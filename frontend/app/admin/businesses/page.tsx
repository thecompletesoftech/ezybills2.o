'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Eye, Ban, CheckCircle, LogIn, UtensilsCrossed } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';

interface BusinessRow {
  id: number;
  name: string;
  owner_name: string;
  owner_email: string;
  business_type: string;
  is_active: boolean;
  subscription_plan_name: string | null;
  subscription_expires_at: string | null;
  invoice_count: number;
  user_count: number;
  created_at: string;
}

function safeDate(d: string | null, fmt = 'dd MMM yyyy') {
  if (!d) return '—';
  try { return format(parseISO(d), fmt); } catch { return d; }
}

function expiryBadge(expiresAt: string | null, isActive: boolean) {
  if (!isActive) return <Badge variant="red">Suspended</Badge>;
  if (!expiresAt) return <Badge variant="gray">No Plan</Badge>;
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (days < 0) return <Badge variant="red">Expired</Badge>;
  if (days <= 7) return <Badge variant="yellow">Expires in {days}d</Badge>;
  return <Badge variant="green">Active</Badge>;
}

export default function BusinessesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{ data: BusinessRow[]; total: number; last_page: number; current_page: number }>({
    queryKey: ['admin-businesses', page, search],
    queryFn: async () => {
      const res = await api.get('/admin/businesses', { params: { page, search: search || undefined } });
      return res.data;
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (id: number) => api.post(`/admin/businesses/${id}/suspend`),
    onSuccess: () => { toast.success('Business suspended'); queryClient.invalidateQueries({ queryKey: ['admin-businesses'] }); },
    onError: () => toast.error('Failed to suspend'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => api.post(`/admin/businesses/${id}/activate`),
    onSuccess: () => { toast.success('Business activated'); queryClient.invalidateQueries({ queryKey: ['admin-businesses'] }); },
    onError: () => toast.error('Failed to activate'),
  });

  const toggleRestaurantMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      api.post(`/admin/businesses/${id}/toggle-restaurant`, { enabled }),
    onSuccess: (_, { enabled }) => {
      toast.success(`Restaurant / KOT features ${enabled ? 'enabled' : 'disabled'}`);
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
    },
    onError: () => toast.error('Failed to update feature'),
  });

  const loginAsMutation = useMutation({
    mutationFn: (id: number) => api.post(`/admin/businesses/${id}/login-as`),
    onSuccess: (res) => {
      const token = (res.data as { token: string }).token;
      localStorage.setItem('auth_token', token);
      window.location.href = '/dashboard';
    },
    onError: () => toast.error('Failed to impersonate'),
  });

  const businesses = (data?.data ?? []) as BusinessRow[];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Businesses</h2>
        <p className="text-gray-500 text-sm mt-0.5">{data?.total ?? 0} registered businesses</p>
      </div>

      <Card>
        <CardContent className="pt-4 pb-2">
          <div className="relative max-w-sm mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : businesses.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No businesses found.</p>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Business</TableHeader>
                    <TableHeader>Owner</TableHeader>
                    <TableHeader>Plan</TableHeader>
                    <TableHeader>Expiry</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Invoices</TableHeader>
                    <TableHeader>Joined</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {businesses.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <p className="font-medium text-gray-900">{b.name}</p>
                        <p className="text-xs text-gray-400 capitalize">{b.business_type}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-700">{b.owner_name}</p>
                        <p className="text-xs text-gray-400">{b.owner_email}</p>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {b.subscription_plan_name ?? <span className="text-gray-400">No plan</span>}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">{safeDate(b.subscription_expires_at)}</TableCell>
                      <TableCell>{expiryBadge(b.subscription_expires_at, b.is_active)}</TableCell>
                      <TableCell className="text-gray-600">{b.invoice_count}</TableCell>
                      <TableCell className="text-xs text-gray-400">{safeDate(b.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button
                            title="View detail"
                            onClick={() => setDetailId(b.id)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          {b.is_active ? (
                            <button
                              title="Suspend"
                              onClick={() => { if (confirm(`Suspend ${b.name}?`)) suspendMutation.mutate(b.id); }}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Ban size={15} />
                            </button>
                          ) : (
                            <button
                              title="Activate"
                              onClick={() => activateMutation.mutate(b.id)}
                              className="p-1.5 text-gray-400 hover:text-green-500 transition-colors"
                            >
                              <CheckCircle size={15} />
                            </button>
                          )}
                          <button
                            title="Toggle Restaurant / KOT features"
                            onClick={() => toggleRestaurantMutation.mutate({ id: b.id, enabled: !['restaurant','cafe','food_cart','bakery'].includes(b.business_type) })}
                            className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors"
                          >
                            <UtensilsCrossed size={15} />
                          </button>
                          <button
                            title="Login as this business"
                            onClick={() => { if (confirm(`Login as ${b.name}? This will switch your session.`)) loginAsMutation.mutate(b.id); }}
                            className="p-1.5 text-gray-400 hover:text-purple-600 transition-colors"
                          >
                            <LogIn size={15} />
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
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page === (data?.last_page ?? 1)} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Modal open={detailId !== null} onClose={() => setDetailId(null)} title="Business Detail" className="max-w-md">
        {detailId && <BusinessDetail id={detailId} onClose={() => setDetailId(null)} />}
      </Modal>
    </div>
  );
}

function BusinessDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-business-detail', id],
    queryFn: async () => {
      const res = await api.get(`/admin/businesses/${id}`);
      return res.data as BusinessRow & { gst_number?: string; address?: string; mobile_number?: string; settings?: { enable_restaurant_features?: boolean } };
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => api.post(`/admin/businesses/${id}/toggle-restaurant`, { enabled }),
    onSuccess: (_, enabled) => {
      toast.success(`Restaurant features ${enabled ? 'enabled' : 'disabled'}`);
      qc.invalidateQueries({ queryKey: ['admin-business-detail', id] });
      qc.invalidateQueries({ queryKey: ['admin-businesses'] });
    },
    onError: () => toast.error('Failed'),
  });

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;
  if (!data) return <p className="text-center text-gray-400 py-8 text-sm">Failed to load.</p>;

  const kotEnabled = data.settings?.enable_restaurant_features
    ?? ['restaurant', 'cafe', 'food_cart', 'bakery'].includes(data.business_type);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-xs text-gray-400">Business Name</p><p className="font-medium">{data.name}</p></div>
        <div><p className="text-xs text-gray-400">Type</p><p className="capitalize">{data.business_type}</p></div>
        <div><p className="text-xs text-gray-400">Owner</p><p>{data.owner_name}</p></div>
        <div><p className="text-xs text-gray-400">Email</p><p className="truncate">{data.owner_email}</p></div>
        <div><p className="text-xs text-gray-400">Plan</p><p>{data.subscription_plan_name ?? 'No plan'}</p></div>
        <div><p className="text-xs text-gray-400">Expires</p><p>{data.subscription_expires_at ? format(parseISO(data.subscription_expires_at), 'dd MMM yyyy') : '—'}</p></div>
        <div><p className="text-xs text-gray-400">Total Invoices</p><p>{data.invoice_count}</p></div>
        <div><p className="text-xs text-gray-400">Total Users</p><p>{data.user_count}</p></div>
        {data.gst_number && <div className="col-span-2"><p className="text-xs text-gray-400">GST Number</p><p className="font-mono">{data.gst_number}</p></div>}
      </div>

      {/* Restaurant / KOT toggle */}
      <div className="border border-gray-200 rounded-lg p-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800">Restaurant / KOT Features</p>
          <p className="text-xs text-gray-400">Enables tables, kitchen orders, and token queue</p>
        </div>
        <button
          onClick={() => toggleMutation.mutate(!kotEnabled)}
          disabled={toggleMutation.isPending}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${kotEnabled ? 'bg-[#0066CC]' : 'bg-gray-300'}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${kotEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
