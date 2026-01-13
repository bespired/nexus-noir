<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sector extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'visible_clue_conditions',
        'thumb_dimensions',
        'entry_scene_id',
    ];

    protected $casts = [
        'visible_clue_conditions' => 'array',
        'thumb_dimensions' => 'array',
        'entry_scene_id' => 'integer',
    ];

    public function scenes(): HasMany
    {
        return $this->hasMany(Scene::class);
    }

    public function media(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Media::class, 'imageable');
    }
}
