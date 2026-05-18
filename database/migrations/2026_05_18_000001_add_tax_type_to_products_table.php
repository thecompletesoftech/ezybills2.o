<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->enum('tax_type', ['inclusive', 'exclusive'])
                ->default('exclusive')
                ->after('gst_percentage');
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->enum('tax_type', ['inclusive', 'exclusive'])
                ->default('exclusive')
                ->after('tax_percentage');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('tax_type');
        });

        Schema::table('invoice_items', function (Blueprint $table) {
            $table->dropColumn('tax_type');
        });
    }
};
