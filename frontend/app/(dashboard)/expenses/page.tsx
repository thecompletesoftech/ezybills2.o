'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Receipt } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Expense, PaginatedResponse } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

function safeFormatDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

interface ExpenseCategory {
  id: number;
  name: string;
}

interface ExpenseFormData {
  title: string;
  category: string;
  amount: string;
  expense_date: string;
  note: string;
}

const emptyForm: ExpenseFormData = {
  title: '',
  category: '',
  amount: '',
  expense_date: new Date().toISOString().split('T')[0],
  note: '',
};

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ExpenseFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<ExpenseFormData>>({});

  // Queries
  const { data, isLoading } = useQuery<PaginatedResponse<Expense>>({
    queryKey: ['expenses', { page }],
    queryFn: async () => {
      const res = await api.get('/expenses', { params: { page } });
      return res.data;
    },
  });

  const { data: expenseCategories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const res = await api.get('/expense-categories');
      return res.data.data ?? res.data;
    },
  });

  // Calculate this page total
  const expenses = data?.data ?? [];
  const pageTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (formData: ExpenseFormData) => {
      const payload = {
        title: formData.title,
        category: formData.category,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        note: formData.note || null,
      };
      return api.post('/expenses', payload);
    },
    onSuccess: () => {
      toast.success('Expense added');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      closeModal();
    },
    onError: () => {
      toast.error('Failed to add expense');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/expenses/${id}`);
    },
    onSuccess: () => {
      toast.success('Expense deleted');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: () => {
      toast.error('Failed to delete expense');
    },
  });

  const openModal = () => {
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
    setFormErrors({});
  };

  const validate = (): boolean => {
    const errors: Partial<ExpenseFormData> = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    if (!form.category) errors.category = 'Category is required';
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      errors.amount = 'Valid amount required';
    }
    if (!form.expense_date) errors.expense_date = 'Date is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    saveMutation.mutate(form);
  };

  const handleDelete = (id: number) => {
    if (!confirm('Delete this expense?')) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Expenses</h2>
          <p className="text-gray-500 text-sm mt-0.5">{data?.total ?? 0} total expenses</p>
        </div>
        <Button variant="primary" size="md" onClick={openModal}>
          <Plus size={16} /> Add Expense
        </Button>
      </div>

      {/* Summary card */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">This Page Total</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(pageTotal)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Total Entries</p>
            <p className="text-xl font-bold text-gray-800">{data?.total ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Categories</p>
            <p className="text-xl font-bold text-gray-800">
              {new Set(expenses.map((e) => e.category)).size}
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="pt-4 pb-2">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Receipt size={40} className="mb-3 opacity-40" />
              <p className="text-sm">No expenses recorded yet</p>
              <Button variant="primary" size="sm" className="mt-3" onClick={openModal}>
                <Plus size={14} /> Add First Expense
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Title</TableHeader>
                    <TableHeader>Category</TableHeader>
                    <TableHeader>Amount</TableHeader>
                    <TableHeader>Note</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="text-gray-500 text-xs whitespace-nowrap">
                        {safeFormatDate(expense.expense_date)}
                      </TableCell>
                      <TableCell className="font-medium">{expense.title}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100">
                          {expense.category}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-red-600">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="text-gray-400 text-xs max-w-[200px] truncate">
                        {expense.note ?? '—'}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
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

      {/* Add Expense Modal */}
      <Modal open={modalOpen} onClose={closeModal} title="Add Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title *"
            placeholder="e.g. Office Supplies"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            error={formErrors.title}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Category *</label>
            {expenseCategories.length > 0 ? (
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC] ${
                  formErrors.category ? 'border-red-400' : 'border-gray-300'
                }`}
              >
                <option value="">Select category</option>
                {expenseCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="e.g. Utilities, Rent, Salaries"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC] ${
                  formErrors.category ? 'border-red-400' : 'border-gray-300'
                }`}
              />
            )}
            {formErrors.category && <p className="text-xs text-red-500">{formErrors.category}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Amount (₹) *"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              error={formErrors.amount}
            />
            <Input
              label="Date *"
              type="date"
              value={form.expense_date}
              onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
              error={formErrors.expense_date}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Note (optional)</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Additional details..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC] resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saveMutation.isPending}>Add Expense</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
