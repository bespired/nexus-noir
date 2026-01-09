<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // MORPH
    public function up(): void
    {
        Schema::create('mediax', function (Blueprint $table) {
            $table->id();
            $table->string('filepad');
            $table->string('title')->nullable();
            $table->string('type');           // 2d, 3d (png, jpg, glb)
            $table->string('imageable_type'); // Morph class
            $table->integer('imageable_id');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mediax');
    }
};
