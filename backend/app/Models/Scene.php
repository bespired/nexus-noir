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
        'thumb_dimensions',
        'data',
    ];

    protected $casts = [
        '2d_gateways' => 'array',
        '3d_spawnpoints' => 'array',
        'thumb_dimensions' => 'array',
        'data' => 'array',
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
