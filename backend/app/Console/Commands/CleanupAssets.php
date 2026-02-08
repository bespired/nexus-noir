<?php
namespace App\Console\Commands;

use App\Models\Config;
use App\Models\Media;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class CleanupAssets extends Command
{
    protected $signature   = 'app:cleanup-assets {--force : Actually delete the files and records} {--dry-run : Show what would be deleted (default)}';
    protected $description = 'Cleanup media duplicates, orphans, and remove unreferenced assets from storage';

    public function handle()
    {
        $force = $this->option('force');

        $this->info('');
        if (! $force) {
            $this->info('DRY RUN MODE - No changes will be made. Use --force to execute.');
        }

        // 1. Remove DB records pointing to non-existent models
        $this->cleanupOrphans($force);

        // 2. Remove DB records that are duplicates
        $this->cleanupMediaDuplicates($force);

        // 3. Remove Files that are no longer referenced by ANY DB record
        // (This naturally cleans up files from step 1 & 2)
        $this->cleanupUnreferencedAssets($force);

        if (! $force) {
            $this->info('Dry run completed. Review the list above.');
        } else {
            $this->info('Cleanup completed.');
        }
    }

    /**
     * Remove Media records where the parent (imageable) no longer exists.
     */
    private function cleanupOrphans($force)
    {
        $this->info('--- Checking for orphaned media records (deleted parents) ---');

        // List all your morphable models here
        $morphables = [
            \App\Models\Clue::class,
            \App\Models\Sector::class,
            \App\Models\Scene::class,
            \App\Models\Character::class,
            \App\Models\Animation::class,
            \App\Models\Sound::class,
            \App\Models\Music::class,
        ];

        $mediaTable = (new Media)->getTable(); // Likely 'mediax' based on your dump

        foreach ($morphables as $modelClass) {
            // Create instance to get the specific table name (e.g., 'sounds', 'scenes')
            $parentInstance = new $modelClass;
            $parentTable    = $parentInstance->getTable();

            // Find Media where:
            // 1. Type matches this model
            // 2. The ID does NOT exist in the parent table
            $orphans = Media::where('imageable_type', $modelClass)
                ->whereNotExists(function ($query) use ($parentTable, $mediaTable) {
                    $query->select(DB::raw(1))
                        ->from($parentTable)
                        ->whereColumn($parentTable . '.id', $mediaTable . '.imageable_id');
                })
                ->get();

            if ($orphans->isEmpty()) {
                continue;
            }

            foreach ($orphans as $orphan) {
                $this->warn("Orphan Found: Media #{$orphan->id} points to missing {$modelClass} #{$orphan->imageable_id}");

                if ($force) {
                    $this->error("DELETING Media ID: {$orphan->id}");
                    $orphan->delete();
                } else {
                    $this->line("WOULD DELETE Media ID: {$orphan->id}");
                }
            }
        }
    }

    private function cleanupMediaDuplicates($force)
    {
        $this->info('--- Checking for duplicate media records ---');

        $duplicates = Media::query()
            ->select('type', 'imageable_type', 'imageable_id', DB::raw('count(*) as count'))
            ->groupBy('type', 'imageable_type', 'imageable_id')
            ->having('count', '>', 1)
            ->get();

        if ($duplicates->isEmpty()) {
            $this->info('No duplicate media records found.');
        }

        foreach ($duplicates as $duplicate) {
            $records = Media::where('type', $duplicate->type)
                ->where('imageable_type', $duplicate->imageable_type)
                ->where('imageable_id', $duplicate->imageable_id)
                ->orderBy('created_at', 'desc')
                ->orderBy('id', 'desc')
                ->get();

            $keep = $records->shift();

            $this->warn("Duplicate group: {$duplicate->imageable_type} #{$duplicate->imageable_id} ({$duplicate->type}) - Found {$duplicate->count} records.");
            $this->line("Keeping Media ID: {$keep->id}");

            foreach ($records as $record) {
                if ($force) {
                    $this->error("DELETING Media ID: {$record->id}");
                    $record->delete();
                } else {
                    $this->line("WOULD DELETE Media ID: {$record->id}");
                }
            }
        }
    }

    private function cleanupUnreferencedAssets($force)
    {
        $this->info('--- Scanning storage for unreferenced assets ---');

        $mediaPaths = Media::pluck('filepad')->toArray();

        $configPaths = [];
        Config::all()->each(function ($config) use (&$configPaths) {
            $val = $config->value;
            if (! $val) {
                return;
            }

            $decoded = json_decode($val, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $configPaths = array_merge($configPaths, $this->extractPathsFromArray($decoded));
            } elseif (is_string($val)) {
                $configPaths[] = $val;
            }
        });

        $referencedPaths = array_unique(array_merge($mediaPaths, $configPaths));

        // Normalize
        $normalizedReferences = [];
        foreach ($referencedPaths as $path) {
            $p                        = ltrim($path, '/');
            $normalizedReferences[$p] = true;
            if (str_starts_with($p, 'glb/') || str_starts_with($p, 'fbx/')) {
                $normalizedReferences['3d/' . $p] = true;
            }

            if (str_starts_with($p, '3d/')) {
                $normalizedReferences[substr($p, 3)] = true;
            }

        }

        $directories = [
            'audio/sfx', 'audio/music', '3d/fbx', '3d/glb',
            'artwork/sector', 'artwork/scene', 'artwork/character', 'artwork/clue', 'artwork/animation',
        ];

        $disk          = Storage::disk('public');
        $filesToDelete = [];

        foreach ($directories as $directory) {
            if (! $disk->exists($directory)) {
                continue;
            }

            foreach ($disk->allFiles($directory) as $file) {
                $f = ltrim($file, '/');
                if (! isset($normalizedReferences[$f])) {
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
