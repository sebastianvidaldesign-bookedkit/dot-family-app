<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cycle_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('family_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('average_cycle_length')->default(28);
            $table->enum('share_level', ['basic', 'flow', 'symptoms', 'everything'])->default('basic');
            $table->boolean('share_with_parent_1')->default(false);
            $table->boolean('share_with_parent_2')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cycle_profiles');
    }
};
