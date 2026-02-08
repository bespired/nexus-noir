<?php

namespace App\Http\Controllers;

use App\Models\Sound;
use Illuminate\Http\Request;

class SoundController extends Controller
{
    public function index()
    {
        return Sound::with('media')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'trigger' => 'nullable|string|max:100',
            'data' => 'nullable|array',
        ]);

        $sound = Sound::create($validated);

        return response()->json($sound, 201);
    }

    public function show($id)
    {
        return Sound::with('media')->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $sound = Sound::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'trigger' => 'nullable|string|max:100',
            'data' => 'nullable|array',
        ]);

        $sound->update($validated);

        return response()->json($sound);
    }

    public function destroy($id)
    {
        $sound = Sound::findOrFail($id);

        foreach ($sound->media as $media) {
            (new MediaController())->destroy($media->id);
        }

        $sound->delete();

        return response()->json(null, 204);
    }
}
