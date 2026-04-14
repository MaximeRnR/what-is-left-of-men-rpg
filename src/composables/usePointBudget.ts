import { computed, type Ref } from 'vue'
import type { Character } from '../models/character'
import type { SkillId } from '../models/skill'
import { ALL_SKILL_IDS, TIER_CUMULATIVE_COST } from '../models/skill'

interface PointBudgetOptions {
  allowMaster?: boolean
  unlimited?: boolean
}

export function usePointBudget(character: Ref<Character>, options: PointBudgetOptions = {}) {
  const { allowMaster = false, unlimited = false } = options

  const totalPoints = computed(() => unlimited ? Infinity : 15)

  const spentPoints = computed(() => {
    return ALL_SKILL_IDS.reduce((sum, id) => {
      return sum + (character.value.skills[id]?.pointsSpent ?? 0)
    }, 0)
  })

  const remainingPoints = computed(() => unlimited ? Infinity : totalPoints.value - spentPoints.value)

  function canAllocate(skillId: SkillId, points: number): boolean {
    const current = character.value.skills[skillId]?.pointsSpent ?? 0
    const newTotal = current + points

    if (!unlimited && points > remainingPoints.value) return false
    if (!allowMaster && newTotal >= TIER_CUMULATIVE_COST.maitre) return false

    return true
  }

  function allocate(skillId: SkillId, points: number): void {
    const current = character.value.skills[skillId]?.pointsSpent ?? 0
    character.value.skills[skillId] = { pointsSpent: current + points }
    character.value.updatedAt = Date.now()
  }

  function deallocate(skillId: SkillId, points: number): void {
    const current = character.value.skills[skillId]?.pointsSpent ?? 0
    character.value.skills[skillId] = { pointsSpent: Math.max(0, current - points) }
    character.value.updatedAt = Date.now()
  }

  const isValid = computed(() => {
    if (!unlimited && spentPoints.value > totalPoints.value) return false
    if (!allowMaster) {
      for (const id of ALL_SKILL_IDS) {
        const spent = character.value.skills[id]?.pointsSpent ?? 0
        if (spent >= TIER_CUMULATIVE_COST.maitre) return false
      }
    }
    return true
  })

  return {
    totalPoints,
    spentPoints,
    remainingPoints,
    canAllocate,
    allocate,
    deallocate,
    isValid,
  }
}
