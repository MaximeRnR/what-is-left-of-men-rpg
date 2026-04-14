import type { SkillId } from './skill'
import type { WeaponDefinition } from './weapon'

export interface SkillAllocation {
  pointsSpent: number
}

export interface InventoryItem {
  id: string
  weaponId?: string
  customWeapon?: WeaponDefinition
  customName?: string
  customDescription?: string
  traits: string[]
  currentFragility: number
}

export interface Ability {
  id: string
  title: string
  description: string
}

export interface CombatTracker {
  currentHP: number
  currentSanity: number
  currentSouffle: number
  activeEffects: string[]
}

export interface Character {
  id: string
  name: string
  story: string
  skills: Record<SkillId, SkillAllocation>
  specializations: Partial<Record<SkillId, string>>
  bonusPoints: Partial<Record<SkillId, number>>
  inventory: InventoryItem[]
  abilities: Ability[]
  tracker: CombatTracker
  createdAt: number
  updatedAt: number
}

export function createEmptyCharacter(id: string, name: string): Character {
  const skills = {} as Record<SkillId, SkillAllocation>
  const allSkillIds: SkillId[] = [
    'martial', 'archerie', 'endurance', 'force', 'agilite', 'ombre', 'artisanat',
    'charisme', 'empathie', 'courage', 'perception', 'tromperie', 'intimidation',
    'instinct', 'creativite', 'connaissance', 'investigation', 'occultisme', 'medecine',
  ]
  for (const id of allSkillIds) {
    skills[id] = { pointsSpent: 0 }
  }

  const now = Date.now()
  return {
    id,
    name,
    story: '',
    skills,
    specializations: {},
    bonusPoints: {},
    inventory: [],
    abilities: [],
    tracker: {
      currentHP: 10,
      currentSanity: 10,
      currentSouffle: 10,
      activeEffects: [],
    },
    createdAt: now,
    updatedAt: now,
  }
}
