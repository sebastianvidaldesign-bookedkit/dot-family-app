<?php

namespace App\Http\Controllers;

use App\Models\CycleProfile;
use App\Models\PeriodLog;
use App\Models\SymptomLog;
use App\Models\User;
use App\Services\PredictionService;
use Illuminate\Http\Request;

class FamilyCalendarController extends Controller
{
    // Resolve the ONE child-owned cycle_profile for this user's family.
    private function resolveProfile(User $user): ?CycleProfile
    {
        if ($user->isChild()) {
            return $user->cycleProfile;
        }

        $family = $user->families()->first();
        if (! $family) {
            return null;
        }

        $child = $family->users()->where('users.role', 'child')->first();
        if (! $child) {
            return null;
        }

        return $child->cycleProfile;
    }

    public function index(Request $request)
    {
        $request->validate(['month' => 'sometimes|date_format:Y-m']);

        $profile = $this->resolveProfile($request->user());
        if (! $profile) {
            return response()->json([]);
        }

        $query = $profile->periodLogs()->with('symptoms', 'updatedBy', 'createdBy');

        if ($request->has('month')) {
            $query->whereYear('date', (int) substr($request->month, 0, 4))
                  ->whereMonth('date', (int) substr($request->month, 5, 2));
        }

        return response()->json(
            $query->orderBy('date')->get()->map(fn ($log) => $this->formatLog($log, $request->user()))
        );
    }

    public function upsert(Request $request)
    {
        $data = $request->validate([
            'date'           => 'required|date_format:Y-m-d',
            'is_period_day'  => 'required|boolean',
            'is_cycle_start' => 'sometimes|boolean',
            'flow'           => 'nullable|in:light,medium,heavy,not_sure',
            'symptoms'       => 'nullable|array',
            'symptoms.*'     => 'in:cramps,tired,headache,emotional,nothing',
        ]);

        $user    = $request->user();
        $profile = $this->resolveProfile($user);

        if (! $profile) {
            return response()->json(['message' => 'No family calendar found.'], 404);
        }

        // is_cycle_start only makes sense when is_period_day is true.
        $isCycleStart = $data['is_period_day']
            ? (bool) ($data['is_cycle_start'] ?? false)
            : false;

        $existing = $profile->periodLogs()->where('date', $data['date'])->first();

        if ($existing) {
            $existing->is_period_day      = $data['is_period_day'];
            $existing->is_cycle_start     = $isCycleStart;
            $existing->flow               = $data['is_period_day'] ? ($data['flow'] ?? null) : null;
            $existing->updated_by_user_id = $user->id;
            $existing->save();
            $log = $existing;
        } else {
            $log = $profile->periodLogs()->create([
                'date'               => $data['date'],
                'is_period_day'      => $data['is_period_day'],
                'is_cycle_start'     => $isCycleStart,
                'flow'               => $data['is_period_day'] ? ($data['flow'] ?? null) : null,
                'created_by_user_id' => $user->id,
                'updated_by_user_id' => $user->id,
            ]);
        }

        if (array_key_exists('symptoms', $data)) {
            $log->symptoms()->delete();
            foreach ($data['symptoms'] ?? [] as $symptom) {
                SymptomLog::create(['period_log_id' => $log->id, 'symptom_type' => $symptom]);
            }
        }

        $log->load('symptoms', 'updatedBy', 'createdBy');

        return response()->json($this->formatLog($log, $user));
    }

    public function prediction(Request $request)
    {
        $profile = $this->resolveProfile($request->user());
        if (! $profile) {
            return response()->json([
                'status'  => 'none',
                'message' => 'Your calendar will learn as you add days.',
            ]);
        }

        return response()->json(app(PredictionService::class)->predict($profile));
    }

    private function formatLog(PeriodLog $log, User $viewer): array
    {
        $editor = $log->updated_by_user_id ? $log->updatedBy : $log->createdBy;

        $updatedBy = null;
        if ($editor) {
            $updatedBy = $editor->id === $viewer->id ? 'me' : $editor->name;
        }

        return [
            'id'             => $log->id,
            'date'           => $log->date->format('Y-m-d'),
            'is_period_day'  => $log->is_period_day,
            'is_cycle_start' => $log->is_cycle_start,
            'flow'           => $log->flow,
            'symptoms'       => $log->symptoms->pluck('symptom_type')->values()->all(),
            'updated_by'     => $updatedBy,
        ];
    }
}
