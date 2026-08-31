<?php

namespace App\Http\Requests;

use App\Models\Recipe;
use Illuminate\Foundation\Http\FormRequest;

class FromUrlRequest extends FormRequest
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
        $rules = Recipe::createRules();

        return [
            'url' => ['required', 'url', 'max:2048'],
            'tags' => $rules['tags'],
            'tags.*' => $rules['tags.*'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'url.required' => 'A recipe URL is required',
            'url.url' => 'Must be a valid URL',
            'tags.max' => 'Maximum 10 tags allowed',
        ];
    }
}
