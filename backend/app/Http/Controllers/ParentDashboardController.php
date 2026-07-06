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

        // Qualify users.role to avoid ambiguous column error in Postgres
        // (both users and family_members tables have a role column)
        $child = $family->users()->where('users.role', 'child')->first();
        if (! $child) {
            return response()->json($this->notShared('No child found in family.'));
        }

        $profile = $child->cycleProfile;
        if (! $profile) {
            return response()->json($this->notShared('No cycle profile yet.'));
        }

        // Determine whether this parent has been granted access.
        // Parent position (0 = parent_1, 1 = parent_2) is determined by insertion order.
        $parentUsers  = $family->parentUsers();
        $parentIndex  = $parentUsers->search(fn ($u) => $u->id === $parent->id);

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

        // Find the most recent period start date
        $lastPeriodStart = null;
        $allPeriodDays = $profile->periodLogs()
            ->where('is_period_day', true)
            ->orderBy('date')
            ->get();

        if ($allPeriodDays->isNotEmpty()) {
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
        }

        // Calendar data: current-month period days with symptoms eager-loaded
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
            'shared'            => true,
            'share_level'       => $shareLevel,
            'last_period_start' => $lastPeriodStart,
            'prediction'        => $prediction,
            'calendar'          => $calendar,
        ]);
    }

    private function notShared(?string $message = null): array
    {
        $payload = [
            'shared'            => false,
            'share_level'       => null,
            'last_period_start' => null,
            'prediction'        => ['status' => 'learning'],
            'calendar'          => [],
        ];

        if ($message) {
            $payload['message'] = $message;
        }

        return $payload;
    }
}
