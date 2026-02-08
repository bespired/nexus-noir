<?php

namespace App\Http\Controllers;

use App\Models\Music;
use Illuminate\Http\Request;

class MusicController extends Controller
{
    public function index()
    {
        return Music::with('media')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'data' => 'nullable|array',
        ]);

        $music = Music::create($validated);

        return response()->json($music, 201);
    }

    public function show($id)
    {
        return Music::with('media')->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $music = Music::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'data' => 'nullable|array',
        ]);

        $music->update($validated);

        return response()->json($music);
    }

    public function destroy($id)
    {
        $music = Music::findOrFail($id);

        foreach ($music->media as $media) {
            (new MediaController())->destroy($media->id);
        }

        $music->delete();

        return response()->json(null, 204);
    }
}
