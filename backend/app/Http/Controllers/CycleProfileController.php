<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class CycleProfileController extends Controller
{
    public function show(Request $request)
    {
        $profile = $request->user()->cycleProfile;
        if (! $profile) {
            return response()->json(['message' => 'No cycle profile found.'], 404);
        }

        return response()->json([
            'id'                  => $profile->id,
            'share_level'         => $profile->share_level,
            'share_with_parent_1' => $profile->share_with_parent_1,
            'share_with_parent_2' => $profile->share_with_parent_2,
            'average_cycle_length'=> $profile->average_cycle_length,
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'share_level'         => 'sometimes|in:basic,flow,symptoms,everything',
            'share_with_parent_1' => 'sometimes|boolean',
            'share_with_parent_2' => 'sometimes|boolean',
        ]);

        $profile = $request->user()->cycleProfile;
        if (! $profile) {
            return response()->json(['message' => 'No cycle profile found.'], 404);
        }

        $profile->update($data);

        return response()->json([
            'id'                  => $profile->id,
            'share_level'         => $profile->share_level,
            'share_with_parent_1' => $profile->share_with_parent_1,
            'share_with_parent_2' => $profile->share_with_parent_2,
            'average_cycle_length'=> $profile->average_cycle_length,
        ]);
    }
}
