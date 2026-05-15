'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Product, Category, Unit, PaginatedResponse } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

interface ProductFormData {
  name: string;
  sku: string;
  category_id: string;
  unit_id: string;
  selling_price: string;
  purchase_price: string;
  stock_quantity: string;
  description: string;
  is_active: boolean;
}

const emptyForm: ProductFormData = {
  name: '',
  sku: '',
  category_id: '',
  unit_id: '',
  selling_price: '',
  purchase_price: '',
  stock_quantity: '',
  description: '',
  is_active: true,
};

function productToForm(p: Product): ProductFormData {
  return {
    name: p.name,
    sku: p.sku ?? '',
    category_id: p.category_id ? String(p.category_id) : '',
    unit_id: p.unit_id ? String(p.unit_id) : '',
    selling_price: String(p.selling_price),
    purchase_price: String(p.purchase_price),
    stock_quantity: String(p.stock_quantity),
    description: p.description ?? '',
    is_active: p.is_active,
  };
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<ProductFormData>>({});

  // Queries
  const { data, isLoading, refetch } = useQuery<PaginatedResponse<Product>>({
    queryKey: ['products', { page, search }],
    queryFn: async () => {
      const res = await api.get('/products', { params: { page, search } });
      return res.data;
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data.data ?? res.data;
    },
  });

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: async () => {
      const res = await api.get('/units');
      return res.data.data ?? res.data;
    },
  });

  // Save mutation (create or update)
  const saveMutation = useMutation({
    mutationFn: async (formData: ProductFormData) => {
      const payload = {
        name: formData.name,
        sku: formData.sku || undefined,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        unit_id: formData.unit_id ? parseInt(formData.unit_id) : null,
        selling_price: parseFloat(formData.selling_price),
        purchase_price: parseFloat(formData.purchase_price) || 0,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        description: formData.description || null,
        is_active: formData.is_active,
      };
      if (editingProduct) {
        return api.put(`/products/${editingProduct.id}`, payload);
      }
      return api.post('/products', payload);
    },
    onSuccess: () => {
      toast.success(editingProduct ? 'Product updated' : 'Product created');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
    onError: () => {
      toast.error('Failed to save product');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      toast.success('Product deleted');
      refetch();
    },
    onError: () => {
      toast.error('Failed to delete product');
    },
  });

  const openAdd = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm(productToForm(product));
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const handleDelete = (id: number) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    deleteMutation.mutate(id);
  };

  const validate = (): boolean => {
    const errors: Partial<ProductFormData> = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (!form.selling_price || isNaN(parseFloat(form.selling_price))) errors.selling_price = 'Valid price required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    saveMutation.mutate(form);
  };

  const field = (key: keyof ProductFormData) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
    error: formErrors[key] as string | undefined,
  });

  const products = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Products</h2>
          <p className="text-gray-500 text-sm mt-0.5">{data?.total ?? 0} total products</p>
        </div>
        <Button variant="primary" size="md" onClick={openAdd}>
          <Plus size={16} /> Add Product
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4 pb-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : products.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No products found.</p>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
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
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-gray-400">{product.sku ?? '—'}</TableCell>
                      <TableCell>{product.category?.name ?? '—'}</TableCell>
                      <TableCell>{formatCurrency(product.selling_price)}</TableCell>
                      <TableCell>
                        <span className={product.stock_quantity <= product.low_stock_threshold ? 'text-red-500 font-medium' : ''}>
                          {product.stock_quantity}
                          {product.stock_quantity <= product.low_stock_threshold && product.stock_quantity > 0 && (
                            <span className="ml-1 text-xs text-amber-500">(Low)</span>
                          )}
                          {product.stock_quantity === 0 && (
                            <span className="ml-1 text-xs text-red-500">(Out)</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? 'green' : 'gray'}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(product)}
                            className="text-gray-400 hover:text-[#0066CC] transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {(data?.last_page ?? 1) > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">Page {data?.current_page} of {data?.last_page}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page === (data?.last_page ?? 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input label="Product Name *" placeholder="e.g. Basmati Rice" {...field('name')} />
            </div>

            <div>
              <Input label="SKU / Barcode" placeholder="e.g. SKU001" {...field('sku')} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Category</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Unit</label>
              <select
                value={form.unit_id}
                onChange={(e) => setForm((f) => ({ ...f, unit_id: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
              >
                <option value="">Select unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.name} ({unit.short_name})</option>
                ))}
              </select>
            </div>

            <div>
              <Input label="Selling Price *" type="number" step="0.01" min="0" placeholder="0.00" {...field('selling_price')} />
            </div>

            <div>
              <Input label="Cost / Purchase Price" type="number" step="0.01" min="0" placeholder="0.00" {...field('purchase_price')} />
            </div>

            <div>
              <Input label="Stock Quantity" type="number" min="0" placeholder="0" {...field('stock_quantity')} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                value={form.is_active ? 'active' : 'inactive'}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.value === 'active' }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC] resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
