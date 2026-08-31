import { expect, test } from '@playwright/test'

import { AUTH_FILE } from './constants'

// Reuses the session global-setup.ts creates once via the API, instead of
// each test submitting the login form and burning the auth throttle budget.
test.use({ storageState: AUTH_FILE })

test.describe('recipe CRUD (manual entry)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Minhas Receitas' })).toBeVisible()
  })

  test('creates, views, edits, and deletes a recipe', async ({ page }) => {
    const title = `E2E Panquecas ${Date.now()}`

    // Create
    await page.getByRole('button', { name: 'Nova Receita' }).click()
    await expect(page.getByRole('heading', { name: 'Nova Receita' })).toBeVisible()

    await page.getByLabel('Título').fill(title)
    await page
      .getByLabel('Ingredientes (um por linha)')
      .fill('2 xícaras de farinha\n1 ovo\n1 xícara de leite')

    // Tags use a chip input: type the tag and press Enter to add it.
    const tagInput = page.getByLabel('Tags (pressione vírgula ou Enter para adicionar)')
    await tagInput.fill('cafe')
    await tagInput.press('Enter')

    await page.getByRole('button', { name: 'Criar receita' }).click()

    // Redirects to the detail page
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await expect(page.getByText('3 xícaras de farinha')).toHaveCount(0)
    await expect(page.getByText('2 xícaras de farinha')).toBeVisible()
    await expect(page.getByText('cafe')).toBeVisible()

    // Appears in the list
    await page.getByRole('button', { name: 'Minhas Receitas' }).click()
    await expect(page.getByRole('heading', { name: 'Minhas Receitas' })).toBeVisible()
    await expect(page.getByText('3 ingredientes')).toBeVisible()

    // Open it from the list, then edit
    await page.getByRole('link').filter({ hasText: title }).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await page.getByRole('button', { name: 'Editar' }).click()
    await expect(page.getByRole('heading', { name: 'Editar Receita' })).toBeVisible()

    const updatedTitle = `${title} (editada)`
    await page.getByLabel('Título').fill(updatedTitle)
    await page.getByRole('button', { name: 'Salvar alterações' }).click()

    await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible()

    // Delete - triggers the custom confirmation dialog, then confirm inside it.
    await page.getByRole('button', { name: 'Excluir' }).click()
    await expect(page.getByText('Tem certeza de que deseja excluir esta receita?')).toBeVisible()
    // Two "Excluir" buttons now exist (the page action and the dialog confirm);
    // the dialog's is the last one in the DOM.
    await page.getByRole('button', { name: 'Excluir' }).last().click()

    await expect(page).toHaveURL('/')
    await expect(page.getByText(updatedTitle)).toHaveCount(0)
  })

  test('rejects a title shorter than 3 characters', async ({ page }) => {
    await page.getByRole('button', { name: 'Nova Receita' }).click()

    const titleInput = page.getByLabel('Título')
    await titleInput.fill('ab')
    await page.getByLabel('Ingredientes (um por linha)').fill('1 ovo')
    await page.getByRole('button', { name: 'Criar receita' }).click()

    // The native minlength constraint blocks submission - still on the form.
    await expect(page.getByRole('heading', { name: 'Nova Receita' })).toBeVisible()
    await expect(titleInput).toHaveJSProperty('validity.valid', false)
  })

  test('shows an error when URL import is blocked', async ({ page }) => {
    await page.getByRole('button', { name: 'Nova Receita' }).click()
    await page.getByRole('button', { name: 'Importar de URL' }).click()
    await page.getByLabel('URL da Receita').fill('https://example.com/not-whitelisted')
    await page.getByRole('button', { name: 'Importar receita' }).click()

    await expect(
      page.getByText('Não foi possível importar a receita desta URL.').first(),
    ).toBeVisible()
  })
})
