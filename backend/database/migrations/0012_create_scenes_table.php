<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scenes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sector_id')->nullable()->constrained('sectors')->nullOnDelete();
            $table->string('title');
            $table->text('description');
            $table->string('type')->default('walkable-area');
            $table->json('2d_gateways')->nullable();
            $table->json('3d_spawnpoints')->nullable();
            $table->json('data')->nullable();
            $table->timestamps();
        });
        // images are morphed
    }

    public function down(): void
    {
        Schema::dropIfExists('scenes');
    }
};
