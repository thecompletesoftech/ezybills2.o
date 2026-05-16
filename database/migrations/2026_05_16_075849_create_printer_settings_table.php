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
        Schema::create('printer_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('business_id')->unique();
            $table->string('paper_size')->default('80mm');  // 80mm (3in), 58mm (2in), A4
            $table->string('connection_type')->default('usb'); // usb, bluetooth, network
            $table->string('printer_name')->nullable();     // USB/network printer name
            $table->string('bluetooth_address')->nullable(); // Bluetooth MAC address (mobile)
            $table->string('network_ip')->nullable();        // Network printer IP
            $table->integer('network_port')->default(9100);
            $table->boolean('auto_print')->default(false);   // Auto-print on invoice save
            $table->boolean('print_logo')->default(true);
            $table->boolean('print_gst')->default(true);
            $table->boolean('print_footer')->default(true);
            $table->text('footer_text')->nullable();
            $table->integer('copies')->default(1);
            $table->timestamps();

            $table->foreign('business_id')->references('id')->on('businesses')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('printer_settings');
    }
};
