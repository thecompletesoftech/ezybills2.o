'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface BillItem {
  name: string;
  qty: number;
  unit: string;
  price: number;
  gst_rate: number;
  discount_pct: number;
}

export interface BillData {
  invoice_number: string;
  date: string;
  business_name: string;
  business_logo_url?: string;
  business_address?: string;
  business_gst?: string;
  business_phone?: string;
  customer_name?: string;
  token_number?: string;
  items: BillItem[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  grand_total: number;
  payment_mode: string;
  cash_received?: number;
  change_amount?: number;
}

interface PrinterSettings {
  paper_size: string;
  print_logo: boolean;
  print_address: boolean;
  print_mobile: boolean;
  print_gst: boolean;
  print_footer: boolean;
  footer_text: string | null;
  copies: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold' : ''}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

function ThermalBill({ bill, settings }: { bill: BillData; settings: PrinterSettings }) {
  const width = settings.paper_size === '58mm' ? '54mm' : '76mm';

  return (
    <div style={{ width, fontFamily: 'monospace', fontSize: '11px', padding: '4px', lineHeight: 1.4 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        {settings.print_logo && bill.business_logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bill.business_logo_url} alt="logo" style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 4 }} />
        )}
        <div style={{ fontSize: 14, fontWeight: 'bold' }}>{bill.business_name}</div>
        {settings.print_address && bill.business_address && <div>{bill.business_address}</div>}
        {settings.print_mobile && bill.business_phone && <div>Ph: {bill.business_phone}</div>}
        {settings.print_gst && bill.business_gst && <div>GSTIN: {bill.business_gst}</div>}
      </div>

