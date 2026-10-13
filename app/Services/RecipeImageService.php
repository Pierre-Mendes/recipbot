<?php

namespace App\Services;

use App\Events\RecipeUpdated;
use App\Models\Recipe;
use App\Models\User;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Stores recipe photos on the configured images disk (MinIO in docker, any
 * S3-compatible bucket in production, the local "public" disk otherwise).
 * Object keys are random UUIDs, so the public URL is not guessable from the
 * recipe or user ids.
 */
class RecipeImageService
{
    /**
     * Store a new photo for the recipe, replacing (and deleting) any previous one.
     *
     * @throws RuntimeException when the disk refuses the write
     */
    public function store(Recipe $recipe, UploadedFile $image): Recipe
    {
        $filename = Str::uuid()->toString().'.'.$image->extension();
        $path = $this->disk()->putFileAs("recipes/{$recipe->user_id}", $image, $filename);

        if ($path === false) {
            throw new RuntimeException('Could not store the recipe image.');
        }

        $previous = $recipe->image_path;
        $recipe->forceFill(['image_path' => $path])->save();

        if ($previous !== null) {
            $this->disk()->delete($previous);
        }

        event(new RecipeUpdated($recipe, $this->ownerOf($recipe)));

        return $recipe;
    }

    /**
     * Remove the recipe's photo (no-op when it has none).
     */
    public function delete(Recipe $recipe): Recipe
    {
        if ($recipe->image_path === null) {
            return $recipe;
        }

        $this->disk()->delete($recipe->image_path);
        $recipe->forceFill(['image_path' => null])->save();

        event(new RecipeUpdated($recipe, $this->ownerOf($recipe)));

        return $recipe;
    }

    /**
     * Public URL of the recipe's photo, or null when it has none.
     */
    public function url(Recipe $recipe): ?string
    {
        return $recipe->image_path === null ? null : $this->disk()->url($recipe->image_path);
    }

    private function disk(): FilesystemAdapter
    {
        /** @var FilesystemAdapter $disk */
        $disk = Storage::disk(config()->string('recipbot.images.disk', 'public'));

        return $disk;
    }

    private function ownerOf(Recipe $recipe): User
    {
        /** @var User $user */
        $user = $recipe->user;

        return $user;
    }
}
