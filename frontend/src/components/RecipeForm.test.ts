import { fireEvent, render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import RecipeForm from '@/components/RecipeForm.vue'

describe('RecipeForm', () => {
  it('emits parsed title/ingredients/tags on manual submit', async () => {
    const { emitted } = render(RecipeForm)

    await fireEvent.update(screen.getByLabelText('Title'), 'Bolo de Chocolate')
    await fireEvent.update(
      screen.getByLabelText('Ingredients (one per line)'),
      'farinha\nacucar\novos',
    )
    await fireEvent.update(screen.getByLabelText('Tags (comma separated)'), 'sobremesa, chocolate')
    await fireEvent.click(screen.getByRole('button', { name: 'Create recipe' }))

    expect(emitted().submit[0]).toEqual([
      {
        title: 'Bolo de Chocolate',
        ingredients: ['farinha', 'acucar', 'ovos'],
        tags: ['sobremesa', 'chocolate'],
        source_url: null,
      },
    ])
  })

  it('emits a from-url payload when the import tab is used', async () => {
    const { emitted } = render(RecipeForm)

    await fireEvent.click(screen.getByRole('button', { name: 'Import from URL' }))
    await fireEvent.update(
      screen.getByLabelText('Recipe URL'),
      'https://www.tudogostoso.com.br/receita/1-bolo.html',
    )
    await fireEvent.click(screen.getByRole('button', { name: 'Import recipe' }))

    expect(emitted().submitFromUrl[0]).toEqual([
      {
        url: 'https://www.tudogostoso.com.br/receita/1-bolo.html',
        tags: [],
      },
    ])
  })

  it('hides the URL-import tab when editing an existing recipe', () => {
    render(RecipeForm, {
      props: {
        recipe: {
          id: 'uuid-1',
          user_id: 1,
          title: 'Bolo',
          ingredients: ['farinha'],
          tags: [],
          source_url: null,
          created_at: '',
          updated_at: '',
        },
      },
    })

    expect(screen.queryByRole('button', { name: 'Import from URL' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })
})
