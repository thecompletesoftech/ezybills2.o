<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RestaurantTable extends Model
{
    protected $table = 'tables';

    protected $fillable = [
        'business_id', 'table_number', 'seats', 'status', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'seats' => 'integer',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function kots()
    {
        return $this->hasMany(Kot::class, 'table_id');
    }

    public function activeKots()
    {
        return $this->kots()->whereIn('status', ['pending', 'in_progress']);
    }
}
