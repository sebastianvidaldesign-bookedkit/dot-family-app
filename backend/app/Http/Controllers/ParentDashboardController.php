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

        // Find the family the parent belongs to
        $family = $parent->families()->first();
        if (! $family) {
            return response()->json(['message' => 'No family found.'], 404);
        }

        // Find the child in the same family
        $child = $family->users()->where('role', 'child')->first();
        if (! $child) {
            return response()->json(['message' => 'No child found in family.'], 404);
        }

        $profile = $child->cycleProfile;
        if (! $profile) {
            return response()->json(['message' => 'No cycle data available.'], 404);
        }

        // Check if this parent has been granted access
        $parentUsers = $family->parentUsers();
        $parentIndex = $parentUsers->search(fn ($u) => $u->id === $parent->id);

        $shareGranted = match ($parentIndex) {
            0       => $profile->share_with_parent_1,
            1       => $profile->share_with_parent_2,
            default => false,
        };

        if (! $shareGranted) {
            return response()->json(['shared' => false]);
        }

        $shareLevel = $profile->share_level;
        $prediction = app(PredictionService::class)->predict($profile);

        // Last period start
        $allPeriodDays = $profile->periodLogs()
            ->where('is_period_day', true)
            ->orderBy('date', 'desc')
            ->get();

        $lastPeriodStart = null;
        $dateSet = $allPeriodDays
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->format('Y-m-d'))
            ->flip()
            ->toArray();

        foreach (array_keys($dateSet) as $dateStr) {
            $dayBefore = Carbon::parse($dateStr)->subDay()->format('Y-m-d');
            if (! isset($dateSet[$dayBefore])) {
                if ($lastPeriodStart === null || $dateStr > $lastPeriodStart) {
                    $lastPeriodStart = $dateStr;
                }
            }
        }

        // Calendar data: current month period days
        $month = now()->format('Y-m');
        $calendarLogs = $profile->periodLogs()
            ->where('is_period_day', true)
            ->whereYear('date', substr($month, 0, 4))
            ->whereMonth('date', substr($month, 5, 2))
            ->orderBy('date')
            ->get();

        $calendarDays = $calendarLogs->map(function ($log) use ($shareLevel) {
            $entry = ['date' => Carbon::parse($log->date)->format('Y-m-d')];
            if (in_array($shareLevel, ['flow', 'symptoms', 'everything'])) {
                $entry['flow'] = $log->flow;
            }
            if (in_array($shareLevel, ['symptoms', 'everything'])) {
                $entry['symptoms'] = $log->symptoms->pluck('symptom_type');
            }
            return $entry;
        });

        return response()->json([
            'shared'            => true,
            'share_level'       => $shareLevel,
            'last_period_start' => $lastPeriodStart,
            'prediction'        => $prediction,
            'calendar'          => $calendarDays,
        ]);
    }
}
