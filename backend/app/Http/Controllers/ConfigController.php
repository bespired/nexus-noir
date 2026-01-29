<?php
namespace App\Http\Controllers;

use App\Models\Config;
use Illuminate\Http\Request;

class ConfigController extends Controller
{
    public function index()
    {
        return Config::all()->pluck('value', 'key');
    }

    public function show($key)
    {
        $config = Config::where('key', $key)->first();
        return response()->json($config);
    }

    public function update(Request $request, $key)
    {
        $config = Config::updateOrCreate(
            ['key' => $key],
            ['value' => $request->value]
        );

        return response()->json($config);
    }

    public function uploadBackdrop(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:10240', // 10MB max
        ]);

        if ($request->hasFile('image')) {
            $file     = $request->file('image');
            $filename = $file->getClientOriginalName();

            // Store in storage/app/public/artwork/general
            $path = $file->storeAs('artwork/general', $filename, 'public');

            $config = Config::updateOrCreate(
                ['key' => 'map_backdrop'],
                ['value' => $path]
            );

            return response()->json($config);
        }

        return response()->json(['message' => 'No file uploaded'], 400);
    }
}
