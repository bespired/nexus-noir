<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class ExportJsonData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:export-json';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Export database data to JSON files in backup/json, overriding existing files.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting JSON export...');

        $backupPath = base_path('../backup/json');

        // Ensure directory exists
        if (!File::exists($backupPath)) {
            File::makeDirectory($backupPath, 0755, true);
        }

        $this->exportTable(\App\Models\Sector::class, 'sectors.json');
        $this->exportTable(\App\Models\Character::class, 'characters.json');
        $this->exportTable(\App\Models\Clue::class, 'clues.json');
        $this->exportTable(\App\Models\Dialog::class, 'dialogs.json');
        $this->exportTable(\App\Models\Action::class, 'actions.json');
        $this->exportTable(\App\Models\Note::class, 'notes.json');
        $this->exportTable(\App\Models\Config::class, 'configs.json');
        $this->exportTable(\App\Models\Scene::class, 'scenes.json');
        $this->exportTable(\App\Models\Media::class, 'mediax.json');
        $this->exportTable(\App\Models\Animation::class, 'animations.json');
        $this->exportTable(\App\Models\AnimationCharacter::class, 'animation_character.json');

        $this->info('JSON export completed successfully.');
    }

    private function exportTable($modelClass, $filename)
    {
        $this->info("Exporting $filename...");

        $data = $modelClass::all();

        // Convert to array
        $jsonContent = $data->toJson(JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $path = base_path('../backup/json/' . $filename);

        File::put($path, $jsonContent);

        $this->info("Wrote " . count($data) . " records to $path");
    }
}
