<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    use HasFactory;

    protected $fillable = [
        'business_id',
        'name',
        'phone',
        'email',
        'gst_number',
        'address',
        'due_amount',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'due_amount' => 'decimal:2',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function purchases()
    {
        return $this->hasMany(Purchase::class);
    }

    public function ledger()
    {
        return $this->hasMany(SupplierLedger::class);
    }

    public function hasDue()
    {
        return $this->due_amount > 0;
    }
}
