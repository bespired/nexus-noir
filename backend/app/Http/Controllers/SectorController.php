<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SectorController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return \App\Models\Sector::with('media')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $sector = \App\Models\Sector::create($validated);

        return response()->json($sector, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $sector = \App\Models\Sector::with(['media', 'scenes.media'])->findOrFail($id);

        // Fetch clues for the conditions
        $clueIds = $sector->visible_clue_conditions ?? [];
        $clues = \App\Models\Clue::with('media')->whereIn('id', $clueIds)->get();

        return response()->json([
            'sector' => $sector,
            'clues' => $clues
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $sector = \App\Models\Sector::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'visible_clue_conditions' => 'nullable|array',
            'visible_clue_conditions.*' => 'integer|exists:clues,id',
            'thumb_dimensions' => 'nullable|array',
            'entry_scene_id' => 'nullable|integer|exists:scenes,id',
        ]);

        $sector->update($validated);

        return response()->json($sector);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $sector = \App\Models\Sector::findOrFail($id);

        // Unlink scenes first
        \App\Models\Scene::where('sector_id', $sector->id)->update(['sector_id' => null]);

        $sector->delete();

        return response()->json(null, 204);
    }
}
