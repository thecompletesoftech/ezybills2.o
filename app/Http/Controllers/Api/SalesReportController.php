<?php

namespace App\Http\Controllers\Api;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalesReportController extends Controller
{
    public function sales(Request $request)
    {
        $businessId = auth()->user()->business_id;
        $from = $request->get('from', now()->startOfMonth()->toDateString());
        $to   = $request->get('to',   now()->toDateString());

        $rows = Invoice::where('business_id', $businessId)
            ->where('invoice_status', '!=', 'cancelled')
            ->where('invoice_type', '!=', 'sale_return')
            ->whereBetween(DB::raw('DATE(invoice_date)'), [$from, $to])
            ->select(
                DB::raw('DATE(invoice_date) as date'),
                DB::raw('SUM(total_amount) as total'),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy(DB::raw('DATE(invoice_date)'))
            ->orderBy('date')
            ->get();

        return $this->success($rows, 'Sales report');
    }
}
