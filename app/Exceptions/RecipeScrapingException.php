<?php

namespace App\Exceptions;

/**
 * Thrown for any recoverable recipe-scraping failure (SSRF rejection,
 * timeout, oversized response, unparseable page). The controller catches
 * this and returns 422 with the exception's message, per
 * specs/recipe-management.spec.md's Error Handling table.
 */
class RecipeScrapingException extends \RuntimeException {}
