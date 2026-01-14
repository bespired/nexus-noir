<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    public function up(): void
    {
        Schema::table('sectors', function (Blueprint $table) {
            if (!Schema::hasColumn('sectors', 'entry_scene_id')) {
                $table->foreignId('entry_scene_id')->nullable()->constrained('scenes')->nullOnDelete();
            }
        });

        Schema::table('scenes', function (Blueprint $table) {
            if (!Schema::hasColumn('scenes', 'thumb_dimensions')) {
                $table->json('thumb_dimensions')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('sectors', function (Blueprint $table) {
            if (Schema::hasColumn('sectors', 'entry_scene_id')) {
                $table->dropForeign(['entry_scene_id']);
                $table->dropColumn('entry_scene_id');
            }
        });

        Schema::table('scenes', function (Blueprint $table) {
            if (Schema::hasColumn('scenes', 'thumb_dimensions')) {
                $table->dropColumn('thumb_dimensions');
            }
        });
    }
};
