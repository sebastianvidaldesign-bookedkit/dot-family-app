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
            return response()->json($this->noData());
        }

        $child = $family->users()->where('users.role', 'child')->first();
        if (! $child) {
            return response()->json($this->noData());
        }

        $profile = $child->cycleProfile;
        if (! $profile) {
            return response()->json($this->noData());
        }

        $prediction = app(PredictionService::class)->predict($profile);

        // Calendar: current month period days for the quick overview strip.
        $month        = now()->format('Y-m');
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
            'shared'     => true,
            'prediction' => $prediction,
            'calendar'   => $calendar,
        ]);
    }

    private function noData(): array
    {
        return [
            'shared'     => false,
            'prediction' => [
                'status'  => 'none',
                'message' => 'Dot will learn as you add period days.',
            ],
            'calendar'   => [],
        ];
    }
}
