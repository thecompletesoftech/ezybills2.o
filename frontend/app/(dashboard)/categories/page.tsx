'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ImagePlus, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Category, PaginatedResponse } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';

// ─── Image upload zone ────────────────────────────────────────────────────────
function CategoryImageZone({
  imageUrl,
  onFile,
  onClear,
}: {
  imageUrl: string | null;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    onFile(file);
  };

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer flex items-center justify-center overflow-hidden
        ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
      style={{ height: 140 }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) accept(f); }}
      onClick={() => !imageUrl && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) accept(f); }} />
      {imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="category" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onClear(); }}
            className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <ImagePlus className="w-8 h-8" />
          <p className="text-xs font-medium">Click or drag image here</p>
          <p className="text-xs">PNG / JPG · max 5 MB</p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
interface CategoryForm {
  name: string;
  description: string;
  is_active: boolean;
}

const emptyForm: CategoryForm = { name: '', description: '', is_active: true };

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data, isLoading } = useQuery<PaginatedResponse<Category>>({
    queryKey: ['categories-manage', { page, search }],
    queryFn: () =>
      api.get('/categories', { params: { page, search, per_page: 20 } }).then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: async (f: CategoryForm) => {
      const fd = new FormData();
      fd.append('name', f.name.trim());
      if (f.description) fd.append('description', f.description.trim());
      fd.append('is_active', f.is_active ? '1' : '0');
      if (imageFile) fd.append('image', imageFile);

      return editing
        ? api.post(`/categories/${editing.id}?_method=PUT`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        : api.post('/categories', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      toast.success(editing ? 'Category updated' : 'Category created');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-manage'] });
      closeModal();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? 'Failed to save category'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      toast.success('Category deleted');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories-manage'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? 'Failed to delete category'),
  });

  const openAdd = () => {
    setEditing(null); setForm(emptyForm);
    setImageFile(null); setImagePreview(null); setModalOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description ?? '', is_active: c.is_active });
    setImageFile(null); setImagePreview(c.image_url ?? null); setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false); setEditing(null); setForm(emptyForm);
    setImageFile(null); setImagePreview(null);
  };

  const handleImageFile = (f: File) => {
    setImageFile(f);
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    saveMutation.mutate(form);
  };

  const categories = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Categories</h2>
          <p className="text-gray-500 text-sm mt-0.5">{data?.total ?? 0} total categories</p>
        </div>
        <Button variant="primary" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Category
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4 pb-2">
          {/* Search */}
          <div className="relative max-w-xs mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Search categories..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : categories.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ImagePlus className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No categories yet</p>
              <p className="text-gray-400 text-sm mt-1">Add your first category to organise products</p>
              <Button variant="primary" className="mt-4" onClick={openAdd}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Category
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className="group relative rounded-xl border border-gray-100 bg-white hover:shadow-md transition-shadow overflow-hidden"
                >
                  {/* Image */}
                  <div className="w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                    {cat.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-gray-300">
                        <ImagePlus className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5">
                    <p className="text-sm font-semibold text-gray-800 truncate">{cat.name}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <Badge variant={cat.is_active ? 'green' : 'gray'} className="text-xs">
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${cat.name}"? This cannot be undone.`))
                              deleteMutation.mutate(cat.id);
                          }}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {(data?.last_page ?? 1) > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">Page {data?.current_page} of {data?.last_page}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page === (data?.last_page ?? 1)} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Modal */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Category' : 'Add Category'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <CategoryImageZone
            imageUrl={imagePreview}
            onFile={handleImageFile}
            onClear={() => { setImageFile(null); setImagePreview(null); }}
          />

          <Input
            label="Category Name *"
            placeholder="e.g. Beverages, Electronics..."
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC] resize-none"
            />
          </div>

          {/* Status toggle */}
          <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Active</span>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-[#0066CC]' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-1 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saveMutation.isPending}>
              {editing ? 'Update' : 'Add Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
