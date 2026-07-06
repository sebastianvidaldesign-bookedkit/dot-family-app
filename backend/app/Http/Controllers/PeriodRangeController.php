<?php

namespace App\Http\Controllers;

use App\Models\CycleProfile;
use App\Models\PeriodRange;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;

class PeriodRangeController extends Controller
{
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

        return $child?->cycleProfile;
    }

    public function index(Request $request)
    {
        $request->validate(['month' => 'sometimes|date_format:Y-m']);

        $profile = $this->resolveProfile($request->user());
        if (! $profile) {
            return response()->json([]);
        }

        $query = $profile->periodRanges()->with('createdBy', 'updatedBy');

        if ($request->has('month')) {
            $year       = (int) substr($request->month, 0, 4);
            $month      = (int) substr($request->month, 5, 2);
            $monthStart = Carbon::create($year, $month, 1)->format('Y-m-d');
            $monthEnd   = Carbon::create($year, $month, 1)->endOfMonth()->format('Y-m-d');

            // Return ranges that overlap with this month.
            $query->where('start_date', '<=', $monthEnd)
                  ->where(function ($q) use ($monthStart) {
                      $q->whereNull('end_date')
                        ->orWhere('end_date', '>=', $monthStart);
                  });
        }

        return response()->json(
            $query->orderBy('start_date', 'desc')
                  ->get()
                  ->map(fn ($r) => $this->formatRange($r, $request->user()))
        );
    }

    public function upsert(Request $request)
    {
        $data = $request->validate([
            'id'         => 'sometimes|nullable|integer',
            'start_date' => 'required|date_format:Y-m-d',
            'end_date'   => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'flow'       => 'nullable|in:light,medium,heavy,not_sure',
            'symptoms'   => 'nullable|array',
            'symptoms.*' => 'in:cramps,tired,headache,emotional,bloating,nothing',
        ]);

        $user    = $request->user();
        $profile = $this->resolveProfile($user);

        if (! $profile) {
            return response()->json(['message' => 'No family calendar found.'], 404);
        }

        $range = null;

        // Find by explicit id first.
        if (! empty($data['id'])) {
            $range = $profile->periodRanges()->find($data['id']);
        }

        if (! $range) {
            // Fall back: find by start_date.
            $range = $profile->periodRanges()->where('start_date', $data['start_date'])->first();
        } elseif ($range->start_date->format('Y-m-d') !== $data['start_date']) {
            // Start date is moving — clear any existing range at the target date.
            $profile->periodRanges()
                ->where('start_date', $data['start_date'])
                ->where('id', '!=', $range->id)
                ->delete();
        }

        if ($range) {
            $range->start_date         = $data['start_date'];
            $range->end_date           = $data['end_date'] ?? null;
            $range->flow               = $data['flow'] ?? null;
            $range->symptoms           = $data['symptoms'] ?? [];
            $range->updated_by_user_id = $user->id;
            $range->save();
        } else {
            $range = $profile->periodRanges()->create([
                'start_date'          => $data['start_date'],
                'end_date'            => $data['end_date'] ?? null,
                'flow'                => $data['flow'] ?? null,
                'symptoms'            => $data['symptoms'] ?? [],
                'created_by_user_id'  => $user->id,
                'updated_by_user_id'  => $user->id,
            ]);
        }

        $range->load('createdBy', 'updatedBy');

        return response()->json($this->formatRange($range, $user));
    }

    public function destroy(Request $request, int $id)
    {
        $user    = $request->user();
        $profile = $this->resolveProfile($user);

        if (! $profile) {
            return response()->json(['message' => 'No family calendar found.'], 404);
        }

        $range = $profile->periodRanges()->find($id);

        if (! $range) {
            return response()->json(['message' => 'Period not found.'], 404);
        }

        $range->delete();

        return response()->json(['ok' => true]);
    }

    private function formatRange(PeriodRange $range, User $viewer): array
    {
        $editor    = $range->updatedBy ?? $range->createdBy;
        $updatedBy = null;

        if ($editor) {
            $updatedBy = $editor->id === $viewer->id ? 'me' : $editor->name;
        }

        return [
            'id'         => $range->id,
            'start_date' => $range->start_date->format('Y-m-d'),
            'end_date'   => $range->end_date ? $range->end_date->format('Y-m-d') : null,
            'ongoing'    => $range->end_date === null,
            'flow'       => $range->flow,
            'symptoms'   => $range->symptoms ?? [],
            'updated_by' => $updatedBy,
        ];
    }
}
