<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clues', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description');
            $table->string('type')->nullable();    // 2d, 3d, tag (gamestate)
            $table->string('initial')->nullable(); // value when game starts
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clues');
    }
};
