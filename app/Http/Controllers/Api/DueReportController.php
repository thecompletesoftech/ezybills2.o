<?php

namespace App\Http\Controllers\Api;

use App\Models\Customer;
use App\Models\Supplier;
use Illuminate\Http\Request;

class DueReportController extends Controller
{
    public function customerDue(Request $request)
    {
        $businessId = $request->user()->business_id;

        $customers = Customer::where('business_id', $businessId)
            ->withSum(['invoices as total_invoiced' => fn ($q) =>
                $q->where('invoice_status', '!=', 'cancelled')], 'total_amount')
            ->withSum(['payments as total_paid' => fn ($q) => $q], 'amount')
            ->get()
            ->map(function ($c) {
                $due = (float) ($c->total_invoiced ?? 0) - (float) ($c->total_paid ?? 0);
                return [
                    'id'            => $c->id,
                    'name'          => $c->name,
                    'phone'         => $c->phone ?? $c->mobile,
                    'total_invoiced' => (float) ($c->total_invoiced ?? 0),
                    'total_paid'    => (float) ($c->total_paid ?? 0),
                    'balance_due'   => max(0, $due),
                ];
            })
            ->filter(fn ($c) => $c['balance_due'] > 0)
            ->sortByDesc('balance_due')
            ->values();

        $suppliers = Supplier::where('business_id', $businessId)
            ->withSum(['purchases as total_purchased' => fn ($q) => $q], 'total_amount')
            ->withSum(['purchasePayments as total_paid' => fn ($q) => $q], 'amount')
            ->get()
            ->map(function ($s) {
                $due = (float) ($s->total_purchased ?? 0) - (float) ($s->total_paid ?? 0);
                return [
                    'id'              => $s->id,
                    'name'            => $s->name,
                    'phone'           => $s->phone ?? $s->mobile,
                    'total_purchased' => (float) ($s->total_purchased ?? 0),
                    'total_paid'      => (float) ($s->total_paid ?? 0),
                    'balance_due'     => max(0, $due),
                ];
            })
            ->filter(fn ($s) => $s['balance_due'] > 0)
            ->sortByDesc('balance_due')
            ->values();

        return $this->success([
            'customer_due_total'  => $customers->sum('balance_due'),
            'supplier_due_total'  => $suppliers->sum('balance_due'),
            'customers'           => $customers,
            'suppliers'           => $suppliers,
        ], 'Due report');
    }
}
