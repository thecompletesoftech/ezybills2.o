'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, CreditCard, ShoppingCart } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Supplier, Product, PaginatedResponse } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';

const INR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v);

function safeDate(s: string) {
  try { return format(parseISO(s), 'dd MMM yyyy'); } catch { return s; }
}

// ─── types ───────────────────────────────────────────────────────────────────

interface PurchaseItem {
  product_id: number;
  product?: Product;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  tax_percentage: number;
  tax_amount: number;
  line_total: number;
}

interface Purchase {
  id: number;
  purchase_number: string;
  purchase_date: string;
  supplier_id: number;
  supplier?: Supplier;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_status: 'pending' | 'partially_paid' | 'paid';
  notes: string | null;
  items?: PurchaseItem[];
}

interface LineItem {
  product_id: number | null;
  product_name: string;
  quantity: string;
  unit_price: string;
  discount_pct: string;
  tax_pct: string;
}

const emptyLine = (): LineItem => ({
  product_id: null, product_name: '', quantity: '1', unit_price: '', discount_pct: '0', tax_pct: '0',
});

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  partially_paid: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-red-100 text-red-700',
};

// ─── page ─────────────────────────────────────────────────────────────────────

export default function PurchasesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  // modal states
  const [addOpen, setAddOpen]       = useState(false);
  const [detailPo, setDetailPo]     = useState<Purchase | null>(null);
  const [payPo, setPayPo]           = useState<Purchase | null>(null);

  // add-purchase form
  const [supplierId, setSupplierId]   = useState('');
  const [notes, setNotes]             = useState('');
  const [lines, setLines]             = useState<LineItem[]>([emptyLine()]);
  const [productSearch, setProductSearch] = useState<Record<number, string>>({});

  // payment form
  const [payAmount, setPayAmount]   = useState('');
  const [payMethod, setPayMethod]   = useState('cash');

  // ── queries ──────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<PaginatedResponse<Purchase>>({
    queryKey: ['purchases', page],
    queryFn: async () => (await api.get('/purchases', { params: { page } })).data,
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers-all'],
    queryFn: async () => {
      const res = await api.get('/suppliers', { params: { per_page: 200 } });
      return res.data.data ?? res.data;
    },
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products-all'],
    queryFn: async () => {
      const res = await api.get('/products', { params: { per_page: 500 } });
      return res.data.data ?? res.data;
    },
  });

  // ── line item helpers ─────────────────────────────────────────────────────
  const updateLine = (idx: number, patch: Partial<LineItem>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const lineTotal = (l: LineItem) => {
    const qty  = parseFloat(l.quantity) || 0;
    const up   = parseFloat(l.unit_price) || 0;
    const disc = parseFloat(l.discount_pct) || 0;
    const tax  = parseFloat(l.tax_pct) || 0;
    const base = qty * up;
    const dAmt = base * disc / 100;
    const tAmt = (base - dAmt) * tax / 100;
    return base - dAmt + tAmt;
  };

  const totals = useMemo(() => {
    let sub = 0, tax = 0;
    lines.forEach((l) => {
      const qty  = parseFloat(l.quantity) || 0;
      const up   = parseFloat(l.unit_price) || 0;
      const disc = parseFloat(l.discount_pct) || 0;
      const taxP = parseFloat(l.tax_pct) || 0;
      const base = qty * up;
      const dAmt = base * disc / 100;
      const tAmt = (base - dAmt) * taxP / 100;
      sub += base - dAmt;
      tax += tAmt;
    });
    return { sub, tax, total: sub + tax };
  }, [lines]);

  const filteredProducts = (idx: number) => {
    const q = (productSearch[idx] ?? '').toLowerCase();
    if (!q) return products.slice(0, 20);
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q)).slice(0, 20);
  };

  // ── mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        supplier_id: parseInt(supplierId),
        notes: notes || null,
        items: lines.map((l) => ({
          product_id:           l.product_id,
          quantity:             parseFloat(l.quantity),
          unit_price:           parseFloat(l.unit_price),
          discount_percentage:  parseFloat(l.discount_pct) || 0,
          tax_percentage:       parseFloat(l.tax_pct) || 0,
        })),
      };
      return api.post('/purchases', payload);
    },
    onSuccess: () => {
      toast.success('Purchase recorded');
      qc.invalidateQueries({ queryKey: ['purchases'] });
      setAddOpen(false);
      resetForm();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save';
      toast.error(msg);
    },
  });

  const payMutation = useMutation({
    mutationFn: async () =>
      api.post(`/purchases/${payPo!.id}/payment`, { amount: parseFloat(payAmount), payment_method: payMethod }),
    onSuccess: () => {
      toast.success('Payment recorded');
      qc.invalidateQueries({ queryKey: ['purchases'] });
      setPayPo(null);
      setPayAmount('');
    },
    onError: () => toast.error('Payment failed'),
  });

  const resetForm = () => {
    setSupplierId('');
    setNotes('');
    setLines([emptyLine()]);
    setProductSearch({});
  };

  const validateAndSubmit = () => {
    if (!supplierId) { toast.error('Select a supplier'); return; }
    if (lines.some((l) => !l.product_id || !l.unit_price)) { toast.error('Fill all product rows'); return; }
    createMutation.mutate();
  };

  const purchases = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Purchases</h2>
          <p className="text-gray-500 text-sm mt-0.5">Track stock received from suppliers</p>
        </div>
        <Button variant="primary" size="md" onClick={() => setAddOpen(true)}>
          <Plus size={16} className="mr-1" /> New Purchase
        </Button>
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-14"><Spinner /></div>
          ) : purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <ShoppingCart size={40} className="mb-3 opacity-40" />
              <p className="text-sm">No purchases yet. Record your first stock purchase.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Purchase #</TableHeader>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Supplier</TableHeader>
                    <TableHeader className="text-right">Amount</TableHeader>
                    <TableHeader className="text-center">Status</TableHeader>
                    <TableHeader className="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {purchases.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono font-medium text-gray-800">{po.purchase_number}</TableCell>
                      <TableCell className="text-gray-600">{safeDate(po.purchase_date)}</TableCell>
                      <TableCell className="text-gray-700">{po.supplier?.name ?? '—'}</TableCell>
                      <TableCell className="text-right font-semibold text-gray-800">{INR(po.total_amount)}</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[po.payment_status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {po.payment_status.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setDetailPo(po)}>
                            <Eye size={14} />
                          </Button>
                          {po.payment_status !== 'paid' && (
                            <Button variant="outline" size="sm" onClick={() => { setPayPo(po); setPayAmount(''); }}>
                              <CreditCard size={14} className="mr-1" /> Pay
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.last_page > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-gray-500 self-center">Page {page} of {data.last_page}</span>
          <Button variant="outline" size="sm" disabled={page === data.last_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      {/* ── ADD PURCHASE MODAL ─────────────────────────────────────────── */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); resetForm(); }} title="New Purchase Order" size="xl">
        <div className="space-y-4">
          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]">
              <option value="">— Select supplier —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Items *</label>
              <Button variant="outline" size="sm" onClick={() => setLines((l) => [...l, emptyLine()])}>+ Add Row</Button>
            </div>

            <div className="space-y-3">
              {lines.map((line, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  {/* Product search */}
                  <div className="relative">
                    <Input
                      placeholder="Search product..."
                      value={productSearch[idx] ?? line.product_name}
                      onChange={(e) => {
                        setProductSearch((p) => ({ ...p, [idx]: e.target.value }));
                        if (!e.target.value) updateLine(idx, { product_id: null, product_name: '' });
                      }}
                    />
                    {(productSearch[idx] ?? '').length > 0 && !line.product_id && (
                      <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {filteredProducts(idx).map((p) => (
                          <div key={p.id} className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                            onClick={() => {
                              updateLine(idx, {
                                product_id: p.id, product_name: p.name,
                                unit_price: String(p.purchase_price),
                                tax_pct: String(p.gst_rate ?? 0),
                              });
                              setProductSearch((prev) => ({ ...prev, [idx]: '' }));
                            }}>
                            <span className="font-medium">{p.name}</span>
                            {p.sku && <span className="text-gray-400 ml-2 text-xs">{p.sku}</span>}
                          </div>
                        ))}
                        {filteredProducts(idx).length === 0 && (
                          <p className="px-3 py-2 text-xs text-gray-400">No products found</p>
                        )}
                      </div>
                    )}
                    {line.product_id && (
                      <p className="text-xs text-green-600 mt-0.5">✓ {line.product_name}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Qty</label>
                      <Input type="number" min="0.01" step="0.01" value={line.quantity}
                        onChange={(e) => updateLine(idx, { quantity: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Unit Price (₹)</label>
                      <Input type="number" min="0" step="0.01" value={line.unit_price}
                        onChange={(e) => updateLine(idx, { unit_price: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Discount %</label>
                      <Input type="number" min="0" max="100" value={line.discount_pct}
                        onChange={(e) => updateLine(idx, { discount_pct: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Tax %</label>
                      <Input type="number" min="0" value={line.tax_pct}
                        onChange={(e) => updateLine(idx, { tax_pct: e.target.value })} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Line Total: <strong>{INR(lineTotal(line))}</strong></span>
                    {lines.length > 1 && (
                      <button onClick={() => setLines((l) => l.filter((_, i) => i !== idx))}
                        className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{INR(totals.sub)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Tax</span><span>{INR(totals.tax)}</span></div>
              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1 mt-1">
                <span>Total</span><span>{INR(totals.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
              placeholder="Optional notes..." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="md" onClick={() => { setAddOpen(false); resetForm(); }}>Cancel</Button>
            <Button variant="primary" size="md" onClick={validateAndSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Spinner /> : 'Save Purchase'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── DETAIL MODAL ──────────────────────────────────────────────────── */}
      {detailPo && (
        <Modal open={!!detailPo} onClose={() => setDetailPo(null)} title={`Purchase — ${detailPo.purchase_number}`} size="lg">
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-500">Supplier</p><p className="font-medium">{detailPo.supplier?.name ?? '—'}</p></div>
              <div><p className="text-xs text-gray-500">Date</p><p className="font-medium">{safeDate(detailPo.purchase_date)}</p></div>
              <div><p className="text-xs text-gray-500">Status</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[detailPo.payment_status]}`}>
                  {detailPo.payment_status.replace('_', ' ')}
                </span>
              </div>
              <div><p className="text-xs text-gray-500">Total</p><p className="font-bold text-lg">{INR(detailPo.total_amount)}</p></div>
            </div>

            {detailPo.items && detailPo.items.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left">Product</th>
                      <th className="px-2 py-2 text-right">Qty</th>
                      <th className="px-2 py-2 text-right">Price</th>
                      <th className="px-2 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detailPo.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-2 py-2">{item.product?.name ?? `Product #${item.product_id}`}</td>
                        <td className="px-2 py-2 text-right">{item.quantity}</td>
                        <td className="px-2 py-2 text-right">{INR(item.unit_price)}</td>
                        <td className="px-2 py-2 text-right font-semibold">{INR(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-gray-50 rounded p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{INR(detailPo.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{INR(detailPo.tax_amount)}</span></div>
              <div className="flex justify-between font-bold border-t border-gray-200 pt-1 mt-1"><span>Total</span><span>{INR(detailPo.total_amount)}</span></div>
            </div>

            {detailPo.notes && <p className="text-gray-500 text-xs italic">{detailPo.notes}</p>}
          </div>
        </Modal>
      )}

      {/* ── PAYMENT MODAL ─────────────────────────────────────────────────── */}
      {payPo && (
        <Modal open={!!payPo} onClose={() => setPayPo(null)} title={`Record Payment — ${payPo.purchase_number}`} size="sm">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-gray-500">Outstanding</p>
              <p className="text-2xl font-bold text-gray-900">{INR(payPo.total_amount)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
              <Input type="number" min="0.01" step="0.01" value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]">
                {['cash', 'upi', 'card', 'credit', 'cheque'].map((m) => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="md" onClick={() => setPayPo(null)}>Cancel</Button>
              <Button variant="primary" size="md" onClick={() => payMutation.mutate()}
                disabled={!payAmount || payMutation.isPending}>
                {payMutation.isPending ? <Spinner /> : 'Record Payment'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