      <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '3px 0', marginBottom: 4 }}>
        <Line label={`Bill #${bill.invoice_number}`} value={new Date(bill.date).toLocaleDateString('en-IN')} />
        {bill.token_number && (
          <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 'bold', margin: '3px 0' }}>
            Token: {bill.token_number}
          </div>
        )}
        {bill.customer_name && <Line label="Customer:" value={bill.customer_name} />}
        <Line label="Mode:" value={bill.payment_mode.toUpperCase()} />
      </div>

      {/* Items */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ borderBottom: '1px dashed #000', paddingBottom: 2, marginBottom: 2, fontWeight: 'bold' }}>
          <span>Item</span>
          <span style={{ float: 'right' }}>Amt</span>
        </div>
        {bill.items.map((item, i) => {
          const base = item.price * item.qty;
          const disc = base * (item.discount_pct / 100);
          const total = base - disc;
          return (
            <div key={i} style={{ marginBottom: 3 }}>
              <div>{item.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 4 }}>
                <span>{item.qty} {item.unit} × {fmt(item.price)}</span>
                <span>{fmt(total)}</span>
              </div>
              {item.gst_rate > 0 && settings.print_gst && (
                <div style={{ paddingLeft: 4, opacity: 0.7 }}>GST {item.gst_rate}%: {fmt(total * item.gst_rate / 100)}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div style={{ borderTop: '1px dashed #000', paddingTop: 4, marginBottom: 4 }}>
        <Line label="Subtotal" value={fmt(bill.subtotal)} />
        {bill.discount_amount > 0 && <Line label="Discount" value={`-${fmt(bill.discount_amount)}`} />}
        {settings.print_gst && bill.tax_amount > 0 && <Line label="GST Total" value={fmt(bill.tax_amount)} />}
        <div style={{ borderTop: '1px solid #000', marginTop: 3, paddingTop: 3 }}>
          <Line label="TOTAL" value={fmt(bill.grand_total)} bold />
        </div>
        {bill.cash_received !== undefined && bill.cash_received > 0 && (
          <>
            <Line label="Cash" value={fmt(bill.cash_received)} />
            <Line label="Change" value={fmt(bill.change_amount ?? 0)} />
          </>
        )}
      </div>

      {/* GST breakdown per rate */}
      {settings.print_gst && (() => {
        const gstByRate: Record<string, number> = {};
        bill.items.forEach(item => {
          if (item.gst_rate > 0) {
            const base = item.price * item.qty * (1 - item.discount_pct / 100);
            const k = `${item.gst_rate}%`;
            gstByRate[k] = (gstByRate[k] ?? 0) + base * item.gst_rate / 100;
          }
        });
        const entries = Object.entries(gstByRate);
        if (!entries.length) return null;
        return (
          <div style={{ borderTop: '1px dashed #000', paddingTop: 3, marginBottom: 4, fontSize: 10 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 2 }}>GST Summary</div>
            {entries.map(([rate, amt]) => <Line key={rate} label={`GST ${rate}`} value={fmt(amt)} />)}
          </div>
        );
      })()}

      {/* Footer */}
      {settings.print_footer && settings.footer_text && (
        <div style={{ textAlign: 'center', borderTop: '1px dashed #000', paddingTop: 4, marginTop: 4 }}>
          {settings.footer_text}
        </div>
      )}
    </div>
  );
}

function A4Bill({ bill, settings }: { bill: BillData; settings: PrinterSettings }) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, padding: 32, maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, borderBottom: '2px solid #0066CC', paddingBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {settings.print_logo && bill.business_logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bill.business_logo_url} alt="logo" style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 6 }} />
          )}
          <div>
            <div style={{ fontSize: 22, fontWeight: 'bold', color: '#0066CC' }}>{bill.business_name}</div>
            {settings.print_address && bill.business_address && (
              <div style={{ color: '#555', marginTop: 4 }}>{bill.business_address}</div>
            )}
            {settings.print_mobile && bill.business_phone && (
              <div style={{ color: '#555' }}>Phone: {bill.business_phone}</div>
            )}
            {settings.print_gst && bill.business_gst && (
              <div style={{ color: '#555' }}>GSTIN: {bill.business_gst}</div>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>TAX INVOICE</div>
          <div style={{ color: '#555', marginTop: 4 }}>#{bill.invoice_number}</div>
          <div style={{ color: '#555' }}>{new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          {bill.token_number && (
            <div style={{ marginTop: 6, padding: '4px 10px', background: '#0066CC', color: 'white', borderRadius: 4, fontWeight: 'bold', fontSize: 13 }}>
              Token: {bill.token_number}
            </div>
          )}
        </div>
      </div>

      {/* Bill To */}
      {bill.customer_name && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 'bold', color: '#555', fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>Bill To</div>
          <div style={{ fontWeight: 'bold' }}>{bill.customer_name}</div>
        </div>
      )}

      {/* Items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr style={{ backgroundColor: '#0066CC', color: 'white' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left' }}>#</th>
            <th style={{ padding: '8px 10px', textAlign: 'left' }}>Item</th>
            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Qty</th>
            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rate</th>
            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Disc%</th>
            {settings.print_gst && <th style={{ padding: '8px 10px', textAlign: 'right' }}>GST%</th>}
            {settings.print_gst && <th style={{ padding: '8px 10px', textAlign: 'right' }}>GST Amt</th>}
            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item, i) => {
            const base = item.price * item.qty;
            const disc = base * (item.discount_pct / 100);
            const afterDisc = base - disc;
            const gstAmt = afterDisc * (item.gst_rate / 100);
            const lineTotal = afterDisc + gstAmt;
            return (
              <tr key={i} style={{ borderBottom: '1px solid #eee', backgroundColor: i % 2 === 0 ? '#f9f9f9' : 'white' }}>
                <td style={{ padding: '7px 10px' }}>{i + 1}</td>
                <td style={{ padding: '7px 10px' }}>{item.name}</td>
                <td style={{ padding: '7px 10px', textAlign: 'right' }}>{item.qty} {item.unit}</td>
                <td style={{ padding: '7px 10px', textAlign: 'right' }}>{fmt(item.price)}</td>
                <td style={{ padding: '7px 10px', textAlign: 'right' }}>{item.discount_pct > 0 ? `${item.discount_pct}%` : '—'}</td>
                {settings.print_gst && <td style={{ padding: '7px 10px', textAlign: 'right' }}>{item.gst_rate > 0 ? `${item.gst_rate}%` : '—'}</td>}
                {settings.print_gst && <td style={{ padding: '7px 10px', textAlign: 'right' }}>{item.gst_rate > 0 ? fmt(gstAmt) : '—'}</td>}
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 'bold' }}>{fmt(lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #eee' }}>
            <span style={{ color: '#555' }}>Subtotal</span><span>{fmt(bill.subtotal)}</span>
          </div>
          {bill.discount_amount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #eee' }}>
              <span style={{ color: '#555' }}>Discount</span><span style={{ color: 'red' }}>-{fmt(bill.discount_amount)}</span>
            </div>
          )}
          {settings.print_gst && bill.tax_amount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #eee' }}>
              <span style={{ color: '#555' }}>GST Total</span><span>{fmt(bill.tax_amount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 'bold', fontSize: 15, borderTop: '2px solid #333' }}>
            <span>GRAND TOTAL</span><span style={{ color: '#0066CC' }}>{fmt(bill.grand_total)}</span>
          </div>
          <div style={{ color: '#555', fontSize: 11 }}>Payment: {bill.payment_mode.toUpperCase()}</div>
          {bill.cash_received !== undefined && bill.cash_received > 0 && (
            <div style={{ color: '#555', fontSize: 11 }}>Cash: {fmt(bill.cash_received)} | Change: {fmt(bill.change_amount ?? 0)}</div>
          )}
        </div>
      </div>

      {/* GST breakdown */}
      {settings.print_gst && (() => {
        const byRate: Record<string, { taxable: number; gst: number }> = {};
        bill.items.forEach(item => {
          if (item.gst_rate > 0) {
            const taxable = item.price * item.qty * (1 - item.discount_pct / 100);
            const k = `${item.gst_rate}`;
            if (!byRate[k]) byRate[k] = { taxable: 0, gst: 0 };
            byRate[k].taxable += taxable;
            byRate[k].gst += taxable * item.gst_rate / 100;
          }
        });
        const entries = Object.entries(byRate);
        if (!entries.length) return null;
        return (
          <div style={{ marginTop: 24, borderTop: '1px solid #eee', paddingTop: 12 }}>
            <div style={{ fontWeight: 'bold', fontSize: 11, color: '#555', marginBottom: 6 }}>GST SUMMARY</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={{ padding: '4px 8px', textAlign: 'left' }}>GST Rate</th>
                  <th style={{ padding: '4px 8px', textAlign: 'right' }}>Taxable Amt</th>
                  <th style={{ padding: '4px 8px', textAlign: 'right' }}>CGST</th>
                  <th style={{ padding: '4px 8px', textAlign: 'right' }}>SGST</th>
                  <th style={{ padding: '4px 8px', textAlign: 'right' }}>Total GST</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([rate, v]) => (
                  <tr key={rate} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '4px 8px' }}>{rate}%</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmt(v.taxable)}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmt(v.gst / 2)}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmt(v.gst / 2)}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold' }}>{fmt(v.gst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Footer */}
      {settings.print_footer && settings.footer_text && (
        <div style={{ textAlign: 'center', marginTop: 32, paddingTop: 16, borderTop: '1px solid #eee', color: '#555' }}>
          {settings.footer_text}
        </div>
      )}
    </div>
  );
}

