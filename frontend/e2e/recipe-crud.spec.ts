import { expect, test } from '@playwright/test'

import { AUTH_FILE } from './constants'

// Reuses the session global-setup.ts creates once via the API, instead of
// each test submitting the login form and burning the auth throttle budget.
test.use({ storageState: AUTH_FILE })

test.describe('recipe CRUD (manual entry)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'My Recipes' })).toBeVisible()
  })

  test('creates, views, edits, and deletes a recipe', async ({ page }) => {
    const title = `E2E Pancakes ${Date.now()}`

    // Create
    await page.getByRole('link', { name: 'Add Recipe' }).click();
    await expect(page.getByRole('heading', { name: 'Add Recipe' })).toBeVisible()

    await page.getByLabel('Title').fill(title)
    await page.getByLabel('Ingredients (one per line)').fill('2 cups flour\n1 egg\n1 cup milk')
    await page.getByLabel('Tags (comma separated)').fill('breakfast, sweet')
    await page.getByRole('button', { name: 'Create recipe' }).click()

    // Redirects to the detail page
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await expect(page.getByText('3 cups flour')).toHaveCount(0)
    await expect(page.getByText('2 cups flour')).toBeVisible()
    await expect(page.getByText('breakfast')).toBeVisible()
    await expect(page.getByText('sweet')).toBeVisible()

    // Appears in the list
    await page.getByRole('link', { name: 'My Recipes' }).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await expect(page.getByText('3 ingredients')).toBeVisible()

    // Edit
    await page.getByRole('heading', { name: title }).click()
    await page.getByRole('link', { name: 'Edit' }).click()
    await expect(page.getByRole('heading', { name: 'Edit Recipe' })).toBeVisible()

    const updatedTitle = `${title} (updated)`
    const titleInput = page.getByLabel('Title')
    await titleInput.fill(updatedTitle)
    await page.getByRole('button', { name: 'Save changes' }).click()

    await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible()

    // Delete
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Delete' }).click()

    await expect(page).toHaveURL('/')
    await expect(page.getByText(updatedTitle)).toHaveCount(0)
  })

  test('rejects a title shorter than 3 characters', async ({ page }) => {
    await page.getByRole('link', { name: 'Add Recipe' }).click()

    const titleInput = page.getByLabel('Title')
    await titleInput.fill('ab')
    await page.getByLabel('Ingredients (one per line)').fill('1 egg')
    await page.getByRole('button', { name: 'Create recipe' }).click()

    // The native minlength constraint blocks submission - still on the form.
    await expect(page.getByRole('heading', { name: 'Add Recipe' })).toBeVisible()
    await expect(titleInput).toHaveJSProperty('validity.valid', false)
  })
})
