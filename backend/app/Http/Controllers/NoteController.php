<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NoteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return \App\Models\Note::all();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
        ]);

        return \App\Models\Note::create($validated);
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
        $note = \App\Models\Note::findOrFail($id);

        $validated = $request->validate([
            'is_done' => 'boolean',
            'title' => 'string|max:255',
            'content' => 'string|nullable',
        ]);

        $note->update($validated);

        return $note;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $note = \App\Models\Note::findOrFail($id);
        $note->delete();

        return response()->noContent();
    }
}
