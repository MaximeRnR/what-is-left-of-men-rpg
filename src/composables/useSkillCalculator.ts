import { TIER_ORDER, TIER_CUMULATIVE_COST, TIER_DIE } from '../models/skill'
import type { TierLevel } from '../models/skill'

export interface SkillTierResult {
  tier: TierLevel | null
  die: string | null
  extraBonus: number
  totalBonus: number
}

export function computeSkillTier(pointsSpent: number, bonusPoints: number): SkillTierResult {
  if (pointsSpent === 0) {
    return { tier: null, die: null, extraBonus: 0, totalBonus: bonusPoints }
  }

  let currentTier: TierLevel = 'incompetent'

  for (const tier of TIER_ORDER) {
    if (TIER_CUMULATIVE_COST[tier] <= pointsSpent) {
      currentTier = tier
    } else {
      break
    }
  }

  const extraBonus = pointsSpent - TIER_CUMULATIVE_COST[currentTier]

  return {
    tier: currentTier,
    die: TIER_DIE[currentTier],
    extraBonus,
    totalBonus: extraBonus + bonusPoints,
  }
}
