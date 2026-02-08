<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Sound extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'trigger',
        'data',
    ];

    protected $casts = [
        'data' => 'array',
    ];

    public function media(): MorphMany
    {
        return $this->morphMany(Media::class, 'imageable');
    }
}
