<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('period_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cycle_profile_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->boolean('is_period_day')->default(false);
            $table->enum('flow', ['light', 'medium', 'heavy', 'not_sure'])->nullable();
            $table->foreignId('created_by_user_id')->constrained('users');
            $table->timestamps();

            $table->unique(['cycle_profile_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('period_logs');
    }
};
