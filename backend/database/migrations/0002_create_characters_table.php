<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('characters', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('role');
            $table->text('description');
            $table->text('motive')->nullable();
            $table->boolean('is_playable')->default(0);
            $table->boolean('is_system')->default(0);   // elevator or dialog spawner
            $table->string('type')->default('persoon'); // person, android, system
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('characters');
    }
};
