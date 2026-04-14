export interface WeaponDefinition {
  id: string
  name: string
  category: 'legere' | 'moyenne' | 'lourde'
  damage: string
  souffleModifier: number
  specialEffects: string[]
  fragility: number
  quality: 'faible_qualite' | 'standard' | 'chef_doeuvre'
  ranged: boolean
}
