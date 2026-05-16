'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Eye, FileText, RotateCcw, Printer } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Invoice, InvoiceItem, PaginatedResponse, Business } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import PrintBill, { type BillData } from '@/components/print-bill';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

function safeFormatDate(dateStr: string, fmt = 'dd MMM yyyy') {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

type StatusFilter = 'all' | 'paid' | 'partial' | 'unpaid' | 'cancelled';

const statusTabs: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Paid', value: 'paid' },
  { label: 'Pending', value: 'unpaid' },
  { label: 'Partial', value: 'partial' },
  { label: 'Cancelled', value: 'cancelled' },
];

function statusBadgeVariant(status: string): 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'purple' {
  switch (status) {
    case 'paid': return 'green';
    case 'partial': return 'yellow';
    case 'unpaid': return 'red';
    case 'cancelled': return 'gray';
    default: return 'blue';
  }
}

interface ReturnQtys {
  [productId: number]: string;
}

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnQtys, setReturnQtys] = useState<ReturnQtys>({});
  const [returnReason, setReturnReason] = useState('');
  const [showPrintBill, setShowPrintBill] = useState(false);

  const { data: businessData } = useQuery<Business>({
    queryKey: ['business'],
    queryFn: async () => { const res = await api.get('/business'); return res.data; },
  });

  const { data, isLoading } = useQuery<PaginatedResponse<Invoice>>({
    queryKey: ['invoices', { page, search, status: statusFilter }],
    queryFn: async () => {
      const params: Record<string, unknown> = { page };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/invoices', { params });
      return res.data;
    },
  });

  // Fetch invoice detail when modal opens
  const { data: invoiceDetail, isLoading: detailLoading } = useQuery<Invoice>({
    queryKey: ['invoice-detail', detailInvoice?.id],
    queryFn: async () => {
      const res = await api.get(`/invoices/${detailInvoice!.id}`);
      return res.data.invoice ?? res.data;
    },
    enabled: detailModalOpen && detailInvoice !== null,
  });

  const returnMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceDetail) return;
      const items = (invoiceDetail.items ?? [])
        .filter((item) => parseFloat(returnQtys[item.product_id] ?? '0') > 0)
        .map((item) => ({
          product_id: item.product_id,
          quantity: parseFloat(returnQtys[item.product_id]),
        }));
      if (items.length === 0) throw new Error('Select at least one item to return');
      return api.post(`/invoices/${invoiceDetail.id}/return`, { items, reason: returnReason || undefined });
    },
    onSuccess: (res) => {
      const retNum = (res?.data as { invoice_number?: string })?.invoice_number ?? '';
      toast.success(`Return ${retNum} created — stock restored`);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-detail', invoiceDetail?.id] });
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      setReturnModalOpen(false);
      setReturnQtys({});
      setReturnReason('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to create return');
    },
  });

  const openDetail = (invoice: Invoice) => {
    setDetailInvoice(invoice);
    setDetailModalOpen(true);
  };

  const openReturn = (items: InvoiceItem[]) => {
    const qtys: ReturnQtys = {};
    items.forEach((item) => { qtys[item.product_id] = String(item.quantity); });
    setReturnQtys(qtys);
    setReturnReason('');
    setReturnModalOpen(true);
  };

  const invoices = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Invoices</h2>
          <p className="text-gray-500 text-sm mt-0.5">{data?.total ?? 0} total invoices</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-white text-[#0066CC] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4 pb-2">
          <div className="relative max-w-sm mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoice # or customer..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC]"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <FileText size={40} className="mb-3 opacity-40" />
              <p className="text-sm">No invoices found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Invoice #</TableHeader>
                    <TableHeader>Customer</TableHeader>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Amount</TableHeader>
                    <TableHeader>Paid</TableHeader>
                    <TableHeader>Balance</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono font-medium text-[#0066CC]">
                        {invoice.invoice_number}
                        {invoice.invoice_type === 'sale_return' && (
                          <span className="ml-1.5 text-[10px] bg-orange-100 text-orange-700 rounded px-1 py-0.5 font-sans font-medium">RETURN</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {invoice.customer?.name ?? <span className="text-gray-400 font-normal">Walk-in</span>}
                      </TableCell>
                      <TableCell className="text-gray-500 text-xs">
                        {safeFormatDate(invoice.invoice_date)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(invoice.total_amount)}
                      </TableCell>
                      <TableCell className="text-green-700">
                        {invoice.paid_amount > 0 ? formatCurrency(invoice.paid_amount) : '—'}
                      </TableCell>
                      <TableCell className={invoice.balance_due > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                        {invoice.balance_due > 0 ? formatCurrency(invoice.balance_due) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(invoice.status)}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => openDetail(invoice)}
                          className="text-gray-400 hover:text-[#0066CC] transition-colors flex items-center gap-1 text-xs"
                        >
                          <Eye size={15} /> View
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

      {/* Invoice Detail Modal */}
      <Modal
        open={detailModalOpen}
        onClose={() => { setDetailModalOpen(false); setDetailInvoice(null); }}
        title={`Invoice ${detailInvoice?.invoice_number ?? ''}`}
        className="max-w-2xl"
      >
        {detailLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : invoiceDetail ? (
          <div className="space-y-4">
            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-gray-50 rounded-xl p-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Customer</p>
                <p className="text-sm font-medium text-gray-800">{invoiceDetail.customer?.name ?? 'Walk-in Customer'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Invoice Date</p>
                <p className="text-sm font-medium text-gray-800">{safeFormatDate(invoiceDetail.invoice_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Status</p>
                <Badge variant={statusBadgeVariant(invoiceDetail.status)}>
                  {invoiceDetail.status.charAt(0).toUpperCase() + invoiceDetail.status.slice(1)}
                </Badge>
              </div>
            </div>

            {/* Items table */}
            {invoiceDetail.items && invoiceDetail.items.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Items</h4>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Product</th>
                        <th className="px-3 py-2 text-right font-medium">Qty</th>
                        <th className="px-3 py-2 text-right font-medium">Unit Price</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoiceDetail.items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-800">
                            {item.product?.name ?? `Product #${item.product_id}`}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-800">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(invoiceDetail.subtotal)}</span>
              </div>
              {invoiceDetail.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-red-600">-{formatCurrency(invoiceDetail.discount_amount)}</span>
                </div>
              )}
              {invoiceDetail.gst_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">GST</span>
                  <span>{formatCurrency(invoiceDetail.gst_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-1 border-t border-gray-200">
                <span>Grand Total</span>
                <span className="text-[#0066CC]">{formatCurrency(invoiceDetail.total_amount)}</span>
              </div>
              {invoiceDetail.paid_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Paid</span>
                  <span className="text-green-600">{formatCurrency(invoiceDetail.paid_amount)}</span>
                </div>
              )}
              {invoiceDetail.balance_due > 0 && (
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-red-600">Balance Due</span>
                  <span className="text-red-600">{formatCurrency(invoiceDetail.balance_due)}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {invoiceDetail.notes && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Notes</p>
                <p className="text-sm text-gray-700">{invoiceDetail.notes}</p>
              </div>
            )}

            <div className="flex justify-between gap-2 pt-2">
              <div>
                {invoiceDetail.invoice_type !== 'sale_return' && invoiceDetail.status !== 'cancelled' && invoiceDetail.items && invoiceDetail.items.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openReturn(invoiceDetail.items!)}
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                  >
                    <RotateCcw size={14} className="mr-1" /> Process Return
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowPrintBill(true)}>
                  <Printer size={14} className="mr-1" /> Print Invoice
                </Button>
                <Button variant="primary" size="sm" onClick={() => { setDetailModalOpen(false); setDetailInvoice(null); }}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-400 py-8 text-sm">Failed to load invoice details.</p>
        )}
      </Modal>

      {/* Return Modal */}
      <Modal
        open={returnModalOpen}
        onClose={() => { setReturnModalOpen(false); setReturnQtys({}); setReturnReason(''); }}
        title={`Process Return — ${invoiceDetail?.invoice_number ?? ''}`}
        className="max-w-lg"
      >
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
            Stock will be restored. Customer due (if any) will be reduced by the return amount.
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Return Quantities</h4>
            <div className="space-y-2">
              {(invoiceDetail?.items ?? []).map((item) => (
                <div key={item.product_id} className="flex items-center gap-3">
                  <div className="flex-1 text-sm text-gray-800">
                    {item.product?.name ?? `Product #${item.product_id}`}
                    <span className="text-gray-400 ml-1 text-xs">({item.quantity} sold)</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={item.quantity}
                    step="1"
                    value={returnQtys[item.product_id] ?? '0'}
                    onChange={(e) => setReturnQtys((q) => ({ ...q, [item.product_id]: e.target.value }))}
                    className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Reason (optional)</label>
            <input
              type="text"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="e.g. Damaged product, Wrong item..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => { setReturnModalOpen(false); setReturnQtys({}); setReturnReason(''); }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1 bg-orange-600 hover:bg-orange-700 focus:ring-orange-500"
              loading={returnMutation.isPending}
              onClick={() => returnMutation.mutate()}
            >
              Confirm Return
            </Button>
          </div>
        </div>
      </Modal>

      {/* Print Bill overlay */}
      {showPrintBill && invoiceDetail && (() => {
        const bill: BillData = {
          invoice_number: invoiceDetail.invoice_number,
          date: invoiceDetail.invoice_date,
          business_name: businessData?.name ?? 'EzyBills',
          business_logo_url: businessData?.logo_url ?? undefined,
          business_address: businessData?.address ?? undefined,
          business_gst: businessData?.gst_number ?? undefined,
          business_phone: businessData?.mobile_number ?? undefined,
          customer_name: invoiceDetail.customer?.name ?? undefined,
          items: (invoiceDetail.items ?? []).map(item => ({
            name: item.product?.name ?? `Product #${item.product_id}`,
            qty: item.quantity,
            unit: (item.product as { unit?: { short_name?: string } } | undefined)?.unit?.short_name ?? 'pcs',
            price: item.unit_price,
            gst_rate: item.gst_rate ?? 0,
            discount_pct: item.discount ?? 0,
          })),
          subtotal: invoiceDetail.subtotal,
          discount_amount: invoiceDetail.discount_amount,
          tax_amount: invoiceDetail.gst_amount,
          grand_total: invoiceDetail.total_amount,
          payment_mode: invoiceDetail.payment_mode ?? invoiceDetail.payments?.[0]?.payment_method ?? 'cash',
        };
        return <PrintBill bill={bill} onClose={() => setShowPrintBill(false)} />;
      })()}
    </div>
  );
}
