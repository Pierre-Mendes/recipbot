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
  await page.getByLabel('Name').fill(user.name)
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(user.password)
  await page.getByLabel('Confirm password').fill(user.password)
  await page.getByRole('button', { name: 'Register' }).click()

  await expect(page.getByText('Registered! Redirecting to login...')).toBeVisible()
  await page.waitForURL('**/login')

  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Log in' }).click()

  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'My Recipes' })).toBeVisible()
}
