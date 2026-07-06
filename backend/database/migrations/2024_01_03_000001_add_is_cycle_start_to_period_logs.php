<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('period_logs', function (Blueprint $table) {
            $table->boolean('is_cycle_start')->default(false)->after('is_period_day');
        });
    }

    public function down(): void
    {
        Schema::table('period_logs', function (Blueprint $table) {
            $table->dropColumn('is_cycle_start');
        });
    }
};
