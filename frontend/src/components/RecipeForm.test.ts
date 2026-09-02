import { fireEvent, render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'

import RecipeForm from '@/components/RecipeForm.vue'

const TAGS_LABEL = 'Tags (pressione vírgula ou Enter para adicionar)'

describe('RecipeForm', () => {
  it('emits structured title/ingredients/instructions/tags on manual submit', async () => {
    const { emitted } = render(RecipeForm)

    await fireEvent.update(screen.getByLabelText('Título'), 'Bolo de Chocolate')

    // Ingredients are structured rows; row 1 exists, Enter adds the next.
    await fireEvent.update(screen.getByLabelText('ingrediente 1'), 'farinha')
    await fireEvent.keyDown(screen.getByLabelText('ingrediente 1'), { key: 'Enter' })
    await fireEvent.update(screen.getByLabelText('ingrediente 2'), 'acucar')

    await fireEvent.update(screen.getByLabelText('passo 1'), 'Misture os secos')

    // Tags are chips: type each one and confirm with Enter.
    const tagsInput = screen.getByLabelText(TAGS_LABEL)
    await fireEvent.update(tagsInput, 'sobremesa')
    await fireEvent.keyDown(tagsInput, { key: 'Enter' })

    await fireEvent.click(screen.getByRole('button', { name: 'Criar receita' }))

    expect(emitted().submit[0]).toEqual([
      {
        title: 'Bolo de Chocolate',
        ingredients: ['farinha', 'acucar'],
        instructions: ['Misture os secos'],
        tags: ['sobremesa'],
        source_url: null,
        notes: null,
      },
    ])
  })

  it('includes the optional note in the manual submit payload', async () => {
    const { emitted } = render(RecipeForm)

    await fireEvent.update(screen.getByLabelText('Título'), 'Bolo')
    await fireEvent.update(screen.getByLabelText('ingrediente 1'), 'farinha')
    await fireEvent.update(screen.getByLabelText('Observação (opcional)'), 'Ver post no Instagram')

    await fireEvent.click(screen.getByRole('button', { name: 'Criar receita' }))

    expect(emitted().submit[0]).toEqual([
      {
        title: 'Bolo',
        ingredients: ['farinha'],
        instructions: [],
        tags: [],
        source_url: null,
        notes: 'Ver post no Instagram',
      },
    ])
  })

  it('emits a from-url payload when the import tab is used', async () => {
    const { emitted } = render(RecipeForm)

    await fireEvent.click(screen.getByRole('button', { name: 'Importar de URL' }))
    await fireEvent.update(
      screen.getByLabelText('URL da Receita'),
      'https://www.tudogostoso.com.br/receita/1-bolo.html',
    )
    await fireEvent.click(screen.getByRole('button', { name: 'Importar receita' }))

    expect(emitted().submitFromUrl[0]).toEqual([
      {
        url: 'https://www.tudogostoso.com.br/receita/1-bolo.html',
        tags: [],
      },
    ])
  })

  it('emits the chosen file from the Arquivo tab', async () => {
    const { emitted } = render(RecipeForm)

    await fireEvent.click(screen.getByRole('button', { name: 'Arquivo' }))
    const file = new File(['x'], 'receita.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const input = screen.getByLabelText('Planilha (.xlsx)') as HTMLInputElement
    // jsdom's input.files is read-only, so define it before firing change.
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    await fireEvent.change(input)
    await fireEvent.click(screen.getByRole('button', { name: 'Importar planilha' }))

    expect(emitted().submitFile[0]).toEqual([file])
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

    expect(screen.queryByRole('button', { name: 'Importar de URL' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument()
  })

  it('prefills from an import draft and labels the button "Criar receita" via submitLabel', () => {
    // The import review flow passes the extracted draft as `recipe` (so the
    // form is prefilled and the URL tab hidden) but overrides the label,
    // because the action is still a create, not "save changes".
    render(RecipeForm, {
      props: {
        recipe: {
          id: 'draft-1',
          title: 'Churros',
          ingredients: ['agua', 'farinha'],
          instructions: ['Ferva a agua', 'Frite'],
          tags: ['doce'],
          source_url: 'https://www.tudogostoso.com.br/receita/1-churros.html',
        },
        submitLabel: 'Criar receita',
      },
    })

    expect(screen.queryByRole('button', { name: 'Importar de URL' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar receita' })).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toHaveValue('Churros')
    expect(screen.getByLabelText('ingrediente 1')).toHaveValue('agua')
    expect(screen.getByLabelText('passo 1')).toHaveValue('Ferva a agua')
    expect(screen.getByLabelText('passo 2')).toHaveValue('Frite')
  })

  it('re-hydrates the fields when a draft arrives after mount (import review)', async () => {
    // The import review flow mounts the form empty (URL tab), then swaps in the
    // extracted draft in place. The fields must populate on that transition, not
    // only when the recipe is present at mount.
    const { rerender } = render(RecipeForm, { props: { recipe: null } })

    expect(screen.getByLabelText('Título')).toHaveValue('')

    await rerender({
      recipe: {
        id: 'draft-1',
        title: 'Churros',
        ingredients: ['agua', 'farinha'],
        instructions: ['Ferva a agua', 'Frite'],
        tags: ['doce'],
        source_url: 'https://www.tudogostoso.com.br/receita/1-churros.html',
      },
      submitLabel: 'Criar receita',
    })

    expect(screen.getByLabelText('Título')).toHaveValue('Churros')
    expect(screen.getByLabelText('ingrediente 1')).toHaveValue('agua')
    expect(screen.getByLabelText('ingrediente 2')).toHaveValue('farinha')
    expect(screen.getByLabelText('passo 1')).toHaveValue('Ferva a agua')
    expect(screen.getByText('doce')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar receita' })).toBeInTheDocument()

    // Discarding the draft (recipe -> null) clears the fields back to empty.
    await rerender({ recipe: null, submitLabel: null })
    expect(screen.getByLabelText('Título')).toHaveValue('')
    expect(screen.getByLabelText('ingrediente 1')).toHaveValue('')
  })

  it('fills the fields from an already-loaded recipe at mount', () => {
    render(RecipeForm, {
      props: {
        recipe: {
          id: 'uuid-1',
          user_id: 1,
          title: 'Bolo',
          ingredients: ['farinha', 'acucar'],
          instructions: ['Misture tudo'],
          tags: ['sobremesa'],
          source_url: null,
          created_at: '',
          updated_at: '',
        },
      },
    })

    expect(screen.getByLabelText('Título')).toHaveValue('Bolo')
    expect(screen.getByLabelText('ingrediente 1')).toHaveValue('farinha')
    expect(screen.getByLabelText('ingrediente 2')).toHaveValue('acucar')
    expect(screen.getByLabelText('passo 1')).toHaveValue('Misture tudo')
    // The existing tag is rendered as a chip, not as the input's value.
    expect(screen.getByText('sobremesa')).toBeInTheDocument()
  })
})
