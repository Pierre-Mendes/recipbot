<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class IndexRecipesRequest extends FormRequest
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
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.config('recipbot.pagination.recipes_max_per_page', 100)],
        ];
    }
}
