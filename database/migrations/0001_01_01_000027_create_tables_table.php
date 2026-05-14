<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->onDelete('cascade');
            $table->string('table_number');
            $table->integer('seats')->default(2);
            $table->enum('status', ['empty', 'occupied', 'reserved', 'dirty'])->default('empty');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['business_id', 'table_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tables');
    }
};
