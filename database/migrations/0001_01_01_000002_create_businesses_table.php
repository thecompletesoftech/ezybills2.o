<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('businesses', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('owner_id')->constrained('users')->onDelete('cascade');
            $table->enum('business_type', ['retail', 'grocery', 'mobile_shop', 'electronics', 'fashion', 'medical', 'hardware', 'cafe', 'restaurant', 'food_cart', 'bakery'])->default('retail');
            $table->string('gst_number')->nullable();
            $table->text('address')->nullable();
            $table->string('mobile_number')->nullable();
            $table->string('email')->nullable();
            $table->string('logo_url')->nullable();
            $table->text('invoice_footer')->nullable();
            $table->string('bank_account_number')->nullable();
            $table->string('bank_ifsc')->nullable();
            $table->string('upi_id')->nullable();
            $table->string('qr_code_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('subscription_plan_id')->nullable();
            $table->timestamp('subscription_expires_at')->nullable();
            $table->timestamps();
        });

        // Add the FK from users.business_id now that businesses table exists
        Schema::table('users', function (Blueprint $table) {
            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['business_id']);
        });
        Schema::dropIfExists('businesses');
    }
};
