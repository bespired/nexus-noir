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
            'file' => 'required|file|extensions:jpeg,png,jpg,gif,glb,fbx|max:10240',
            'imageable_id' => 'required|integer',
            'imageable_type' => 'required|string',
            'title' => 'nullable|string',
            'data' => 'nullable|string'
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
                if (!in_array($modelName, ['clue', 'character', 'scene', 'sector', 'animation'])) {
                    $folder = 'artwork/general';
                }
            }

            // Generate a filename
            $originalName = $file->getClientOriginalName();

            // Remove extension for cleaning
            $nameWithoutExt = pathinfo($originalName, PATHINFO_FILENAME);

            // Remove leading timestamps (digits + underscore)
            $nameWithoutExt = preg_replace('/^\d+_/', '', $nameWithoutExt);

            // Remove _compressed suffix
            $nameWithoutExt = preg_replace('/_compressed$/i', '', $nameWithoutExt);

            // Sanitize remaining characters (optional, but good practice)
            $nameWithoutExt = preg_replace('/[^a-zA-Z0-9\-\_]/', '', $nameWithoutExt);

            $cleanFilename = time() . '_' . $nameWithoutExt . '.' . $extension;
            $path = $file->storeAs($folder, $cleanFilename, 'public');

            $media = Media::create([
                'filepad' => $path,
                'title' => $request->title ?? $file->getClientOriginalName(),
                'type' => $type,
                'imageable_type' => $request->imageable_type,
                'imageable_id' => $request->imageable_id,
                'data' => $request->data ? json_decode($request->data, true) : null,
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
