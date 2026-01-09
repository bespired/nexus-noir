<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Character extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'role',
        'description',
        'motive',
        'is_playable',
        'is_system',
        'type',
    ];

    protected $casts = [
        'is_playable' => 'boolean',
        'is_system' => 'boolean',
    ];
}
