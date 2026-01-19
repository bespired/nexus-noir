<?php

namespace App\Console\Commands;

use App\Models\Config;
use App\Models\Media;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class CleanupAssets extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:cleanup-assets {--force : Actually delete the files and records} {--dry-run : Show what would be deleted (default)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Cleanup media duplicates and remove unreferenced assets from storage';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $force = $this->option('force');

        if (!$force) {
            $this->info('DRY RUN MODE - No changes will be made to the database or filesystem. Use --force to actually delete.');
        }

        $this->cleanupMediaDuplicates($force);
        $this->cleanupUnreferencedAssets($force);

        if (!$force) {
            $this->info('Dry run completed. Review the list above before running with --force.');
        } else {
            $this->info('Cleanup completed.');
        }
    }

    /**
     * Deduplicate media records in the database.
     */
    private function cleanupMediaDuplicates($force)
    {
        $this->info('--- Checking for duplicate media records ---');

        // Group by type+imageable_type+imageable_id
        $duplicates = Media::select('type', 'imageable_type', 'imageable_id', DB::raw('count(*) as count'))
            ->groupBy('type', 'imageable_type', 'imageable_id')
            ->having('count', '>', 1)
            ->get();

        if ($duplicates->isEmpty()) {
            $this->info('No duplicate media records found.');
            return;
        }

        foreach ($duplicates as $duplicate) {
            $records = Media::where('type', $duplicate->type)
                ->where('imageable_type', $duplicate->imageable_type)
                ->where('imageable_id', $duplicate->imageable_id)
                ->orderBy('created_at', 'desc')
                ->orderBy('id', 'desc')
                ->get();

            // Keep the first one, delete the others
            $keep = $records->shift();
            
            $this->warn("Duplicate group: {$duplicate->imageable_type} #{$duplicate->imageable_id} ({$duplicate->type}) - Found {$duplicate->count} records.");
            $this->line("Keeping Media ID: {$keep->id} (Created: {$keep->created_at})");

            foreach ($records as $record) {
                if ($force) {
                    $this->error("DELETING Media ID: {$record->id} (Path: {$record->filepad})");
                    $record->delete();
                } else {
                    $this->line("WOULD DELETE Media ID: {$record->id} (Path: {$record->filepad})");
                }
            }
        }
    }

    /**
     * Delete files from storage that are not referenced in the database.
     */
    private function cleanupUnreferencedAssets($force)
    {
        $this->info('--- Scanning storage for unreferenced assets ---');

        // 1. Get all referenced paths from Media
        $mediaPaths = Media::pluck('filepad')->toArray();

        // 2. Get all referenced paths from Configs
        $configPaths = [];
        Config::all()->each(function ($config) use (&$configPaths) {
            $val = $config->value;
            if (!$val) return;

            // Try to decode if it's JSON
            $decoded = json_decode($val, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $configPaths = array_merge($configPaths, $this->extractPathsFromArray($decoded));
            } elseif (is_string($val)) {
                $configPaths[] = $val;
            }
        });

        $referencedPaths = array_unique(array_merge($mediaPaths, $configPaths));

        // Normalize referenced paths: trim slashes and ensure they are searchable
        $normalizedReferences = [];
        foreach ($referencedPaths as $path) {
            $p = ltrim($path, '/');
            $normalizedReferences[$p] = true;
            // Also add version with 3d/ prefix if it doesn't have it, and vice versa
            if (str_starts_with($p, 'glb/') || str_starts_with($p, 'fbx/')) {
                $normalizedReferences['3d/' . $p] = true;
            }
            if (str_starts_with($p, '3d/')) {
                $normalizedReferences[substr($p, 3)] = true;
            }
        }

        // 3. Define target directories to scan
        $directories = [
            '3d/fbx',
            '3d/glb',
            'artwork/sector',
            'artwork/scene',
            'artwork/character',
            'artwork/clue',
            'artwork/animation', 
        ];

        $disk = Storage::disk('public');
        $filesToDelete = [];

        foreach ($directories as $directory) {
            if (!$disk->exists($directory)) {
                continue;
            }

            $allFiles = $disk->allFiles($directory);

            foreach ($allFiles as $file) {
                $f = ltrim($file, '/');
                if (!isset($normalizedReferences[$f])) {
                    $filesToDelete[] = $file;
                }
            }
        }

        if (empty($filesToDelete)) {
            $this->info('No unreferenced assets found.');
            return;
        }

        $this->warn("Found " . count($filesToDelete) . " unreferenced files.");

        foreach ($filesToDelete as $file) {
            if ($force) {
                $this->error("DELETING: {$file}");
                $disk->delete($file);
            } else {
                $this->line("WOULD DELETE: {$file}");
            }
        }
    }

    /**
     * Recursively extract strings from an array that might be paths.
     */
    private function extractPathsFromArray($array)
    {
        $paths = [];
        foreach ($array as $item) {
            if (is_string($item)) {
                $paths[] = $item;
            } elseif (is_array($item)) {
                $paths = array_merge($paths, $this->extractPathsFromArray($item));
            }
        }
        return $paths;
    }
}
