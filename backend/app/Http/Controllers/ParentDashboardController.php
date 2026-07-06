<?php

namespace App\Http\Controllers;

use App\Services\PredictionService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ParentDashboardController extends Controller
{
    public function index(Request $request)
    {
        $parent = $request->user();

        $family = $parent->families()->first();
        if (! $family) {
            return response()->json($this->noData('No family found.'));
        }

        $child = $family->users()->where('users.role', 'child')->first();
        if (! $child) {
            return response()->json($this->noData('No child found in family.'));
        }

        $profile = $child->cycleProfile;
        if (! $profile) {
            return response()->json($this->noData('No cycle profile yet.'));
        }

        // Parents always have full access — no sharing gate.
        $prediction    = app(PredictionService::class)->predict($profile);
        $periodSummary = $this->buildPeriodSummary($profile);

        // Calendar: current month, all period days, full detail.
        $month = now()->format('Y-m');
        $calendarLogs = $profile->periodLogs()
            ->with('symptoms')
            ->where('is_period_day', true)
            ->whereYear('date', (int) substr($month, 0, 4))
            ->whereMonth('date', (int) substr($month, 5, 2))
            ->orderBy('date')
            ->get();

        $calendar = $calendarLogs->map(fn ($log) => [
            'date'     => Carbon::parse($log->date)->format('Y-m-d'),
            'flow'     => $log->flow,
            'symptoms' => $log->symptoms->pluck('symptom_type')->values()->all(),
        ]);

        return response()->json([
            'shared'         => true,
            'period_summary' => $periodSummary,
            'prediction'     => $prediction,
            'calendar'       => $calendar,
        ]);
    }

    private function buildPeriodSummary($profile): ?array
    {
        $allLogs = $profile->periodLogs()
            ->where('is_period_day', true)
            ->orderBy('date')
            ->get();

        if ($allLogs->isEmpty()) {
            return null;
        }

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

        $startLog = collect($lastBlock)->firstWhere('is_cycle_start', true);
        $hasCycleStartMarker = $startLog !== null;

        if (! $startLog) {
            $startLog = $lastBlock[0];
        }

        $startDate    = Carbon::parse($startLog->date);
        $lastDate     = Carbon::parse(end($lastBlock)->date);
        $durationDays = (int) $startDate->diffInDays($lastDate) + 1;

        return [
            'started'                => $startDate->format('Y-m-d'),
            'last_logged_day'        => $lastDate->format('Y-m-d'),
            'duration_days'          => $durationDays,
            'has_cycle_start_marker' => $hasCycleStartMarker,
        ];
    }

    private function noData(?string $message = null): array
    {
        $payload = [
            'shared'         => false,
            'period_summary' => null,
            'prediction'     => ['status' => 'none'],
            'calendar'       => [],
        ];

        if ($message) {
            $payload['message'] = $message;
        }

        return $payload;
    }
}
