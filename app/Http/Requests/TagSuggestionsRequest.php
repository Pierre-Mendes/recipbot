<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TagSuggestionsRequest extends FormRequest
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
            'q' => ['nullable', 'string', 'max:50'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:'.config('recipbot.pagination.tags_max_limit', 25)],
        ];
    }
}
