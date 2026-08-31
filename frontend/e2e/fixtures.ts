import { type Page, expect } from '@playwright/test'

export interface TestUser {
  name: string
  email: string
  password: string
}

export function newTestUser(): TestUser {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`
  return {
    name: 'E2E Test User',
    email: `e2e-${unique}@example.com`,
    password: 'password123',
  }
}

export async function registerAndLogin(page: Page, user: TestUser): Promise<void> {
  await page.goto('/register')
  await page.getByLabel('Nome').fill(user.name)
  await page.getByLabel('E-mail').fill(user.email)
  await page.getByLabel('Senha', { exact: true }).fill(user.password)
  await page.getByLabel('Confirmar Senha').fill(user.password)
  await page.getByRole('button', { name: 'Cadastrar' }).click()

  await expect(page.getByText('Conta criada com sucesso!')).toBeVisible()
  await page.waitForURL('**/login')

  await page.getByLabel('E-mail').fill(user.email)
  await page.getByLabel('Senha', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Minhas Receitas' })).toBeVisible()
}
