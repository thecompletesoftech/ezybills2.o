<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'price',
        'currency',
        'billing_cycle',
        'device_limit',
        'user_limit',
        'whatsapp_message_limit',
        'branch_limit',
        'storage_limit',
        'features',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'device_limit' => 'integer',
        'user_limit' => 'integer',
        'whatsapp_message_limit' => 'integer',
        'branch_limit' => 'integer',
        'storage_limit' => 'integer',
        'features' => 'array',
        'is_active' => 'boolean',
    ];

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    public function businesses()
    {
        return $this->hasMany(Business::class, 'subscription_plan_id');
    }
}
