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

  it('adds HP from endurance tiers (incompetent malus skipped once trained)', () => {
    // Endurance at 5 = competent. Incompetent malus is skipped (totalPoints > 0).
    // initie(+1) + entraine(+1) + competent(+1) = +3 HP from endurance.
    // No other skill contributes HP. Total: 10 + 3 = 13.
    const stats = setup({ endurance: 5 })
    expect(stats.maxHP.value).toBe(13)
  })

  it('endurance at 0 points (incompetent) gives -1 HP', () => {
    // Just checking the endurance part: incompetent = -1 HP
    // All other skills also at incompetent, but only endurance affects HP
    const stats = setup()
    expect(stats.maxHP.value).toBe(9) // 10 - 1
  })

  it('endurance at 1 point (initie) gives +1 HP (incompetent malus skipped)', () => {
    // incompetent malus skipped (totalPoints > 0). Only initie(+1) applies.
    const stats = setup({ endurance: 1 })
    expect(stats.maxHP.value).toBe(11)
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
    // Endurance at 9 = maitre. Incompetent malus skipped.
    // initie(+1) + entraine(+1) + competent(+1) + maitre(+2) = +5 HP, maitre also +1 Souffle.
    const stats = setup({ endurance: 9 })
    expect(stats.maxHP.value).toBe(15)
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
    // Instinct at 1 = initie: malus skipped, only initie(+1).
    // Perception at 0 = incompetent: -1.
    // Total: 0.
    const stats = setup({ instinct: 1 })
    expect(stats.initiativeModifier.value).toBe(0)
  })

  it('instinct at 0 (incompetent) gives -1 initiative', () => {
    // Instinct incompetent -1, Perception incompetent -1 = -2 total
    const stats = setup()
    expect(stats.initiativeModifier.value).toBe(-2)
  })

  it('perception entraine gives +1 initiative', () => {
    // Perception at 3 = entraine: malus skipped, only entraine(+1).
    // Instinct at 0 = incompetent: -1.
    // Total: 0.
    const stats = setup({ perception: 3 })
    expect(stats.initiativeModifier.value).toBe(0)
  })

  it('instinct entraine no longer triggers the incompetent malus', () => {
    // Bug regression: with Instinct at 2 (entraine) and Perception incompetent,
    // the character should get +1 from Instinct initie, the incompetent malus
    // should no longer apply. Total = +1 (Instinct) -1 (Perception incompetent) = 0.
    const stats = setup({ instinct: 2 })
    expect(stats.initiativeModifier.value).toBe(0)
  })

  it('collects unlocked talents', () => {
    // Martial at 3 = entraine: incompetent + initie + entraine = 3 talents
    // Endurance at 1 = initie: incompetent + initie = 2 talents
    // All other 17 skills at 0 = incompetent = 17 talents
    const stats = setup({ martial: 3, endurance: 1 })
    expect(stats.unlockedTalents.value).toHaveLength(3 + 2 + 17)
  })

  it('combines stats from multiple skills', () => {
    // Endurance 5 (competent: +3 HP, malus skipped) + Courage 5 (competent: +3 PSM) + Agilite 9 (maitre: +1 Souffle, +1 ST)
    const stats = setup({ endurance: 5, courage: 5, agilite: 9 })
    expect(stats.maxHP.value).toBe(13)
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

  it('archerie cs_modifier malus disappears once trained', () => {
    // Archerie incompetent grants +1 CS attaque_distance. Once at initie (1 point),
    // the malus must no longer be applied to csModifiers.
    const stats = setup({ archerie: 1 })
    expect(stats.csModifiers.value['attaque_distance'] ?? 0).toBe(0)
  })

  it('archerie at incompetent still applies the cs_modifier malus', () => {
    // Sanity check: at 0 points the malus must still be applied.
    const stats = setup()
    expect(stats.csModifiers.value['attaque_distance']).toBe(1)
  })
})
