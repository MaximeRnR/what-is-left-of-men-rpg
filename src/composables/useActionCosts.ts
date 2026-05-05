import { computed, type Ref, type ComputedRef } from 'vue'
import type { Character } from '../models/character'
import type { WeaponDefinition } from '../models/weapon'
import type { useCharacterStats } from './useCharacterStats'
import { TIER_CUMULATIVE_COST } from '../models/skill'
import type { TierLevel, SkillId } from '../models/skill'

export interface ActionCostConditions {
  embusque: boolean
  encercle: boolean
  attaqueOpportuniteSubie: boolean
  memeCible: boolean
  sansFocus: boolean
  apresParadeEsquive: boolean
  premierTourLegende: boolean
}

export type ToggleKey = keyof ActionCostConditions

const BASE_ATTACK = 6
const BASE_PARRY = 4
const BASE_DODGE = 6
const BASE_SPECIAL = 6
const MIN_CS = 2

type Stats = ReturnType<typeof useCharacterStats>

// helper: determine if a skill has reached at least the given tier
function hasReachedTier(character: Character, skill: SkillId, tier: TierLevel): boolean {
  const spent = character.skills[skill]?.pointsSpent ?? 0
  const bonus = character.bonusPoints[skill] ?? 0
  return (spent + bonus) >= TIER_CUMULATIVE_COST[tier]
}

export function useActionCosts(
  character: Ref<Character>,
  stats: Stats,
  conditions: Ref<ActionCostConditions>,
) {
  function csModifierFor(condition: string): number {
    return stats.csModifiers.value[condition] ?? 0
  }

  // melee attack: applies attaque_melee passive modifier
  function meleeAttackPassive(): number {
    return csModifierFor('attaque_melee')
  }
  function rangedAttackPassive(): number {
    return csModifierFor('attaque_distance')
  }
  function parryPassive(): number {
    return csModifierFor('parade')
  }
  function dodgePassive(): number {
    return csModifierFor('esquive')
  }

  function attackConditionalDelta(): number {
    let delta = 0
    // memeCible only relevant if Pression unlocked (data adds -1 meme_cible passive when spec chosen)
    if (conditions.value.memeCible) delta += csModifierFor('meme_cible')
    if (conditions.value.sansFocus) delta += csModifierFor('sans_focus')
    return delta
  }

  function defenseConditionalDelta(): number {
    // EMBUSQUE / ENCERCLE / AOO all activate the same single modifier; do NOT stack.
    if (
      conditions.value.embusque ||
      conditions.value.encercle ||
      conditions.value.attaqueOpportuniteSubie
    ) {
      return csModifierFor('defense_embusque_encerle_aoo')
    }
    return 0
  }

  function lourdeCancellation(weapon: WeaponDefinition): number {
    if (weapon.category !== 'lourde') return 0
    if (!hasReachedTier(character.value, 'force', 'maitre')) return 0
    return -1
  }

  function applyLegendeOverride(cost: number): number {
    if (conditions.value.premierTourLegende && hasReachedTier(character.value, 'instinct', 'legende')) {
      return Math.ceil(cost / 2)
    }
    return cost
  }

  function applyFloor(cost: number): number {
    return Math.max(MIN_CS, cost)
  }

  function attackCost(weapon: WeaponDefinition, isFirst: boolean): number {
    // Maitre Martial override: 3 CS fixed (only on ATTAQUE)
    if (
      conditions.value.apresParadeEsquive &&
      hasReachedTier(character.value, 'martial', 'maitre')
    ) {
      return applyFloor(applyLegendeOverride(3))
    }

    const passive = weapon.ranged ? rangedAttackPassive() : meleeAttackPassive()
    let cost = BASE_ATTACK + (weapon.souffleModifier ?? 0) + passive + attackConditionalDelta()
    if (isFirst) {
      const firstKey = weapon.ranged ? 'attaque_premiere_distance' : 'attaque_premiere_melee'
      cost += csModifierFor(firstKey)
    }
    cost += lourdeCancellation(weapon)
    return applyFloor(applyLegendeOverride(cost))
  }

  function parryCost(weapon: WeaponDefinition): number {
    let cost = BASE_PARRY + (weapon.souffleModifier ?? 0) + parryPassive() + defenseConditionalDelta()
    cost += lourdeCancellation(weapon)
    return applyFloor(applyLegendeOverride(cost))
  }

  function dodgeCost(): number {
    const cost = BASE_DODGE + dodgePassive() + defenseConditionalDelta()
    return applyFloor(applyLegendeOverride(cost))
  }

  function specialCost(): number {
    const cost = BASE_SPECIAL
    return applyFloor(applyLegendeOverride(cost))
  }

  const applicableToggles: ComputedRef<ToggleKey[]> = computed(() => {
    const result: ToggleKey[] = []
    const c = character.value

    const instinctEntraine = hasReachedTier(c, 'instinct', 'entraine')
    const ombreMaitre = hasReachedTier(c, 'ombre', 'maitre')
    if (instinctEntraine || ombreMaitre) result.push('embusque')
    if (instinctEntraine) {
      result.push('encercle')
      result.push('attaqueOpportuniteSubie')
    }

    if (hasReachedTier(c, 'martial', 'competent') && c.specializations.martial === 'pression') {
      result.push('memeCible')
    }
    if (hasReachedTier(c, 'ombre', 'competent') && c.specializations.ombre === 'assassin') {
      result.push('sansFocus')
    }
    if (hasReachedTier(c, 'martial', 'maitre')) result.push('apresParadeEsquive')
    if (hasReachedTier(c, 'instinct', 'legende')) result.push('premierTourLegende')

    return result
  })

  return { attackCost, parryCost, dodgeCost, specialCost, applicableToggles }
}
