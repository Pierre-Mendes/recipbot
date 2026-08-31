import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '@/api/client'
import {
  createRecipe,
  createRecipeFromUrl,
  deleteRecipe,
  getRecipe,
  listRecipes,
  listTags,
  searchRecipes,
  updateRecipe,
} from '@/api/recipes'
import type { Recipe } from '@/types'

const recipe: Recipe = {
  id: 'uuid-1',
  user_id: 1,
  title: 'Bolo',
  ingredients: ['farinha'],
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
