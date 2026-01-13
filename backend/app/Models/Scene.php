<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Scene extends Model
{
    use HasFactory;

    protected $fillable = [
        'sector_id',
        'title',
        'description',
        'type',
        '2d_gateways',
        '3d_spawnpoints',
        'data',
        'thumb_dimensions',
    ];

    protected $casts = [
        '2d_gateways' => 'array',
        '3d_spawnpoints' => 'array',
        'data' => 'array',
        'thumb_dimensions' => 'array',
    ];

    public function sector(): BelongsTo
    {
        return $this->belongsTo(Sector::class);
    }

    public function media(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Media::class, 'imageable');
    }
}
