export type SkillId =
  // Corps
  | 'martial' | 'archerie' | 'endurance' | 'force' | 'agilite' | 'ombre' | 'artisanat'
  // Coeur
  | 'charisme' | 'empathie' | 'courage' | 'perception' | 'tromperie' | 'intimidation'
  // Esprit
  | 'instinct' | 'creativite' | 'connaissance' | 'investigation' | 'occultisme' | 'medecine'

export const ALL_SKILL_IDS: SkillId[] = [
  'martial', 'archerie', 'endurance', 'force', 'agilite', 'ombre', 'artisanat',
  'charisme', 'empathie', 'courage', 'perception', 'tromperie', 'intimidation',
  'instinct', 'creativite', 'connaissance', 'investigation', 'occultisme', 'medecine',
]

export type TierLevel = 'incompetent' | 'initie' | 'entraine' | 'competent' | 'maitre' | 'legende'

export const TIER_ORDER: TierLevel[] = ['incompetent', 'initie', 'entraine', 'competent', 'maitre', 'legende']

export const TIER_CUMULATIVE_COST: Record<TierLevel, number> = {
  incompetent: 0,
  initie: 1,
  entraine: 2,
  competent: 4,
  maitre: 7,
  legende: 11,
}

export const TIER_DIE: Record<TierLevel, string> = {
  incompetent: 'd4',
  initie: 'd6',
  entraine: 'd8',
  competent: 'd10',
  maitre: 'd12',
  legende: 'd20',
}

export type SkillCategory = 'corps' | 'coeur' | 'esprit'

export interface PassiveEffect {
  type: 'hp' | 'sanity' | 'souffle' | 'st' | 'cs_modifier' | 'damage' | 'initiative'
  value: number
  condition?: string
}

export interface Specialization {
  id: string
  name: string
  description: string
  passiveEffects: PassiveEffect[]
}

export interface SkillTier {
  level: TierLevel
  die: string
  costToReach: number
  talentName: string
  description: string
  isMalus: boolean
  passiveEffects: PassiveEffect[]
  specializations?: Specialization[]
}

export interface SkillDefinition {
  id: SkillId
  name: string
  latinName: string
  category: SkillCategory
  tiers: SkillTier[]
}
