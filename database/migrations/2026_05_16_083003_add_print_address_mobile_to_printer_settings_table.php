<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('printer_settings', function (Blueprint $table) {
            $table->boolean('print_address')->default(true)->after('print_logo');
            $table->boolean('print_mobile')->default(true)->after('print_address');
        });
    }

    public function down(): void
    {
        Schema::table('printer_settings', function (Blueprint $table) {
            $table->dropColumn(['print_address', 'print_mobile']);
        });
    }
};
