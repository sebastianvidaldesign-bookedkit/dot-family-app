<?php

namespace App\Http\Controllers;

use App\Models\PeriodLog;
use App\Models\SymptomLog;
use App\Services\PredictionService;
use Illuminate\Http\Request;

class PeriodLogController extends Controller
{
    public function index(Request $request)
    {
        $request->validate(['month' => 'sometimes|date_format:Y-m']);

        $profile = $request->user()->cycleProfile;
        if (! $profile) {
            return response()->json([]);
        }

        $query = $profile->periodLogs()->with('symptoms');

        if ($request->has('month')) {
            $query->whereYear('date', substr($request->month, 0, 4))
                  ->whereMonth('date', substr($request->month, 5, 2));
        }

        $logs = $query->orderBy('date')->get()->map(fn ($log) => $this->formatLog($log));

        return response()->json($logs);
    }

    public function upsert(Request $request)
    {
        $data = $request->validate([
            'date'         => 'required|date_format:Y-m-d',
            'is_period_day'=> 'required|boolean',
            'flow'         => 'nullable|in:light,medium,heavy,not_sure',
            'symptoms'     => 'nullable|array',
            'symptoms.*'   => 'in:cramps,tired,headache,emotional,nothing',
        ]);

        $profile = $request->user()->cycleProfile;
        if (! $profile) {
            return response()->json(['message' => 'No cycle profile found.'], 404);
        }

        $log = PeriodLog::updateOrCreate(
            ['cycle_profile_id' => $profile->id, 'date' => $data['date']],
            [
                'is_period_day'      => $data['is_period_day'],
                'flow'               => $data['is_period_day'] ? ($data['flow'] ?? null) : null,
                'created_by_user_id' => $request->user()->id,
            ]
        );

        if (isset($data['symptoms'])) {
            $log->symptoms()->delete();
            foreach ($data['symptoms'] as $symptom) {
                SymptomLog::create(['period_log_id' => $log->id, 'symptom_type' => $symptom]);
            }
        }

        $log->load('symptoms');

        return response()->json($this->formatLog($log), 200);
    }

    public function prediction(Request $request)
    {
        $profile = $request->user()->cycleProfile;
        if (! $profile) {
            return response()->json([
                'status'  => 'none',
                'message' => 'Your calendar will learn as you add days.',
            ]);
        }

        return response()->json(app(PredictionService::class)->predict($profile));
    }

    private function formatLog(PeriodLog $log): array
    {
        return [
            'id'            => $log->id,
            'date'          => $log->date->format('Y-m-d'),
            'is_period_day' => $log->is_period_day,
            'flow'          => $log->flow,
            'symptoms'      => $log->symptoms->pluck('symptom_type'),
        ];
    }
}
