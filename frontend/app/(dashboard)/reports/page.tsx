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

const INR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const TABS = [
  { key: 'sales',     label: 'Sales' },
  { key: 'purchase',  label: 'Purchase' },
  { key: 'pl',        label: 'P & L' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'due',       label: 'Due Report' },
  { key: 'gst',       label: 'GST' },
] as const;

type Tab = typeof TABS[number]['key'];

// ─── type definitions ────────────────────────────────────────────────────────

type SalesRow    = { date: string; total: number; count: number };
interface GstRow { gst_rate: number; taxable_value: number; cgst_rate: number; cgst_amount: number; sgst_rate: number; sgst_amount: number; total_tax: number; invoice_count: number }
interface GstData { from: string; to: string; rows: GstRow[]; totals: { taxable_value: number; cgst_amount: number; sgst_amount: number; total_tax: number } }
interface PlData  { from: string; to: string; revenue: number; total_discount: number; cogs: number; gross_profit: number; expenses: number; net_profit: number }
interface InvData { total_products: number; in_stock: number; low_stock: number; out_of_stock: number; stock_value: number; low_stock_items: { product_id: number; product_name: string; current_stock: number; threshold: number }[] }
interface DueCustomer { id: number; name: string; phone: string; total_invoiced: number; total_paid: number; balance_due: number }
interface DueData { customer_due_total: number; supplier_due_total: number; customers: DueCustomer[]; suppliers: DueCustomer[] }
interface PurchaseRow { id: number; purchase_number: string; purchase_date: string; supplier_name: string; total_amount: number; payment_status: string }
interface PurchaseData { from: string; to: string; total_purchases: number; total_amount: number; total_tax: number; total_discount: number; by_supplier: { supplier_name: string; count: number; total_amount: number }[]; purchases: PurchaseRow[] }

