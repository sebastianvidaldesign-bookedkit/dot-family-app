<?php

namespace App\Services;

use App\Models\CycleProfile;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class PredictionService
{
    private const FALLBACK_CYCLE_DAYS = 28;
    private const MIN_GAP = 15;
    private const MAX_GAP = 60;
    private const RANGE_DAYS = 3;

    public function predict(CycleProfile $profile): array
    {
        $periodLogs = $profile->periodLogs()
            ->where('is_period_day', true)
            ->orderBy('date')
            ->get();

        $starts = $this->findCycleStarts($periodLogs);

        if (count($starts) === 0) {
            return [
                'status'           => 'none',
                'message'          => 'Your calendar will learn as you add days.',
                'confidence_label' => null,
                'range_start'      => null,
                'range_end'        => null,
                'last_period_start'=> null,
                'avg_cycle_days'   => null,
            ];
        }

        $lastStart = end($starts);

        if (count($starts) === 1) {
            // Fallback: one data point, assume a typical 28-day cycle.
            $center     = $lastStart->copy()->addDays(self::FALLBACK_CYCLE_DAYS);
            $rangeStart = $center->copy()->subDays(self::RANGE_DAYS);
            $rangeEnd   = $center->copy()->addDays(self::RANGE_DAYS);

            return [
                'status'           => 'fallback',
                'message'          => 'This is just a first guess. Cycles can be irregular when they first start.',
                'confidence_label' => 'first guess',
                'range_start'      => $rangeStart->format('Y-m-d'),
                'range_end'        => $rangeEnd->format('Y-m-d'),
                'last_period_start'=> $lastStart->format('Y-m-d'),
                'avg_cycle_days'   => self::FALLBACK_CYCLE_DAYS,
            ];
        }

        // 2+ starts — use the average of valid gaps.
        $gaps = $this->calculateValidGaps($starts);

        if (empty($gaps)) {
            return [
                'status'           => 'none',
                'message'          => 'Your calendar is still learning. Keep adding days.',
                'confidence_label' => null,
                'range_start'      => null,
                'range_end'        => null,
                'last_period_start'=> $lastStart->format('Y-m-d'),
                'avg_cycle_days'   => null,
            ];
        }

        $avgDays    = (int) round(array_sum($gaps) / count($gaps));
        $center     = $lastStart->copy()->addDays($avgDays);
        $rangeStart = $center->copy()->subDays(self::RANGE_DAYS);
        $rangeEnd   = $center->copy()->addDays(self::RANGE_DAYS);

        return [
            'status'           => 'learned',
            'message'          => 'Cycles can be irregular, especially at first. This is only a guess.',
            'confidence_label' => 'learning',
            'range_start'      => $rangeStart->format('Y-m-d'),
            'range_end'        => $rangeEnd->format('Y-m-d'),
            'last_period_start'=> $lastStart->format('Y-m-d'),
            'avg_cycle_days'   => $avgDays,
        ];
    }

    private function findCycleStarts(Collection $logs): array
    {
        if ($logs->isEmpty()) {
            return [];
        }

        $dateSet = $logs
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->format('Y-m-d'))
            ->flip()
            ->toArray();

        $starts = [];

        foreach (array_keys($dateSet) as $dateStr) {
            $date      = Carbon::parse($dateStr);
            $dayBefore = $date->copy()->subDay()->format('Y-m-d');

            if (! isset($dateSet[$dayBefore])) {
                $starts[] = $date;
            }
        }

        usort($starts, fn ($a, $b) => $a->lt($b) ? -1 : 1);

        return $starts;
    }

    private function calculateValidGaps(array $starts): array
    {
        $gaps = [];

        for ($i = 1; $i < count($starts); $i++) {
            $gap = $starts[$i - 1]->diffInDays($starts[$i]);

            if ($gap >= self::MIN_GAP && $gap <= self::MAX_GAP) {
                $gaps[] = $gap;
            }
        }

        return $gaps;
    }
}
