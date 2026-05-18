<?php

namespace App\Http\Controllers\Api;

use App\Models\Purchase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseReportController extends Controller
{
    public function purchase(Request $request)
    {
        $businessId = $request->user()->business_id;

        $request->validate([
            'from' => 'nullable|date',
            'to'   => 'nullable|date',
        ]);

        $from = $request->from ?? now()->startOfMonth()->toDateString();
        $to   = $request->to   ?? now()->toDateString();

        $purchases = Purchase::where('business_id', $businessId)
            ->whereDate('purchase_date', '>=', $from)
            ->whereDate('purchase_date', '<=', $to)
            ->with('supplier:id,name')
            ->orderByDesc('purchase_date')
            ->get();

        $totalAmount  = $purchases->sum('total_amount');
        $totalTax     = $purchases->sum('tax_amount');
        $totalDiscount = $purchases->sum('discount_amount');

        // By supplier summary
        $bySupplier = $purchases->groupBy('supplier_id')->map(function ($group) {
            return [
                'supplier_id'   => $group->first()->supplier_id,
                'supplier_name' => $group->first()->supplier?->name ?? 'Unknown',
                'count'         => $group->count(),
                'total_amount'  => (float) $group->sum('total_amount'),
            ];
        })->sortByDesc('total_amount')->values();

        return $this->success([
            'from'           => $from,
            'to'             => $to,
            'total_purchases' => $purchases->count(),
            'total_amount'   => (float) $totalAmount,
            'total_tax'      => (float) $totalTax,
            'total_discount' => (float) $totalDiscount,
            'by_supplier'    => $bySupplier,
            'purchases'      => $purchases->map(fn ($p) => [
                'id'              => $p->id,
                'purchase_number' => $p->purchase_number,
                'purchase_date'   => $p->purchase_date?->toDateString(),
                'supplier_name'   => $p->supplier?->name ?? '—',
                'total_amount'    => (float) $p->total_amount,
                'payment_status'  => $p->payment_status,
            ])->values(),
        ], 'Purchase report');
    }
}
