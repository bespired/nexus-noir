<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Media;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:jpeg,png,jpg,gif,glb,fbx|max:10240',
            'imageable_id' => 'required|integer',
            'imageable_type' => 'required|string',
            'title' => 'nullable|string'
        ]);

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $extension = $file->getClientOriginalExtension();
            $imageableType = $request->imageable_type;

            if (in_array($extension, ['glb', 'fbx'])) {
                $type = '3d';
                $folder = "3d/{$extension}";
            } else {
                $type = '2d';
                // Detect destination folder from class name
                $modelName = strtolower(class_basename($imageableType));
                $folder = "artwork/{$modelName}";

                // Fallback for unexpected types
                if (!in_array($modelName, ['clue', 'character', 'scene', 'sector'])) {
                    $folder = 'artwork/general';
                }
            }

            // Generate a filename
            $filename = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs($folder, $filename, 'public');

            $media = Media::create([
                'filepad' => $path,
                'title' => $request->title ?? $file->getClientOriginalName(),
                'type' => $type,
                'imageable_type' => $request->imageable_type,
                'imageable_id' => $request->imageable_id,
            ]);

            return response()->json($media, 201);
        }

        return response()->json(['message' => 'No file uploaded'], 400);
    }

    public function destroy($id)
    {
        $media = Media::findOrFail($id);

        // Delete physical file
        if (Storage::disk('public')->exists($media->filepad)) {
            Storage::disk('public')->delete($media->filepad);
        }

        $media->delete();
        return response()->json(null, 204);
    }
}
