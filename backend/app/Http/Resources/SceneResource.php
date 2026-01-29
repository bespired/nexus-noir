<?php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SceneResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        // Filter media by type
        $media    = collect($this->media);
        $backdrop = $media ? $media->where('type', '2d')->first() : null;
        $model    = $media ? $media->where('type', '3d')->sortByDesc('id')->first() : null;

        return [
            'id'               => $this->id,
            'title'            => $this->title,
            'description'      => $this->description,
            'type'             => $this->type,

            'backdrop_url'     => $backdrop ? $backdrop['filepad'] : null,
            'model_url'        => $model ? $model['filepad'] : null,

            // Editor uses media
            'media'            => $media,

            // Include the raw data for gateways and spawnpoints
            '2d_gateways'      => $this->{'2d_gateways'},
            '3d_spawnpoints'   => $this->{'3d_spawnpoints'},
            'thumb_dimensions' => $this->thumb_dimensions,
            'data'             => $this->data,

            // Sector relationship
            'sector'           => $this->sector,
            'sector_id'        => $this->sector_id,

            'created_at'       => $this->created_at,
            'updated_at'       => $this->updated_at,
        ];
    }
}
