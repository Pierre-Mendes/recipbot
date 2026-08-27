<?php

use App\Models\Recipe;
use App\Models\User;

test('soft deletes a user', function () {
    $user = User::factory()->create();

    $user->delete();

    expect($user->fresh()->trashed())->toBeTrue()
        ->and(User::find($user->id))->toBeNull()
        ->and(User::withTrashed()->find($user->id))->not->toBeNull();
});

test('has many recipes', function () {
    $user = User::factory()->create();
    Recipe::factory()->count(2)->for($user)->create();

    expect($user->recipes)->toHaveCount(2)
        ->and($user->recipes->first())->toBeInstanceOf(Recipe::class);
});

test('hides password and remember token from serialization', function () {
    $user = User::factory()->create();

    $array = $user->toArray();

    expect($array)->not->toHaveKey('password')
        ->and($array)->not->toHaveKey('remember_token');
});
