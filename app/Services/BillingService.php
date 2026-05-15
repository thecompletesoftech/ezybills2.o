<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Customer;

class BillingService
{
    public function createInvoice($businessId, $data)
    {
        $invoice = Invoice::create([
            'business_id' => $businessId,
            'customer_id' => $data['customer_id'] ?? null,
            'invoice_number' => $this->generateInvoiceNumber($businessId),
            'invoice_type' => $data['invoice_type'] ?? 'retail_invoice',
            'invoice_date' => now(),
            'subtotal' => 0,
            'tax_amount' => 0,
            'discount_amount' => $data['discount_amount'] ?? 0,
            'round_off' => $data['round_off'] ?? 0,
            'total_amount' => 0,
            'created_by' => auth()->id(),
        ]);

        $subtotal = 0;
        $taxAmount = 0;

        foreach ($data['items'] as $item) {
            $product = \App\Models\Product::find($item['product_id']);
            
            $itemSubtotal = $item['quantity'] * $item['unit_price'];
            $itemDiscount = $itemSubtotal * ($item['discount_percentage'] ?? 0) / 100;
            $itemTax = ($itemSubtotal - $itemDiscount) * ($product->gst_percentage ?? 0) / 100;

            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'discount_percentage' => $item['discount_percentage'] ?? 0,
                'discount_amount' => $itemDiscount,
                'tax_percentage' => $product->gst_percentage,
                'tax_amount' => $itemTax,
                'line_total' => $itemSubtotal - $itemDiscount + $itemTax,
            ]);

            $subtotal += $itemSubtotal;
            $taxAmount += $itemTax;

            // Update stock
            $stock = Stock::where('product_id', $item['product_id'])->first();
            if ($stock) {
                $stock->decrement('current_stock', $item['quantity']);
                StockMovement::create([
                    'stock_id' => $stock->id,
                    'product_id' => $item['product_id'],
                    'business_id' => $businessId,
                    'movement_type' => 'sale',
                    'quantity' => -$item['quantity'],
                    'reference_type' => 'invoice',
                    'reference_id' => $invoice->id,
                ]);
            }
        }

        $totalAmount = $subtotal - ($data['discount_amount'] ?? 0) + $taxAmount + ($data['round_off'] ?? 0);

        $invoiceStatus = ($data['payment_status'] ?? '') === 'hold' ? 'held' : 'confirmed';

        $invoice->update([
            'subtotal' => $subtotal,
            'tax_amount' => $taxAmount,
            'total_amount' => $totalAmount,
            'invoice_status' => $invoiceStatus,
        ]);

        // Auto-record payment if paid at POS
        if (($data['payment_status'] ?? '') === 'paid' && $totalAmount > 0) {
            Payment::create([
                'invoice_id' => $invoice->id,
                'business_id' => $businessId,
                'amount' => $totalAmount,
                'payment_method' => $data['payment_mode'] ?? 'cash',
                'payment_date' => now(),
            ]);
            $invoice->update(['payment_status' => 'paid']);
        }

        return $invoice;
    }

    public function recordPayment($invoiceId, $data)
    {
        $invoice = Invoice::find($invoiceId);
        
        Payment::create([
            'invoice_id' => $invoiceId,
            'business_id' => $invoice->business_id,
            'amount' => $data['amount'],
            'payment_method' => $data['payment_method'],
            'reference_number' => $data['reference_number'] ?? null,
            'payment_date' => now(),
            'notes' => $data['notes'] ?? null,
        ]);

        // Update invoice payment status
        $totalPaid = $invoice->payments()->sum('amount');
        if ($totalPaid >= $invoice->total_amount) {
            $invoice->update(['payment_status' => 'paid']);
        } elseif ($totalPaid > 0) {
            $invoice->update(['payment_status' => 'partially_paid']);
        }

        return true;
    }

    public function createSaleReturn($businessId, Invoice $originalInvoice, array $returnItems, ?string $reason = null): Invoice
    {
        if ($originalInvoice->invoice_status === 'cancelled') {
            throw new \Exception('Cannot return a cancelled invoice');
        }
        if ($originalInvoice->invoice_type === 'sale_return') {
            throw new \Exception('Cannot return a return invoice');
        }

        $returnInvoice = Invoice::create([
            'business_id'    => $businessId,
            'customer_id'    => $originalInvoice->customer_id,
            'invoice_number' => $this->generateReturnNumber($businessId),
            'invoice_type'   => 'sale_return',
            'invoice_date'   => now(),
            'invoice_status' => 'confirmed',
            'payment_status' => 'paid',
            'subtotal'       => 0,
            'tax_amount'     => 0,
            'discount_amount'=> 0,
            'round_off'      => 0,
            'total_amount'   => 0,
            'notes'          => 'Return of ' . $originalInvoice->invoice_number . ($reason ? ': ' . $reason : ''),
            'created_by'     => auth()->id(),
        ]);

        $subtotal  = 0;
        $taxAmount = 0;
        $inventoryService = new \App\Services\InventoryService();

        $originalInvoice->load('items');

        foreach ($returnItems as $item) {
            $original = $originalInvoice->items
                ->firstWhere('product_id', $item['product_id']);

            if (!$original) continue;

            $qty        = min((float) $item['quantity'], (float) $original->quantity);
            $lineBase   = $qty * $original->unit_price;
            $lineDisc   = $lineBase * ($original->discount_percentage ?? 0) / 100;
            $lineTax    = ($lineBase - $lineDisc) * ($original->tax_percentage ?? 0) / 100;
            $lineTotal  = $lineBase - $lineDisc + $lineTax;

            InvoiceItem::create([
                'invoice_id'          => $returnInvoice->id,
                'product_id'          => $item['product_id'],
                'quantity'            => $qty,
                'unit_price'          => $original->unit_price,
                'discount_percentage' => $original->discount_percentage,
                'discount_amount'     => $lineDisc,
                'tax_percentage'      => $original->tax_percentage,
                'tax_amount'          => $lineTax,
                'line_total'          => $lineTotal,
            ]);

            $subtotal  += $lineBase;
            $taxAmount += $lineTax;

            // Add stock back at current WAC — no WAC recalculation for returns
            $inventoryService->addStock(
                $item['product_id'], $businessId, $qty,
                'return', 'invoice', $returnInvoice->id
            );
        }

        $totalReturn = $subtotal + $taxAmount;

        $returnInvoice->update([
            'subtotal'     => $subtotal,
            'tax_amount'   => $taxAmount,
            'total_amount' => $totalReturn,
        ]);

        // Credit customer: reduce outstanding due (shop owes them the refund)
        if ($originalInvoice->customer_id && $totalReturn > 0) {
            $customer = Customer::find($originalInvoice->customer_id);
            if ($customer) {
                $customer->update(['due_amount' => max(0, $customer->due_amount - $totalReturn)]);
            }
        }

        return $returnInvoice;
    }

    private function generateInvoiceNumber($businessId)
    {
        $prefix = 'INV';
        $lastInvoice = Invoice::where('business_id', $businessId)
            ->latest('id')
            ->first();

        $number = ($lastInvoice ? intval(substr($lastInvoice->invoice_number, -6)) : 0) + 1;
        return $prefix . str_pad($number, 6, '0', STR_PAD_LEFT);
    }

    private function generateReturnNumber($businessId): string
    {
        $last = Invoice::where('business_id', $businessId)
            ->where('invoice_type', 'sale_return')
            ->latest('id')
            ->first();
        $number = ($last ? intval(substr($last->invoice_number, -6)) : 0) + 1;
        return 'RET' . str_pad($number, 6, '0', STR_PAD_LEFT);
    }
}
