<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('period_ranges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cycle_profile_id')->constrained()->cascadeOnDelete();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->enum('flow', ['light', 'medium', 'heavy', 'not_sure'])->nullable();
            $table->json('symptoms')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users');
            $table->foreignId('updated_by_user_id')->constrained('users');
            $table->timestamps();

            $table->unique(['cycle_profile_id', 'start_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('period_ranges');
    }
};
