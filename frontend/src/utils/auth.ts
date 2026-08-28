const TOKEN_KEY = 'recipbot.token'

// localStorage per OWASP_CHECKLIST.md's documented token-storage approach for this project.
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}
