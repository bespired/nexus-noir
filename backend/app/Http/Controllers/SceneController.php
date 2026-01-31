<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Scene;
use Illuminate\Support\Str;

class SceneController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $scenes = \App\Models\Scene::with(['media', 'sector'])->get();

        return \App\Http\Resources\SceneResource::collection($scenes);
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
            'data' => 'nullable|array',
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
            'data' => 'nullable|array',
        ]);

        $scene->update($validated);

        return response()->json($scene);
    }

    public function batchUpdate(Request $request)
    {
        $validated = $request->validate([
            'scenes' => 'required|array',
            'scenes.*.id' => 'required|exists:scenes,id',
            'scenes.*.thumb_dimensions' => 'required|array',
        ]);

        foreach ($validated['scenes'] as $sceneData) {
            \App\Models\Scene::where('id', $sceneData['id'])->update([
                'thumb_dimensions' => $sceneData['thumb_dimensions'],
            ]);
        }

        return response()->json(['status' => 'success']);
    }

    public function progress()
    {
        $basePath = '/var/www/nexus-scenes';

        if (!file_exists($basePath)) {
            return response()->json(['error' => 'Nexus scenes directory not found'], 404);
        }

        // Pre-fetch all scenes with media, indexed by slugified title
        $dbScenes = Scene::with('media')->get();
        $sceneLookup = [];
        foreach ($dbScenes as $s) {
            $sceneLookup[Str::slug($s->title)] = $s;
        }

        $sectors = [];
        $sectorDirs = array_filter(glob($basePath . '/*'), 'is_dir');

        // Helper to extract a "match slug" from a filename
        $getMatchSlug = function ($filename) {
            $name = pathinfo($filename, PATHINFO_FILENAME);
            $name = preg_replace('/^\d+_/', '', $name); // Remove timestamp prefix
            if (strpos($name, '--') !== false) {
                $parts = explode('--', $name);
                $name = end($parts); // Take part after --
            }
            return Str::slug($name);
        };

        foreach ($sectorDirs as $sectorDirPath) {
            $sectorName = basename($sectorDirPath);
            $sceneDirs = array_filter(glob($sectorDirPath . '/*'), 'is_dir');

            $scenes = [];
            foreach ($sceneDirs as $sceneDirPath) {
                $sceneName = basename($sceneDirPath);
                $files = array_filter(scandir($sceneDirPath), function ($f) {
                    return $f !== '.' && $f !== '..';
                });

                $hasPng = false;
                $hasFspy = false;
                $hasBlend = false;
                $hasGlb = false;

                $txtFiles = [];
                $pngFiles = [];

                foreach ($files as $file) {
                    if (str_ends_with($file, '.png')) {
                        $hasPng = true;
                        $pngFiles[] = $file;
                    }
                    if (str_ends_with($file, '.fspy'))
                        $hasFspy = true;
                    if (str_ends_with($file, '.blend'))
                        $hasBlend = true;
                    if (str_ends_with($file, '.glb'))
                        $hasGlb = true;
                    if (str_ends_with($file, '.txt'))
                        $txtFiles[] = $file;
                }

                // Prioritized Matching Strategy
                $dbScene = null;
                $slugsToTry = [];

                if (!empty($txtFiles)) {
                    $slugsToTry[] = $getMatchSlug($txtFiles[0]);
                }
                if (!empty($pngFiles)) {
                    $slugsToTry[] = $getMatchSlug($pngFiles[0]);
                }
                $slugsToTry[] = Str::slug($sceneName);

                foreach ($slugsToTry as $slug) {
                    if (isset($sceneLookup[$slug])) {
                        $dbScene = $sceneLookup[$slug];
                        break;
                    }
                }

                $scenes[] = [
                    'id' => $dbScene ? $dbScene->id : null,
                    'name' => $sceneName,
                    'png' => $hasPng,
                    'fspy' => $hasFspy,
                    'blend' => $hasBlend,
                    'glb' => $hasGlb,
                    'db_png' => $dbScene ? $dbScene->media->where('type', '2d')->count() > 0 : false,
                    'db_glb' => $dbScene ? $dbScene->media->where('type', '3d')->count() > 0 : false,
                ];
            }

            if (!empty($scenes)) {
                $sectors[] = [
                    'name' => $sectorName,
                    'scenes' => $scenes
                ];
            }
        }

        return response()->json($sectors);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $scene = \App\Models\Scene::findOrFail($id);
        $scene->delete();

        return response()->json(null, 204);
    }
}
