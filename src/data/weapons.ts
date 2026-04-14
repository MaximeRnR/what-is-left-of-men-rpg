import type { WeaponDefinition } from '../models/weapon'
import weaponsData from './weapons.json'

export const allWeapons = weaponsData as WeaponDefinition[]

export function getWeaponById(id: string): WeaponDefinition | undefined {
  return allWeapons.find(w => w.id === id)
}
