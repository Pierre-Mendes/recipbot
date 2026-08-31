import { expect, test } from '@playwright/test'

import { newTestUser, registerAndLogin } from './fixtures'

test.describe('authentication', () => {
  test('redirects an unauthenticated visitor to login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('registers, logs in, and logs out', async ({ page }) => {
    const user = newTestUser()

    await registerAndLogin(page, user)
    await expect(page.getByText(user.name)).toBeVisible()

    // The logout control is an icon-only button labelled via its title.
    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('shows an error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill('nobody@example.com')
    await page.getByLabel('Senha', { exact: true }).fill('wrong-password')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page.getByText('Invalid credentials')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })
})
