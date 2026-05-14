<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Device extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'business_id',
        'device_name',
        'device_id',
        'device_type',
        'os',
        'ip_address',
        'last_login_at',
        'last_active_at',
        'is_active',
    ];

    protected $casts = [
        'last_login_at' => 'datetime',
        'last_active_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function business()
    {
        return $this->belongsTo(Business::class);
    }
}
