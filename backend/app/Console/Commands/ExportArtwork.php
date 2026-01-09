<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use ZipArchive;
use RecursiveIteratorIterator;
use RecursiveDirectoryIterator;

class ExportArtwork extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:export-artwork';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Export artwork and glb files to a zip archive in backup folder.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting artwork export...');

        $publicPath = storage_path('app/public');
        $backupPath = base_path('../backup');
        $zipFileName = 'artwork.zip';
        $zipFilePath = $backupPath . '/' . $zipFileName;

        if (!File::exists($publicPath)) {
            $this->error("Source directory not found: $publicPath");
            return 1;
        }

        // Ensure backup directory exists
        if (!File::exists($backupPath)) {
            File::makeDirectory($backupPath, 0755, true);
        }

        $zip = new ZipArchive;

        if ($zip->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === TRUE) {
            $files = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($publicPath),
                RecursiveIteratorIterator::LEAVES_ONLY
            );

            foreach ($files as $name => $file) {
                // Skip directories (they would be added automatically)
                if (!$file->isDir()) {
                    // Get real and relative path for current file
                    $filePath = $file->getRealPath();

                    if ($filePath) {
                        $relativePath = substr($filePath, strlen($publicPath) + 1);
                        // Add current file to archive
                        $zip->addFile($filePath, $relativePath);
                    }
                }
            }

            // Zip archive will be created only after closing object
            $zip->close();
            $this->info("Artwork exported successfully to: $zipFilePath");
        } else {
            $this->error('Failed to create zip file.');
            return 1;
        }

        return 0;
    }
}
