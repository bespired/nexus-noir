<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ClueController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return \App\Models\Clue::with('media')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'type' => 'required|string',
            'initial' => 'required|boolean',
        ]);

        $clue = \App\Models\Clue::create($validated);

        return response()->json($clue, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return \App\Models\Clue::with('media')->findOrFail($id);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $clue = \App\Models\Clue::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'type' => 'required|string',
            'initial' => 'required|boolean',
        ]);

        $clue->update($validated);

        return response()->json($clue);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $clue = \App\Models\Clue::findOrFail($id);
        $clue->delete();

        return response()->json(null, 204);
    }
}
