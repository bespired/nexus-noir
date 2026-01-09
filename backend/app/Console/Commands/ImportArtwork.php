<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use ZipArchive;

class ImportArtwork extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:import-artwork';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import artwork and glb files from backup/artwork.zip to storage/app/public.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting artwork import...');

        $publicPath = storage_path('app/public');
        $backupPath = base_path('../backup');
        $zipFileName = 'artwork.zip';
        $zipFilePath = $backupPath . '/' . $zipFileName;

        if (!File::exists($zipFilePath)) {
            $this->error("Backup file not found: $zipFilePath");
            return 1;
        }

        // Ensure public directory exists
        if (!File::exists($publicPath)) {
            File::makeDirectory($publicPath, 0755, true);
        }

        $zip = new ZipArchive;

        if ($zip->open($zipFilePath) === TRUE) {
            $this->info("Extracting to $publicPath...");

            $zip->extractTo($publicPath);
            $zip->close();

            $this->info("Artwork imported successfully.");
        } else {
            $this->error('Failed to open zip file.');
            return 1;
        }

        return 0;
    }
}
