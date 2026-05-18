<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Token extends Model
{
    protected $fillable = [
        'business_id', 'token_number', 'token_time', 'token_amount', 'items', 'status', 'notes',
    ];

    protected $casts = [
        'token_time' => 'datetime',
        'token_amount' => 'decimal:2',
        'items' => 'array',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }
}
