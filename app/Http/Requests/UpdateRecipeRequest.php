<?php

namespace App\Http\Requests;

use App\Models\Recipe;
use Illuminate\Foundation\Http\FormRequest;

class UpdateRecipeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'min:3', 'max:255', Recipe::titleNotBlankRule()],
            'ingredients' => ['sometimes', 'array', 'min:1', 'max:20'],
            'ingredients.*' => ['string', 'max:255'],
            'instructions' => ['sometimes', 'nullable', 'array', 'max:50'],
            'instructions.*' => ['string', 'max:1000'],
            'tags' => ['nullable', 'array', 'max:10'],
            // Same tag charset as the store/URL-import paths.
            'tags.*' => ['string', 'max:50', 'regex:/^[\p{L}\p{N} -]+$/u'],
            'source_url' => ['nullable', 'url', 'max:2048'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.min' => 'Recipe title must be at least 3 characters',
            'ingredients.max' => 'Maximum 20 ingredients allowed',
            'tags.max' => 'Maximum 10 tags allowed',
            'source_url.url' => 'Source URL must be a valid URL',
        ];
    }
}
