'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Phone, Mail, MapPin, ChevronDown, ChevronRight, CreditCard } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Customer, PaginatedResponse } from '@/lib/types';
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

interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  opening_balance: string;
}

const emptyForm: CustomerFormData = {
  name: '',
  phone: '',
  email: '',
  address: '',
  gstin: '',
  opening_balance: '0',
};

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Customer add/edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<CustomerFormData>>({});

  // Expanded row for detail panel
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Payment modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Queries
  const { data, isLoading } = useQuery<PaginatedResponse<Customer>>({
    queryKey: ['customers', { page, search }],
    queryFn: async () => {
      const res = await api.get('/customers', { params: { page, search } });
      return res.data;
    },
  });

  // Ledger for expanded customer
  const { data: ledger = [], isLoading: ledgerLoading } = useQuery<LedgerEntry[]>({
    queryKey: ['customer-ledger', expandedId],
    queryFn: async () => {
      const res = await api.get(`/customers/${expandedId}/ledger`);
      return res.data.data ?? res.data;
    },
    enabled: expandedId !== null,
  });

  // Save customer mutation
  const saveMutation = useMutation({
    mutationFn: async (formData: CustomerFormData) => {
      const payload = {
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        gstin: formData.gstin || null,
        opening_balance: parseFloat(formData.opening_balance) || 0,
      };
      if (editingCustomer) {
        return api.put(`/customers/${editingCustomer.id}`, payload);
      }
      return api.post('/customers', payload);
    },
    onSuccess: () => {
      toast.success(editingCustomer ? 'Customer updated' : 'Customer added');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      closeModal();
    },
    onError: () => {
      toast.error('Failed to save customer');
    },
  });

  // Due payment mutation
  const paymentMutation = useMutation({
    mutationFn: async ({ customerId, amount }: { customerId: number; amount: number }) => {
      return api.post(`/customers/${customerId}/due-payment`, { amount });
    },
    onSuccess: () => {
      toast.success('Payment recorded');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-ledger', paymentCustomer?.id] });
      setPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentCustomer(null);
    },
    onError: () => {
      toast.error('Failed to record payment');
    },
  });

  const openAdd = () => {
    setEditingCustomer(null);
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
      gstin: customer.gstin ?? '',
      opening_balance: String(customer.opening_balance),
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCustomer(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const validate = (): boolean => {
    const errors: Partial<CustomerFormData> = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    saveMutation.mutate(form);
  };

  const openPaymentModal = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setPaymentCustomer(customer);
    setPaymentAmount('');
    setPaymentModalOpen(true);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer || !paymentAmount || isNaN(parseFloat(paymentAmount))) {
      toast.error('Enter a valid amount');
      return;
    }
    paymentMutation.mutate({ customerId: paymentCustomer.id, amount: parseFloat(paymentAmount) });
  };

  const customers = data?.data ?? [];

  const safeFormatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Customers</h2>
          <p className="text-gray-500 text-sm mt-0.5">{data?.total ?? 0} total customers</p>
        </div>
        <Button variant="primary" size="md" onClick={openAdd}>
          <Plus size={16} /> Add Customer
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4 pb-2">
          <div className="relative max-w-sm mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : customers.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No customers found.</p>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader className="w-8"></TableHeader>
                    <TableHeader>Name</TableHeader>
                    <TableHeader>Phone</TableHeader>
                    <TableHeader>Email</TableHeader>
                    <TableHeader>Balance</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customers.map((customer) => (
                    <>
                      <TableRow
                        key={customer.id}
                        className="cursor-pointer"
                        onClick={() => setExpandedId(expandedId === customer.id ? null : customer.id)}
                      >
                        <TableCell>
                          {expandedId === customer.id ? (
                            <ChevronDown size={15} className="text-[#0066CC]" />
                          ) : (
                            <ChevronRight size={15} className="text-gray-400" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>
                          {customer.phone ? (
                            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                              <Phone size={11} /> {customer.phone}
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {customer.email ? (
                            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                              <Mail size={11} /> {customer.email}
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={customer.current_balance > 0 ? 'red' : customer.current_balance < 0 ? 'green' : 'gray'}>
                            {formatCurrency(Math.abs(customer.current_balance))}
                            {customer.current_balance > 0 && ' due'}
                            {customer.current_balance < 0 && ' credit'}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEdit(customer); }}
                              className="text-xs text-gray-400 hover:text-[#0066CC] transition-colors px-2 py-1 border border-gray-200 rounded-lg hover:border-[#0066CC]/30"
                            >
                              Edit
                            </button>
                            {customer.current_balance > 0 && (
                              <button
                                onClick={(e) => openPaymentModal(customer, e)}
                                className="text-xs text-green-600 hover:text-green-800 transition-colors px-2 py-1 border border-green-200 rounded-lg hover:border-green-400 flex items-center gap-1"
                              >
                                <CreditCard size={11} /> Pay
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded detail row */}
                      {expandedId === customer.id && (
                        <tr key={`detail-${customer.id}`} className="bg-blue-50/30">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="space-y-4">
                              {/* Customer info */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                                  <p className="text-sm font-medium text-gray-800">{customer.phone ?? '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 mb-0.5">Email</p>
                                  <p className="text-sm font-medium text-gray-800">{customer.email ?? '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 mb-0.5">GSTIN</p>
                                  <p className="text-sm font-medium text-gray-800">{customer.gstin ?? '—'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 mb-0.5">Address</p>
                                  <p className="text-sm font-medium text-gray-800 flex items-start gap-1">
                                    {customer.address ? <><MapPin size={12} className="mt-0.5 flex-shrink-0" />{customer.address}</> : '—'}
                                  </p>
                                </div>
                              </div>

                              {/* Record payment button */}
                              {customer.current_balance > 0 && (
                                <div>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={(e) => openPaymentModal(customer, e)}
                                  >
                                    <CreditCard size={14} /> Record Payment ({formatCurrency(customer.current_balance)} due)
                                  </Button>
                                </div>
                              )}

                              {/* Ledger */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-800 mb-2">Recent Ledger</h4>
                                {ledgerLoading ? (
                                  <div className="flex justify-center py-4"><Spinner size="sm" /></div>
                                ) : ledger.length === 0 ? (
                                  <p className="text-sm text-gray-400 py-2">No ledger entries found.</p>
                                ) : (
                                  <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                        <tr>
                                          <th className="px-3 py-2 text-left font-medium">Date</th>
                                          <th className="px-3 py-2 text-left font-medium">Description</th>
                                          <th className="px-3 py-2 text-right font-medium">Debit</th>
                                          <th className="px-3 py-2 text-right font-medium">Credit</th>
                                          <th className="px-3 py-2 text-right font-medium">Balance</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {ledger.slice(0, 10).map((entry) => (
                                          <tr key={entry.id} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 text-gray-500">{safeFormatDate(entry.date)}</td>
                                            <td className="px-3 py-2 text-gray-700">{entry.description}</td>
                                            <td className="px-3 py-2 text-right text-red-600">
                                              {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                                            </td>
                                            <td className="px-3 py-2 text-right text-green-600">
                                              {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                                            </td>
                                            <td className={`px-3 py-2 text-right font-medium ${entry.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                              {formatCurrency(Math.abs(entry.balance))}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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

      {/* Add / Edit Customer Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Full Name *" placeholder="e.g. Rahul Sharma" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} error={formErrors.name} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Phone" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <Input label="Email" type="email" placeholder="rahul@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Street, City, State..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC] resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="GSTIN" placeholder="22AAAAA0000A1Z5" value={form.gstin} onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))} />
            <Input label="Opening Balance (₹)" type="number" step="0.01" placeholder="0.00" value={form.opening_balance} onChange={(e) => setForm((f) => ({ ...f, opening_balance: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saveMutation.isPending}>
              {editingCustomer ? 'Update Customer' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        open={paymentModalOpen}
        onClose={() => { setPaymentModalOpen(false); setPaymentAmount(''); setPaymentCustomer(null); }}
        title="Record Payment"
      >
        {paymentCustomer && (
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-800">{paymentCustomer.name}</p>
              <p className="text-sm text-gray-500">Outstanding: <span className="text-red-600 font-semibold">{formatCurrency(paymentCustomer.current_balance)}</span></p>
            </div>
            <Input
              label="Amount Received (₹)"
              type="number"
              step="0.01"
              min="0.01"
              max={paymentCustomer.current_balance}
              placeholder="Enter amount"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPaymentAmount(String(paymentCustomer.current_balance))}
              >
                Full Amount
              </Button>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setPaymentModalOpen(false); setPaymentAmount(''); }}>Cancel</Button>
              <Button type="submit" variant="primary" loading={paymentMutation.isPending}>Record Payment</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
