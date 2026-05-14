<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'business_id',
        'name',
        'phone',
        'email',
        'gst_number',
        'address',
        'group_id',
        'credit_limit',
        'due_amount',
        'total_purchases',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'credit_limit' => 'decimal:2',
        'due_amount' => 'decimal:2',
        'total_purchases' => 'decimal:2',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function group()
    {
        return $this->belongsTo(CustomerGroup::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function ledger()
    {
        return $this->hasMany(CustomerLedger::class);
    }

    public function payments()
    {
        return $this->hasMany(CustomerPayment::class);
    }

    public function hasDue()
    {
        return $this->due_amount > 0;
    }

    public function hasOverdue()
    {
        $dueDays = now()->diffInDays(now()->subDays(30));
        return $this->due_amount > 0 && $dueDays > 30;
    }
}
