<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class CharacterController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = \App\Models\Character::with(['media', 'animations']);

        if ($request->has('type')) {
            $query->where('type', $request->query('type'));
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'role' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'motive' => 'nullable|string',
            'is_playable' => 'required|boolean',
            'type' => 'required|string|in:person,vehicle',
        ]);

        $character = \App\Models\Character::create($validated);

        if ($request->has('animation_ids')) {
            $character->animations()->sync($request->input('animation_ids'));
        }

        return response()->json($character->load(['media', 'animations']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return \App\Models\Character::with(['media', 'animations'])->findOrFail($id);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $character = \App\Models\Character::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'role' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'motive' => 'nullable|string',
            'is_playable' => 'required|boolean',
            'type' => 'required|string|in:person,vehicle',
        ]);

        $character->update($validated);

        if ($request->has('animation_ids')) {
            $character->animations()->sync($request->input('animation_ids'));
        }

        return response()->json($character->load(['media', 'animations']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $character = \App\Models\Character::findOrFail($id);
        $character->delete();

        return response()->json(null, 204);
    }
}
