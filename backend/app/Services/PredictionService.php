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

    private const MIN_GAP            = 15;  // ignore gaps shorter than this (data error)
    private const MAX_GAP            = 60;  // ignore gaps longer than this (data error)
    private const LEARNED_RANGE_DAYS = 3;   // ±3 day window for learned estimate
    private const OVULATION_OFFSET   = 14;  // days before estimated next period
    private const OVULATION_WINDOW   = 2;   // ±2 days around ovulation center

    public function predict(CycleProfile $profile): array
    {
        // Use period_ranges.start_date as the cycle start.
        $starts = $profile->periodRanges()
            ->orderBy('start_date')
            ->pluck('start_date')
            ->map(fn ($d) => Carbon::parse($d))
            ->all();

        $summary = $this->buildSummary($profile);

        if (count($starts) === 0) {
            return array_merge($summary, [
                'status'                          => 'none',
                'message'                         => 'Dot will learn as you add periods.',
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

        // 2+ starts — learn from average of valid start-to-start gaps.
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
                'message'                         => 'Your calendar is still learning. Keep adding periods.',
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

    private function buildSummary(CycleProfile $profile): array
    {
        $empty = [
            'last_period_start'      => null,
            'last_logged_period_day' => null,
            'duration_days'          => null,
            'period_start_source'    => 'none',
            'period_ongoing'         => false,
        ];

        $latest = $profile->periodRanges()
            ->orderBy('start_date', 'desc')
            ->first();

        if (! $latest) {
            return $empty;
        }

        $startDate = Carbon::parse($latest->start_date);
        $endDate   = $latest->end_date ? Carbon::parse($latest->end_date) : null;
        $ongoing   = $latest->end_date === null;

        // Duration from start to end (inclusive); if ongoing, count to today.
        $durationEnd  = $endDate ?? now()->startOfDay();
        $durationDays = (int) $startDate->diffInDays($durationEnd) + 1;

        return [
            'last_period_start'      => $startDate->format('Y-m-d'),
            'last_logged_period_day' => $endDate ? $endDate->format('Y-m-d') : null,
            'duration_days'          => $durationDays,
            'period_start_source'    => 'explicit',
            'period_ongoing'         => $ongoing,
        ];
    }
}
