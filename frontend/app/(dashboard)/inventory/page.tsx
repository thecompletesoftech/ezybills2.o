'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, PackagePlus, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Product, PaginatedResponse } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [addStockProduct, setAddStockProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState('');
  const [unitCost, setUnitCost] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse<Product>>({
    queryKey: ['inventory-products'],
    queryFn: async () => {
      const res = await api.get('/products', { params: { per_page: 100 } });
      return res.data;
    },
  });

  const addStockMutation = useMutation({
    mutationFn: async () => {
      if (!addStockProduct) return;
      return api.post('/stock/add', {
        product_id: addStockProduct.id,
        quantity: parseFloat(qty),
        unit_cost: parseFloat(unitCost),
      });
    },
    onSuccess: (res) => {
      const d = (res?.data as { current_stock: number; purchase_price: number }) ?? {};
      toast.success(
        `Stock added. New qty: ${d.current_stock ?? '?'} · New WAC: ${formatCurrency(d.purchase_price ?? 0)}`
      );
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
    onError: () => toast.error('Failed to add stock'),
  });

  const openModal = (p: Product) => {
    setAddStockProduct(p);
    setQty('');
    setUnitCost(String(p.purchase_price));
  };

  const closeModal = () => {
    setAddStockProduct(null);
    setQty('');
    setUnitCost('');
  };

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qty || parseFloat(qty) <= 0) { toast.error('Enter a valid quantity'); return; }
    if (!unitCost || parseFloat(unitCost) < 0) { toast.error('Enter a valid cost price'); return; }
    addStockMutation.mutate();
  };

  const products = data?.data ?? [];
  const lowStock = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity < 5);
  const outOfStock = products.filter((p) => p.stock_quantity <= 0);

  // WAC preview for the modal
  const previewWAC = (() => {
    if (!addStockProduct || !qty || !unitCost) return null;
    const oldQty = addStockProduct.stock_quantity;
    const oldCost = addStockProduct.purchase_price;
    const newQty = parseFloat(qty) || 0;
    const newCost = parseFloat(unitCost) || 0;
    const total = oldQty + newQty;
    if (total <= 0) return null;
    return (oldQty * oldCost + newQty * newCost) / total;
  })();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Inventory</h2>
          <p className="text-gray-500 text-sm mt-0.5">Stock levels · WAC pricing · Add stock</p>
        </div>
      </div>

      {/* Alert banners */}
      {outOfStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">{outOfStock.length} item(s) out of stock</p>
            <p className="text-xs text-red-500 mt-0.5">{outOfStock.map((p) => p.name).join(', ')}</p>
          </div>
        </div>
      )}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700">{lowStock.length} item(s) running low (under 5 units)</p>
            <p className="text-xs text-amber-500 mt-0.5">{lowStock.map((p) => p.name).join(', ')}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Products — Stock &amp; Cost</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : products.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No products yet. Add products first.</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Product</TableHeader>
                  <TableHeader>Category</TableHeader>
                  <TableHeader>Stock Qty</TableHeader>
                  <TableHeader>WAC (Cost)</TableHeader>
                  <TableHeader>Sale Price</TableHeader>
                  <TableHeader>GST</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Action</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => {
                  const stockBadge =
                    product.stock_quantity <= 0 ? 'red' :
                    product.stock_quantity < 5 ? 'yellow' : 'green';
                  const stockLabel =
                    product.stock_quantity <= 0 ? 'Out of Stock' :
                    product.stock_quantity < 5 ? 'Low Stock' : 'In Stock';
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-gray-400">{product.category?.name ?? '—'}</TableCell>
                      <TableCell>
                        <span className={product.stock_quantity <= 0 ? 'text-red-600 font-bold' : product.stock_quantity < 5 ? 'text-amber-600 font-semibold' : 'text-gray-700'}>
                          {product.stock_quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600">{formatCurrency(product.purchase_price)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(product.selling_price)}</TableCell>
                      <TableCell className="text-gray-400">{product.gst_rate}%</TableCell>
                      <TableCell><Badge variant={stockBadge}>{stockLabel}</Badge></TableCell>
                      <TableCell>
                        <button
                          onClick={() => openModal(product)}
                          className="flex items-center gap-1 text-xs text-[#0066CC] hover:text-blue-800 font-medium"
                        >
                          <PackagePlus size={14} /> Add Stock
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Stock Modal */}
      <Modal
        open={!!addStockProduct}
        onClose={closeModal}
        title={`Add Stock — ${addStockProduct?.name ?? ''}`}
        className="max-w-sm"
      >
        <form onSubmit={handleAddStock} className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700 space-y-1">
            <p>Current stock: <strong>{addStockProduct?.stock_quantity}</strong> units</p>
            <p>Current WAC: <strong>{formatCurrency(addStockProduct?.purchase_price ?? 0)}</strong></p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Quantity to Add *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="e.g. 50"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Purchase Price per Unit *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="e.g. 11.00"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
            />
          </div>

          {/* WAC Preview */}
          {previewWAC !== null && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <TrendingUp size={16} className="text-green-600 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-green-700 font-medium">New Weighted Avg Cost: {formatCurrency(previewWAC)}</p>
                <p className="text-green-600 text-xs">
                  ({addStockProduct?.stock_quantity} × {formatCurrency(addStockProduct?.purchase_price ?? 0)} + {qty} × {formatCurrency(parseFloat(unitCost) || 0)}) ÷ {(addStockProduct?.stock_quantity ?? 0) + (parseFloat(qty) || 0)} units
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1" loading={addStockMutation.isPending}>
              Add Stock
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
