<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceItem extends Model
{
    use HasFactory;

    protected $appends = ['discount', 'gst_rate', 'gst_amount', 'subtotal'];

    protected $fillable = [
        'invoice_id',
        'product_id',
        'quantity',
        'unit_price',
        'discount_percentage',
        'discount_amount',
        'tax_percentage',
        'tax_amount',
        'line_total',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_percentage' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'line_total' => 'decimal:2',
    ];

    public function getDiscountAttribute(): float { return (float) $this->discount_amount; }
    public function getGstRateAttribute(): float { return (float) $this->tax_percentage; }
    public function getGstAmountAttribute(): float { return (float) $this->tax_amount; }
    public function getSubtotalAttribute(): float { return (float) $this->line_total; }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
