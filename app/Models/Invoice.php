<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $appends = ['status', 'gst_amount', 'paid_amount', 'balance_due'];

    protected $fillable = [
        'business_id',
        'customer_id',
        'invoice_number',
        'invoice_type',
        'invoice_date',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'round_off',
        'total_amount',
        'payment_status',
        'invoice_status',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'invoice_date' => 'datetime',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'round_off' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    public function getStatusAttribute(): string
    {
        if ($this->invoice_status === 'cancelled') return 'cancelled';
        return match($this->payment_status) {
            'paid' => 'paid',
            'partially_paid' => 'partial',
            default => 'unpaid',
        };
    }

    public function getGstAmountAttribute(): float
    {
        return (float) $this->tax_amount;
    }

    public function getPaidAmountAttribute(): float
    {
        if ($this->relationLoaded('payments')) {
            return (float) $this->payments->sum('amount');
        }
        return (float) Payment::where('invoice_id', $this->id)->sum('amount');
    }

    public function getBalanceDueAttribute(): float
    {
        return max(0.0, (float) $this->total_amount - $this->paid_amount);
    }

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function items()
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isPaid()
    {
        return $this->payment_status === 'paid';
    }

    public function isPending()
    {
        return $this->payment_status === 'pending';
    }

    public function isPartiallyPaid()
    {
        return $this->payment_status === 'partially_paid';
    }
}
