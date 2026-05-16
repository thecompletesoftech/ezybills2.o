'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, PackagePlus, TrendingUp, Upload, Download, Filter, AlertCircle } from 'lucide-react';
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

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

// ─── Bulk Restock Panel ──────────────────────────────────────────────────────
function BulkRestockPanel({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<{ updated: number; skipped: string[]; errors: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation({
    mutationFn: (f: File) => {
      const fd = new FormData(); fd.append('file', f);
      return api.post('/stock/restock', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: res => {
      setResult(res.data.data);
      toast.success('Restock complete');
      setFile(null);
      onDone();
    },
    onError: () => toast.error('Restock import failed'),
  });

  const downloadTemplate = () => {
    api.get('/stock/restock/sample', { responseType: 'blob' }).then(res => {
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = 'stock_restock_template.csv'; a.click(); URL.revokeObjectURL(url);
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) setFile(f);
    else toast.error('Please upload a CSV file');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Bulk Stock Restock</CardTitle>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Download Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          Download the template (pre-filled with your products), fill in <strong>quantity_to_add</strong> and optional <strong>purchase_price</strong>, then upload.
          Stock movements are recorded with date automatically.
        </p>
        <div
          className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
          <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          {file ? (
            <p className="font-medium text-gray-700">{file.name} &nbsp;<span className="text-gray-400 text-sm">({(file.size / 1024).toFixed(1)} KB)</span></p>
          ) : (
            <p className="text-sm text-gray-500">Drag & drop CSV or click to browse</p>
          )}
        </div>

        {file && (
          <div className="mt-3 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setFile(null)}>Clear</Button>
            <Button variant="primary" loading={importMutation.isPending} onClick={() => importMutation.mutate(file)}>
              <Upload className="w-4 h-4 mr-1.5" /> Upload & Restock
            </Button>
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-2">
            <div className="p-3 bg-green-50 rounded-lg text-green-700 text-sm font-medium">
              ✓ {result.updated} products restocked
            </div>
            {result.skipped.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-amber-700 text-sm font-medium mb-1">Skipped ({result.skipped.length})</p>
                {result.skipped.map((s, i) => <p key={i} className="text-xs text-amber-600">{s}</p>)}
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-red-700 text-sm font-medium mb-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Errors</p>
                {result.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [addStockProduct, setAddStockProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [showRestock, setShowRestock] = useState(false);

  const { data, isLoading } = useQuery<PaginatedResponse<Product>>({
    queryKey: ['inventory-products'],
    queryFn: () => api.get('/products', { params: { per_page: 200 } }).then(r => r.data),
  });

  const addStockMutation = useMutation({
    mutationFn: () => {
      if (!addStockProduct) throw new Error('No product');
      return api.post('/stock/add', {
        product_id: addStockProduct.id,
        quantity: parseFloat(qty),
        unit_cost: parseFloat(unitCost),
      });
    },
    onSuccess: res => {
      const d = (res?.data as { current_stock: number; purchase_price: number }) ?? {};
      toast.success(`Stock added. New qty: ${d.current_stock ?? '?'} · New WAC: ${formatCurrency(d.purchase_price ?? 0)}`);
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
    onError: () => toast.error('Failed to add stock'),
  });

  const openModal = (p: Product) => { setAddStockProduct(p); setQty(''); setUnitCost(String(p.purchase_price)); };
  const closeModal = () => { setAddStockProduct(null); setQty(''); setUnitCost(''); };

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qty || parseFloat(qty) <= 0) { toast.error('Enter a valid quantity'); return; }
    if (!unitCost || parseFloat(unitCost) < 0) { toast.error('Enter a valid cost price'); return; }
    addStockMutation.mutate();
  };

  const allProducts = data?.data ?? [];

  // Low-stock uses per-product threshold
  const getStockStatus = (p: Product) => {
    const threshold = (p as Product & { low_stock_threshold?: number }).low_stock_threshold ?? 0;
    if (p.stock_quantity <= 0) return 'out_of_stock';
    if (threshold > 0 && p.stock_quantity <= threshold) return 'low_stock';
    return 'in_stock';
  };

  const filteredProducts = stockFilter === 'all' ? allProducts : allProducts.filter(p => getStockStatus(p) === stockFilter);

  const outOfStock = allProducts.filter(p => p.stock_quantity <= 0);
  const lowStock   = allProducts.filter(p => {
    const threshold = (p as Product & { low_stock_threshold?: number }).low_stock_threshold ?? 0;
    return p.stock_quantity > 0 && threshold > 0 && p.stock_quantity <= threshold;
  });

  const previewWAC = (() => {
    if (!addStockProduct || !qty || !unitCost) return null;
    const oldQty = addStockProduct.stock_quantity, oldCost = addStockProduct.purchase_price;
    const newQty = parseFloat(qty) || 0, newCost = parseFloat(unitCost) || 0;
    const total = oldQty + newQty;
    return total <= 0 ? null : (oldQty * oldCost + newQty * newCost) / total;
  })();

  const FILTERS: { key: StockFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: allProducts.length },
    { key: 'in_stock', label: 'In Stock', count: allProducts.filter(p => getStockStatus(p) === 'in_stock').length },
    { key: 'low_stock', label: 'Low Stock', count: lowStock.length },
    { key: 'out_of_stock', label: 'Out of Stock', count: outOfStock.length },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Inventory</h2>
          <p className="text-gray-500 text-sm mt-0.5">Stock levels · WAC pricing · Low-stock alerts</p>
        </div>
        <Button variant="outline" onClick={() => setShowRestock(v => !v)}>
          <Upload className="w-4 h-4 mr-1.5" /> {showRestock ? 'Hide Restock' : 'Bulk Restock'}
        </Button>
      </div>

      {/* Alert banners */}
      {outOfStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">{outOfStock.length} item(s) out of stock</p>
            <p className="text-xs text-red-500 mt-0.5">{outOfStock.map(p => p.name).join(', ')}</p>
          </div>
        </div>
      )}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700">{lowStock.length} item(s) below low-stock threshold</p>
            <p className="text-xs text-amber-500 mt-0.5">{lowStock.map(p => p.name).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Bulk restock */}
      {showRestock && (
        <BulkRestockPanel onDone={() => {
          queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
        }} />
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <Filter size={15} className="text-gray-400 self-center" />
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setStockFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${stockFilter === f.key ? 'bg-[#0066CC] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {f.label} {f.count !== undefined && <span className="ml-1 opacity-70">({f.count})</span>}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {stockFilter === 'all' ? 'All Products' : FILTERS.find(f => f.key === stockFilter)?.label} — Stock & Cost
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : filteredProducts.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No products match this filter.</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Product</TableHeader>
                  <TableHeader>Category</TableHeader>
                  <TableHeader>Stock Qty</TableHeader>
                  <TableHeader>Alert At</TableHeader>
                  <TableHeader>WAC (Cost)</TableHeader>
                  <TableHeader>Sale Price</TableHeader>
                  <TableHeader>GST</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Action</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts.map(product => {
                  const status = getStockStatus(product);
                  const threshold = (product as Product & { low_stock_threshold?: number }).low_stock_threshold ?? 0;
                  const badgeVariant = status === 'out_of_stock' ? 'red' : status === 'low_stock' ? 'yellow' : 'green';
                  const badgeLabel = status === 'out_of_stock' ? 'Out of Stock' : status === 'low_stock' ? 'Low Stock' : 'In Stock';
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-gray-400">{product.category?.name ?? '—'}</TableCell>
                      <TableCell>
                        <span className={status === 'out_of_stock' ? 'text-red-600 font-bold' : status === 'low_stock' ? 'text-amber-600 font-semibold' : 'text-gray-700'}>
                          {product.stock_quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">{threshold > 0 ? `≤ ${threshold}` : '—'}</TableCell>
                      <TableCell className="text-gray-600">{formatCurrency(product.purchase_price)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(product.selling_price)}</TableCell>
                      <TableCell className="text-gray-400">{product.gst_rate}%</TableCell>
                      <TableCell><Badge variant={badgeVariant}>{badgeLabel}</Badge></TableCell>
                      <TableCell>
                        <button onClick={() => openModal(product)} className="flex items-center gap-1 text-xs text-[#0066CC] hover:text-blue-800 font-medium">
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
      <Modal open={!!addStockProduct} onClose={closeModal} title={`Add Stock — ${addStockProduct?.name ?? ''}`} className="max-w-sm">
        <form onSubmit={handleAddStock} className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700 space-y-1">
            <p>Current stock: <strong>{addStockProduct?.stock_quantity}</strong> units</p>
            <p>Current WAC: <strong>{formatCurrency(addStockProduct?.purchase_price ?? 0)}</strong></p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Quantity to Add *</label>
            <input type="number" min="0.01" step="0.01" value={qty} onChange={e => setQty(e.target.value)} placeholder="e.g. 50"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Purchase Price per Unit *</label>
            <input type="number" min="0" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)} placeholder="e.g. 11.00"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]" />
          </div>

          {previewWAC !== null && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <TrendingUp size={16} className="text-green-600 shrink-0" />
              <div className="text-sm">
                <p className="text-green-700 font-medium">New WAC: {formatCurrency(previewWAC)}</p>
                <p className="text-green-600 text-xs">
                  ({addStockProduct?.stock_quantity} × {formatCurrency(addStockProduct?.purchase_price ?? 0)} + {qty} × {formatCurrency(parseFloat(unitCost) || 0)}) ÷ {(addStockProduct?.stock_quantity ?? 0) + (parseFloat(qty) || 0)} units
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1" loading={addStockMutation.isPending}>Add Stock</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
