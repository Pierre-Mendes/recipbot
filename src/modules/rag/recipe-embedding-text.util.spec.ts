import { buildRecipeEmbeddingText } from './recipe-embedding-text.util';

describe('buildRecipeEmbeddingText', () => {
  it('combines title, tags, ingredients, and instructions on separate lines', () => {
    const text = buildRecipeEmbeddingText({
      title: 'Bolo de Cenoura',
      tags: ['sobremesa', 'facil'],
      ingredients: ['2 cenouras', '3 ovos'],
      instructions: ['Bata tudo', 'Asse por 40 min'],
    });

    expect(text).toBe(
      [
        'Bolo de Cenoura',
        'Tags: sobremesa, facil',
        'Ingredients: 2 cenouras; 3 ovos',
        'Instructions: Bata tudo Asse por 40 min',
      ].join('\n'),
    );
  });

  it('omits empty sections instead of leaving blank lines', () => {
    const text = buildRecipeEmbeddingText({
      title: 'Bolo Simples',
      tags: [],
      ingredients: ['farinha'],
      instructions: [],
    });

    expect(text).toBe('Bolo Simples\nIngredients: farinha');
  });

  it('handles a null title', () => {
    const text = buildRecipeEmbeddingText({
      title: null,
      tags: [],
      ingredients: ['farinha'],
      instructions: [],
    });

    expect(text).toBe('Ingredients: farinha');
  });

  it('returns an empty string when everything is empty', () => {
    expect(
      buildRecipeEmbeddingText({
        title: null,
        tags: [],
        ingredients: [],
        instructions: [],
      }),
    ).toBe('');
  });
});
