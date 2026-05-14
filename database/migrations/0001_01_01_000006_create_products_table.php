<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('product_code')->nullable();
            $table->string('sku')->nullable();
            $table->string('barcode')->unique()->nullable();
            $table->foreignId('category_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('brand_id')->nullable()->constrained()->onDelete('set null');
            $table->string('hsn_code')->nullable();
            $table->decimal('gst_percentage', 5, 2)->default(0);
            $table->text('description')->nullable();
            $table->decimal('purchase_price', 12, 2);
            $table->decimal('sale_price', 12, 2);
            $table->decimal('wholesale_price', 12, 2)->nullable();
            $table->decimal('mrp', 12, 2)->nullable();
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->foreignId('primary_unit_id')->constrained('units')->onDelete('restrict');
            $table->foreignId('secondary_unit_id')->nullable()->constrained('units')->onDelete('set null');
            $table->decimal('unit_conversion', 8, 2)->nullable();
            $table->string('image_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['business_id', 'barcode']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
