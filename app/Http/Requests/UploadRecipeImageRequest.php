<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadRecipeImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Raster images only: the "image" rule rejects SVG, which could carry
     * scripts once served from the bucket.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $maxKb = config()->integer('recipbot.images.max_file_kb', 5120);

        return [
            'image' => [
                'required',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                "max:{$maxKb}",
                'dimensions:max_width=8000,max_height=8000',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'image.required' => 'An image file is required',
            'image.image' => 'The file must be an image (jpg, png, webp)',
            'image.mimes' => 'The file must be an image (jpg, png, webp)',
            'image.max' => 'The image is too large',
        ];
    }
}
