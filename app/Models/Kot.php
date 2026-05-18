<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Kot extends Model
{
    protected $fillable = [
        'business_id', 'table_id', 'kot_number', 'kot_time', 'items', 'status', 'notes',
    ];

    protected $casts = [
        'kot_time' => 'datetime',
        'items' => 'array',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function table()
    {
        return $this->belongsTo(RestaurantTable::class, 'table_id');
    }
}
