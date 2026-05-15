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

interface GstRow {
  gst_rate: number;
  taxable_value: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  total_tax: number;
  invoice_count: number;
}

interface GstReport {
  from: string;
  to: string;
  rows: GstRow[];
  totals: { taxable_value: number; cgst_amount: number; sgst_amount: number; total_tax: number };
}

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

  const { data: gstData, isLoading: gstLoading } = useQuery<GstReport>({
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
        <div className="space-y-4">
          {/* Summary cards */}
          {gstData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Taxable Value', value: gstData.totals.taxable_value },
                { label: 'CGST', value: gstData.totals.cgst_amount },
                { label: 'SGST', value: gstData.totals.sgst_amount },
                { label: 'Total GST', value: gstData.totals.total_tax },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="pt-4">
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(s.value)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>GST Rate-wise Breakup</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {gstLoading ? (
                <div className="flex justify-center py-10"><Spinner /></div>
              ) : !gstData || gstData.rows.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">No taxable sales in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">GST Rate</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Taxable Value</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">CGST %</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">CGST Amt</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">SGST %</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">SGST Amt</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total Tax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {gstData.rows.map((row) => (
                        <tr key={row.gst_rate} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-800">
                            {row.gst_rate === 0 ? 'Exempt (0%)' : `${row.gst_rate}%`}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(row.taxable_value)}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{row.cgst_rate}%</td>
                          <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(row.cgst_amount)}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{row.sgst_rate}%</td>
                          <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(row.sgst_amount)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatCurrency(row.total_tax)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                      <tr>
                        <td className="px-4 py-3 font-bold text-gray-800">Total</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800">{formatCurrency(gstData.totals.taxable_value)}</td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3 text-right font-bold text-gray-800">{formatCurrency(gstData.totals.cgst_amount)}</td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3 text-right font-bold text-gray-800">{formatCurrency(gstData.totals.sgst_amount)}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#0066CC]">{formatCurrency(gstData.totals.total_tax)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-gray-400 text-center">
            CGST + SGST split assumes intrastate (same-state) sales. GST rate per product is set in Products → Add/Edit Product.
          </p>
        </div>
      )}
    </div>
  );
}
