<?php

namespace App\Http\Controllers;

use App\Models\Animation;
use Illuminate\Http\Request;

class AnimationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Animation::with('media');

        if ($request->has('type')) {
            $query->where('type', $request->query('type'));
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|string|in:mixamo,blender,other',
        ]);

        $animation = Animation::create($validated);

        if ($request->has('character_ids')) {
            $animation->characters()->sync($request->input('character_ids'));
        }

        return response()->json($animation->load(['media', 'characters']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return Animation::with(['media', 'characters'])->findOrFail($id);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $animation = Animation::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|string|in:mixamo,blender,other',
        ]);

        $animation->update($validated);

        if ($request->has('character_ids')) {
            $animation->characters()->sync($request->input('character_ids'));
        }

        return response()->json($animation->load(['media', 'characters']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $animation = Animation::findOrFail($id);
        $animation->delete();

        return response()->json(null, 204);
    }
}
