<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Stock extends Model
{
    use HasFactory;

    protected $table = 'stock';

    protected $fillable = [
        'product_id',
        'business_id',
        'opening_stock',
        'current_stock',
        'warehouse_stock',
        'reserved_stock',
        'last_updated_at',
    ];

    protected $casts = [
        'opening_stock' => 'decimal:2',
        'current_stock' => 'decimal:2',
        'warehouse_stock' => 'decimal:2',
        'reserved_stock' => 'decimal:2',
        'last_updated_at' => 'datetime',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function movements()
    {
        return $this->hasMany(StockMovement::class);
    }

    public function isLowStock($lowStockLevel = 10)
    {
        return $this->current_stock <= $lowStockLevel;
    }

    public function isOutOfStock()
    {
        return $this->current_stock <= 0;
    }

    public function getAvailableQuantity()
    {
        return $this->current_stock - $this->reserved_stock;
    }
}
