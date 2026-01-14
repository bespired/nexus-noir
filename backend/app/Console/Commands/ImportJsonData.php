<?php
namespace App\Console\Commands;

use App\Models\Action;
use App\Models\Character;
use App\Models\Clue;
use App\Models\Config;
use App\Models\Dialog;
use App\Models\Media;
use App\Models\Note;
use App\Models\Scene;
use App\Models\Sector;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

class ImportJsonData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:import-json';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import data from JSON files in backup/json';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting JSON import...');

        // Disable foreign key checks
        Schema::disableForeignKeyConstraints();

        // Truncate tables
        $this->truncateTables();

        // Import data
        $this->importSectors();
        $this->importCharacters();
        $this->importClues();
        $this->importDialogs();
        $this->importActions();
        $this->importNotes();
        $this->importConfigs();
        $this->importScenes();
        $this->importMedia();

        // Enable foreign key checks
        Schema::enableForeignKeyConstraints();

        $this->info('JSON import completed successfully.');
    }

    private function truncateTables()
    {
        $this->info('Truncating tables...');
        Action::truncate();
        Character::truncate();
        Clue::truncate();
        Config::truncate();
        Dialog::truncate();
        Media::truncate();
        Note::truncate();
        Scene::truncate();
        Sector::truncate();
    }

    private function importSectors()
    {
        $this->info('Importing Sectors...');
        $data = $this->loadJson('sectors.json');
        foreach ($data as $item) {
            Sector::create([
                'id'                      => $item['id'],
                'name'                    => $item['name'],
                'description'             => $item['description'] ?? null,
                'visible_clue_conditions' => $item['visible_clue_conditions'] ?? null,
                'thumb_dimensions'        => isset($item['thumb_dimensions']) ? json_encode($item['thumb_dimensions']) : null,
                'created_at'              => $item['created_at'] ?? now(),
                'updated_at'              => $item['updated_at'] ?? now(),
            ]);
        }
    }

    private function importCharacters()
    {
        $this->info('Importing Characters...');
        $data = $this->loadJson('characters.json');
        foreach ($data as $item) {
            Character::create([
                'id'          => $item['id'],
                'name'        => $item['name'],
                'role'        => $item['role'],
                'description' => $item['description'],
                'motive'      => $item['motive'] ?? null,
                'is_playable' => $item['is_playable'] ?? false,
                'is_system'   => $item['is_system'] ?? false,
                'type'        => $item['type'] ?? 'persoon',
                'created_at'  => $item['created_at'] ?? now(),
                'updated_at'  => $item['updated_at'] ?? now(),
            ]);
        }
    }

    private function importClues()
    {
        $this->info('Importing Clues...');
        $data = $this->loadJson('clues.json');
        foreach ($data as $item) {
            Clue::create([
                'id'          => $item['id'],
                'title'       => $item['title'] ?? $item['titel'],
                'description' => $item['description'],
                'type'        => $item['type'] ?? null,
                'initial'     => $item['initial'] ?? null,
                'created_at'  => $item['created_at'] ?? now(),
                'updated_at'  => $item['updated_at'] ?? now(),
            ]);
        }
    }

    private function importDialogs()
    {
        $this->info('Importing Dialogs...');
        $data = $this->loadJson('dialogs.json');
        foreach ($data as $item) {
            Dialog::create([
                'id'         => $item['id'],
                'title'      => $item['title'] ?? $item['titel'],
                'tree'       => $item['tree'] ?? null,
                'created_at' => $item['created_at'] ?? now(),
                'updated_at' => $item['updated_at'] ?? now(),
            ]);
        }
    }

    private function importActions()
    {
        $this->info('Importing Actions...');
        $data = $this->loadJson('actions.json');
        foreach ($data as $item) {
            Action::create([
                'id'          => $item['id'],
                'name'        => $item['name'],
                'description' => $item['description'] ?? null,
                'actions'     => $item['actions'] ?? null,
                'created_at'  => $item['created_at'] ?? now(),
                'updated_at'  => $item['updated_at'] ?? now(),
            ]);
        }
    }

    private function importNotes()
    {
        $this->info('Importing Notes...');
        $data = $this->loadJson('notes.json');
        foreach ($data as $item) {
            Note::create([
                'id'         => $item['id'],
                'title'      => $item['title'] ?? $item['titel'],
                'content'    => $item['content'],
                'is_done'    => $item['is_done'] ?? false,
                'created_at' => $item['created_at'] ?? now(),
                'updated_at' => $item['updated_at'] ?? now(),
            ]);
        }
    }

    private function importConfigs()
    {
        $this->info('Importing Configs...');
        $data = $this->loadJson('configs.json');
        foreach ($data as $item) {
            Config::create([
                'id'         => $item['id'],
                'key'        => $item['key'],
                'value'      => $item['value'] ?? null,
                'created_at' => $item['created_at'] ?? now(),
                'updated_at' => $item['updated_at'] ?? now(),
            ]);
        }
    }

    private function importScenes()
    {
        $this->info('Importing Scenes...');
        $data = $this->loadJson('scenes.json');
        foreach ($data as $item) {
            Scene::create([
                'id'               => $item['id'],
                'sector_id'        => $item['sector_id'] ?? null,
                'title'            => $item['title'] ?? $item['titel'], // Handle both keys just in case
                'description'      => $item['description'] ?? '',
                'type'             => $item['type'] ?? 'walkable-area',
                '2d_gateways'      => $item['2d_gateways'] ?? null,
                '3d_spawnpoints'   => $item['3d_spawnpoints'] ?? null,
                'thumb_dimensions' => isset($item['thumb_dimensions']) ? $item['thumb_dimensions'] : null,
                'data'             => isset($item['data']) ? $item['data'] : null,
                'created_at'       => $item['created_at'] ?? now(),
                'updated_at'       => $item['updated_at'] ?? now(),
            ]);
        }
    }

    private function importMedia()
    {
        $this->info('Importing Media...');
        $data = $this->loadJson('mediax.json');
        foreach ($data as $item) {
            Media::create([
                'id'             => $item['id'],
                'filepad'        => $item['filepad'] ?? $item['bestandspad'], // Mapping bestandspad -> filepad
                'title'          => $item['title'] ?? $item['titel'] ?? null,
                'type'           => $this->determineMediaType($item['filepad'] ?? $item['bestandspad']),
                'imageable_type' => $item['imageable_type'],
                'imageable_id'   => $item['imageable_id'],
                'created_at'     => $item['created_at'] ?? now(),
                'updated_at'     => $item['updated_at'] ?? now(),
            ]);
        }
    }

    private function loadJson($filename)
    {
        $path = base_path('../backup/json/' . $filename);
        if (! File::exists($path)) {
            $this->warn("File not found: $path");
            return [];
        }

        $content = File::get($path);
        $json    = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->error("JSON Error in $filename: " . json_last_error_msg());
            return [];
        }

        return $json;
    }

    private function determineMediaType($path)
    {
        $extension = pathinfo($path, PATHINFO_EXTENSION);
        if (in_array(strtolower($extension), ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
            return '2d';
        }
        if (in_array(strtolower($extension), ['glb', 'gltf'])) {
            return '3d';
        }
        return 'unknown';
    }
}
