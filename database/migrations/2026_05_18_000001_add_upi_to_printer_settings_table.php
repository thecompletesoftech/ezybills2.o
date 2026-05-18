<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('printer_settings', function (Blueprint $table) {
            $table->string('upi_id', 100)->nullable()->after('footer_text');
            $table->boolean('print_upi_qr')->default(false)->after('upi_id');
        });
    }

    public function down(): void
    {
        Schema::table('printer_settings', function (Blueprint $table) {
            $table->dropColumn(['upi_id', 'print_upi_qr']);
        });
    }
};
