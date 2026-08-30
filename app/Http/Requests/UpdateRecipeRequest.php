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
        return Recipe::updateRules();
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
