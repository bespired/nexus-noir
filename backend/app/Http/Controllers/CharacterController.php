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
        $query = \App\Models\Character::with('media');

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

        return response()->json($character, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
