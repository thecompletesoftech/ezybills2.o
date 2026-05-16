<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $appends = ['selling_price', 'unit_id', 'unit', 'gst_rate', 'stock_quantity'];

    protected $fillable = [
        'business_id',
        'name',
        'product_code',
        'sku',
        'barcode',
        'category_id',
        'brand_id',
        'supplier_id',
        'hsn_code',
        'gst_percentage',
        'description',
        'purchase_price',
        'sale_price',
        'wholesale_price',
        'mrp',
        'discount_percentage',
        'primary_unit_id',
        'secondary_unit_id',
        'unit_conversion',
        'image_url',
        'low_stock_threshold',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'gst_percentage' => 'float',
        'purchase_price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'wholesale_price' => 'decimal:2',
        'mrp' => 'decimal:2',
    ];

    public function getSellingPriceAttribute(): float
    {
        return (float) $this->sale_price;
    }

    public function getUnitIdAttribute(): ?int
    {
        return $this->primary_unit_id;
    }

    public function getUnitAttribute(): ?Unit
    {
        return $this->primaryUnit;
    }

    public function getGstRateAttribute(): float
    {
        return (float) $this->gst_percentage;
    }

    public function getStockQuantityAttribute(): float
    {
        if ($this->relationLoaded('stock') && $this->stock !== null) {
            return (float) $this->stock->current_stock;
        }
        return 0.0;
    }

    public function business()
    {
        return $this->belongsTo(Business::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function primaryUnit()
    {
        return $this->belongsTo(Unit::class, 'primary_unit_id');
    }

    public function secondaryUnit()
    {
        return $this->belongsTo(Unit::class, 'secondary_unit_id');
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function images()
    {
        return $this->hasMany(ProductImage::class);
    }

    public function stock()
    {
        return $this->hasOne(Stock::class);
    }

    public function invoiceItems()
    {
        return $this->hasMany(InvoiceItem::class);
    }
}
