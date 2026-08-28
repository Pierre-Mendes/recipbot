<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRecipeRequest extends FormRequest
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
            'title' => ['required', 'string', 'min:3', 'max:255'],
            'ingredients' => ['required', 'array', 'min:1', 'max:20'],
            'ingredients.*' => ['string', 'max:500'],
            'tags' => ['nullable', 'array', 'max:10'],
            'tags.*' => ['string', 'max:50'],
            'source_url' => ['nullable', 'url', 'max:2048'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'Recipe title is required',
            'title.min' => 'Recipe title must be at least 3 characters',
            'ingredients.required' => 'At least one ingredient is required',
            'ingredients.max' => 'Maximum 20 ingredients allowed',
            'tags.max' => 'Maximum 10 tags allowed',
            'source_url.url' => 'Source URL must be a valid URL',
        ];
    }
}
