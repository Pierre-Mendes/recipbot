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

function renderWithRouter(recipe: Recipe) {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'recipes', component: { template: '<div />' } },
      { path: '/recipes/:id', name: 'recipe-detail', component: { template: '<div />' } },
    ],
  })
  return render(RecipeCard, {
    props: { recipe },
    global: { plugins: [router] },
  })
}

describe('RecipeCard', () => {
  it('renders the title, ingredient count, and tags', () => {
    renderWithRouter(recipe)

    expect(screen.getByText('Bolo de Chocolate')).toBeInTheDocument()
    expect(screen.getByText('3 ingredients')).toBeInTheDocument()
    expect(screen.getByText('sobremesa')).toBeInTheDocument()
    expect(screen.getByText('chocolate')).toBeInTheDocument()
  })

  it('links to the recipe detail page', () => {
    renderWithRouter(recipe)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/recipes/uuid-1')
  })
})
