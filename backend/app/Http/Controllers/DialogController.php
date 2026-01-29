<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;

class DialogController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return \App\Models\Dialog::with('media')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $dialog = \App\Models\Dialog::create($validated);

        return response()->json($dialog, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $dialog = \App\Models\Dialog::with('media')->findOrFail($id);
        return response()->json($dialog);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $dialog = \App\Models\Dialog::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'tree'  => 'sometimes|nullable|array',
        ]);

        $dialog->update($validated);

        return response()->json($dialog);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $dialog = \App\Models\Dialog::findOrFail($id);
        $dialog->delete();

        return response()->json(null, 204);
    }
}
