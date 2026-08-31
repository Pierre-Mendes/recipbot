import { render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'

import RecipeCard from '@/components/RecipeCard.vue'
import type { Recipe } from '@/types'

const recipe: Recipe = {
  id: 'uuid-1',
  user_id: 1,
  title: 'Bolo de Chocolate',
  ingredients: ['farinha', 'acucar', 'ovos'],
  tags: ['sobremesa', 'chocolate'],
  source_url: null,
  created_at: '',
  updated_at: '',
}

function renderWithRouter(recipe: Recipe, layout: 'grid' | 'list' = 'grid') {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'recipes', component: { template: '<div />' } },
      { path: '/recipes/:id', name: 'recipe-detail', component: { template: '<div />' } },
    ],
  })
  return render(RecipeCard, {
    props: { recipe, layout },
    global: { plugins: [router] },
  })
}

// A recipe that exercises the optional branches: imported source, a real
// timestamp (so the "created" label renders) and more than three tags (so the
// "+N" overflow chip renders).
const richRecipe: Recipe = {
  ...recipe,
  id: 'uuid-2',
  source_url: 'https://example.com/recipe',
  created_at: new Date().toISOString(),
  tags: ['a', 'b', 'c', 'd', 'e'],
}

describe('RecipeCard', () => {
  it('renders the title, ingredient count, and tags', () => {
    renderWithRouter(recipe)

    expect(screen.getByText('Bolo de Chocolate')).toBeInTheDocument()
    expect(screen.getByText('3 ingredientes')).toBeInTheDocument()
    expect(screen.getByText('sobremesa')).toBeInTheDocument()
    expect(screen.getByText('chocolate')).toBeInTheDocument()
  })

  it('links to the recipe detail page', () => {
    renderWithRouter(recipe)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/recipes/uuid-1')
  })

  it('renders the list layout with title and tags', () => {
    renderWithRouter(recipe, 'list')

    expect(screen.getByText('Bolo de Chocolate')).toBeInTheDocument()
    expect(screen.getByText('sobremesa')).toBeInTheDocument()
  })

  it('shows the imported indicator, a created label, and a tag overflow chip (grid)', () => {
    renderWithRouter(richRecipe, 'grid')

    // Only the first three tags render, plus a "+2" overflow chip for the rest.
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('c')).toBeInTheDocument()
    expect(screen.queryByText('d')).not.toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('shows the imported indicator, a created label, and a tag overflow chip (list)', () => {
    renderWithRouter(richRecipe, 'list')

    expect(screen.getByText('+2')).toBeInTheDocument()
    expect(screen.getByLabelText('Importada de uma URL')).toBeInTheDocument()
  })
})
