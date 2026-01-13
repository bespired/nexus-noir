<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SceneController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return \App\Models\Scene::with(['media', 'sector'])->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'sector_id' => 'nullable|exists:sectors,id',
            'type' => 'required|string|in:walkable-area,vue-component,investigation,combat,cut-scene',
            '2d_gateways' => 'nullable|array',
            '3d_spawnpoints' => 'nullable|array',
        ]);

        $scene = \App\Models\Scene::create($validated);

        return response()->json($scene, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return \App\Models\Scene::with(['media', 'sector'])->findOrFail($id);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $scene = \App\Models\Scene::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'sector_id' => 'nullable|exists:sectors,id',
            'type' => 'required|string|in:walkable-area,vue-component,investigation,combat,cut-scene',
            '2d_gateways' => 'nullable|array',
            '3d_spawnpoints' => 'nullable|array',
            'thumb_dimensions' => 'nullable|array',
        ]);

        $scene->update($validated);

        return response()->json($scene);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
