<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use ZipArchive;

class InstallApp extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:install {--file= : Specific backup file to install (optional)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Install application from the latest backup (or specified file).';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting application installation/restore...');

        $backupDir = base_path('../backup');
        $fileOption = $this->option('file');

        // 1. Find Backup File
        $zipFilePath = null;
        if ($fileOption) {
            $zipFilePath = $backupDir . '/' . $fileOption;
            if (!File::exists($zipFilePath)) {
                $this->error("Specified backup file not found: $zipFilePath");
                return 1;
            }
        } else {
            // Find latest nexus-noir-*.zip
            $files = glob($backupDir . '/nexus-noir-*.zip');
            if (empty($files)) {
                $this->error('No backup files found in backup directory.');
                return 1;
            }
            // Sort by modified time, descending
            usort($files, function ($a, $b) {
                return filemtime($b) - filemtime($a);
            });
            $zipFilePath = $files[0];
        }

        $this->info("Using backup file: " . basename($zipFilePath));

        // 2. Unzip to Temp Directory
        $this->info('Step 1: Extracting backup...');
        $tempDir = storage_path('app/temp_restore_' . time());
        File::makeDirectory($tempDir, 0755, true);

        $zip = new ZipArchive;
        if ($zip->open($zipFilePath) === TRUE) {
            $zip->extractTo($tempDir);
            $zip->close();
        } else {
            $this->error('Failed to open zip file.');
            File::deleteDirectory($tempDir);
            return 1;
        }

        // 3. Restore Assets
        $this->info('Step 2: Restoring assets...');
        $publicDir = storage_path('app/public');
        $extractedAssetsDir = $tempDir . '/assets';

        if (File::exists($extractedAssetsDir)) {
            // Ensure public dir exists
            if (!File::exists($publicDir)) {
                File::makeDirectory($publicDir, 0755, true);
            }

            // We use File::copyDirectory to merge/overwrite. 
            // Note: copyDirectory overwrites existing files with same name.
            File::copyDirectory($extractedAssetsDir, $publicDir);
            $this->info('Assets restored.');
        } else {
            $this->warn('No assets folder found in backup.');
        }

        // 4. Restore JSON
        $this->info('Step 3: Restoring JSON data...');
        $jsonDir = base_path('../backup/json');
        $extractedJsonDir = $tempDir . '/json';

        if (File::exists($extractedJsonDir)) {
            if (!File::exists($jsonDir)) {
                File::makeDirectory($jsonDir, 0755, true);
            }

            File::copyDirectory($extractedJsonDir, $jsonDir);
            $this->info('JSON files restored.');
        } else {
            $this->warn('No JSON folder found in backup.');
        }

        // 5. Cleanup Temp
        File::deleteDirectory($tempDir);

        // 6. Import Data
        $this->info('Step 4: Importing data into database...');
        $exitCode = $this->call('app:import-json');

        if ($exitCode === 0) {
            $this->info('Application installed successfully.');
            return 0;
        } else {
            $this->error('Database import failed.');
            return 1;
        }
    }
}
