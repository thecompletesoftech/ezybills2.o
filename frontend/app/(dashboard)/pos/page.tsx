'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CheckCircle,
  Printer,
  MessageSquare,
  X,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Product, Category, Customer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import PrintBill, { type BillData } from '@/components/print-bill';
import { UpiQr } from '@/components/ui/upi-qr';

interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  gst_rate: number;
  tax_type: 'inclusive' | 'exclusive';
}

type PaymentMode = 'cash' | 'card' | 'upi' | 'split';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

const emptyCustomerForm = { name: '', phone: '', email: '', address: '', gstin: '', opening_balance: '0' };
type CustomerForm = typeof emptyCustomerForm;

export default function POSPage() {
  const queryClient = useQueryClient();

  // --- Product search & filter ---
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  // --- Cart ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const customerRef = useRef<HTMLDivElement>(null);

  // --- Quick-add customer modal ---
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomerForm);
  const [customerFormError, setCustomerFormError] = useState('');

  // --- Token ---
  const [tokenNumber, setTokenNumber] = useState('');

  // --- Totals ---
  const [discountPct, setDiscountPct] = useState(0);

  // --- Payment ---
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [cashReceived, setCashReceived] = useState('');

  // --- Success modal + print ---
  const [successInvoice, setSuccessInvoice] = useState<{ invoice_number: string; total: number } | null>(null);
  const [printBillData, setPrintBillData] = useState<BillData | null>(null);
  const [showPrintBill, setShowPrintBill] = useState(false);

  // --- Queries ---
  const { data: printerSettings } = useQuery<{ upi_id?: string | null; business_name?: string }>({
    queryKey: ['printer-settings'],
    queryFn: () => api.get('/settings/printer').then(r => r.data.data ?? r.data),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories', { params: { per_page: 'all', is_active: 1 } });
      return res.data.data ?? res.data;
    },
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['pos-products', search, activeCategory],
    queryFn: async () => {
      const params: Record<string, unknown> = { per_page: 60 };
      if (search) params.search = search;
      if (activeCategory) params.category_id = activeCategory;
      const res = await api.get('/products', { params });
      return res.data.data ?? res.data;
    },
  });

  const { data: customerResults = [] } = useQuery<Customer[]>({
    queryKey: ['customer-search', customerSearch],
    queryFn: async () => {
      if (!customerSearch || customerSearch.length < 2) return [];
      const res = await api.get('/customers', { params: { search: customerSearch, per_page: 10 } });
      return res.data.data ?? res.data;
    },
    enabled: customerSearch.length >= 2,
  });

  // Close customer dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setCustomerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // --- Cart logic ---
  const addToCart = useCallback((product: Product) => {
    if (product.stock_quantity <= 0) {
      toast.error('Product is out of stock');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: product.selling_price,
          quantity: 1,
          unit: product.unit?.short_name ?? 'pcs',
          gst_rate: product.gst_rate ?? 0,
          tax_type: product.tax_type ?? 'exclusive',
        },
      ];
    });
    toast.success(`${product.name} added`, { duration: 800 });
  }, []);

  const updateQty = (product_id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product_id === product_id
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (product_id: number) => {
    setCart((prev) => prev.filter((item) => item.product_id !== product_id));
  };

  // --- Totals calculation ---
  // subtotal = raw sum of displayed prices (inclusive items already have tax inside)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = subtotal * (discountPct / 100);

  // Per-item tax (extracted for inclusive, added for exclusive)
  const taxAmount = cart.reduce((sum, item) => {
    const itemBase = item.price * item.quantity;
    const taxableBase = itemBase * (1 - discountPct / 100);
    if (item.tax_type === 'inclusive') {
      return item.gst_rate > 0
        ? sum + taxableBase * item.gst_rate / (100 + item.gst_rate)
        : sum;
    }
    return sum + taxableBase * item.gst_rate / 100;
  }, 0);

  // grandTotal: for exclusive items tax is added; for inclusive it's already in price
  const grandTotal = cart.reduce((sum, item) => {
    const itemBase = item.price * item.quantity;
    const taxableBase = itemBase * (1 - discountPct / 100);
    if (item.tax_type === 'inclusive') {
      return sum + taxableBase; // tax already inside
    }
    return sum + taxableBase + taxableBase * item.gst_rate / 100;
  }, 0);
  const changeAmount = parseFloat(cashReceived || '0') - grandTotal;

  // --- Invoice mutations ---
  const createInvoiceMutation = useMutation({
    mutationFn: async (status: 'paid' | 'hold') => {
      // 'split' is not in the backend enum (cash,card,upi,credit,mixed)
      const backendMode = paymentMode === 'split' ? 'mixed' : paymentMode;
      const payload = {
        customer_id: selectedCustomer?.id ?? null,
        payment_mode: backendMode,
        payment_status: status === 'paid' ? 'paid' : 'hold',
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price,
          discount_percentage: discountPct,
        })),
      };
      const res = await api.post('/invoices', payload);
      return res.data;
    },
    onSuccess: (data, status) => {
      if (status === 'paid') {
        const invoiceNumber = data.invoice?.invoice_number ?? data.invoice_number ?? 'INV-' + Date.now();
        const business = data.invoice?.business ?? data.business ?? {};
        setSuccessInvoice({ invoice_number: invoiceNumber, total: grandTotal });
        setPrintBillData({
          invoice_number: invoiceNumber,
          date: new Date().toISOString(),
          business_name: business.name ?? 'EzyBills',
          business_logo_url: business.logo_url ?? undefined,
          business_address: business.address ?? undefined,
          business_gst: business.gst_number ?? undefined,
          business_phone: business.mobile_number ?? undefined,
          customer_name: selectedCustomer?.name ?? undefined,
          token_number: tokenNumber || undefined,
          items: cart.map((item) => ({
            name: item.name,
            qty: item.quantity,
            unit: item.unit,
            price: item.price,
            gst_rate: item.gst_rate,
            discount_pct: discountPct,
          })),
          subtotal,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          grand_total: grandTotal,
          payment_mode: paymentMode,
          cash_received: paymentMode === 'cash' && cashReceived ? parseFloat(cashReceived) : undefined,
          change_amount: paymentMode === 'cash' && cashReceived && changeAmount > 0 ? changeAmount : undefined,
        });
      } else {
        toast.success('Invoice held successfully');
        clearCart();
      }
    },
    onError: () => {
      toast.error('Failed to create invoice');
    },
  });

  const addCustomerMutation = useMutation({
    mutationFn: async (form: CustomerForm) => {
      const res = await api.post('/customers', {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        gstin: form.gstin || null,
        opening_balance: parseFloat(form.opening_balance) || 0,
      });
      return (res.data.data ?? res.data) as Customer;
    },
    onSuccess: (customer: Customer) => {
      setSelectedCustomer(customer);
      setCustomerSearch(customer.name);
      setAddCustomerOpen(false);
      setCustomerForm(emptyCustomerForm);
      setCustomerFormError('');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`${customer.name} added and selected`);
    },
    onError: () => toast.error('Failed to add customer'),
  });

  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name.trim()) { setCustomerFormError('Name is required'); return; }
    setCustomerFormError('');
    addCustomerMutation.mutate(customerForm);
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setCustomerSearch('');
    setTokenNumber('');
    setDiscountPct(0);
    setCashReceived('');
    setPaymentMode('cash');
    setPrintBillData(null);
    setShowPrintBill(false);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] gap-0 -m-4 lg:-m-6 overflow-hidden">
      {/* ===== LEFT PANEL ===== */}
      <div className="flex-1 flex flex-col bg-gray-50 border-r border-gray-200 min-w-0">
        {/* Search bar */}
        <div className="px-4 pt-4 pb-2 space-y-3 bg-white border-b border-gray-100">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search product name or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
            />
          </div>
          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveCategory(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === null
                  ? 'bg-[#0066CC] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-[#0066CC] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {productsLoading ? (
            <div className="flex justify-center items-center h-40">
              <Spinner />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Search size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {products.map((product) => {
                const inCart = cart.find((c) => c.product_id === product.id);
                const lowStock = product.stock_quantity > 0 && product.stock_quantity < 5;
                const outOfStock = product.stock_quantity <= 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={outOfStock}
                    className={`relative text-left bg-white rounded-xl border p-3 transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 ${
                      inCart
                        ? 'border-[#0066CC] bg-blue-50/40'
                        : outOfStock
                        ? 'border-gray-100 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-[#0066CC]/40'
                    }`}
                  >
                    {inCart && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#0066CC] text-white text-xs flex items-center justify-center font-bold">
                        {inCart.quantity}
                      </span>
                    )}
                    <div className="w-full h-10 bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                      <span className="text-gray-400 text-lg font-bold">{product.name.charAt(0)}</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2 mb-1">
                      {product.name}
                    </p>
                    <p className="text-sm font-bold text-[#0066CC]">{formatCurrency(product.selling_price)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {lowStock && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-medium">
                          <AlertTriangle size={10} /> Low
                        </span>
                      )}
                      {outOfStock ? (
                        <span className="text-[10px] text-red-500 font-medium">Out of stock</span>
                      ) : (
                        <span className="text-[10px] text-gray-400">Qty: {product.stock_quantity}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== RIGHT PANEL (Cart) ===== */}
      <div className="w-[380px] flex-shrink-0 flex flex-col bg-white">
        {/* Cart header + customer selector */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-[#0066CC]" />
              <span className="font-bold text-gray-800">Current Sale</span>
              {cart.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#0066CC] text-white text-xs flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <Trash2 size={12} /> Clear
              </button>
            )}
          </div>

          {/* Customer selector */}
          <div className="flex items-center gap-2">
          <div className="relative flex-1" ref={customerRef}>
            <div
              className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:border-[#0066CC]/50 transition-colors"
              onClick={() => setCustomerDropdownOpen(true)}
            >
              <Search size={14} className="text-gray-400 flex-shrink-0" />
              {selectedCustomer ? (
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{selectedCustomer.name}</p>
                    {selectedCustomer.phone && (
                      <p className="text-xs text-gray-400">{selectedCustomer.phone}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCustomer(null);
                      setCustomerSearch('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Select customer (optional)"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setCustomerDropdownOpen(true);
                  }}
                  className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
                />
              )}
              {!selectedCustomer && <ChevronDown size={14} className="text-gray-400" />}
            </div>
            {customerDropdownOpen && customerResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                {customerResults.map((c) => (
                  <button
                    key={c.id}
                    className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors"
                    onClick={() => {
                      setSelectedCustomer(c);
                      setCustomerSearch(c.name);
                      setCustomerDropdownOpen(false);
                    }}
                  >
                    <p className="text-sm font-medium text-gray-800">{c.name}</p>
                    {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setCustomerForm(emptyCustomerForm);
              setCustomerFormError('');
              setAddCustomerOpen(true);
            }}
            title="Add new customer"
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-[#0066CC] hover:text-[#0066CC] hover:bg-blue-50 transition-colors"
          >
            <Plus size={16} />
          </button>
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 py-12">
              <ShoppingCart size={48} className="mb-3" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1">Click products to add them</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {cart.map((item) => (
                <div key={item.product_id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{formatCurrency(item.price)} / {item.unit}</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-gray-300 hover:text-red-400 transition-colors mt-0.5 flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQty(item.product_id, -1)}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#0066CC] hover:text-[#0066CC] transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.product_id, 1)}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[#0066CC] hover:text-[#0066CC] transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-gray-800">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + Payment */}
        {cart.length > 0 && (
          <div className="border-t border-gray-100 bg-gray-50/50">
            {/* Discount & Tax */}
            <div className="px-4 pt-3 pb-2 space-y-2">
              {/* Token number */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500 w-20 flex-shrink-0">Token #</label>
                <input
                  type="text"
                  placeholder="e.g. T-001"
                  value={tokenNumber}
                  onChange={(e) => setTokenNumber(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500 w-20 flex-shrink-0">Discount %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPct || ''}
                  onChange={(e) => setDiscountPct(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
                />
                {discountPct > 0 && (
                  <span className="text-sm text-red-500 w-20 text-right">-{formatCurrency(discountAmount)}</span>
                )}
              </div>
              {taxAmount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">GST (auto)</span>
                  <span className="text-gray-600">+{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                <span className="text-base font-bold text-gray-900">Grand Total</span>
                <span className="text-base font-bold text-[#0066CC]">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Payment mode */}
            <div className="px-4 pb-2">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-3">
                {(['cash', 'card', 'upi', 'split'] as PaymentMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPaymentMode(mode)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                      paymentMode === mode
                        ? 'bg-white text-[#0066CC] shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Cash: amount received + change */}
              {paymentMode === 'cash' && (
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500 w-28 flex-shrink-0">Cash Received</label>
                    <input
                      type="number"
                      min={0}
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder={grandTotal.toFixed(2)}
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
                    />
                  </div>
                  {cashReceived && parseFloat(cashReceived) >= grandTotal && (
                    <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                      <span className="text-sm text-green-700 font-medium">Change</span>
                      <span className="text-sm font-bold text-green-700">{formatCurrency(changeAmount)}</span>
                    </div>
                  )}
                  {cashReceived && parseFloat(cashReceived) < grandTotal && (
                    <div className="flex items-center justify-between px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                      <span className="text-sm text-red-600 font-medium">Short by</span>
                      <span className="text-sm font-bold text-red-600">{formatCurrency(grandTotal - parseFloat(cashReceived))}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Quick amount buttons for cash */}
              {paymentMode === 'cash' && (
                <div className="flex gap-1 mb-3 flex-wrap">
                  {[100, 200, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setCashReceived(String(amt))}
                      className="px-2 py-1 text-xs border border-gray-200 rounded-lg hover:border-[#0066CC] hover:text-[#0066CC] transition-colors"
                    >
                      ₹{amt}
                    </button>
                  ))}
                  <button
                    onClick={() => setCashReceived(grandTotal.toFixed(2))}
                    className="px-2 py-1 text-xs border border-[#0066CC]/30 text-[#0066CC] rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Exact
                  </button>
                </div>
              )}

              {paymentMode === 'upi' && (
                <div className="mb-3 px-3 py-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
                  <p className="text-sm text-purple-700 font-semibold mb-2">
                    UPI Payment — {formatCurrency(grandTotal)}
                  </p>
                  {printerSettings?.upi_id ? (
                    <>
                      <div className="flex justify-center mb-1">
                        <UpiQr
                          upiId={printerSettings.upi_id}
                          businessName="EzyBills"
                          amount={grandTotal}
                          size={140}
                          className="rounded"
                        />
                      </div>
                      <p className="text-xs text-purple-600 font-medium">{printerSettings.upi_id}</p>
                      <p className="text-xs text-purple-400 mt-0.5">Scan QR to pay</p>
                    </>
                  ) : (
                    <p className="text-xs text-purple-500">Collect {formatCurrency(grandTotal)} via UPI</p>
                  )}
                </div>
              )}

              {paymentMode === 'card' && (
                <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <p className="text-sm text-blue-700 font-medium">Card Payment</p>
                  <p className="text-xs text-blue-500 mt-0.5">Swipe / tap card for {formatCurrency(grandTotal)}</p>
                </div>
              )}

              {paymentMode === 'split' && (
                <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-center">
                  <p className="text-sm text-amber-700 font-medium">Split Payment</p>
                  <p className="text-xs text-amber-500 mt-0.5">Total: {formatCurrency(grandTotal)} — mark as paid after collecting</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  loading={createInvoiceMutation.isPending}
                  onClick={() => createInvoiceMutation.mutate('hold')}
                >
                  Hold
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-[2]"
                  loading={createInvoiceMutation.isPending}
                  onClick={() => createInvoiceMutation.mutate('paid')}
                >
                  Complete Sale
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== PRINT BILL OVERLAY ===== */}
      {showPrintBill && printBillData && (
        <PrintBill bill={printBillData} onClose={() => setShowPrintBill(false)} />
      )}

      {/* ===== SUCCESS MODAL ===== */}
      {successInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={36} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Sale Complete!</h3>
            <p className="text-gray-500 text-sm mb-1">Invoice #{successInvoice.invoice_number}</p>
            <p className="text-2xl font-bold text-[#0066CC] mb-6">{formatCurrency(successInvoice.total)}</p>

            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setShowPrintBill(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Printer size={16} /> Print
              </button>
              <button
                onClick={() => {
                  const msg = encodeURIComponent(
                    `Invoice #${successInvoice.invoice_number} | Total: ${formatCurrency(successInvoice.total)} | Thank you for shopping with us!`
                  );
                  window.open(`https://wa.me/?text=${msg}`, '_blank');
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-green-200 rounded-xl text-sm font-medium text-green-600 hover:bg-green-50 transition-colors"
              >
                <MessageSquare size={16} /> WhatsApp
              </button>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                setSuccessInvoice(null);
                clearCart();
              }}
            >
              New Sale
            </Button>
          </div>
        </div>
      )}

      {/* ===== QUICK-ADD CUSTOMER MODAL ===== */}
      <Modal
        open={addCustomerOpen}
        onClose={() => { setAddCustomerOpen(false); setCustomerFormError(''); }}
        title="Add Customer"
      >
        <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
          <Input
            label="Full Name *"
            placeholder="e.g. Rahul Sharma"
            value={customerForm.name}
            onChange={(e) => setCustomerForm((f) => ({ ...f, name: e.target.value }))}
            error={customerFormError || undefined}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={customerForm.phone}
              onChange={(e) => setCustomerForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Input
              label="Email"
              type="email"
              placeholder="rahul@example.com"
              value={customerForm.email}
              onChange={(e) => setCustomerForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Address</label>
            <textarea
              value={customerForm.address}
              onChange={(e) => setCustomerForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Street, City, State..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC] resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="GSTIN"
              placeholder="22AAAAA0000A1Z5"
              value={customerForm.gstin}
              onChange={(e) => setCustomerForm((f) => ({ ...f, gstin: e.target.value }))}
            />
            <Input
              label="Opening Balance (₹)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={customerForm.opening_balance}
              onChange={(e) => setCustomerForm((f) => ({ ...f, opening_balance: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setAddCustomerOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={addCustomerMutation.isPending}>Add Customer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
