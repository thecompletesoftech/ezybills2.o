'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, CreditCard, AlertTriangle, Receipt, Users, TrendingUp } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

interface AdminStats {
  total_customers: number;
  active_shops: number;
  expired_shops: number;
  trial_accounts: number;
  monthly_revenue: number;
  total_revenue: number;
  pending_renewals: number;
  total_invoices: number;
  new_businesses_this_month: number;
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery<AdminStats>({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await api.get('/admin/dashboard');
      return res.data;
    },
  });

  const stats = [
    { label: 'Total Businesses', value: data?.total_customers ?? 0, icon: Building2, color: 'blue', format: 'number' },
    { label: 'Active Shops', value: data?.active_shops ?? 0, icon: TrendingUp, color: 'green', format: 'number' },
    { label: 'Expired / Inactive', value: data?.expired_shops ?? 0, icon: AlertTriangle, color: 'red', format: 'number' },
    { label: 'Trial Accounts', value: data?.trial_accounts ?? 0, icon: Users, color: 'yellow', format: 'number' },
    { label: 'Monthly Revenue', value: data?.monthly_revenue ?? 0, icon: CreditCard, color: 'purple', format: 'currency' },
    { label: 'Total Invoices', value: data?.total_invoices ?? 0, icon: Receipt, color: 'gray', format: 'number' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    gray: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Admin Dashboard</h2>
        <p className="text-gray-500 text-sm mt-0.5">Overview of all businesses, plans, and revenue</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {stats.map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {s.format === 'currency' ? formatCurrency(s.value) : s.value.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className={`p-2 rounded-lg ${colorMap[s.color]}`}>
                      <s.icon size={18} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {(data?.pending_renewals ?? 0) > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {data?.pending_renewals} subscription(s) expiring in the next 7 days
                </p>
                <p className="text-xs text-amber-600 mt-0.5">Go to Subscriptions to extend them.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>New This Month</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gray-800">{data?.new_businesses_this_month ?? 0}</p>
                <p className="text-sm text-gray-500 mt-1">New businesses registered</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Trials to Convert</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-600">{data?.trial_accounts ?? 0}</p>
                <p className="text-sm text-gray-500 mt-1">Businesses without a paid plan</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
