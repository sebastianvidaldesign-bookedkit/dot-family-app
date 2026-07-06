<?php

namespace App\Http\Controllers;

use App\Models\Note;
use Illuminate\Http\Request;

class NoteController extends Controller
{
    public function index(Request $request)
    {
        $request->validate(['date' => 'sometimes|date_format:Y-m-d']);

        $profile = $request->user()->cycleProfile;
        if (! $profile) {
            return response()->json([]);
        }

        $query = $profile->notes()->orderBy('date', 'desc');

        if ($request->has('date')) {
            $query->whereDate('date', $request->date);
        }

        return response()->json($query->get(['id', 'date', 'body', 'visibility']));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'date'       => 'required|date_format:Y-m-d',
            'body'       => 'required|string|max:2000',
            'visibility' => 'required|in:private,shared',
        ]);

        $profile = $request->user()->cycleProfile;
        if (! $profile) {
            return response()->json(['message' => 'No cycle profile found.'], 404);
        }

        $note = $profile->notes()->create($data);

        return response()->json($note->only(['id', 'date', 'body', 'visibility']), 201);
    }

    public function update(Request $request, Note $note)
    {
        $this->authorizeNote($request, $note);

        $data = $request->validate([
            'body'       => 'sometimes|string|max:2000',
            'visibility' => 'sometimes|in:private,shared',
        ]);

        $note->update($data);

        return response()->json($note->only(['id', 'date', 'body', 'visibility']));
    }

    public function destroy(Request $request, Note $note)
    {
        $this->authorizeNote($request, $note);
        $note->delete();
        return response()->json(null, 204);
    }

    private function authorizeNote(Request $request, Note $note): void
    {
        $profile = $request->user()->cycleProfile;
        if (! $profile || $note->cycle_profile_id !== $profile->id) {
            abort(403);
        }
    }
}
