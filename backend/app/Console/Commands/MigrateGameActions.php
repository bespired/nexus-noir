<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MigrateGameActions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'game:migrate-actions {--dry-run : Only show what would be changed}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate legacy action constants and dialogue fields to new unified standards';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');

        $this->info($dryRun ? "Starting DRY RUN migration..." : "Starting migration...");

        $this->migrateActions($dryRun);
        $this->migrateDialogs($dryRun);

        $this->info("Migration complete.");
    }

    private function migrateActions($dryRun)
    {
        $this->info("Migrating 'actions' table...");
        $actions = DB::table('actions')->get();
        $updatedCount = 0;

        foreach ($actions as $action) {
            $data = json_decode($action->actions, true);
            if (!$data)
                continue;

            $modified = false;
            $newData = $this->migrateActionList($data, $modified);

            if ($modified) {
                if (!$dryRun) {
                    DB::table('actions')->where('id', $action->id)->update([
                        'actions' => json_encode($newData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
                    ]);
                }
                $this->line(" - Updated action ID {$action->id}: {$action->name}");
                $updatedCount++;
            }
        }

        $this->info("   Done. Updated {$updatedCount} records.");
    }

    private function migrateDialogs($dryRun)
    {
        $this->info("Migrating 'dialogs' table...");
        $dialogs = DB::table('dialogs')->get();
        $updatedCount = 0;

        foreach ($dialogs as $dialog) {
            $tree = json_decode($dialog->tree, true);
            if (!$tree || !isset($tree['nodes']))
                continue;

            $modified = false;

            // 1. Handle legacy "nodes" as object/dictionary (convert to array)
            if (is_array($tree['nodes']) && !array_is_list($tree['nodes'])) {
                $this->line("   - Converting object-based nodes to array for ID {$dialog->id}");
                $arrayNodes = [];
                foreach ($tree['nodes'] as $id => $node) {
                    $node['id'] = $id; // Ensure ID is preserved
                    $arrayNodes[] = $node;
                }
                $tree['nodes'] = $arrayNodes;
                $modified = true;
            }

            // 2. Migrate nodes (field names and actions)
            $nodesSource = is_array($tree['nodes']) ? $tree['nodes'] : [];

            foreach ($tree['nodes'] as &$node) {
                $nodeModified = false;

                // Rename 'options' to 'answers'
                if (isset($node['options'])) {
                    $node['answers'] = $node['options'];
                    unset($node['options']);
                    $nodeModified = true;
                }

                if (isset($node['answers']) && is_array($node['answers'])) {
                    foreach ($node['answers'] as &$answer) {
                        // Rename 'next' to 'next_node'
                        if (isset($answer['next'])) {
                            $answer['next_node'] = $answer['next'];
                            unset($answer['next']);
                            $nodeModified = true;
                        }

                        // Map legacy end signals in next_node
                        if (isset($answer['next_node'])) {
                            $answer['next_node'] = $this->migrateNextNode($answer['next_node'], $nodeModified);
                        }

                        // Migrate action inside answer
                        if (isset($answer['action'])) {
                            $answer['action'] = $this->migrateValue($answer['action'], $nodeModified);
                        }
                    }
                }

                // Migrate node-level action
                if (isset($node['action'])) {
                    $node['action'] = $this->migrateValue($node['action'], $nodeModified);
                }

                if ($nodeModified)
                    $modified = true;
            }

            if ($modified) {
                if (!$dryRun) {
                    DB::table('dialogs')->where('id', $dialog->id)->update([
                        'tree' => json_encode($tree, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
                    ]);
                }
                $this->line(" - Updated dialog ID {$dialog->id}: {$dialog->title}");
                $updatedCount++;
            }
        }

        $this->info("   Done. Updated {$updatedCount} records.");
    }

    private function migrateActionList($actions, &$modified)
    {
        if (!is_array($actions))
            return $actions;

        foreach ($actions as &$step) {
            if (isset($step['type'])) {
                $step['type'] = $this->migrateValue($step['type'], $modified);
            }
        }
        return $actions;
    }

    private function migrateNextNode($value, &$modified)
    {
        $mapping = [
            'END' => '_end',
            '[END]' => '_end',
            'CLOSE' => '_end',
            'STOP' => '_end',
            'exit' => '_end'
        ];

        if (is_string($value) && isset($mapping[$value])) {
            $modified = true;
            return $mapping[$value];
        }

        return $value;
    }

    private function migrateValue($value, &$modified)
    {
        $mapping = [
            'WALK_TO_POSITION' => 'walk-to',
            'LOOK_AT_TARGET' => 'look-at',
            'GIVE_CLUE' => 'give-clue',
            'GOTO_SCENE' => 'goto-scene',
            'IDLE_WAIT' => 'idle-wait',
            'START_DIALOGUE' => 'start-dialogue',
            'START DIALOG' => 'start-dialogue',
            'PLAY_ANIMATION' => 'play-animation',
            'END TALK' => 'end',
            'END' => 'end',
        ];

        if (is_string($value) && isset($mapping[$value])) {
            $modified = true;
            return $mapping[$value];
        }

        return $value;
    }
}
