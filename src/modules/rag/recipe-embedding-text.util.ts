export interface RecipeEmbeddingInput {
  title: string | null;
  ingredients: string[];
  instructions: string[];
  tags: string[];
}

/**
 * Builds the text representation embedded at index time. Whatever this
 * produces must stay stable — re-ordering or reformatting it changes
 * every future embedding relative to already-stored vectors.
 */
export function buildRecipeEmbeddingText(recipe: RecipeEmbeddingInput): string {
  const parts = [
    recipe.title,
    recipe.tags.length > 0 ? `Tags: ${recipe.tags.join(', ')}` : null,
    recipe.ingredients.length > 0
      ? `Ingredients: ${recipe.ingredients.join('; ')}`
      : null,
    recipe.instructions.length > 0
      ? `Instructions: ${recipe.instructions.join(' ')}`
      : null,
  ];

  return parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .join('\n');
}
