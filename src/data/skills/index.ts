import type { SkillDefinition } from '../../models/skill'
import corpsData from './corps.json'
import coeurData from './coeur.json'
import espritData from './esprit.json'

export const corpsSkills = corpsData as SkillDefinition[]
export const coeurSkills = coeurData as SkillDefinition[]
export const espritSkills = espritData as SkillDefinition[]

export const allSkills: SkillDefinition[] = [
  ...corpsSkills,
  ...coeurSkills,
  ...espritSkills,
]

export function getSkillById(id: string): SkillDefinition | undefined {
  return allSkills.find(s => s.id === id)
}
