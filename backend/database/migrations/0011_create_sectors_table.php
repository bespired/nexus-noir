<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sectors', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->text('visible_clue_conditions')->nullable();
            $table->string('thumb_dimensions')->nullable(); // x,y, w,h
            $table->timestamps();
            $table->unique(['name']);
        });
        // images are morphed
    }

    public function down(): void
    {
        Schema::dropIfExists('sectors');
    }
};
