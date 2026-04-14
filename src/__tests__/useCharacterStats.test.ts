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

  // With 0 points all skills are at incompetent (base state)
  // Endurance incompetent: -1 HP
  // Perception incompetent: -1 initiative
  // Instinct incompetent: -1 initiative
  // Empathie incompetent: +1 cs_modifier (aider) — not HP/sanity/souffle
  // Archerie incompetent: +1 cs_modifier (distance) — not HP/sanity/souffle
  // Martial incompetent: +1 cs_modifier — not HP/sanity/souffle

  it('returns base stats with no points (all at incompetent)', () => {
    const stats = setup()
    // Base 10 HP - 1 (endurance incompetent) = 9
    expect(stats.maxHP.value).toBe(9)
    expect(stats.maxSanity.value).toBe(10)
    expect(stats.maxSouffle.value).toBe(10)
    // Perception incompetent -1 + Instinct incompetent -1 = -2
    expect(stats.initiativeModifier.value).toBe(-2)
  })

  it('adds HP from endurance tiers (cumulative)', () => {
    // Endurance at 5 points = competent: incompetent(-1) + initie(+1) + entraine(+1) + competent(+1) = +2
    // Base 9 (from other incompetent malus) + 2 net from endurance tiers = 9 - (-1) + 2 = 9 + 3 = 12
    // Actually: all skills at incompetent gives -1 HP from endurance. Now endurance at 5 gives full chain.
    // Total HP effects: endurance(-1+1+1+1) = +2 net from endurance. Other skills: no HP effects.
    // So: 10 + 2 = 12
    const stats = setup({ endurance: 5 })
    expect(stats.maxHP.value).toBe(12)
  })

  it('endurance at 0 points (incompetent) gives -1 HP', () => {
    // Just checking the endurance part: incompetent = -1 HP
    // All other skills also at incompetent, but only endurance affects HP
    const stats = setup()
    expect(stats.maxHP.value).toBe(9) // 10 - 1
  })

  it('endurance at 1 point (initie) gives net 0 HP from endurance', () => {
    // incompetent(-1) + initie(+1) = 0 net
    const stats = setup({ endurance: 1 })
    expect(stats.maxHP.value).toBe(10)
  })

  it('adds sanity from courage entraine and competent', () => {
    // Courage at 5 = competent: entraine(+1 PSM) + competent(+2 PSM) = +3 PSM
    const stats = setup({ courage: 5 })
    expect(stats.maxSanity.value).toBe(13)
  })

  it('adds sanity from empathie competent', () => {
    // Empathie at 5 = competent: +2 PSM
    const stats = setup({ empathie: 5 })
    expect(stats.maxSanity.value).toBe(12)
  })

  it('adds souffle from endurance maitre', () => {
    // Endurance at 9 = maitre: -1+1+1+1+2 = +4 HP, +1 Souffle
    const stats = setup({ endurance: 9 })
    expect(stats.maxHP.value).toBe(14)
    expect(stats.maxSouffle.value).toBe(11)
  })

  it('adds souffle from agilite maitre', () => {
    // Agilite at 9 = maitre: competent(+1 ST), maitre(+1 Souffle)
    const stats = setup({ agilite: 9 })
    expect(stats.maxSouffle.value).toBe(11)
    expect(stats.stModifier.value).toBe(1)
  })

  it('computes ST modifier from ombre competent', () => {
    // Ombre at 5 = competent: +1 ST
    const stats = setup({ ombre: 5 })
    expect(stats.stModifier.value).toBe(1)
  })

  it('adds specialization passive effects', () => {
    // Ombre at 5 (competent) + gredin: +1 ST (tier) + +1 ST (spec) = +2 ST
    const stats = setup({ ombre: 5 }, { ombre: 'gredin' })
    expect(stats.stModifier.value).toBe(2)
  })

  it('computes initiative modifiers', () => {
    // Instinct at 1 = initie: incompetent(-1) + initie(+1) = net 0
    // Perception at 0 = incompetent: -1
    // Total: -1
    const stats = setup({ instinct: 1 })
    expect(stats.initiativeModifier.value).toBe(-1)
  })

  it('instinct at 0 (incompetent) gives -1 initiative', () => {
    // Instinct incompetent -1, Perception incompetent -1 = -2 total
    const stats = setup()
    expect(stats.initiativeModifier.value).toBe(-2)
  })

  it('perception entraine gives +1 initiative', () => {
    // Perception at 3 = entraine: incompetent(-1) + entraine(+1) = net 0
    // Instinct at 0 = incompetent: -1
    // Total: -1
    const stats = setup({ perception: 3 })
    expect(stats.initiativeModifier.value).toBe(-1)
  })

  it('collects unlocked talents', () => {
    // Martial at 3 = entraine: incompetent + initie + entraine = 3 talents
    // Endurance at 1 = initie: incompetent + initie = 2 talents
    // All other 17 skills at 0 = incompetent = 17 talents
    const stats = setup({ martial: 3, endurance: 1 })
    expect(stats.unlockedTalents.value).toHaveLength(3 + 2 + 17)
  })

  it('combines stats from multiple skills', () => {
    // Endurance 5 (competent: +2 HP net) + Courage 5 (competent: +3 PSM) + Agilite 9 (maitre: +1 Souffle, +1 ST)
    const stats = setup({ endurance: 5, courage: 5, agilite: 9 })
    expect(stats.maxHP.value).toBe(12)
    expect(stats.maxSanity.value).toBe(13)
    expect(stats.maxSouffle.value).toBe(11)
    expect(stats.stModifier.value).toBe(1)
  })

  it('includes bonus points in skill tier calculation for unlocked talents', () => {
    // Martial 1 point (initie) + 2 bonus = 3 total = entraine
    const stats = setup({ martial: 1 }, {}, { martial: 2 })
    const martialTalents = stats.unlockedTalents.value.filter(t => t.skill === 'martial')
    expect(martialTalents).toHaveLength(3) // incompetent + initie + entraine
  })
})
