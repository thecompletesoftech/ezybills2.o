'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import {
  IndianRupee,
  FileText,
  Users,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import api from '@/lib/api';
import type { DashboardSummary, WeeklySales, Invoice } from '@/lib/types';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

const statusVariant: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
  paid: 'green',
  partial: 'yellow',
  unpaid: 'red',
  cancelled: 'gray',
};

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return res.data;
    },
  });

  const { data: chartsData, isLoading: chartsLoading } = useQuery<{ weekly_sales: WeeklySales[] }>({
    queryKey: ['dashboard', 'charts'],
    queryFn: async () => {
      const res = await api.get('/dashboard/charts');
      return res.data;
    },
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<{ data: Invoice[] }>({
    queryKey: ['invoices', { page: 1, per_page: 5 }],
    queryFn: async () => {
      const res = await api.get('/invoices', { params: { page: 1, per_page: 5 } });
      return res.data;
    },
  });

  const weeklySales = chartsData?.weekly_sales?.map((d) => ({
    ...d,
    label: format(parseISO(d.date), 'EEE'),
  })) ?? [];

  const recentInvoices = invoicesData?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-0.5">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Summary cards */}
      {summaryLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <StatCard
            label="Total Sales (Today)"
            value={formatCurrency(summary?.total_sales ?? 0)}
            icon={<IndianRupee size={20} />}
            colorClass="bg-blue-50 text-[#0066CC]"
          />
          <StatCard
            label="Total Invoices"
            value={summary?.total_invoices ?? 0}
            icon={<FileText size={20} />}
            colorClass="bg-purple-50 text-purple-600"
          />
          <StatCard
            label="Total Customers"
            value={summary?.total_customers ?? 0}
            icon={<Users size={20} />}
            colorClass="bg-green-50 text-green-600"
          />
          <StatCard
            label="Pending Dues"
            value={formatCurrency(summary?.pending_dues ?? 0)}
            icon={<TrendingUp size={20} />}
            colorClass="bg-orange-50 text-orange-500"
          />
          <StatCard
            label="Low Stock Alerts"
            value={summary?.low_stock_count ?? 0}
            icon={<AlertTriangle size={20} />}
            colorClass="bg-red-50 text-red-500"
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Weekly sales chart */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {chartsLoading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={weeklySales} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), 'Sales']}
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      fontSize: '13px',
                    }}
                  />
                  <Bar dataKey="amount" fill="#0066CC" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Quick stats panel */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Paid Invoices</span>
              <Badge variant="green">
                {recentInvoices.filter((i) => i.status === 'paid').length}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Unpaid Invoices</span>
              <Badge variant="red">
                {recentInvoices.filter((i) => i.status === 'unpaid').length}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Partial Invoices</span>
              <Badge variant="yellow">
                {recentInvoices.filter((i) => i.status === 'partial').length}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500">Low Stock Items</span>
              <Badge variant="red">{summary?.low_stock_count ?? 0}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invoicesLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : recentInvoices.length === 0 ? (
            <p className="text-center text-gray-400 py-10 text-sm">No invoices yet.</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Invoice #</TableHeader>
                  <TableHeader>Customer</TableHeader>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Amount</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium text-[#0066CC]">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>{invoice.customer?.name ?? 'Walk-in'}</TableCell>
                    <TableCell>
                      {format(parseISO(invoice.invoice_date), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(invoice.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[invoice.status] ?? 'gray'}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
