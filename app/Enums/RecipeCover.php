<?php

namespace App\Enums;

/**
 * Built-in cover illustrations a user can pick for a recipe instead of
 * uploading a photo. The artwork itself lives in the frontend
 * (frontend/public/covers/{value}.svg); the API only stores the key.
 */
enum RecipeCover: string
{
    case Cake = 'cake';
    case Pasta = 'pasta';
    case Salad = 'salad';
    case Soup = 'soup';
    case Bread = 'bread';
    case Meat = 'meat';
    case Fish = 'fish';
    case Drink = 'drink';
}
