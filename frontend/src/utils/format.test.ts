import { describe, expect, it } from 'vitest'

import { relativeTime, titleGradient } from '@/utils/format'

describe('relativeTime', () => {
  it('returns null for missing or unparseable dates', () => {
    expect(relativeTime('')).toBeNull()
    expect(relativeTime(null)).toBeNull()
    expect(relativeTime(undefined)).toBeNull()
    expect(relativeTime('not-a-date')).toBeNull()
  })

  it('formats a recent past date in pt-BR', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const result = relativeTime(threeDaysAgo)
    expect(result).toMatch(/dia/)
  })
})

describe('titleGradient', () => {
  it('is deterministic for the same title', () => {
    expect(titleGradient('Bolo de Cenoura')).toBe(titleGradient('Bolo de Cenoura'))
  })

  it('produces a CSS linear-gradient string', () => {
    expect(titleGradient('Feijoada')).toMatch(/^linear-gradient\(/)
  })

  it('differs for different titles', () => {
    expect(titleGradient('Bolo')).not.toBe(titleGradient('Torta'))
  })
})
