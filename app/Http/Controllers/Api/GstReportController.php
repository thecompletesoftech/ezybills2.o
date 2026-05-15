<?php

namespace App\Http\Controllers\Api;

use App\Models\InvoiceItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GstReportController extends Controller
{
    public function summary(Request $request)
    {
        $businessId = auth()->user()->business_id;
        $from = $request->get('from', now()->startOfMonth()->toDateString());
        $to   = $request->get('to',   now()->toDateString());

        // Aggregate taxable value and GST by rate, excluding cancelled and return invoices
        $rows = InvoiceItem::join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->where('invoices.business_id', $businessId)
            ->where('invoices.invoice_status', '!=', 'cancelled')
            ->where('invoices.invoice_type', '!=', 'sale_return')
            ->whereBetween(DB::raw('DATE(invoices.invoice_date)'), [$from, $to])
            ->select(
                'invoice_items.tax_percentage as gst_rate',
                DB::raw('SUM(invoice_items.quantity * invoice_items.unit_price - invoice_items.discount_amount) as taxable_value'),
                DB::raw('SUM(invoice_items.tax_amount) as total_tax'),
                DB::raw('COUNT(DISTINCT invoices.id) as invoice_count')
            )
            ->groupBy('invoice_items.tax_percentage')
            ->orderBy('invoice_items.tax_percentage')
            ->get()
            ->map(function ($row) {
                $rate     = (float) $row->gst_rate;
                $taxable  = (float) $row->taxable_value;
                $totalTax = (float) $row->total_tax;
                // Split into CGST + SGST (each = rate/2) — assumes intrastate sales
                return [
                    'gst_rate'      => $rate,
                    'taxable_value' => round($taxable, 2),
                    'cgst_rate'     => $rate / 2,
                    'cgst_amount'   => round($totalTax / 2, 2),
                    'sgst_rate'     => $rate / 2,
                    'sgst_amount'   => round($totalTax / 2, 2),
                    'total_tax'     => round($totalTax, 2),
                    'invoice_count' => (int) $row->invoice_count,
                ];
            });

        $totals = [
            'taxable_value' => round($rows->sum('taxable_value'), 2),
            'cgst_amount'   => round($rows->sum('cgst_amount'), 2),
            'sgst_amount'   => round($rows->sum('sgst_amount'), 2),
            'total_tax'     => round($rows->sum('total_tax'), 2),
        ];

        return $this->success([
            'from'    => $from,
            'to'      => $to,
            'rows'    => $rows,
            'totals'  => $totals,
        ], 'GST report');
    }
}