// ─── stat card helper ────────────────────────────────────────────────────────

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${color ?? 'text-gray-800'}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const today      = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

  const [from, setFrom]   = useState(monthStart);
  const [to, setTo]       = useState(today);
  const [tab, setTab]     = useState<Tab>('sales');
  const [applied, setApplied] = useState({ from: monthStart, to: today });

  const apply = () => setApplied({ from, to });

  // Sales
  const { data: salesData, isLoading: salesLoading } = useQuery<SalesRow[]>({
    queryKey: ['reports', 'sales', applied],
    queryFn: async () => (await api.get('/reports/sales', { params: applied })).data,
    enabled: tab === 'sales',
  });

  // GST
  const { data: gstData, isLoading: gstLoading } = useQuery<GstData>({
    queryKey: ['reports', 'gst', applied],
    queryFn: async () => (await api.get('/reports/gst', { params: applied })).data,
    enabled: tab === 'gst',
  });

  // P&L
  const { data: plData, isLoading: plLoading } = useQuery<PlData>({
    queryKey: ['reports', 'pl', applied],
    queryFn: async () => (await api.get('/reports/profit-loss', { params: applied })).data,
    enabled: tab === 'pl',
  });

  // Inventory
  const { data: invData, isLoading: invLoading } = useQuery<InvData>({
    queryKey: ['reports', 'inventory'],
    queryFn: async () => (await api.get('/reports/inventory')).data,
    enabled: tab === 'inventory',
  });

  // Due
  const { data: dueData, isLoading: dueLoading } = useQuery<DueData>({
    queryKey: ['reports', 'due'],
    queryFn: async () => (await api.get('/reports/customer-due')).data,
    enabled: tab === 'due',
  });

  // Purchase
  const { data: purchaseData, isLoading: purchaseLoading } = useQuery<PurchaseData>({
    queryKey: ['reports', 'purchase', applied],
    queryFn: async () => (await api.get('/reports/purchase', { params: applied })).data,
    enabled: tab === 'purchase',
  });

  const noDate = tab === 'inventory' || tab === 'due';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Reports</h2>
        <p className="text-gray-500 text-sm mt-0.5">Business analytics and summaries</p>
      </div>

      {/* Date filter */}
      {!noDate && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">From</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">To</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]" />
              </div>
              <Button variant="primary" size="md" onClick={apply}>Apply</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === key ? 'border-[#0066CC] text-[#0066CC]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── SALES ─────────────────────────────────────────────────────────── */}
      {tab === 'sales' && (() => {
        const rows  = salesData ?? [];
        const total = rows.reduce((s, d) => s + d.total, 0);
        const count = rows.reduce((s, d) => s + d.count, 0);
        const chart = rows.map((d) => ({ ...d, label: format(new Date(d.date), 'dd MMM') }));
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Stat label="Total Sales" value={INR(total)} />
              <Stat label="Total Invoices" value={String(count)} />
            </div>
            <Card>
              <CardHeader><CardTitle>Daily Sales</CardTitle></CardHeader>
              <CardContent>
                {salesLoading ? <div className="flex justify-center py-10"><Spinner /></div>
                  : chart.length === 0 ? <p className="text-center text-gray-400 py-10 text-sm">No data for this period.</p>
                  : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={chart} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v) => [INR(Number(v)), 'Sales']} contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '13px' }} />
                        <Bar dataKey="total" fill="#0066CC" radius={[6, 6, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* ── PURCHASE ──────────────────────────────────────────────────────── */}
      {tab === 'purchase' && (
        <div className="space-y-4">
          {purchaseLoading ? <div className="flex justify-center py-10"><Spinner /></div> : purchaseData && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat label="Total Purchases" value={String(purchaseData.total_purchases)} />
                <Stat label="Total Amount" value={INR(purchaseData.total_amount)} />
                <Stat label="Total Tax" value={INR(purchaseData.total_tax)} />
                <Stat label="Total Discount" value={INR(purchaseData.total_discount)} />
              </div>

              {purchaseData.by_supplier.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>By Supplier</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Orders</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {purchaseData.by_supplier.map((s) => (
                          <tr key={s.supplier_name} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">{s.supplier_name}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{s.count}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-800">{INR(s.total_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle>Purchase List</CardTitle></CardHeader>
                <CardContent className="p-0">
                  {purchaseData.purchases.length === 0
                    ? <p className="text-center text-gray-400 py-10 text-sm">No purchases in this period.</p>
                    : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Purchase #</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {purchaseData.purchases.map((p) => (
                              <tr key={p.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-800">{p.purchase_number}</td>
                                <td className="px-4 py-3 text-gray-600">{p.purchase_date}</td>
                                <td className="px-4 py-3 text-gray-700">{p.supplier_name}</td>
                                <td className="px-4 py-3 text-right font-semibold text-gray-800">{INR(p.total_amount)}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                    p.payment_status === 'paid' ? 'bg-green-100 text-green-700'
                                    : p.payment_status === 'partially_paid' ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'}`}>
                                    {p.payment_status.replace('_', ' ')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── P & L ─────────────────────────────────────────────────────────── */}
      {tab === 'pl' && (
        <div className="space-y-4">
          {plLoading ? <div className="flex justify-center py-10"><Spinner /></div> : plData && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Stat label="Revenue" value={INR(plData.revenue)} />
                <Stat label="Discounts Given" value={INR(plData.total_discount)} color="text-orange-600" />
                <Stat label="Cost of Goods (COGS)" value={INR(plData.cogs)} color="text-red-600" />
                <Stat label="Gross Profit" value={INR(plData.gross_profit)}
                  color={plData.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'} />
                <Stat label="Expenses" value={INR(plData.expenses)} color="text-orange-600" />
                <Stat label="Net Profit" value={INR(plData.net_profit)}
                  color={plData.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}
                  sub={plData.net_profit >= 0 ? '▲ Profitable' : '▼ Loss'} />
              </div>

              <Card>
                <CardHeader><CardTitle>Profit & Loss Summary</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: 'Total Revenue', value: plData.revenue, bold: false },
                      { label: '  − Discounts', value: -plData.total_discount, bold: false },
                      { label: '  − Cost of Goods Sold', value: -plData.cogs, bold: false },
                      { label: 'Gross Profit', value: plData.gross_profit, bold: true },
                      { label: '  − Expenses', value: -plData.expenses, bold: false },
                      { label: 'Net Profit / (Loss)', value: plData.net_profit, bold: true },
                    ].map((row) => (
                      <div key={row.label} className={`flex justify-between items-center py-2 border-b border-gray-100 last:border-b-2 last:border-gray-300 ${row.bold ? 'font-bold' : ''}`}>
                        <span className="text-gray-700">{row.label}</span>
                        <span className={row.value < 0 ? 'text-red-600' : row.value > 0 ? 'text-green-700' : 'text-gray-500'}>
                          {row.value < 0 ? `(${INR(-row.value)})` : INR(row.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── INVENTORY ─────────────────────────────────────────────────────── */}
      {tab === 'inventory' && (
        <div className="space-y-4">
          {invLoading ? <div className="flex justify-center py-10"><Spinner /></div> : invData && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat label="Total Products" value={String(invData.total_products)} />
                <Stat label="In Stock" value={String(invData.in_stock)} color="text-green-600" />
                <Stat label="Low Stock" value={String(invData.low_stock)} color="text-orange-600" />
                <Stat label="Out of Stock" value={String(invData.out_of_stock)} color="text-red-600" />
              </div>
              <Stat label="Total Stock Value" value={INR(invData.stock_value)} sub="Based on purchase price" />

              {invData.low_stock_items.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Low Stock Items</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Current Stock</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Threshold</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {invData.low_stock_items.map((item) => (
                          <tr key={item.product_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">{item.product_name}</td>
                            <td className="px-4 py-3 text-right text-orange-600 font-semibold">{item.current_stock}</td>
                            <td className="px-4 py-3 text-right text-gray-500">{item.threshold}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ── DUE REPORT ────────────────────────────────────────────────────── */}
      {tab === 'due' && (
        <div className="space-y-4">
          {dueLoading ? <div className="flex justify-center py-10"><Spinner /></div> : dueData && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Stat label="Total Customer Due" value={INR(dueData.customer_due_total)} color="text-red-600" />
                <Stat label="Total Supplier Due" value={INR(dueData.supplier_due_total)} color="text-orange-600" />
              </div>

              {dueData.customers.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Customer Dues</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Invoiced</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Paid</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {dueData.customers.map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                            <td className="px-4 py-3 text-gray-500">{c.phone ?? '—'}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{INR(c.total_invoiced)}</td>
                            <td className="px-4 py-3 text-right text-green-600">{INR(c.total_paid)}</td>
                            <td className="px-4 py-3 text-right font-bold text-red-600">{INR(c.balance_due)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              {dueData.suppliers.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Supplier Dues</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Purchased</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Paid</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {dueData.suppliers.map((s) => (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                            <td className="px-4 py-3 text-gray-500">{s.phone ?? '—'}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{INR(s.total_invoiced)}</td>
                            <td className="px-4 py-3 text-right text-green-600">{INR(s.total_paid)}</td>
                            <td className="px-4 py-3 text-right font-bold text-orange-600">{INR(s.balance_due)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              {dueData.customers.length === 0 && dueData.suppliers.length === 0 && (
                <p className="text-center text-gray-400 py-10 text-sm">No outstanding dues. All clear!</p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── GST ───────────────────────────────────────────────────────────── */}
      {tab === 'gst' && (
        <div className="space-y-4">
          {gstLoading ? <div className="flex justify-center py-10"><Spinner /></div> : gstData && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat label="Taxable Value" value={INR(gstData.totals.taxable_value)} />
                <Stat label="CGST" value={INR(gstData.totals.cgst_amount)} />
                <Stat label="SGST" value={INR(gstData.totals.sgst_amount)} />
                <Stat label="Total GST" value={INR(gstData.totals.total_tax)} color="text-[#0066CC]" />
              </div>
              <Card>
                <CardHeader><CardTitle>GST Rate-wise Breakup</CardTitle></CardHeader>
                <CardContent className="p-0">
                  {gstData.rows.length === 0
                    ? <p className="text-center text-gray-400 py-10 text-sm">No taxable sales in this period.</p>
                    : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              {['GST Rate', 'Taxable Value', 'CGST %', 'CGST Amt', 'SGST %', 'SGST Amt', 'Total Tax'].map((h) => (
                                <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase ${h === 'GST Rate' ? 'text-left' : 'text-right'}`}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {gstData.rows.map((row) => (
                              <tr key={row.gst_rate} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-semibold text-gray-800">{row.gst_rate === 0 ? 'Exempt (0%)' : `${row.gst_rate}%`}</td>
                                <td className="px-4 py-3 text-right text-gray-700">{INR(row.taxable_value)}</td>
                                <td className="px-4 py-3 text-right text-gray-500">{row.cgst_rate}%</td>
                                <td className="px-4 py-3 text-right text-gray-700">{INR(row.cgst_amount)}</td>
                                <td className="px-4 py-3 text-right text-gray-500">{row.sgst_rate}%</td>
                                <td className="px-4 py-3 text-right text-gray-700">{INR(row.sgst_amount)}</td>
                                <td className="px-4 py-3 text-right font-semibold text-gray-800">{INR(row.total_tax)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                            <tr>
                              <td className="px-4 py-3 font-bold text-gray-800">Total</td>
                              <td className="px-4 py-3 text-right font-bold text-gray-800">{INR(gstData.totals.taxable_value)}</td>
                              <td /><td className="px-4 py-3 text-right font-bold text-gray-800">{INR(gstData.totals.cgst_amount)}</td>
                              <td /><td className="px-4 py-3 text-right font-bold text-gray-800">{INR(gstData.totals.sgst_amount)}</td>
                              <td className="px-4 py-3 text-right font-bold text-[#0066CC]">{INR(gstData.totals.total_tax)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                </CardContent>
              </Card>
              <p className="text-xs text-gray-400 text-center">CGST + SGST split assumes intrastate sales.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
