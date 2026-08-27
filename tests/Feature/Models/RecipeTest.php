<?php

use App\Models\Recipe;
use App\Models\User;
use Illuminate\Support\Facades\Validator;

function validateRecipe(array $overrides = []): \Illuminate\Contracts\Validation\Validator
{
    $data = array_merge([
        'title' => 'Bolo de Chocolate',
        'ingredients' => ['2 xícaras de farinha', '1 xícara de açúcar'],
        'tags' => ['sobremesa', 'chocolate'],
        'source_url' => null,
    ], $overrides);

    return Validator::make($data, Recipe::rules());
}

test('creates a recipe with valid data', function () {
    $user = User::factory()->create();

    $recipe = Recipe::factory()->for($user)->create([
        'title' => 'Bolo de Chocolate',
        'ingredients' => ['farinha', 'açúcar'],
        'tags' => ['sobremesa'],
    ]);

    expect($recipe->title)->toBe('Bolo de Chocolate')
        ->and($recipe->ingredients)->toBe(['farinha', 'açúcar'])
        ->and($recipe->tags)->toBe(['sobremesa'])
        ->and($recipe->id)->toBeString();
});

test('validation passes with valid data', function () {
    expect(validateRecipe()->passes())->toBeTrue();
});

test('validation fails when title is missing', function () {
    expect(validateRecipe(['title' => null])->fails())->toBeTrue();
});

test('validation fails when title is shorter than 3 characters', function () {
    expect(validateRecipe(['title' => 'Ab'])->fails())->toBeTrue();
});

test('validation fails when title is only whitespace', function () {
    expect(validateRecipe(['title' => '   '])->fails())->toBeTrue();
});

test('validation fails with more than 20 ingredients', function () {
    $result = validateRecipe(['ingredients' => array_fill(0, 21, 'item')]);

    expect($result->fails())->toBeTrue();
});

test('validation fails with an empty ingredients array', function () {
    expect(validateRecipe(['ingredients' => []])->fails())->toBeTrue();
});

test('validation fails with more than 10 tags', function () {
    $result = validateRecipe(['tags' => array_fill(0, 11, 'tag')]);

    expect($result->fails())->toBeTrue();
});

test('validation fails when a tag has invalid characters', function () {
    expect(validateRecipe(['tags' => ['sobremesa!']])->fails())->toBeTrue();
});

test('validation fails with an invalid source url', function () {
    expect(validateRecipe(['source_url' => 'not-a-url'])->fails())->toBeTrue();
});

test('soft deletes a recipe', function () {
    $recipe = Recipe::factory()->create();

    $recipe->delete();

    expect($recipe->fresh()->trashed())->toBeTrue()
        ->and(Recipe::find($recipe->id))->toBeNull()
        ->and(Recipe::withTrashed()->find($recipe->id))->not->toBeNull();
});

test('belongs to a user', function () {
    $user = User::factory()->create();
    $recipe = Recipe::factory()->for($user)->create();

    expect($recipe->user)->toBeInstanceOf(User::class)
        ->and($recipe->user->id)->toBe($user->id);
});
