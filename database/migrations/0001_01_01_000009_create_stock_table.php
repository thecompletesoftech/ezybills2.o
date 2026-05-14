<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->unique()->constrained()->onDelete('cascade');
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->decimal('opening_stock', 12, 2)->default(0);
            $table->decimal('current_stock', 12, 2)->default(0);
            $table->decimal('warehouse_stock', 12, 2)->default(0);
            $table->decimal('reserved_stock', 12, 2)->default(0);
            $table->timestamp('last_updated_at')->nullable();
            $table->timestamps();
            $table->index(['business_id', 'current_stock']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock');
    }
};
