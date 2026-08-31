<?php

namespace App\Http\Requests;

use App\Models\Recipe;
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
        return Recipe::createRules();
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
