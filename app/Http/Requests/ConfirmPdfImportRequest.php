<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmPdfImportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Upper page bounds depend on the cached analysis, so the controller
     * checks them once it has loaded it.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'recipes' => ['required', 'array', 'min:1', 'max:50'],
            'recipes.*.title' => ['nullable', 'string', 'max:255'],
            'recipes.*.pages' => ['required', 'array', 'min:1'],
            'recipes.*.pages.*' => ['integer', 'min:1', 'distinct'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'recipes.required' => 'Select at least one recipe',
            'recipes.*.pages.required' => 'Each recipe needs at least one page',
            'recipes.*.pages.min' => 'Each recipe needs at least one page',
        ];
    }
}
