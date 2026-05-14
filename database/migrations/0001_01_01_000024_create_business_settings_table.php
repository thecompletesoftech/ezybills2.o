<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('business_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->unique()->constrained()->onDelete('cascade');
            $table->string('financial_year')->nullable();
            $table->decimal('tax_rate', 5, 2)->default(18);
            $table->string('currency')->default('INR');
            $table->string('invoice_prefix')->default('INV');
            $table->integer('low_stock_level')->default(10);
            $table->boolean('enable_restaurant_features')->default(false);
            $table->boolean('enable_whatsapp')->default(false);
            $table->boolean('enable_subscription')->default(false);
            $table->string('thermal_printer_model')->nullable();
            $table->string('receipt_width')->nullable();
            $table->string('printer_ip')->nullable();
            $table->json('settings')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business_settings');
    }
};
