<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BusinessSettings extends Model
{
    use HasFactory;

    protected $fillable = [
        'business_id',
        'financial_year',
        'tax_rate',
        'currency',
        'invoice_prefix',
        'low_stock_level',
        'enable_restaurant_features',
        'enable_whatsapp',
        'enable_subscription',
        'thermal_printer_model',
        'receipt_width',
        'printer_ip',
        'settings',
    ];

    protected $casts = [
        'settings' => 'array',
        'enable_restaurant_features' => 'boolean',
        'enable_whatsapp' => 'boolean',
        'enable_subscription' => 'boolean',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }
}
