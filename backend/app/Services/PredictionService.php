<?php

namespace App\Services;

use App\Models\CycleProfile;
use Carbon\Carbon;

class PredictionService
{
    // Adolescent cycle norms per ACOG/AAP guidance (first gynecologic years)
    private const ADOLESCENT_MIN_DAYS    = 21;
    private const ADOLESCENT_CENTER_DAYS = 32; // mean first-year interval
    private const ADOLESCENT_MAX_DAYS    = 45;

    private const MIN_GAP             = 15;  // ignore gaps shorter than this (data error)
    private const MAX_GAP             = 60;  // ignore gaps longer than this (data error)
    private const LEARNED_RANGE_DAYS  = 3;   // ±3 day window for learned estimate
    private const OVULATION_OFFSET    = 14;  // days before estimated next period
    private const OVULATION_WINDOW    = 2;   // ±2 days around ovulation center

    public function predict(CycleProfile $profile): array
    {
        $starts = $profile->periodLogs()
            ->where('is_period_day', true)
            ->where('is_cycle_start', true)
            ->orderBy('date')
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d))
            ->all();

        $summary = $this->buildSummary($profile);

        if (count($starts) === 0) {
            return array_merge($summary, [
                'status'                          => 'none',
                'message'                         => 'Dot will learn as you add period days.',
                'confidence_label'                => null,
                'estimated_center_date'           => null,
                'estimated_range_start'           => null,
                'estimated_range_end'             => null,
                'average_cycle_days'              => null,
                'possible_ovulation_window_start' => null,
                'possible_ovulation_window_end'   => null,
            ]);
        }

        $lastStart = end($starts);

        if (count($starts) === 1) {
            $center     = $lastStart->copy()->addDays(self::ADOLESCENT_CENTER_DAYS);
            $rangeStart = $lastStart->copy()->addDays(self::ADOLESCENT_MIN_DAYS);
            $rangeEnd   = $lastStart->copy()->addDays(self::ADOLESCENT_MAX_DAYS);
            $ovCenter   = $center->copy()->subDays(self::OVULATION_OFFSET);

            return array_merge($summary, [
                'status'                          => 'first_guess',
                'message'                         => 'Cycles can be irregular when periods first start — this is a wide first guess.',
                'confidence_label'                => 'first guess',
                'estimated_center_date'           => $center->format('Y-m-d'),
                'estimated_range_start'           => $rangeStart->format('Y-m-d'),
                'estimated_range_end'             => $rangeEnd->format('Y-m-d'),
                'average_cycle_days'              => null,
                'possible_ovulation_window_start' => $ovCenter->copy()->subDays(self::OVULATION_WINDOW)->format('Y-m-d'),
                'possible_ovulation_window_end'   => $ovCenter->copy()->addDays(self::OVULATION_WINDOW)->format('Y-m-d'),
            ]);
        }

        // 2+ starts — learn from average of valid first-day-to-first-day gaps.
        $gaps = [];
        for ($i = 1; $i < count($starts); $i++) {
            $gap = $starts[$i - 1]->diffInDays($starts[$i]);
            if ($gap >= self::MIN_GAP && $gap <= self::MAX_GAP) {
                $gaps[] = $gap;
            }
        }

        if (empty($gaps)) {
            return array_merge($summary, [
                'status'                          => 'none',
                'message'                         => 'Your calendar is still learning. Keep adding days.',
                'confidence_label'                => null,
                'estimated_center_date'           => null,
                'estimated_range_start'           => null,
                'estimated_range_end'             => null,
                'average_cycle_days'              => null,
                'possible_ovulation_window_start' => null,
                'possible_ovulation_window_end'   => null,
            ]);
        }

        $avgDays    = (int) round(array_sum($gaps) / count($gaps));
        $center     = $lastStart->copy()->addDays($avgDays);
        $rangeStart = $center->copy()->subDays(self::LEARNED_RANGE_DAYS);
        $rangeEnd   = $center->copy()->addDays(self::LEARNED_RANGE_DAYS);
        $ovCenter   = $center->copy()->subDays(self::OVULATION_OFFSET);

        return array_merge($summary, [
            'status'                          => 'learned',
            'message'                         => 'Dot will keep learning over time.',
            'confidence_label'                => 'based on previous periods',
            'estimated_center_date'           => $center->format('Y-m-d'),
            'estimated_range_start'           => $rangeStart->format('Y-m-d'),
            'estimated_range_end'             => $rangeEnd->format('Y-m-d'),
            'average_cycle_days'              => $avgDays,
            'possible_ovulation_window_start' => $ovCenter->copy()->subDays(self::OVULATION_WINDOW)->format('Y-m-d'),
            'possible_ovulation_window_end'   => $ovCenter->copy()->addDays(self::OVULATION_WINDOW)->format('Y-m-d'),
        ]);
    }

    // Build period summary from the most recent consecutive block of period days.
    private function buildSummary(CycleProfile $profile): array
    {
        $empty = [
            'last_period_start'      => null,
            'last_logged_period_day' => null,
            'duration_days'          => null,
            'period_start_source'    => 'none',
        ];

        $allLogs = $profile->periodLogs()
            ->where('is_period_day', true)
            ->orderBy('date')
            ->get();

        if ($allLogs->isEmpty()) {
            return $empty;
        }

        // Group into consecutive blocks (gaps > 1 day split a block).
        $blocks = [];
        $block  = [];

        foreach ($allLogs as $log) {
            $date = Carbon::parse($log->date);

            if (empty($block)) {
                $block[] = $log;
            } else {
                $prev = Carbon::parse(end($block)->date);
                if ($date->diffInDays($prev) === 1) {
                    $block[] = $log;
                } else {
                    $blocks[] = $block;
                    $block    = [$log];
                }
            }
        }

        if (! empty($block)) {
            $blocks[] = $block;
        }

        $lastBlock = end($blocks);

        // Prefer the explicit is_cycle_start marker; fall back to the block's first day.
        $startLog = collect($lastBlock)->firstWhere('is_cycle_start', true);
        $source   = $startLog ? 'explicit' : 'inferred';

        if (! $startLog) {
            $startLog = $lastBlock[0];
        }

        $startDate    = Carbon::parse($startLog->date);
        $lastDate     = Carbon::parse(end($lastBlock)->date);
        $durationDays = (int) $startDate->diffInDays($lastDate) + 1;

        return [
            'last_period_start'      => $startDate->format('Y-m-d'),
            'last_logged_period_day' => $lastDate->format('Y-m-d'),
            'duration_days'          => $durationDays,
            'period_start_source'    => $source,
        ];
    }
}
