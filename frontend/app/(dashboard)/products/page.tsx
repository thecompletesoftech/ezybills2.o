'use client';

import { useCallback, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, ImagePlus, X, Upload, Download, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Product, Category, Unit, Supplier, PaginatedResponse } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';

interface TaxRate { id: number; name: string; rate: number; is_active: boolean; }

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

interface ProductFormData {
  name: string; sku: string; category_id: string; unit_id: string; supplier_id: string;
  selling_price: string; purchase_price: string; stock_quantity: string;
  gst_rate: string; tax_type: 'inclusive' | 'exclusive';
  low_stock_threshold: string; description: string; is_active: boolean;
}

const emptyForm: ProductFormData = {
  name: '', sku: '', category_id: '', unit_id: '', supplier_id: '',
  selling_price: '', purchase_price: '', stock_quantity: '', gst_rate: '0',
  tax_type: 'exclusive', low_stock_threshold: '5', description: '', is_active: true,
};

function productToForm(p: Product): ProductFormData {
  return {
    name: p.name, sku: p.sku ?? '', category_id: p.category_id ? String(p.category_id) : '',
    unit_id: p.unit_id ? String(p.unit_id) : '',
    supplier_id: (p as Product & { supplier_id?: number }).supplier_id ? String((p as Product & { supplier_id?: number }).supplier_id) : '',
    selling_price: String(p.selling_price), purchase_price: String(p.purchase_price),
    stock_quantity: String(p.stock_quantity), gst_rate: String(p.gst_rate ?? 0),
    tax_type: p.tax_type ?? 'exclusive',
    low_stock_threshold: String((p as Product & { low_stock_threshold?: number }).low_stock_threshold ?? 5),
    description: p.description ?? '', is_active: p.is_active,
  };
}

// ─── Image Drag/Drop Upload Zone ────────────────────────────────────────────
function ImageUploadZone({
  imageUrl, onFile, onClear,
}: { imageUrl: string | null; onFile: (f: File) => void; onClear: () => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10 MB'); return; }
    onFile(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) accept(file);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed transition-colors ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
      style={{ minHeight: 160 }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !imageUrl && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) accept(f); }} />
      {imageUrl ? (
        <div className="relative w-full h-40 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="product" className="max-h-36 max-w-full object-contain rounded-lg" />
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onClear(); }}
            className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 gap-2 cursor-pointer">
          <ImagePlus className="w-8 h-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Drag & drop or click to upload</p>
          <p className="text-xs text-gray-400">Auto-compressed to 500×500 · PNG/JPG/WEBP</p>
        </div>
      )}
    </div>
  );
}

