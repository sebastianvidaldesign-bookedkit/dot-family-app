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
            return response()->json($this->notShared('No family found.'));
        }

        $child = $family->users()->where('users.role', 'child')->first();
        if (! $child) {
            return response()->json($this->notShared('No child found in family.'));
        }

        $profile = $child->cycleProfile;
        if (! $profile) {
            return response()->json($this->notShared('No cycle profile yet.'));
        }

        // Determine whether this parent has been granted access.
        $parentUsers = $family->parentUsers();
        $parentIndex = $parentUsers->search(fn ($u) => $u->id === $parent->id);

        $shareGranted = match ($parentIndex) {
            0       => (bool) $profile->share_with_parent_1,
            1       => (bool) $profile->share_with_parent_2,
            default => false,
        };

        if (! $shareGranted) {
            return response()->json($this->notShared());
        }

        $shareLevel = $profile->share_level;
        $prediction = app(PredictionService::class)->predict($profile);

        // Build a period range summary from the most recent consecutive block.
        $periodSummary = $this->buildPeriodSummary($profile);

        // Calendar data: current-month period days with symptoms eager-loaded.
        $month = now()->format('Y-m');
        $calendarLogs = $profile->periodLogs()
            ->with('symptoms')
            ->where('is_period_day', true)
            ->whereYear('date', (int) substr($month, 0, 4))
            ->whereMonth('date', (int) substr($month, 5, 2))
            ->orderBy('date')
            ->get();

        $calendar = $calendarLogs->map(function ($log) use ($shareLevel) {
            $entry = ['date' => Carbon::parse($log->date)->format('Y-m-d')];
            if (in_array($shareLevel, ['flow', 'symptoms', 'everything'])) {
                $entry['flow'] = $log->flow;
            }
            if (in_array($shareLevel, ['symptoms', 'everything'])) {
                $entry['symptoms'] = $log->symptoms->pluck('symptom_type')->values()->all();
            }
            return $entry;
        });

        return response()->json([
            'shared'         => true,
            'share_level'    => $shareLevel,
            'period_summary' => $periodSummary,
            'prediction'     => $prediction,
            'calendar'       => $calendar,
        ]);
    }

    // Build a summary of the most recent period block.
    // Returns null if there are no period days at all.
    private function buildPeriodSummary($profile): ?array
    {
        $allLogs = $profile->periodLogs()
            ->where('is_period_day', true)
            ->orderBy('date')
            ->get();

        if ($allLogs->isEmpty()) {
            return null;
        }

        // Split logs into consecutive blocks.
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

        // Use the most recent block.
        $lastBlock = end($blocks);

        // Find the cycle-start marker, falling back to the first day of the block.
        $startLog = collect($lastBlock)->firstWhere('is_cycle_start', true);
        $hasCycleStartMarker = $startLog !== null;

        if (! $startLog) {
            $startLog = $lastBlock[0];
        }

        $startDate   = Carbon::parse($startLog->date);
        $lastDate    = Carbon::parse(end($lastBlock)->date);
        $durationDays = (int) $startDate->diffInDays($lastDate) + 1;

        return [
            'started'                => $startDate->format('Y-m-d'),
            'last_logged_day'        => $lastDate->format('Y-m-d'),
            'duration_days'          => $durationDays,
            'has_cycle_start_marker' => $hasCycleStartMarker,
        ];
    }

    private function notShared(?string $message = null): array
    {
        $payload = [
            'shared'         => false,
            'share_level'    => null,
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
