'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Phone, Mail, MapPin, ChevronDown, ChevronRight, Wallet } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Supplier, PaginatedResponse } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

interface LedgerEntry {
  id: number;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface SupplierFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  gst_number: string;
  opening_balance: string;
}

const emptyForm: SupplierFormData = {
  name: '', phone: '', email: '', address: '', gst_number: '', opening_balance: '0',
};

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<SupplierFormData>>({});

  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentSupplier, setPaymentSupplier] = useState<Supplier | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse<Supplier>>({
    queryKey: ['suppliers', { page, search }],
    queryFn: () => api.get('/suppliers', { params: { page, search } }).then(r => r.data),
  });

  const { data: ledger = [], isLoading: ledgerLoading } = useQuery<LedgerEntry[]>({
    queryKey: ['supplier-ledger', expandedId],
    queryFn: () => api.get(`/suppliers/${expandedId}/ledger`).then(r => r.data.data ?? r.data),
    enabled: expandedId !== null,
  });

  const saveMutation = useMutation({
    mutationFn: (formData: SupplierFormData) => {
      const payload = {
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        gst_number: formData.gst_number || null,
        opening_balance: parseFloat(formData.opening_balance) || 0,
      };
      return editingSupplier
        ? api.put(`/suppliers/${editingSupplier.id}`, payload)
        : api.post('/suppliers', payload);
    },
    onSuccess: () => {
      toast.success(editingSupplier ? 'Supplier updated' : 'Supplier added');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      closeModal();
    },
    onError: () => toast.error('Failed to save supplier'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/suppliers/${id}`),
    onSuccess: () => {
      toast.success('Supplier deleted');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: () => toast.error('Failed to delete supplier'),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ supplierId, amount }: { supplierId: number; amount: number }) =>
      api.post(`/suppliers/${supplierId}/ledger`, { amount, type: 'payment', description: 'Payment made' }),
    onSuccess: () => {
      toast.success('Payment recorded');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger', paymentSupplier?.id] });
      setPaymentOpen(false);
      setPaymentAmount('');
      setPaymentSupplier(null);
    },
    onError: () => toast.error('Failed to record payment'),
  });

  const openAdd = () => { setEditingSupplier(null); setForm(emptyForm); setFormErrors({}); setModalOpen(true); };
  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setForm({ name: s.name, phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '', gst_number: s.gst_number ?? '', opening_balance: String(s.opening_balance) });
    setFormErrors({});
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditingSupplier(null); setForm(emptyForm); setFormErrors({}); };

  const validate = () => {
    const errors: Partial<SupplierFormData> = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (validate()) saveMutation.mutate(form); };

  const openPayment = (s: Supplier, e: React.MouseEvent) => {
    e.stopPropagation(); setPaymentSupplier(s); setPaymentAmount(''); setPaymentOpen(true);
  };

  const safeDate = (d: string) => { try { return format(parseISO(d), 'dd MMM yyyy'); } catch { return d; } };

  const suppliers = data?.data ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} total suppliers</p>
        </div>
        <Button variant="primary" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Supplier
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <Input placeholder="Search by name or phone…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="pl-9" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No suppliers found</p>
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Supplier</TableHeader>
                  <TableHeader>Contact</TableHeader>
                  <TableHeader>GST No.</TableHeader>
                  <TableHeader className="text-right">Total Purchases</TableHeader>
                  <TableHeader className="text-right">Balance Due</TableHeader>
                  <TableHeader className="text-right">Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {suppliers.map((s) => (
                  <>
                    <TableRow
                      key={s.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-blue-600">{s.name[0].toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{s.name}</p>
                            {s.address && <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{s.address}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {s.phone && <p className="text-sm flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" />{s.phone}</p>}
                          {s.email && <p className="text-sm flex items-center gap-1.5 text-gray-500"><Mail className="w-3.5 h-3.5 text-gray-400" />{s.email}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {s.gst_number ? <Badge variant="blue">{s.gst_number}</Badge> : <span className="text-gray-300 text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(s.total_purchases ?? 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(s.due_amount ?? 0) > 0 ? (
                          <span className="font-semibold text-red-600">{formatCurrency(s.due_amount)}</span>
                        ) : (
                          <Badge variant="green">Cleared</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          {(s.due_amount ?? 0) > 0 && (
                            <Button size="sm" variant="outline" onClick={e => openPayment(s, e)}>
                              <Wallet className="w-3.5 h-3.5 mr-1" /> Pay
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => openEdit(s)}>Edit</Button>
                          <Button size="sm" variant="outline"
                            onClick={() => { if (confirm(`Delete ${s.name}?`)) deleteMutation.mutate(s.id); }}>
                            Delete
                          </Button>
                          {expandedId === s.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded ledger */}
                    {expandedId === s.id && (
                      <TableRow key={`${s.id}-ledger`}>
                        <TableCell colSpan={6} className="bg-gray-50 p-0">
                          <div className="p-4">
                            <p className="text-sm font-semibold text-gray-700 mb-3">Transaction Ledger — {s.name}</p>
                            {ledgerLoading ? <Spinner /> : ledger.length === 0 ? (
                              <p className="text-sm text-gray-400 text-center py-4">No transactions yet</p>
                            ) : (
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-gray-500 border-b">
                                    <th className="text-left py-2 font-medium">Date</th>
                                    <th className="text-left py-2 font-medium">Description</th>
                                    <th className="text-right py-2 font-medium">Debit</th>
                                    <th className="text-right py-2 font-medium">Credit</th>
                                    <th className="text-right py-2 font-medium">Balance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ledger.map((entry) => (
                                    <tr key={entry.id} className="border-b border-gray-100">
                                      <td className="py-2 text-gray-500">{safeDate(entry.date)}</td>
                                      <td className="py-2">{entry.description}</td>
                                      <td className="py-2 text-right text-red-500">{entry.debit > 0 ? formatCurrency(entry.debit) : '—'}</td>
                                      <td className="py-2 text-right text-green-600">{entry.credit > 0 ? formatCurrency(entry.credit) : '—'}</td>
                                      <td className="py-2 text-right font-medium">{formatCurrency(entry.balance)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.last_page > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="flex items-center text-sm text-gray-500 px-2">Page {page} of {data.last_page}</span>
          <Button variant="outline" size="sm" disabled={page === data.last_page} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={closeModal} title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Supplier Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} error={formErrors.name} placeholder="e.g. ABC Distributors" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="supplier@email.com" />
          </div>
          <Input label="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="City, State" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="GST Number" value={form.gst_number} onChange={e => setForm(f => ({ ...f, gst_number: e.target.value }))} placeholder="22ABCDE1234F1Z5" />
            <Input label="Opening Balance (₹)" type="number" value={form.opening_balance} onChange={e => setForm(f => ({ ...f, opening_balance: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saveMutation.isPending}>
              {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title={`Record Payment — ${paymentSupplier?.name ?? ''}`} className="max-w-sm">
        <form onSubmit={e => {
          e.preventDefault();
          if (!paymentSupplier || !paymentAmount || isNaN(parseFloat(paymentAmount))) { toast.error('Enter a valid amount'); return; }
          paymentMutation.mutate({ supplierId: paymentSupplier.id, amount: parseFloat(paymentAmount) });
        }} className="space-y-4">
          <div className="bg-red-50 rounded-lg p-3 text-sm">
            <span className="text-gray-500">Balance Due: </span>
            <span className="font-bold text-red-600">{formatCurrency(paymentSupplier?.due_amount ?? 0)}</span>
          </div>
          <Input label="Payment Amount (₹)" type="number" value={paymentAmount}
            onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" autoFocus />
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={paymentMutation.isPending}>Record Payment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
