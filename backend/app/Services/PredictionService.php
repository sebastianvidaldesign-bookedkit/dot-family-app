<?php

namespace App\Services;

use App\Models\CycleProfile;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class PredictionService
{
    public function predict(CycleProfile $profile): array
    {
        $periodLogs = $profile->periodLogs()
            ->where('is_period_day', true)
            ->orderBy('date')
            ->get();

        $starts = $this->findCycleStarts($periodLogs);

        if (count($starts) < 2) {
            return [
                'status'  => 'learning',
                'message' => 'Still getting to know your cycle. After a few more cycles, this will have a better guess for you.',
            ];
        }

        $gaps = $this->calculateValidGaps($starts);

        if (empty($gaps)) {
            return [
                'status'  => 'learning',
                'message' => 'Still getting to know your cycle. After a few more cycles, this will have a better guess for you.',
            ];
        }

        $avgDays   = (int) round(array_sum($gaps) / count($gaps));
        $lastStart = end($starts);

        $predictedCenter = $lastStart->copy()->addDays($avgDays);
        $rangeStart      = $predictedCenter->copy()->subDays(3);
        $rangeEnd        = $predictedCenter->copy()->addDays(3);

        return [
            'status'            => 'predicted',
            'range_start'       => $rangeStart->format('Y-m-d'),
            'range_end'         => $rangeEnd->format('Y-m-d'),
            'avg_cycle_days'    => $avgDays,
            'last_period_start' => $lastStart->format('Y-m-d'),
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

            if ($gap >= 15 && $gap <= 60) {
                $gaps[] = $gap;
            }
        }

        return $gaps;
    }
}
