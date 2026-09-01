<?php

namespace App\Models;

use Database\Factories\RecipeFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Recipe extends Model
{
    /** @use HasFactory<RecipeFactory> */
    use HasFactory, HasUuids, SoftDeletes;

    /**
     * The primary key is a database-generated UUID, not an auto-incrementing integer.
     */
    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'title',
        'ingredients',
        'instructions',
        'tags',
        'source_url',
        'notes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'ingredients' => 'array',
            'instructions' => 'array',
            'tags' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Validation rules per specs/recipe-management.spec.md "Validation Rules".
     *
     * @return array<string, mixed>
     */
    public static function rules(): array
    {
        return [
            'title' => [
                'required',
                'string',
                'min:3',
                'max:255',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if (is_string($value) && trim($value) === '') {
                        $fail('The '.$attribute.' cannot be only whitespace.');
                    }
                },
            ],
            'ingredients' => ['required', 'array', 'min:1', 'max:20'],
            'ingredients.*' => ['string', 'max:255'],
            'instructions' => ['sometimes', 'array', 'max:50'],
            'instructions.*' => ['string', 'max:1000'],
            'tags' => ['sometimes', 'array', 'max:10'],
            'tags.*' => ['string', 'max:50', 'regex:/^[\p{L}\p{N} -]+$/u'],
            'source_url' => ['nullable', 'url', 'max:2048'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function createRules(): array
    {
        return self::rules();
    }

    /**
     * @return array<string, mixed>
     */
    public static function updateRules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'min:3', 'max:255'],
            'ingredients' => ['sometimes', 'array', 'min:1', 'max:20'],
            'ingredients.*' => ['string', 'max:255'],
            'instructions' => ['sometimes', 'array', 'max:50'],
            'instructions.*' => ['string', 'max:1000'],
            'tags' => ['sometimes', 'array', 'max:10'],
            'tags.*' => ['string', 'max:50', 'regex:/^[\p{L}\p{N} -]+$/u'],
            'source_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
