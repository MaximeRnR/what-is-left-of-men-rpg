import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useCharacterStats } from '../composables/useCharacterStats'
import { createEmptyCharacter } from '../models/character'
import type { SkillId } from '../models/skill'

describe('useCharacterStats', () => {
  function setup(skills: Partial<Record<SkillId, number>> = {}, specializations: Partial<Record<SkillId, string>> = {}, bonusPoints: Partial<Record<SkillId, number>> = {}) {
    const character = ref(createEmptyCharacter('test-id', 'Test'))
    for (const [id, points] of Object.entries(skills)) {
      character.value.skills[id as SkillId] = { pointsSpent: points as number }
    }
    character.value.specializations = specializations
    character.value.bonusPoints = bonusPoints
    return useCharacterStats(character)
  }

  it('returns base stats with no points allocated', () => {
    const stats = setup()
    expect(stats.maxHP.value).toBe(10)
    expect(stats.maxSanity.value).toBe(10)
    expect(stats.maxSouffle.value).toBe(10)
  })

  it('adds HP from endurance tiers (cumulative)', () => {
    // Endurance at 6 points: incompetent(-1HP) + initie(+1HP) + entraine(+1HP) + competent(+1HP) = +2HP
    const stats = setup({ endurance: 6 })
    expect(stats.maxHP.value).toBe(12)
  })

  it('subtracts HP from endurance incompetent', () => {
    // Endurance incompetent: -1 HP
    const stats = setup({ endurance: 1 })
    expect(stats.maxHP.value).toBe(9)
  })

  it('adds sanity from courage entraine and competent', () => {
    // Courage: entraine +1 PSM, competent +2 PSM = +3 at 6 points
    const stats = setup({ courage: 6 })
    expect(stats.maxSanity.value).toBe(13)
  })

  it('adds sanity from empathie competent', () => {
    // Empathie competent: +2 PSM
    const stats = setup({ empathie: 6 })
    expect(stats.maxSanity.value).toBe(12)
  })

  it('adds souffle from endurance maitre', () => {
    // Endurance maitre: +2HP +1 Souffle. Cumulative HP: -1+1+1+1+2=4
    const stats = setup({ endurance: 10 })
    expect(stats.maxHP.value).toBe(14)
    expect(stats.maxSouffle.value).toBe(11)
  })

  it('adds souffle from agilite maitre', () => {
    // Agilite maitre: +1 Souffle. Competent: +1 ST
    const stats = setup({ agilite: 10 })
    expect(stats.maxSouffle.value).toBe(11)
    expect(stats.stModifier.value).toBe(1)
  })

  it('computes ST modifier from ombre competent', () => {
    // Ombre competent: +1 ST
    const stats = setup({ ombre: 6 })
    expect(stats.stModifier.value).toBe(1)
  })

  it('adds specialization passive effects', () => {
    // Ombre competent + gredin specialization: +1 ST (tier) + +1 ST (spec) = +2 ST
    const stats = setup({ ombre: 6 }, { ombre: 'gredin' })
    expect(stats.stModifier.value).toBe(2)
  })

  it('computes initiative modifiers', () => {
    // Instinct: incompetent -1, initie +1 => net 0 at initie
    const stats = setup({ instinct: 2 })
    expect(stats.initiativeModifier.value).toBe(0)
  })

  it('instinct incompetent gives -1 initiative', () => {
    const stats = setup({ instinct: 1 })
    expect(stats.initiativeModifier.value).toBe(-1)
  })

  it('perception entraine gives +1 initiative', () => {
    // Perception: incompetent -1 initiative, entraine +1 initiative => net 0
    const stats = setup({ perception: 4 })
    expect(stats.initiativeModifier.value).toBe(0)
  })

  it('collects unlocked talents', () => {
    const stats = setup({ martial: 4, endurance: 2 })
    // Martial at entraine: incompetent + initie + entraine = 3 talents
    // Endurance at initie: incompetent + initie = 2 talents
    expect(stats.unlockedTalents.value).toHaveLength(5)
  })

  it('combines stats from multiple skills', () => {
    // Endurance 6 (+2 HP) + Courage 6 (+3 PSM) + Agilite 10 (+1 Souffle, +1 ST)
    const stats = setup({ endurance: 6, courage: 6, agilite: 10 })
    expect(stats.maxHP.value).toBe(12)
    expect(stats.maxSanity.value).toBe(13)
    expect(stats.maxSouffle.value).toBe(11)
    expect(stats.stModifier.value).toBe(1)
  })

  it('includes bonus points in skill tier calculation for unlocked talents', () => {
    // Martial 2 points (initie) + 2 bonus = entraine level for talent display
    const stats = setup({ martial: 2 }, {}, { martial: 2 })
    const martialTalents = stats.unlockedTalents.value.filter(t => t.skill === 'martial')
    expect(martialTalents).toHaveLength(3) // incompetent + initie + entraine
  })
})
