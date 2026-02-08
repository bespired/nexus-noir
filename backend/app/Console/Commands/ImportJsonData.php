<?php

namespace App\Console\Commands;

use App\Models\Action;
use App\Models\Animation;
use App\Models\AnimationCharacter;
use App\Models\Character;
use App\Models\Clue;
use App\Models\Config;
use App\Models\Dialog;
use App\Models\Media;
use App\Models\Music;
use App\Models\Sound;
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
        $this->importAnimations();
        $this->importAnimationCharacter();
        $this->importMusics();
        $this->importSounds();

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
        Animation::truncate();
        AnimationCharacter::truncate();
        Music::truncate();
        Sound::truncate();
    }

    private function importSectors()
    {
        $this->info('Importing Sectors...');
        $data = $this->loadJson('sectors.json');
        foreach ($data as $item) {
            (new Sector())->forceFill($item)->save();
        }
    }

    private function importCharacters()
    {
        $this->info('Importing Characters...');
        $data = $this->loadJson('characters.json');
        foreach ($data as $item) {
            (new Character())->forceFill([
                'id' => $item['id'],
                'name' => $item['name'],
                'role' => $item['role'],
                'description' => $item['description'],
                'motive' => $item['motive'] ?? null,
                'is_playable' => $item['is_playable'] ?? false,
                'is_system' => $item['is_system'] ?? false,
                'type' => $item['type'] ?? 'persoon',
                'created_at' => $item['created_at'] ?? now(),
                'updated_at' => $item['updated_at'] ?? now(),
            ])->save();
        }
    }

    private function importClues()
    {
        $this->info('Importing Clues...');
        $data = $this->loadJson('clues.json');
        foreach ($data as $item) {
            (new Clue())->forceFill([
                'id' => $item['id'],
                'title' => $item['title'] ?? $item['titel'],
                'description' => $item['description'],
                'type' => $item['type'] ?? null,
                'initial' => $item['initial'] ?? null,
                'created_at' => $item['created_at'] ?? now(),
                'updated_at' => $item['updated_at'] ?? now(),
            ])->save();
        }
    }

    private function importDialogs()
    {
        $this->info('Importing Dialogs...');
        $data = $this->loadJson('dialogs.json');
        foreach ($data as $item) {
            (new Dialog())->forceFill($item)->save();
        }
    }

    private function importActions()
    {
        $this->info('Importing Actions...');
        $data = $this->loadJson('actions.json');
        foreach ($data as $item) {
            (new Action())->forceFill($item)->save();
        }
    }

    private function importNotes()
    {
        $this->info('Importing Notes...');
        $data = $this->loadJson('notes.json');
        foreach ($data as $item) {
            (new Note())->forceFill([
                'id' => $item['id'],
                'title' => $item['title'] ?? $item['titel'],
                'content' => $item['content'],
                'is_done' => $item['is_done'] ?? false,
                'created_at' => $item['created_at'] ?? now(),
                'updated_at' => $item['updated_at'] ?? now(),
            ])->save();
        }
    }

    private function importConfigs()
    {
        $this->info('Importing Configs...');
        $data = $this->loadJson('configs.json');
        foreach ($data as $item) {
            (new Config())->forceFill([
                'id' => $item['id'],
                'key' => $item['key'],
                'value' => $item['value'] ?? null,
                'created_at' => $item['created_at'] ?? now(),
                'updated_at' => $item['updated_at'] ?? now(),
            ])->save();
        }
    }

    private function importScenes()
    {
        $this->info('Importing Scenes...');
        $data = $this->loadJson('scenes.json');
        foreach ($data as $item) {
            (new Scene())->forceFill($item)->save();
        }
    }

    private function importMedia()
    {
        $this->info('Importing Media...');
        $data = $this->loadJson('mediax.json');
        foreach ($data as $item) {
            (new Media())->forceFill([
                'id' => $item['id'],
                'filepad' => $item['filepad'] ?? $item['bestandspad'], // Mapping bestandspad -> filepad
                'title' => $this->determineMediaTitle($item),
                'type' => $this->determineMediaType($item['filepad'] ?? $item['bestandspad']),
                'data' => $item['data'] ?? null,
                'imageable_type' => $item['imageable_type'],
                'imageable_id' => $item['imageable_id'],
                'created_at' => $item['created_at'] ?? now(),
                'updated_at' => $item['updated_at'] ?? now(),
            ])->save();
        }
    }

    private function importAnimations()
    {
        $this->info('Importing Animations...');
        $data = $this->loadJson('animations.json');
        foreach ($data as $item) {
            (new Animation())->forceFill([
                'id' => $item['id'],
                'name' => $item['name'] ?? null,
                'description' => $item['description'] ?? null,
                'type' => $item['type'] ?? 'idle',
                'created_at' => $item['created_at'] ?? now(),
                'updated_at' => $item['updated_at'] ?? now(),
            ])->save();
        }
    }

    private function importAnimationCharacter()
    {
        $this->info('Importing Animation Character associations...');
        $data = $this->loadJson('animation_character.json');
        foreach ($data as $item) {
            (new AnimationCharacter())->forceFill($item)->save();
        }
    }

    private function importMusics()
    {
        $this->info('Importing Music...');
        $data = $this->loadJson('musics.json');
        foreach ($data as $item) {
            (new Music())->forceFill($item)->save();
        }
    }

    private function importSounds()
    {
        $this->info('Importing Sounds...');
        $data = $this->loadJson('sounds.json');
        foreach ($data as $item) {
            (new Sound())->forceFill($item)->save();
        }
    }

    private function loadJson($filename)
    {
        $path = base_path('../backup/json/' . $filename);
        if (!File::exists($path)) {
            $this->warn("File not found: $path");

            return [];
        }

        $content = File::get($path);
        $json = json_decode($content, true);

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
        if (in_array(strtolower($extension), ['ogg', 'mp3'])) {
            return 'music';
        }
        if (in_array(strtolower($extension), ['wav', 'mp3'])) {
            return 'sfx';
        }

        return 'unknown';
    }

    private function determineMediaTitle($item)
    {
        $title = $item['title'] ?? null;

        if ($title === null && isset($item['imageable_type']) && isset($item['imageable_id'])) {
            $modelClass = $item['imageable_type'];
            if (class_exists($modelClass)) {
                $model = $modelClass::find($item['imageable_id']);
                if ($model) {
                    $title = $model->title ?? $model->name ?? null;
                }
            }
        }

        if ($title) {
            // Remove extension
            $title = pathinfo($title, PATHINFO_FILENAME);
            // Replace kebab or snake case with spaces
            $title = str_replace(['-', '_'], ' ', $title);
            // Title case
            $title = mb_convert_case($title, MB_CASE_TITLE, "UTF-8");
        }

        return $title;
    }
}
