'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CalendarPlus, XCircle } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';

interface Subscription {
  id: number;
  business_id: number;
  business_name: string;
  plan_name: string;
  plan_price: number;
  billing_cycle: string;
  start_date: string;
  end_date: string;
  status: string;
  payment_mode: string | null;
  reference_number: string | null;
}

interface Plan { id: number; name: string; price: number; billing_cycle: string; }
interface Business { id: number; name: string; }

function safeDate(d: string, fmt = 'dd MMM yyyy') {
  try { return format(parseISO(d), fmt); } catch { return d; }
}

function statusVariant(s: string): 'green' | 'yellow' | 'red' | 'gray' {
  if (s === 'active') return 'green';
  if (s === 'pending') return 'yellow';
  if (s === 'expired') return 'red';
  return 'gray';
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

interface NewSubForm {
  business_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  payment_mode: string;
  reference_number: string;
}

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [newSubOpen, setNewSubOpen] = useState(false);
  const [extendId, setExtendId] = useState<number | null>(null);
  const [extendDays, setExtendDays] = useState('30');
  const [newForm, setNewForm] = useState<NewSubForm>({
    business_id: '', plan_id: '', start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    payment_mode: 'cash', reference_number: '',
  });

  const { data, isLoading } = useQuery<{ data: Subscription[]; total: number; last_page: number; current_page: number }>({
    queryKey: ['admin-subscriptions', page],
    queryFn: async () => {
      const res = await api.get('/admin/subscriptions', { params: { page } });
      return res.data;
    },
  });

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['admin-plans-list'],
    queryFn: async () => {
      const res = await api.get('/admin/plans');
      return res.data ?? [];
    },
  });

  const { data: businesses = [] } = useQuery<Business[]>({
    queryKey: ['admin-businesses-list'],
    queryFn: async () => {
      const res = await api.get('/admin/businesses', { params: { per_page: 200 } });
      return (res.data as { data: Business[] }).data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/admin/subscriptions', {
      business_id: parseInt(newForm.business_id),
      plan_id: parseInt(newForm.plan_id),
      start_date: newForm.start_date,
      end_date: newForm.end_date,
      payment_mode: newForm.payment_mode || null,
      reference_number: newForm.reference_number || null,
    }),
    onSuccess: () => {
      toast.success('Subscription created');
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setNewSubOpen(false);
    },
    onError: () => toast.error('Failed to create subscription'),
  });

  const extendMutation = useMutation({
    mutationFn: (id: number) => api.post(`/admin/subscriptions/${id}/extend`, { days: parseInt(extendDays) }),
    onSuccess: () => {
      toast.success(`Extended by ${extendDays} days`);
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setExtendId(null);
    },
    onError: () => toast.error('Failed to extend'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/subscriptions/${id}`),
    onSuccess: () => {
      toast.success('Subscription cancelled');
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
    onError: () => toast.error('Failed to cancel'),
  });

  const subscriptions = (data?.data ?? []) as Subscription[];

  // Auto-fill end_date when plan changes
  const handlePlanChange = (planId: string) => {
    const plan = plans.find(p => String(p.id) === planId);
    if (plan) {
      const days = plan.billing_cycle === 'yearly' ? 365 : plan.billing_cycle === 'quarterly' ? 90 : 30;
      const start = newForm.start_date ? new Date(newForm.start_date) : new Date();
      setNewForm(f => ({ ...f, plan_id: planId, end_date: format(addDays(start, days), 'yyyy-MM-dd') }));
    } else {
      setNewForm(f => ({ ...f, plan_id: planId }));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Subscriptions</h2>
          <p className="text-gray-500 text-sm mt-0.5">{data?.total ?? 0} total subscriptions</p>
        </div>
        <Button variant="primary" className="bg-purple-700 hover:bg-purple-800" onClick={() => setNewSubOpen(true)}>
          <Plus size={16} /> New Subscription
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : subscriptions.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No subscriptions yet.</p>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Business</TableHeader>
                    <TableHeader>Plan</TableHeader>
                    <TableHeader>Start</TableHeader>
                    <TableHeader>End</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Payment</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subscriptions.map((sub) => {
                    const daysLeft = Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / 86400000);
                    return (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium text-gray-900">{sub.business_name}</TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-800">{sub.plan_name}</p>
                          <p className="text-xs text-gray-400">{formatCurrency(sub.plan_price)}/{sub.billing_cycle === 'monthly' ? 'mo' : sub.billing_cycle === 'yearly' ? 'yr' : 'qtr'}</p>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">{safeDate(sub.start_date)}</TableCell>
                        <TableCell>
                          <p className="text-xs text-gray-600">{safeDate(sub.end_date)}</p>
                          {daysLeft > 0 && daysLeft <= 14 && (
                            <p className="text-xs text-amber-500">{daysLeft}d left</p>
                          )}
                          {daysLeft <= 0 && <p className="text-xs text-red-500">Expired</p>}
                        </TableCell>
                        <TableCell><Badge variant={statusVariant(sub.status)}>{sub.status}</Badge></TableCell>
                        <TableCell className="text-xs text-gray-500 capitalize">{sub.payment_mode ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <button
                              title="Extend"
                              onClick={() => { setExtendId(sub.id); setExtendDays('30'); }}
                              className="p-1.5 text-gray-400 hover:text-purple-600 transition-colors"
                            >
                              <CalendarPlus size={15} />
                            </button>
                            {sub.status !== 'cancelled' && (
                              <button
                                title="Cancel"
                                onClick={() => { if (confirm('Cancel this subscription?')) cancelMutation.mutate(sub.id); }}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <XCircle size={15} />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {(data?.last_page ?? 1) > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-gray-100">
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

      {/* New Subscription Modal */}
      <Modal open={newSubOpen} onClose={() => setNewSubOpen(false)} title="New Subscription" className="max-w-md">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Business *</label>
            <select value={newForm.business_id} onChange={(e) => setNewForm(f => ({ ...f, business_id: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500" required>
              <option value="">Select business</option>
              {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Plan *</label>
            <select value={newForm.plan_id} onChange={(e) => handlePlanChange(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500" required>
              <option value="">Select plan</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}/{p.billing_cycle === 'monthly' ? 'mo' : p.billing_cycle === 'yearly' ? 'yr' : 'qtr'}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date *" type="date" value={newForm.start_date}
              onChange={(e) => setNewForm(f => ({ ...f, start_date: e.target.value }))} />
            <Input label="End Date *" type="date" value={newForm.end_date}
              onChange={(e) => setNewForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Payment Mode</label>
            <select value={newForm.payment_mode} onChange={(e) => setNewForm(f => ({ ...f, payment_mode: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="complimentary">Complimentary</option>
            </select>
          </div>

          <Input label="Reference / Transaction ID" placeholder="Optional" value={newForm.reference_number}
            onChange={(e) => setNewForm(f => ({ ...f, reference_number: e.target.value }))} />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setNewSubOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1 bg-purple-700 hover:bg-purple-800" loading={createMutation.isPending}>
              Create Subscription
            </Button>
          </div>
        </form>
      </Modal>

      {/* Extend Modal */}
      <Modal open={extendId !== null} onClose={() => setExtendId(null)} title="Extend Subscription" className="max-w-xs">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">How many days to add to the current expiry?</p>
          <div className="flex gap-2">
            {[30, 60, 90, 365].map(d => (
              <button key={d} onClick={() => setExtendDays(String(d))}
                className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${extendDays === String(d) ? 'bg-purple-700 text-white border-purple-700' : 'border-gray-300 text-gray-600 hover:border-purple-400'}`}>
                {d === 365 ? '1yr' : `${d}d`}
              </button>
            ))}
          </div>
          <Input label="Custom days" type="number" min="1" value={extendDays}
            onChange={(e) => setExtendDays(e.target.value)} />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setExtendId(null)}>Cancel</Button>
            <Button variant="primary" className="flex-1 bg-purple-700 hover:bg-purple-800"
              loading={extendMutation.isPending}
              onClick={() => extendId && extendMutation.mutate(extendId)}>
              Extend
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
