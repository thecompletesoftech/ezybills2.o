'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

type SalesReport = { date: string; total: number; count: number }[];

export default function ReportsPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [activeTab, setActiveTab] = useState<'sales' | 'gst'>('sales');

  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = useQuery<SalesReport>({
    queryKey: ['reports', 'sales', from, to],
    queryFn: async () => {
      const res = await api.get('/reports/sales', { params: { from, to } });
      return res.data;
    },
  });

  const { data: gstData, isLoading: gstLoading } = useQuery({
    queryKey: ['reports', 'gst', from, to],
    queryFn: async () => {
      const res = await api.get('/reports/gst', { params: { from, to } });
      return res.data;
    },
    enabled: activeTab === 'gst',
  });

  const chartData = (salesData ?? []).map((d) => ({
    ...d,
    label: format(new Date(d.date), 'dd MMM'),
  }));

  const totalSales = (salesData ?? []).reduce((sum, d) => sum + d.total, 0);
  const totalCount = (salesData ?? []).reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Reports</h2>
        <p className="text-gray-500 text-sm mt-0.5">Sales, inventory, and GST reports</p>
      </div>

      {/* Date filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
              />
            </div>
            <Button variant="primary" size="md" onClick={() => refetchSales()}>
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['sales', 'gst'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-[#0066CC] text-[#0066CC]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'gst' ? 'GST Report' : 'Sales Report'}
          </button>
        ))}
      </div>

      {activeTab === 'sales' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{formatCurrency(totalSales)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Total Invoices</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{totalCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Daily Sales Chart</CardTitle></CardHeader>
            <CardContent>
              {salesLoading ? (
                <div className="flex justify-center py-10"><Spinner /></div>
              ) : chartData.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">No data for the selected period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Sales']} contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '13px' }} />
                    <Bar dataKey="total" fill="#0066CC" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'gst' && (
        <Card>
          <CardHeader><CardTitle>GST Report</CardTitle></CardHeader>
          <CardContent>
            {gstLoading ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : (
              <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(gstData, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
