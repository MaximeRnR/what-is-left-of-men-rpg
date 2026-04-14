import { describe, it, expect } from 'vitest'
import { computeSkillTier } from '../composables/useSkillCalculator'

describe('computeSkillTier', () => {
  it('returns incompetent for 0 points (base state)', () => {
    const result = computeSkillTier(0, 0)
    expect(result.tier).toBe('incompetent')
    expect(result.die).toBe('d4')
    expect(result.extraBonus).toBe(0)
    expect(result.totalBonus).toBe(0)
  })

  it('returns initie for 1 point', () => {
    const result = computeSkillTier(1, 0)
    expect(result.tier).toBe('initie')
    expect(result.die).toBe('d6')
    expect(result.extraBonus).toBe(0)
  })

  it('returns initie +1 for 2 points', () => {
    const result = computeSkillTier(2, 0)
    expect(result.tier).toBe('initie')
    expect(result.die).toBe('d6')
    expect(result.extraBonus).toBe(1)
  })

  it('returns entraine for 3 points', () => {
    const result = computeSkillTier(3, 0)
    expect(result.tier).toBe('entraine')
    expect(result.die).toBe('d8')
    expect(result.extraBonus).toBe(0)
  })

  it('returns entraine +1 for 4 points', () => {
    const result = computeSkillTier(4, 0)
    expect(result.tier).toBe('entraine')
    expect(result.die).toBe('d8')
    expect(result.extraBonus).toBe(1)
  })

  it('returns competent for 5 points', () => {
    const result = computeSkillTier(5, 0)
    expect(result.tier).toBe('competent')
    expect(result.die).toBe('d10')
    expect(result.extraBonus).toBe(0)
  })

  it('returns competent +3 for 8 points', () => {
    const result = computeSkillTier(8, 0)
    expect(result.tier).toBe('competent')
    expect(result.die).toBe('d10')
    expect(result.extraBonus).toBe(3)
  })

  it('returns maitre for 9 points', () => {
    const result = computeSkillTier(9, 0)
    expect(result.tier).toBe('maitre')
    expect(result.die).toBe('d12')
    expect(result.extraBonus).toBe(0)
  })

  it('adds bonusPoints to totalBonus', () => {
    const result = computeSkillTier(2, 2)
    expect(result.tier).toBe('initie')
    expect(result.extraBonus).toBe(1)
    expect(result.totalBonus).toBe(3)
  })

  it('returns incompetent with bonus only', () => {
    const result = computeSkillTier(0, 3)
    expect(result.tier).toBe('incompetent')
    expect(result.extraBonus).toBe(0)
    expect(result.totalBonus).toBe(3)
  })
})
