<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use ZipArchive;
use RecursiveIteratorIterator;
use RecursiveDirectoryIterator;

class BackupApp extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:backup';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a full backup (JSON data + Assets) of the application.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting full application backup...');

        // 1. Export Database to JSON
        $this->info('Step 1: Exporting database to JSON...');
        $exitCode = $this->call('app:export-json');
        if ($exitCode !== 0) {
            $this->error('Database export failed. Aborting backup.');
            return 1;
        }

        // 2. Prepare Paths
        $timestamp = date('Y-m-d-H-i-s');
        $zipFileName = "nexus-noir-{$timestamp}.zip";
        $backupDir = base_path('../backup');
        $zipFilePath = $backupDir . '/' . $zipFileName;

        $jsonDir = base_path('../backup/json');
        $publicDir = storage_path('app/public');

        if (!File::exists($backupDir)) {
            File::makeDirectory($backupDir, 0755, true);
        }

        // 3. Create Zip Archive
        $this->info("Step 2: Creating archive $zipFileName...");
        $zip = new ZipArchive;

        if ($zip->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === TRUE) {

            // Add JSON files
            $this->info('Adding JSON files...');
            $jsonFiles = File::files($jsonDir);
            foreach ($jsonFiles as $file) {
                $zip->addFile($file->getRealPath(), 'json/' . $file->getFilename());
            }

            // Add Assets (recursive)
            $this->info('Adding Assets...');
            if (File::exists($publicDir)) {
                $files = new RecursiveIteratorIterator(
                    new RecursiveDirectoryIterator($publicDir),
                    RecursiveIteratorIterator::LEAVES_ONLY
                );

                foreach ($files as $name => $file) {
                    if (!$file->isDir()) {
                        $filePath = $file->getRealPath();
                        if ($filePath) {
                            $relativePath = substr($filePath, strlen($publicDir) + 1);
                            $zip->addFile($filePath, 'assets/' . $relativePath);
                        }
                    }
                }
            } else {
                $this->warn("Public storage directory not found: $publicDir");
            }

            $zip->close();
            $this->info("Backup created successfully: $zipFilePath");
        } else {
            $this->error('Failed to create zip file.');
            return 1;
        }

        return 0;
    }
}
