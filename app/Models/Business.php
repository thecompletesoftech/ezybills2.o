<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Business extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'owner_id',
        'business_type',
        'gst_number',
        'address',
        'mobile_number',
        'email',
        'logo_url',
        'invoice_footer',
        'bank_account_number',
        'bank_ifsc',
        'upi_id',
        'qr_code_url',
        'is_active',
        'subscription_plan_id',
        'subscription_expires_at',
    ];

    protected $casts = [
        'subscription_expires_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function customers()
    {
        return $this->hasMany(Customer::class);
    }

    public function suppliers()
    {
        return $this->hasMany(Supplier::class);
    }

    public function settings()
    {
        return $this->hasOne(BusinessSettings::class);
    }

    public function subscriptionPlan()
    {
        return $this->belongsTo(Plan::class, 'subscription_plan_id');
    }

    public function devices()
    {
        return $this->hasMany(Device::class);
    }

    public function isRestaurant()
    {
        return in_array($this->business_type, ['restaurant', 'cafe', 'food_cart', 'bakery']);
    }
}
