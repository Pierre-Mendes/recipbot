import { describe, expect, it } from 'vitest'

import { parseQuantity, convertIngredient } from '@/utils/units'

describe('parseQuantity', () => {
  it('parses integers and decimals (dot and comma)', () => {
    expect(parseQuantity('2')).toBe(2)
    expect(parseQuantity('1.5')).toBe(1.5)
    expect(parseQuantity('1,5')).toBe(1.5)
  })

  it('parses slash and unicode fractions', () => {
    expect(parseQuantity('1/2')).toBe(0.5)
    expect(parseQuantity('½')).toBe(0.5)
  })

  it('parses mixed numbers', () => {
    expect(parseQuantity('1 1/2')).toBe(1.5)
    expect(parseQuantity('1½')).toBe(1.5)
  })

  it('declines ranges and non-numbers', () => {
    expect(parseQuantity('2 a 3')).toBeNull()
    expect(parseQuantity('2-3')).toBeNull()
    expect(parseQuantity('a gosto')).toBeNull()
    expect(parseQuantity('')).toBeNull()
  })
})

describe('convertIngredient', () => {
  it('converts volume to millilitres', () => {
    expect(convertIngredient('1 xícara de leite', 'ml')).toEqual({
      measure: '240 ml',
      name: 'de leite',
    })
    expect(convertIngredient('1/2 copo de água', 'ml')).toEqual({
      measure: '120 ml',
      name: 'de água',
    })
  })

  it('converts volume to cups', () => {
    expect(convertIngredient('480 ml de caldo', 'cup')).toEqual({
      measure: '2 xícara',
      name: 'de caldo',
    })
  })

  it('converts mass within itself', () => {
    expect(convertIngredient('1 kg de açúcar', 'g')).toEqual({
      measure: '1000 g',
      name: 'de açúcar',
    })
  })

  it('converts volume to grams using the density table', () => {
    // 1 cup (240 ml) of flour at 0.53 g/ml ~= 127 g.
    expect(convertIngredient('1 xícara de farinha', 'g')).toEqual({
      measure: '127 g',
      name: 'de farinha',
    })
  })

  it('declines a cross conversion when the density is unknown', () => {
    expect(convertIngredient('1 xícara de nozes picadas', 'g')).toBeNull()
  })

  it('declines when there is no unit or no quantity', () => {
    expect(convertIngredient('3 ovos', 'g')).toBeNull()
    expect(convertIngredient('sal a gosto', 'ml')).toBeNull()
  })

  it('returns null for the original system (no conversion)', () => {
    expect(convertIngredient('1 xícara de leite', 'original')).toBeNull()
  })
})
