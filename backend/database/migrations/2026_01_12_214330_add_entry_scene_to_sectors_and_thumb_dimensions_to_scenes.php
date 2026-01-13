<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sectors', function (Blueprint $table) {
            $table->foreignId('entry_scene_id')->nullable()->constrained('scenes')->nullOnDelete();
        });

        Schema::table('scenes', function (Blueprint $table) {
            $table->json('thumb_dimensions')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sectors', function (Blueprint $table) {
            $table->dropForeign(['entry_scene_id']);
            $table->dropColumn('entry_scene_id');
        });

        Schema::table('scenes', function (Blueprint $table) {
            $table->dropColumn('thumb_dimensions');
        });
    }
};
