<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Media extends Model
{
    use HasFactory;

    protected $table = 'mediax';

    protected $fillable = [
        'filepad',
        'title',
        'type',
        'data',
        'imageable_type',
        'imageable_id',
    ];

    protected $casts = [
        'data' => 'array',
    ];

    public function imageable(): MorphTo
    {
        return $this->morphTo();
    }
}
