<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AnimationCharacter extends Model
{
    use HasFactory;

    protected $table = 'animation_character';

    protected $fillable = [
        'animation_id',
        'character_id',
    ];
}