interface PrintBillProps {
  bill: BillData;
  onClose: () => void;
}

const DEFAULT_SETTINGS: PrinterSettings = {
  paper_size: '80mm', print_logo: true, print_address: true, print_mobile: true,
  print_gst: true, print_footer: true, footer_text: 'Thank you for your business!', copies: 1,
};

export default function PrintBill({ bill, onClose }: PrintBillProps) {
  const [settings, setSettings] = useState<PrinterSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    api.get('/settings/printer')
      .then(r => {
        const s = r.data.data ?? r.data;
        setSettings({
          paper_size: s.paper_size ?? '80mm',
          print_logo: s.print_logo ?? true,
          print_address: s.print_address ?? true,
          print_mobile: s.print_mobile ?? true,
          print_gst: s.print_gst ?? true,
          print_footer: s.print_footer ?? true,
          footer_text: s.footer_text ?? 'Thank you for your business!',
          copies: s.copies ?? 1,
        });
      })
      .catch(() => {/* use defaults */});
  }, []);

  const doPrint = () => {
    const printArea = document.getElementById('print-bill-area');
    if (!printArea) return;

    const w = window.open('', '_blank', 'width=600,height=800');
    if (!w) { window.print(); return; }

    const paperCss = settings.paper_size === 'A4'
      ? '@page { size: A4; margin: 15mm; }'
      : `@page { size: ${settings.paper_size} auto; margin: 2mm; }`;

    w.document.write(`<html><head><style>
      ${paperCss}
      * { box-sizing: border-box; }
      body { margin: 0; padding: 0; }
    </style></head><body>`);

    for (let i = 0; i < settings.copies; i++) {
      w.document.write(printArea.innerHTML);
      if (i < settings.copies - 1) w.document.write('<div style="page-break-after:always"></div>');
    }

    w.document.write('</body></html>');
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900">Print Preview</p>
            <p className="text-xs text-gray-400">{settings.paper_size} · {settings.copies} cop{settings.copies === 1 ? 'y' : 'ies'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Close</button>
            <button onClick={doPrint}
              className="px-4 py-2 text-sm bg-[#0066CC] text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-1.5">
              🖨 Print
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="p-6 bg-gray-100 flex justify-center overflow-x-auto">
          <div id="print-bill-area" className="bg-white shadow-md rounded">
            {settings.paper_size === 'A4'
              ? <A4Bill bill={bill} settings={settings} />
              : <ThermalBill bill={bill} settings={settings} />}
          </div>
        </div>
      </div>
    </div>
  );
}
