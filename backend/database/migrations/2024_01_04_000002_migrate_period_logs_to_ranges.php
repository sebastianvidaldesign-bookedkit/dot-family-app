<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Backfill: convert consecutive period_log rows into period_range rows.
// Safe to run on a fresh install (no period_logs → no-op).
// Idempotent: skips start_dates that already exist in period_ranges.
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('period_logs')) {
            return;
        }

        $profiles = DB::table('cycle_profiles')->get();

        foreach ($profiles as $profile) {
            $logs = DB::table('period_logs')
                ->where('cycle_profile_id', $profile->id)
                ->where('is_period_day', true)
                ->orderBy('date')
                ->get();

            if ($logs->isEmpty()) {
                continue;
            }

            // Group into consecutive blocks (gap > 1 day starts a new block).
            $blocks   = [];
            $block    = [];
            $prevDate = null;

            foreach ($logs as $log) {
                $date = Carbon::parse($log->date);

                if ($prevDate === null || $date->diffInDays($prevDate) > 1) {
                    if (! empty($block)) {
                        $blocks[] = $block;
                    }
                    $block = [];
                }

                $block[]  = $log;
                $prevDate = $date;
            }

            if (! empty($block)) {
                $blocks[] = $block;
            }

            foreach ($blocks as $blockLogs) {
                $collection = collect($blockLogs);

                // Prefer the explicitly-marked cycle-start log; fall back to first log.
                $startLog = $collection->first(fn ($l) => (bool) $l->is_cycle_start) ?? $blockLogs[0];
                $endLog   = end($blockLogs);

                $startDate = Carbon::parse($startLog->date)->format('Y-m-d');
                $endDate   = Carbon::parse($endLog->date)->format('Y-m-d');

                // Skip if already migrated.
                $exists = DB::table('period_ranges')
                    ->where('cycle_profile_id', $profile->id)
                    ->where('start_date', $startDate)
                    ->exists();

                if ($exists) {
                    continue;
                }

                // Gather symptoms from all logs in the block, deduplicated, minus "nothing".
                $logIds   = $collection->pluck('id')->all();
                $symptoms = [];

                if (Schema::hasTable('symptom_logs') && ! empty($logIds)) {
                    $symptoms = DB::table('symptom_logs')
                        ->whereIn('period_log_id', $logIds)
                        ->pluck('symptom_type')
                        ->filter(fn ($s) => $s !== 'nothing')
                        ->unique()
                        ->values()
                        ->all();
                }

                $updatedBy = $endLog->updated_by_user_id
                    ?? $endLog->created_by_user_id
                    ?? $startLog->created_by_user_id;

                DB::table('period_ranges')->insert([
                    'cycle_profile_id'   => $profile->id,
                    'start_date'         => $startDate,
                    'end_date'           => $endDate,
                    'flow'               => $startLog->flow ?? null,
                    'symptoms'           => json_encode(array_values($symptoms)),
                    'created_by_user_id' => $startLog->created_by_user_id,
                    'updated_by_user_id' => $updatedBy,
                    'created_at'         => now(),
                    'updated_at'         => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        DB::table('period_ranges')->truncate();
    }
};
