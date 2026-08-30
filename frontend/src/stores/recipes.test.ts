import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as recipesApi from '@/api/recipes'
import type { PaginatedRecipes, Recipe } from '@/types'
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

  it('omits empty query and tags from the search payload', async () => {
    vi.mocked(recipesApi.searchRecipes).mockResolvedValue({
      data: [],
      meta: { current_page: 1, total: 0, per_page: 20, last_page: 1 },
    })

    const store = useRecipesStore()
    await store.search('', [])

    expect(recipesApi.searchRecipes).toHaveBeenCalledWith({
      query: undefined,
      tags: undefined,
      page: 1,
    })
  })

  it('sets an error when search fails', async () => {
    vi.mocked(recipesApi.searchRecipes).mockRejectedValue(new Error('network error'))

    const store = useRecipesStore()
    await store.search('bolo', [])

    expect(store.error).toBe('Search failed')
    expect(store.loading).toBe(false)
  })

  it('drops a stale search response when a newer search has already resolved', async () => {
    let resolveStale!: (value: PaginatedRecipes) => void
    const stale = new Promise<PaginatedRecipes>((resolve) => {
      resolveStale = resolve
    })
    const fresh: PaginatedRecipes = {
      data: [sampleRecipe],
      meta: { current_page: 1, total: 1, per_page: 20, last_page: 1 },
    }
    vi.mocked(recipesApi.searchRecipes).mockReturnValueOnce(stale).mockResolvedValueOnce(fresh)

    const store = useRecipesStore()
    const stalePromise = store.search('old', [])
    const freshPromise = store.search('new', [])
    await freshPromise

    // Resolve the older, superseded request last - its result must be ignored.
    resolveStale({
      data: [],
      meta: { current_page: 9, total: 0, per_page: 20, last_page: 9 },
    })
    await stalePromise

    expect(store.recipes).toEqual([sampleRecipe])
    expect(store.meta?.current_page).toBe(1)
    expect(store.loading).toBe(false)
  })

  it('loads tag suggestions', async () => {
    vi.mocked(recipesApi.listTags).mockResolvedValue([
      { name: 'sobremesa', count: 3 },
      { name: 'salgado', count: 1 },
    ])

    const store = useRecipesStore()
    await store.fetchTags()

    expect(store.tags).toHaveLength(2)
    expect(store.tags[0]).toEqual({ name: 'sobremesa', count: 3 })
  })

  it('falls back to an empty tag list when fetching tags fails', async () => {
    vi.mocked(recipesApi.listTags).mockRejectedValue(new Error('network error'))

    const store = useRecipesStore()
    await store.fetchTags()

    expect(store.tags).toEqual([])
  })

  it('creates a recipe through the API', async () => {
    vi.mocked(recipesApi.createRecipe).mockResolvedValue(sampleRecipe)

    const store = useRecipesStore()
    const input = { title: 'Bolo', ingredients: ['farinha'], tags: ['sobremesa'] }
    const created = await store.create(input)

    expect(recipesApi.createRecipe).toHaveBeenCalledWith(input)
    expect(created).toEqual(sampleRecipe)
  })

  it('creates a recipe from a URL through the API', async () => {
    vi.mocked(recipesApi.createRecipeFromUrl).mockResolvedValue(sampleRecipe)

    const store = useRecipesStore()
    const input = { url: 'https://example.com/recipe', tags: [] }
    const created = await store.createFromUrl(input)

    expect(recipesApi.createRecipeFromUrl).toHaveBeenCalledWith(input)
    expect(created).toEqual(sampleRecipe)
  })

  it('updates a recipe through the API', async () => {
    const updated = { ...sampleRecipe, title: 'Bolo atualizado' }
    vi.mocked(recipesApi.updateRecipe).mockResolvedValue(updated)

    const store = useRecipesStore()
    const result = await store.update(sampleRecipe.id, { title: 'Bolo atualizado' })

    expect(recipesApi.updateRecipe).toHaveBeenCalledWith(sampleRecipe.id, {
      title: 'Bolo atualizado',
    })
    expect(result.title).toBe('Bolo atualizado')
  })
})
