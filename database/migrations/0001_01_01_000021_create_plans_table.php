<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['trial', 'monthly', 'quarterly', 'yearly', 'lifetime'])->default('monthly');
            $table->decimal('price', 12, 2)->default(0);
            $table->string('currency')->default('INR');
            $table->integer('billing_cycle')->nullable();
            $table->integer('device_limit')->default(1);
            $table->integer('user_limit')->default(5);
            $table->integer('whatsapp_message_limit')->default(1000);
            $table->integer('branch_limit')->default(1);
            $table->integer('storage_limit')->default(5);
            $table->json('features')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