// ─── Bulk Import Panel ───────────────────────────────────────────────────────
function BulkImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: string[]; errors: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation({
    mutationFn: (f: File) => {
      const fd = new FormData(); fd.append('file', f);
      return api.post('/products/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: res => { setResult(res.data.data); toast.success('Import complete'); setFile(null); },
    onError: () => toast.error('Import failed'),
  });

  const downloadSample = () => {
    api.get('/products/import/sample', { responseType: 'blob' }).then(res => {
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'product_import_sample.csv';
      a.click(); URL.revokeObjectURL(url);
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) setFile(f);
    else toast.error('Please upload a CSV file');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Bulk Product Import</h2>
          <p className="text-sm text-gray-500 mt-0.5">Upload a CSV to add multiple products at once. Images are downloaded automatically from URLs.</p>
        </div>
        <Button variant="outline" onClick={downloadSample}>
          <Download className="w-4 h-4 mr-1.5" /> Sample CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
            <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            {file ? (
              <div>
                <p className="font-medium text-gray-700">{file.name}</p>
                <p className="text-sm text-gray-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-500">Drag & drop CSV or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">Columns: name, sku, barcode, category, selling_price, purchase_price, gst_rate, unit, stock_quantity, low_stock_threshold, description, image_url</p>
              </>
            )}
          </div>

          {file && (
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setFile(null)}>Clear</Button>
              <Button variant="primary" loading={importMutation.isPending} onClick={() => importMutation.mutate(file)}>
                <Upload className="w-4 h-4 mr-1.5" /> Import Products
              </Button>
            </div>
          )}

          {result && (
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700 text-sm font-medium">
                ✓ {result.imported} products imported successfully
              </div>
              {result.skipped.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-amber-700 text-sm font-medium mb-1">Skipped ({result.skipped.length})</p>
                  {result.skipped.map((s, i) => <p key={i} className="text-xs text-amber-600">{s}</p>)}
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-red-700 text-sm font-medium mb-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Errors ({result.errors.length})</p>
                  {result.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'list' | 'bulk'>('list');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<ProductFormData>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<Product>>({
    queryKey: ['products', { page, search }],
    queryFn: () => api.get('/products', { params: { page, search } }).then(r => r.data),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data ?? r.data),
  });

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: () => api.get('/units').then(r => r.data.data ?? r.data),
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers-all'],
    queryFn: () => api.get('/suppliers', { params: { per_page: 200 } }).then(r => r.data.data ?? r.data),
  });

  const { data: taxRates = [] } = useQuery<TaxRate[]>({
    queryKey: ['tax-rates'],
    queryFn: () => api.get('/tax-rates').then(r => r.data.data ?? r.data),
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: ProductFormData) => {
      const payload: Record<string, unknown> = {
        name: formData.name,
        sku: formData.sku || undefined,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        unit_id: formData.unit_id ? parseInt(formData.unit_id) : null,
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
        selling_price: parseFloat(formData.selling_price),
        purchase_price: parseFloat(formData.purchase_price) || 0,
        gst_rate: parseFloat(formData.gst_rate) || 0,
        tax_type: formData.tax_type,
        low_stock_threshold: parseFloat(formData.low_stock_threshold) || 0,
        description: formData.description || null,
        is_active: formData.is_active,
      };
      if (!editingProduct) payload.stock_quantity = parseInt(formData.stock_quantity) || 0;

      // If image file selected, use multipart form
      if (imageFile) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, String(v)); });
        fd.append('image', imageFile);
        return editingProduct
          ? api.post(`/products/${editingProduct.id}?_method=PUT`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
          : api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      return editingProduct ? api.put(`/products/${editingProduct.id}`, payload) : api.post('/products', payload);
    },
    onSuccess: () => {
      toast.success(editingProduct ? 'Product updated' : 'Product created');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
    onError: () => toast.error('Failed to save product'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => { toast.success('Product deleted'); queryClient.invalidateQueries({ queryKey: ['products'] }); },
    onError: () => toast.error('Failed to delete product'),
  });

  const openAdd = () => {
    setEditingProduct(null); setForm(emptyForm); setFormErrors({});
    setImageFile(null); setImagePreview(null); setModalOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditingProduct(p); setForm(productToForm(p)); setFormErrors({});
    setImageFile(null);
    setImagePreview((p as Product & { image_url?: string }).image_url ?? null);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false); setEditingProduct(null); setForm(emptyForm);
    setFormErrors({}); setImageFile(null); setImagePreview(null);
  };

  const handleImageFile = (f: File) => {
    setImageFile(f);
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const validate = () => {
    const e: Partial<ProductFormData> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.selling_price || isNaN(parseFloat(form.selling_price))) e.selling_price = 'Valid price required';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (validate()) saveMutation.mutate(form); };

  const sel = (key: keyof ProductFormData) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, [key]: e.target.value })),
  });

  const products = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Products</h2>
          <p className="text-gray-500 text-sm mt-0.5">{data?.total ?? 0} total products</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTab(tab === 'bulk' ? 'list' : 'bulk')}>
            <Upload className="w-4 h-4 mr-1.5" /> {tab === 'bulk' ? 'Back to List' : 'Bulk Import'}
          </Button>
          {tab === 'list' && (
            <Button variant="primary" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Product
            </Button>
          )}
        </div>
      </div>

      {tab === 'bulk' ? <BulkImportPanel /> : (
        <>
          <Card>
            <CardContent className="pt-4 pb-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text" placeholder="Search products..."
                    value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
                  />
                </div>
              </div>

              {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
                : products.length === 0 ? <p className="text-center text-gray-400 py-12 text-sm">No products found.</p>
                : (
                  <>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeader>Image</TableHeader>
                          <TableHeader>Name</TableHeader>
                          <TableHeader>SKU</TableHeader>
                          <TableHeader>Category</TableHeader>
                          <TableHeader>Price</TableHeader>
                          <TableHeader>Stock</TableHeader>
                          <TableHeader>Status</TableHeader>
                          <TableHeader>Actions</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {products.map(product => {
                          const imgUrl = (product as Product & { image_url?: string }).image_url;
                          const threshold = (product as Product & { low_stock_threshold?: number }).low_stock_threshold ?? 0;
                          const isLow = product.stock_quantity > 0 && product.stock_quantity <= threshold;
                          return (
                            <TableRow key={product.id}>
                              <TableCell>
                                {imgUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={imgUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <ImagePlus className="w-4 h-4 text-gray-300" />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell className="text-gray-400">{product.sku ?? '—'}</TableCell>
                              <TableCell>{product.category?.name ?? '—'}</TableCell>
                              <TableCell>{formatCurrency(product.selling_price)}</TableCell>
                              <TableCell>
                                <span className={product.stock_quantity <= 0 ? 'text-red-600 font-bold' : isLow ? 'text-amber-600 font-semibold' : ''}>
                                  {product.stock_quantity}
                                  {isLow && <span className="ml-1 text-xs text-amber-500">(Low)</span>}
                                  {product.stock_quantity <= 0 && <span className="ml-1 text-xs text-red-500">(Out)</span>}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant={product.is_active ? 'green' : 'gray'}>
                                  {product.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => openEdit(product)} className="text-gray-400 hover:text-blue-600 transition" title="Edit">
                                    <Pencil size={15} />
                                  </button>
                                  <button onClick={() => { if (confirm('Delete this product?')) deleteMutation.mutate(product.id); }}
                                    className="text-gray-400 hover:text-red-500 transition" title="Delete">
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    {(data?.last_page ?? 1) > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500">Page {data?.current_page} of {data?.last_page}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                          <Button variant="outline" size="sm" disabled={page === (data?.last_page ?? 1)} onClick={() => setPage(p => p + 1)}>Next</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Add / Edit Modal */}
      <Modal open={modalOpen} onClose={closeModal} title={editingProduct ? 'Edit Product' : 'Add Product'} className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image upload */}
          <ImageUploadZone
            imageUrl={imagePreview}
            onFile={handleImageFile}
            onClear={() => { setImageFile(null); setImagePreview(null); }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input label="Product Name *" placeholder="e.g. Basmati Rice"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} error={formErrors.name} />
            </div>

            <Input label="SKU / Barcode" placeholder="e.g. SKU001"
              value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />

            {/* Category */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Category</label>
              <select {...sel('category_id')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]">
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Unit */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Unit</label>
              <select {...sel('unit_id')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]">
                <option value="">Select unit</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.short_name})</option>)}
              </select>
            </div>

            {/* Supplier */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Supplier</label>
              <select {...sel('supplier_id')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]">
                <option value="">Select supplier (optional)</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* GST from tax_rates */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">GST Rate</label>
              <select {...sel('gst_rate')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]">
                <option value="0">0% (Exempt)</option>
                {taxRates.filter(t => t.is_active).map(t => (
                  <option key={t.id} value={t.rate}>{t.name} ({t.rate}%)</option>
                ))}
                {taxRates.length === 0 && [5, 12, 18, 28].map(r => (
                  <option key={r} value={r}>GST {r}%</option>
                ))}
              </select>
            </div>

            {/* Tax Type */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Tax Type</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, tax_type: 'exclusive' }))}
                  className={`flex-1 px-3 py-2 transition-colors ${form.tax_type === 'exclusive' ? 'bg-[#0066CC] text-white font-medium' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  Exclusive
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, tax_type: 'inclusive' }))}
                  className={`flex-1 px-3 py-2 border-l border-gray-300 transition-colors ${form.tax_type === 'inclusive' ? 'bg-[#0066CC] text-white font-medium' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  Inclusive
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {form.tax_type === 'exclusive'
                  ? 'Tax added on top of selling price (e.g. ₹100 + 18% GST = ₹118)'
                  : 'Tax already included in selling price (e.g. ₹118 MRP includes 18% GST)'}
              </p>
            </div>

            <Input label="Selling Price *" type="number" step="0.01" min="0" placeholder="0.00"
              value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))}
              error={formErrors.selling_price} />

            <Input label="Cost / Purchase Price" type="number" step="0.01" min="0" placeholder="0.00"
              value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} />

            {!editingProduct ? (
              <Input label="Opening Stock Qty" type="number" min="0" placeholder="0"
                value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} />
            ) : (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Current Stock</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
                  {editingProduct.stock_quantity} units — use Inventory to update
                </div>
              </div>
            )}

            <Input label="Low Stock Alert (qty)" type="number" min="0" placeholder="5"
              value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))} />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                value={form.is_active ? 'active' : 'inactive'}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'active' }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description..." rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC] resize-none" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saveMutation.isPending}>
              {editingProduct ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
