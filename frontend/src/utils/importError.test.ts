import { describe, expect, it } from 'vitest'

import { importErrorMessage } from '@/utils/importError'

const apiError = (message: string, status = 422) => ({ response: { status, data: { message } } })

describe('importErrorMessage', () => {
  it('explains an unsupported site instead of a generic failure', () => {
    expect(importErrorMessage(apiError('Domain not whitelisted.'), 'x')).toContain(
      'ainda não é suportado',
    )
  })

  it('carries the page limit into the translated message', () => {
    expect(importErrorMessage(apiError('This PDF has too many pages (max 150).'), 'x')).toBe(
      'O PDF tem páginas demais (máximo de 150).',
    )
  })

  it('flags an upload rejected by the server for size', () => {
    expect(importErrorMessage({ response: { status: 413 } }, 'x')).toBe(
      'O arquivo é grande demais para enviar.',
    )
  })

  it('falls back for unknown messages and network errors', () => {
    expect(importErrorMessage(apiError('Something else'), 'fallback')).toBe('fallback')
    expect(importErrorMessage(new Error('Network Error'), 'fallback')).toBe('fallback')
  })
})
