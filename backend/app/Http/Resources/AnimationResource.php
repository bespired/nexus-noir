<?php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnimationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        // Filter media by type
        $media = collect($this->media);
        $model = $media ? $media->where('type', '3d')->sortByDesc('id')->first() : null;

        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'description' => $this->description,
            'type'        => $this->type,

            'model_url'   => $model ? $model['filepad'] : null,

            'media'       => $media,

            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,
        ];
    }
}
