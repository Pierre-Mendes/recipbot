import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as recipesApi from '@/api/recipes'
import type { Recipe } from '@/types'
import { useRecipesStore } from '@/stores/recipes'

vi.mock('@/api/recipes')

const sampleRecipe: Recipe = {
  id: 'uuid-1',
  user_id: 1,
  title: 'Bolo de Chocolate',
  ingredients: ['farinha', 'acucar'],
  tags: ['sobremesa'],
  source_url: null,
  created_at: '',
  updated_at: '',
}

describe('recipes store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('loads recipes and pagination meta', async () => {
    vi.mocked(recipesApi.listRecipes).mockResolvedValue({
      data: [sampleRecipe],
      meta: { current_page: 1, total: 1, per_page: 20, last_page: 1 },
    })

    const store = useRecipesStore()
    await store.fetchAll()

    expect(store.recipes).toHaveLength(1)
    expect(store.meta?.total).toBe(1)
    expect(store.loading).toBe(false)
  })

  it('sets an error and keeps loading false when fetching fails', async () => {
    vi.mocked(recipesApi.listRecipes).mockRejectedValue(new Error('network error'))

    const store = useRecipesStore()
    await store.fetchAll()

    expect(store.error).toBe('Failed to load recipes')
    expect(store.loading).toBe(false)
  })

  it('removes a recipe locally after a successful delete', async () => {
    vi.mocked(recipesApi.listRecipes).mockResolvedValue({
      data: [sampleRecipe],
      meta: { current_page: 1, total: 1, per_page: 20, last_page: 1 },
    })
    vi.mocked(recipesApi.deleteRecipe).mockResolvedValue(undefined)

    const store = useRecipesStore()
    await store.fetchAll()
    await store.remove(sampleRecipe.id)

    expect(store.recipes).toHaveLength(0)
  })

  it('passes query and tags through to the search endpoint', async () => {
    vi.mocked(recipesApi.searchRecipes).mockResolvedValue({
      data: [sampleRecipe],
      meta: { current_page: 1, total: 1, per_page: 20, last_page: 1 },
    })

    const store = useRecipesStore()
    await store.search('bolo', ['sobremesa'])

    expect(recipesApi.searchRecipes).toHaveBeenCalledWith({
      query: 'bolo',
      tags: ['sobremesa'],
      page: 1,
    })
    expect(store.recipes).toHaveLength(1)
  })
})
