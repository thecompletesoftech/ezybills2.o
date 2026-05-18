'use client';

import { useEffect } from 'react';

export interface KotSlipData {
  kot_number: string;
  table_number?: string | null;
  kot_time: string;
  items: { name: string; qty: number; notes?: string | null }[];
  notes?: string | null;
  business_name: string;
}

function fmtTime(s: string) {
  try { return new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }); }
  catch { return s; }
}

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

interface PrintKotSlipProps {
  kot: KotSlipData;
  onClose: () => void;
  autoPrint?: boolean;
}

export default function PrintKotSlip({ kot, onClose, autoPrint = true }: PrintKotSlipProps) {
  const doPrint = () => {
    const area = document.getElementById('kot-slip-area');
    if (!area) return;

    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;

    w.document.write(`<html><head><title>KOT #${kot.kot_number}</title><style>
      @page { size: 80mm auto; margin: 2mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: monospace; font-size: 12px; }
    </style></head><body>`);
    w.document.write(area.innerHTML);
    w.document.write('</body></html>');
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  useEffect(() => {
    if (autoPrint) {
      const t = setTimeout(doPrint, 400);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint]);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm my-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900 text-sm">KOT Slip — #{kot.kot_number}</p>
            <p className="text-xs text-gray-400">Printing automatically…</p>
          </div>
          <div className="flex gap-2">
            <button onClick={doPrint}
              className="px-3 py-1.5 text-xs bg-[#0066CC] text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-1">
              🖨 Print again
            </button>
            <button onClick={onClose} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 bg-gray-100 flex justify-center">
          <div id="kot-slip-area" className="bg-white shadow-md rounded p-3"
            style={{ width: '76mm', fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.5 }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 'bold' }}>{kot.business_name}</div>
              <div style={{ fontSize: 16, fontWeight: 'bold', letterSpacing: 1, marginTop: 4 }}>
                *** KITCHEN ORDER ***
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '4px 0', marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>KOT #: <strong>{kot.kot_number}</strong></span>
                <span>{fmtDate(kot.kot_time)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Time: {fmtTime(kot.kot_time)}</span>
                {kot.table_number && <span>Table: <strong>{kot.table_number}</strong></span>}
              </div>
            </div>

            {/* Items */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontWeight: 'bold', borderBottom: '1px dashed #000', paddingBottom: 2, marginBottom: 4 }}>
                <span>Item</span>
                <span style={{ float: 'right' }}>Qty</span>
              </div>
              {kot.items.map((item, i) => (
                <div key={i} style={{ marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>{item.name}</span>
                    <span>× {item.qty}</span>
                  </div>
                  {item.notes && (
                    <div style={{ fontSize: 11, paddingLeft: 8, fontStyle: 'italic', color: '#444' }}>
                      ↳ {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {kot.notes && (
              <div style={{ borderTop: '1px dashed #000', paddingTop: 4, fontSize: 11 }}>
                <strong>Note:</strong> {kot.notes}
              </div>
            )}

            <div style={{ borderTop: '1px dashed #000', paddingTop: 4, textAlign: 'center', fontSize: 11 }}>
              — Please prepare immediately —
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
