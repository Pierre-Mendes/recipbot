import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '@/api/client'
import {
  createRecipe,
  createRecipeFromUrl,
  deleteRecipe,
  getRecipe,
  listRecipes,
  listTags,
  previewRecipeFromUrl,
  searchRecipes,
  updateRecipe,
} from '@/api/recipes'
import type { Recipe, RecipeDraft } from '@/types'

const recipe: Recipe = {
  id: 'uuid-1',
  user_id: 1,
  title: 'Bolo',
  ingredients: ['farinha'],
  instructions: null,
  tags: [],
  source_url: null,
  created_at: '',
  updated_at: '',
}

describe('recipes api', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('listRecipes requests the given page and returns the paginated payload', async () => {
    const meta = { current_page: 2, total: 1, per_page: 20, last_page: 1 }
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ data: { data: [recipe], meta: { pagination: meta } } })

    const result = await listRecipes(2)

    expect(get).toHaveBeenCalledWith('/recipes', { params: { page: 2 } })
    expect(result).toEqual({ data: [recipe], meta })
  })

  it('listRecipes falls back to a default meta when the response omits pagination', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: [recipe] } })

    const result = await listRecipes()

    expect(result).toEqual({
      data: [recipe],
      meta: { current_page: 1, total: 0, per_page: 20, last_page: 1 },
    })
  })

  it('searchRecipes falls back to a default meta when the response omits pagination', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { data: [recipe] } })

    const result = await searchRecipes({ query: 'bolo' })

    expect(result).toEqual({
      data: [recipe],
      meta: { current_page: 1, total: 0, per_page: 20, last_page: 1 },
    })
  })

  it('getRecipe unwraps the data envelope', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: recipe } })

    const result = await getRecipe('uuid-1')

    expect(result).toEqual(recipe)
  })

  it('getRecipe coerces null tags/ingredients into arrays so rendering never throws', async () => {
    // A stale backend or a legacy row can send null jsonb fields; rendering does
    // recipe.tags.length / ingredients.join(...), which would throw and blank the
    // page. The API layer normalizes these to [] at the boundary.
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { data: { ...recipe, tags: null, ingredients: null, instructions: null } },
    })

    const result = await getRecipe('uuid-1')

    expect(result.tags).toEqual([])
    expect(result.ingredients).toEqual([])
    expect(result.instructions).toBeNull()
  })

  it('getRecipe tolerates an unwrapped recipe body (no data envelope)', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: recipe })

    const result = await getRecipe('uuid-1')

    expect(result).toEqual(recipe)
  })

  it('getRecipe throws on a response with no usable recipe, so the page shows "not found" instead of blanking', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: null } })

    await expect(getRecipe('uuid-1')).rejects.toThrow()
  })

  it('createRecipe posts the form input', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: { data: recipe, message: 'ok' } })

    const input = { title: 'Bolo', ingredients: ['farinha'], instructions: [], tags: [] }
    const result = await createRecipe(input)

    expect(post).toHaveBeenCalledWith('/recipes', input)
    expect(result).toEqual(recipe)
  })

  it('updateRecipe patches the given id', async () => {
    const patch = vi
      .spyOn(apiClient, 'patch')
      .mockResolvedValue({ data: { data: recipe, message: 'ok' } })

    await updateRecipe('uuid-1', { title: 'New title' })

    expect(patch).toHaveBeenCalledWith('/recipes/uuid-1', { title: 'New title' })
  })

  it('deleteRecipe deletes the given id', async () => {
    const del = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: {} })

    await deleteRecipe('uuid-1')

    expect(del).toHaveBeenCalledWith('/recipes/uuid-1')
  })

  it('createRecipeFromUrl posts to /recipes/from-url', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: { data: recipe, message: 'ok' } })

    const input = { url: 'https://www.tudogostoso.com.br/receita/1.html', tags: ['doce'] }
    const result = await createRecipeFromUrl(input)

    expect(post).toHaveBeenCalledWith('/recipes/from-url', input)
    expect(result).toEqual(recipe)
  })

  const draft: RecipeDraft = {
    id: 'draft-1',
    title: 'Panquecas',
    ingredients: ['farinha', 'ovo'],
    instructions: ['misture tudo'],
    tags: ['cafe'],
    source_url: 'https://www.tudogostoso.com.br/receita/1.html',
  }

  it('previewRecipeFromUrl posts to /recipes/preview-url and unwraps the draft envelope', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { data: draft } })

    const input = { url: 'https://www.tudogostoso.com.br/receita/1.html', tags: ['cafe'] }
    const result = await previewRecipeFromUrl(input)

    expect(post).toHaveBeenCalledWith('/recipes/preview-url', input)
    expect(result).toEqual(draft)
  })

  it('previewRecipeFromUrl coerces null/missing draft fields into safe defaults so the review form never throws', async () => {
    // The scraper can return a partial extraction (missing title, null jsonb
    // list fields). The review form renders ingredients.map(...) etc., so the
    // API layer normalizes these at the boundary just like normalizeRecipe.
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: {
        data: {
          id: 'draft-1',
          title: null,
          ingredients: null,
          instructions: null,
          tags: null,
          source_url: null,
        },
      },
    })

    const result = await previewRecipeFromUrl({ url: 'https://x.test', tags: [] })

    expect(result).toEqual({
      id: 'draft-1',
      title: '',
      ingredients: [],
      instructions: [],
      tags: [],
      source_url: null,
    })
  })

  it('previewRecipeFromUrl tolerates an unwrapped draft body (no data envelope)', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: draft })

    const result = await previewRecipeFromUrl({ url: 'https://x.test', tags: [] })

    expect(result).toEqual(draft)
  })

  it('previewRecipeFromUrl throws on a response with no usable draft, so callers surface an import error instead of a broken form', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { data: null } })

    await expect(previewRecipeFromUrl({ url: 'https://x.test', tags: [] })).rejects.toThrow(
      'Malformed draft response: missing draft payload',
    )
  })

  it('searchRecipes posts the filters and normalizes pagination to meta', async () => {
    const pagination = { current_page: 1, total: 1, per_page: 20, last_page: 1 }
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: { data: [recipe], meta: { pagination, search_time_ms: 5, cache_hit: false } },
    })

    const input = { tags: ['sobremesa'], query: 'bolo', page: 1 }
    const result = await searchRecipes(input)

    expect(post).toHaveBeenCalledWith('/recipes/search', input)
    expect(result).toEqual({ data: [recipe], meta: pagination })
  })

  it('listTags unwraps the tags array', async () => {
    const tags = [{ name: 'sobremesa', count: 3 }]
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: tags } })

    const result = await listTags()

    expect(result).toEqual(tags)
  })
})
