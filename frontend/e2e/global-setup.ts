import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { AUTH_FILE, API_URL } from './constants'
import { newTestUser } from './fixtures'

/**
 * Logging in goes through the app's own 5-attempts/15-minutes throttle
 * (routes/api.php), same as production. Running the login *form* for every
 * spec would burn that budget and self-lock the suite, so auth happens once
 * here, directly against the API, and every spec except auth.spec.ts reuses
 * the resulting storage state instead of submitting the login form again.
 */
export default async function globalSetup(): Promise<void> {
  const user = newTestUser()

  const registerRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: user.name,
      email: user.email,
      password: user.password,
      password_confirmation: user.password,
    }),
  })
  if (!registerRes.ok) {
    throw new Error(`E2E setup: register failed with ${registerRes.status}`)
  }

  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password }),
  })
  if (!loginRes.ok) {
    throw new Error(`E2E setup: login failed with ${loginRes.status}`)
  }
  const { access_token: token } = (await loginRes.json()) as { access_token: string }

  mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
  writeFileSync(
    AUTH_FILE,
    JSON.stringify({
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:5173',
          localStorage: [{ name: 'recipbot.token', value: token }],
        },
      ],
    }),
  )
}
