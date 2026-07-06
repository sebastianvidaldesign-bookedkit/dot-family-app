<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('symptom_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_log_id')->constrained()->cascadeOnDelete();
            $table->enum('symptom_type', ['cramps', 'tired', 'headache', 'emotional', 'nothing']);
            $table->timestamps();

            $table->unique(['period_log_id', 'symptom_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('symptom_logs');
    }
};
