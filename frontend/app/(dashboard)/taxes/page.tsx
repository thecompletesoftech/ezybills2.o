'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';

interface TaxRate {
  id: number;
  name: string;
  rate: number;
  type: string;
  is_active: boolean;
}

interface TaxForm {
  name: string;
  rate: string;
  type: string;
  is_active: boolean;
}

const TAX_TYPES = ['GST', 'IGST', 'CGST+SGST', 'CESS', 'Other'];

const emptyForm: TaxForm = { name: '', rate: '', type: 'GST', is_active: true };

export default function TaxesPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [form, setForm] = useState<TaxForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<TaxForm>>({});

  const { data: taxes = [], isLoading } = useQuery<TaxRate[]>({
    queryKey: ['tax-rates'],
    queryFn: () => api.get('/tax-rates').then(r => r.data.data ?? r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (f: TaxForm) => {
      const payload = { name: f.name, rate: parseFloat(f.rate), type: f.type, is_active: f.is_active };
      return editing
        ? api.put(`/tax-rates/${editing.id}`, payload)
        : api.post('/tax-rates', payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Tax rate updated' : 'Tax rate added');
      qc.invalidateQueries({ queryKey: ['tax-rates'] });
      closeModal();
    },
    onError: () => toast.error('Failed to save tax rate'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/tax-rates/${id}`),
    onSuccess: () => {
      toast.success('Tax rate deleted');
      qc.invalidateQueries({ queryKey: ['tax-rates'] });
    },
    onError: () => toast.error('Failed to delete tax rate'),
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setErrors({}); setModalOpen(true); };
  const openEdit = (t: TaxRate) => {
    setEditing(t);
    setForm({ name: t.name, rate: String(t.rate), type: t.type, is_active: t.is_active });
    setErrors({});
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditing(null); setForm(emptyForm); setErrors({}); };

  const validate = () => {
    const e: Partial<TaxForm> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.rate || isNaN(parseFloat(form.rate)) || parseFloat(form.rate) < 0) e.rate = 'Valid rate required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => { ev.preventDefault(); if (validate()) saveMutation.mutate(form); };

  const f = (key: keyof TaxForm) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value })),
    error: errors[key] as string | undefined,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax Rates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage GST / IGST / CESS rates used on products</p>
        </div>
        <Button variant="primary" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Tax Rate
        </Button>
      </div>

      {/* Preset suggestion chips */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-gray-400 self-center">Quick presets:</span>
        {[0, 5, 12, 18, 28].map(r => (
          <button
            key={r}
            onClick={() => {
              setEditing(null);
              setForm({ name: `GST ${r}%`, rate: String(r), type: 'GST', is_active: true });
              setErrors({});
              setModalOpen(true);
            }}
            className="text-xs px-2.5 py-1 rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50 transition"
          >
            GST {r}%
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : taxes.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="font-medium">No tax rates yet</p>
              <p className="text-sm mt-1">Add GST rates that will be selectable on products</p>
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader className="text-right">Rate</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader className="text-right">Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {taxes.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <Badge variant="blue">{t.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-gray-800">{t.rate}%</TableCell>
                    <TableCell>
                      <Badge variant={t.is_active ? 'green' : 'gray'}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(t)} className="text-gray-400 hover:text-blue-600 transition">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteMutation.mutate(t.id); }}
                          className="text-gray-400 hover:text-red-500 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Tax Rate' : 'Add Tax Rate'} className="max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name *" placeholder="e.g. GST 18%" {...f('name')} />
          <Input label="Rate (%) *" type="number" step="0.01" min="0" max="100" placeholder="18" {...f('rate')} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Type</label>
            <select
              value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
            >
              {TAX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
            <span className="text-sm text-gray-700">Active (available on products)</span>
          </label>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saveMutation.isPending}>
              {editing ? 'Update' : 'Add Tax Rate'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
