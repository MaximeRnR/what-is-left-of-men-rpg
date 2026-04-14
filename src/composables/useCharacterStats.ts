import { computed, type Ref } from 'vue'
import type { Character } from '../models/character'
import type { SkillId, TierLevel, SkillTier, PassiveEffect } from '../models/skill'
import { ALL_SKILL_IDS } from '../models/skill'
import { allSkills } from '../data/skills'
import { computeSkillTier } from './useSkillCalculator'

interface UnlockedTalent {
  skill: SkillId
  tier: TierLevel
  talent: SkillTier
}

export function useCharacterStats(character: Ref<Character>) {
  function collectPassiveEffects(): PassiveEffect[] {
    const effects: PassiveEffect[] = []

    for (const skillId of ALL_SKILL_IDS) {
      const spent = character.value.skills[skillId]?.pointsSpent ?? 0
      const bonus = character.value.bonusPoints[skillId] ?? 0
      const totalPoints = spent + bonus
      if (totalPoints === 0) continue

      const result = computeSkillTier(totalPoints, 0)
      if (!result.tier) continue

      const skillDef = allSkills.find(s => s.id === skillId)
      if (!skillDef) continue

      for (const tier of skillDef.tiers) {
        if (tier.costToReach > totalPoints) break
        effects.push(...tier.passiveEffects)

        // Add specialization effects if chosen and this tier has specializations
        if (tier.specializations?.length) {
          const chosenSpecId = character.value.specializations[skillId]
          if (chosenSpecId) {
            const spec = tier.specializations.find(s => s.id === chosenSpecId)
            if (spec) {
              effects.push(...spec.passiveEffects)
            }
          }
        }
      }
    }

    return effects
  }

  const maxHP = computed(() => {
    const effects = collectPassiveEffects()
    return 10 + effects.filter(e => e.type === 'hp').reduce((sum, e) => sum + e.value, 0)
  })

  const maxSanity = computed(() => {
    const effects = collectPassiveEffects()
    return 10 + effects.filter(e => e.type === 'sanity').reduce((sum, e) => sum + e.value, 0)
  })

  const maxSouffle = computed(() => {
    const effects = collectPassiveEffects()
    return 10 + effects.filter(e => e.type === 'souffle').reduce((sum, e) => sum + e.value, 0)
  })

  const stModifier = computed(() => {
    const effects = collectPassiveEffects()
    return effects.filter(e => e.type === 'st').reduce((sum, e) => sum + e.value, 0)
  })

  const initiativeModifier = computed(() => {
    const effects = collectPassiveEffects()
    return effects.filter(e => e.type === 'initiative').reduce((sum, e) => sum + e.value, 0)
  })

  const csModifiers = computed(() => {
    const effects = collectPassiveEffects()
    const result: Record<string, number> = {}
    for (const e of effects.filter(e => e.type === 'cs_modifier')) {
      const key = e.condition ?? 'general'
      result[key] = (result[key] ?? 0) + e.value
    }
    return result
  })

  const damageModifiers = computed(() => {
    const effects = collectPassiveEffects()
    const result: Record<string, number> = {}
    for (const e of effects.filter(e => e.type === 'damage')) {
      const key = e.condition ?? 'general'
      result[key] = (result[key] ?? 0) + e.value
    }
    return result
  })

  const unlockedTalents = computed((): UnlockedTalent[] => {
    const talents: UnlockedTalent[] = []

    for (const skillId of ALL_SKILL_IDS) {
      const spent = character.value.skills[skillId]?.pointsSpent ?? 0
      const bonus = character.value.bonusPoints[skillId] ?? 0
      const totalPoints = spent + bonus
      if (totalPoints === 0) continue

      const skillDef = allSkills.find(s => s.id === skillId)
      if (!skillDef) continue

      for (const tier of skillDef.tiers) {
        if (tier.costToReach > totalPoints) break
        talents.push({ skill: skillId, tier: tier.level, talent: tier })
      }
    }

    return talents
  })

  return {
    maxHP,
    maxSanity,
    maxSouffle,
    stModifier,
    initiativeModifier,
    csModifiers,
    damageModifiers,
    unlockedTalents,
  }
}
