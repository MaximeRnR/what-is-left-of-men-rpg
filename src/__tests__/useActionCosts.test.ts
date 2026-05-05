import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useActionCosts, type ActionCostConditions } from '../composables/useActionCosts'
import { useCharacterStats } from '../composables/useCharacterStats'
import { createEmptyCharacter } from '../models/character'
import type { Character } from '../models/character'
import type { SkillId } from '../models/skill'
import type { WeaponDefinition } from '../models/weapon'

function defaultConditions(): ActionCostConditions {
  return {
    embusque: false,
    encercle: false,
    attaqueOpportuniteSubie: false,
    memeCible: false,
    sansFocus: false,
    apresParadeEsquive: false,
    premierTourLegende: false,
  }
}

function makeWeapon(overrides: Partial<WeaponDefinition> = {}): WeaponDefinition {
  return {
    id: 'test',
    name: 'Test',
    category: 'moyenne',
    damage: '1d6',
    souffleModifier: 0,
    specialEffects: [],
    fragility: 1,
    quality: 'standard',
    ranged: false,
    ...overrides,
  }
}

function setup(skills: Partial<Record<SkillId, number>> = {}, specializations: Partial<Record<SkillId, string>> = {}) {
  const character = ref<Character>(createEmptyCharacter('id', 'Test'))
  for (const [id, points] of Object.entries(skills)) {
    character.value.skills[id as SkillId] = { pointsSpent: points as number }
  }
  character.value.specializations = specializations
  const stats = useCharacterStats(character)
  const conditions = ref(defaultConditions())
  const costs = useActionCosts(character, stats, conditions)
  return { character, stats, conditions, costs }
}

describe('useActionCosts — base costs (no talents)', () => {

  it('attaque melee 1ere = 6 CS', () => {
    // martial 0 = incompetent. We only verify base; incompetent malus is on post-action, not on attack itself.
    // Note: archerie incompetent gives +1 distance but we attack with melee weapon here.
    const { costs } = setup()
    expect(costs.attackCost(makeWeapon(), true)).toBe(6)
  })

  it('parade = 4 CS', () => {
    const { costs } = setup()
    expect(costs.parryCost(makeWeapon())).toBe(4)
  })

  it('esquive = 6 CS', () => {
    const { costs } = setup()
    expect(costs.dodgeCost()).toBe(6)
  })

  it('special = 6 CS', () => {
    const { costs } = setup()
    expect(costs.specialCost()).toBe(6)
  })
})

describe('useActionCosts — non-conditional passive modifiers', () => {
  it('Martial Entraine (-1 attaque_melee) reduces attack cost', () => {
    // martial 2 = entraine
    const { costs } = setup({ martial: 2 })
    expect(costs.attackCost(makeWeapon(), false)).toBe(5)
  })

  it('Martial Entraine (-1 parade) reduces parry cost', () => {
    const { costs } = setup({ martial: 2 })
    expect(costs.parryCost(makeWeapon())).toBe(3)
  })

  it('Agilite Entraine (-1 esquive) reduces dodge cost', () => {
    // agilite 2 = entraine
    const { costs } = setup({ agilite: 2 })
    expect(costs.dodgeCost()).toBe(5)
  })

  it('Force Entraine (-1 special_contextuelles) does NOT auto-apply to specialCost', () => {
    // The display button shows the neutral SPECIAL (6 CS). Special_contextuelles
    // bonus is contextual (player chooses scenario), not auto-applied.
    const { costs } = setup({ force: 2 })
    expect(costs.specialCost()).toBe(6)
  })

  it('Empathie Entraine (-1 aider) does not affect attack/parry/dodge/special', () => {
    // Aide is out of scope (no AIDE button in this iteration)
    const { costs } = setup({ empathie: 2 })
    expect(costs.attackCost(makeWeapon(), false)).toBe(6)
    expect(costs.dodgeCost()).toBe(6)
  })

  it('Archerie Tireur Rapide (-1 attaque_distance) reduces ranged attack', () => {
    // archerie 4 = competent, with tireur_rapide spec
    const { costs } = setup({ archerie: 4 }, { archerie: 'tireur_rapide' })
    // Plus base 6 - 1 (tireur rapide) = 5. Note: attaque_distance condition may also be
    // affected by archerie incompetent (+1) — but at competent, incompetent malus is gone.
    expect(costs.attackCost(makeWeapon({ ranged: true }), false)).toBe(5)
  })

  it('Archerie incompetent (+1 attaque_distance) increases ranged attack', () => {
    // archerie 0 = incompetent. The malus +1 attaque_distance applies.
    const { costs } = setup()
    expect(costs.attackCost(makeWeapon({ ranged: true }), false)).toBe(7)
  })
})

describe('useActionCosts — first attack bonus', () => {
  it('Martial Initie applies -1 only on first melee attack', () => {
    // martial 1 = initie. attaque_premiere_melee = -1.
    // 2eme/3eme attack: just base 6.
    const { costs } = setup({ martial: 1 })
    expect(costs.attackCost(makeWeapon(), true)).toBe(5)
    expect(costs.attackCost(makeWeapon(), false)).toBe(6)
  })

  it('Archerie Initie applies -1 only on first ranged attack', () => {
    // archerie 1 = initie. Initie unlocks Reflexe Oculaire (-1 attaque_premiere_distance).
    // Note: at archerie initie, incompetent +1 attaque_distance malus is suppressed
    // (existing pattern: malus only applies when stuck at incompetent).
    const { costs } = setup({ archerie: 1 })
    expect(costs.attackCost(makeWeapon({ ranged: true }), true)).toBe(5)
    expect(costs.attackCost(makeWeapon({ ranged: true }), false)).toBe(6)
  })

  it('cumulates Initie + Entraine on first melee attack', () => {
    // martial 2 = entraine (Initie + Entraine both unlocked).
    // attaque_premiere_melee = -1, attaque_melee = -1. Total: 6 - 1 - 1 = 4.
    const { costs } = setup({ martial: 2 })
    expect(costs.attackCost(makeWeapon(), true)).toBe(4)
    expect(costs.attackCost(makeWeapon(), false)).toBe(5)
  })
})

describe('useActionCosts — conditional toggles', () => {
  it('memeCible toggle reduces attack -1 if Pression spec unlocked', () => {
    const { conditions, costs } = setup({ martial: 4 }, { martial: 'pression' })
    // Without toggle: 6 + 0 (martial competent: attaque_melee -1, plus pression spec -1 meme_cible if active)
    // martial competent unlocks: incompetent (skipped), initie, entraine (-1 attaque_melee, -1 parade), competent (no passive itself, spec adds meme_cible)
    expect(costs.attackCost(makeWeapon(), false)).toBe(5)  // 6 + 0 + (-1 attaque_melee from entraine), no toggle
    conditions.value.memeCible = true
    expect(costs.attackCost(makeWeapon(), false)).toBe(4)
  })

  it('memeCible toggle has no effect if Pression spec NOT unlocked', () => {
    const { conditions, costs } = setup({ martial: 2 })
    conditions.value.memeCible = true
    expect(costs.attackCost(makeWeapon(), false)).toBe(5)  // entraine -1, no pression
  })

  it('sansFocus toggle reduces attack -1 if Assassin spec unlocked', () => {
    const { conditions, costs } = setup({ ombre: 4 }, { ombre: 'assassin' })
    conditions.value.sansFocus = true
    expect(costs.attackCost(makeWeapon(), false)).toBe(5)  // 6 - 1 (sans_focus)
  })

  it('embusque/encercle/aoo each reduces parry -1 if Instinct Entraine unlocked', () => {
    const { conditions, costs } = setup({ instinct: 2 })
    expect(costs.parryCost(makeWeapon())).toBe(4)
    conditions.value.embusque = true
    expect(costs.parryCost(makeWeapon())).toBe(3)
    conditions.value.embusque = false
    conditions.value.encercle = true
    expect(costs.parryCost(makeWeapon())).toBe(3)
    conditions.value.encercle = false
    conditions.value.attaqueOpportuniteSubie = true
    expect(costs.parryCost(makeWeapon())).toBe(3)
  })

  it('embusque toggle reduces dodge -1 if Instinct Entraine unlocked', () => {
    const { conditions, costs } = setup({ instinct: 2 })
    conditions.value.embusque = true
    expect(costs.dodgeCost()).toBe(5)
  })

  it('multiple defense toggles dont stack (each gives same -1)', () => {
    // Per data: a single -1 cs_modifier on defense_embusque_encerle_aoo. The toggles
    // share the same modifier; activating multiple should not stack.
    const { conditions, costs } = setup({ instinct: 2 })
    conditions.value.embusque = true
    conditions.value.encercle = true
    expect(costs.parryCost(makeWeapon())).toBe(3)  // not 2
  })

  it('embusque toggle has NO CS effect with only Ombre Maitre (Chat Gris adds damage, not CS)', () => {
    const { conditions, costs } = setup({ ombre: 7 })
    // Ombre Maitre exposes the embusque toggle (Chat Gris context), but it's a damage modifier
    // not a cs_modifier — parry/dodge cost should be unchanged.
    expect(costs.parryCost(makeWeapon())).toBe(4)
    expect(costs.dodgeCost()).toBe(6)
    conditions.value.embusque = true
    expect(costs.parryCost(makeWeapon())).toBe(4)
    expect(costs.dodgeCost()).toBe(6)
  })
})

describe('useActionCosts — overrides and floor', () => {
  it('Maitre Martial override: apresParadeEsquive=true → ATTAQUE = 3 CS fixed', () => {
    const { conditions, costs } = setup({ martial: 7 })  // maitre
    conditions.value.apresParadeEsquive = true
    expect(costs.attackCost(makeWeapon(), false)).toBe(3)
    expect(costs.attackCost(makeWeapon(), true)).toBe(3)  // even on first
  })

  it('Maitre Martial override does NOT apply to PARADE/ESQUIVE/SPECIAL', () => {
    const { conditions, costs } = setup({ martial: 7 })
    conditions.value.apresParadeEsquive = true
    // Parade still uses normal computation: 4 + 0 (souffle) + (-1 parade entraine) = 3
    expect(costs.parryCost(makeWeapon())).toBe(3)
    // Dodge unchanged: 6 (no agilite)
    expect(costs.dodgeCost()).toBe(6)
  })

  it('Maitre Martial override has no effect if Maitre tier not reached', () => {
    const { conditions, costs } = setup({ martial: 2 })  // entraine, not maitre
    conditions.value.apresParadeEsquive = true
    // Toggle ignored — falls back to normal computation
    expect(costs.attackCost(makeWeapon(), false)).toBe(5)
  })

  it('Instinct Legende override: premierTourLegende=true → cost / 2 ceil for all actions', () => {
    const { conditions, costs } = setup({ instinct: 11 })  // legende
    conditions.value.premierTourLegende = true
    expect(costs.attackCost(makeWeapon(), false)).toBe(3)  // 6 / 2
    expect(costs.parryCost(makeWeapon())).toBe(2)          // 4 / 2
    expect(costs.dodgeCost()).toBe(3)                      // 6 / 2
    expect(costs.specialCost()).toBe(3)                    // 6 / 2
  })

  it('Instinct Legende override has no effect if Legende tier not reached', () => {
    const { conditions, costs } = setup({ instinct: 7 })  // maitre, not legende
    conditions.value.premierTourLegende = true
    expect(costs.attackCost(makeWeapon(), false)).toBe(6)  // unchanged
  })

  it('Maitre Martial + Legende combined: 3 → /2 ceil → 2 (floored to 2)', () => {
    const { conditions, costs } = setup({ martial: 7, instinct: 11 })
    conditions.value.apresParadeEsquive = true
    conditions.value.premierTourLegende = true
    expect(costs.attackCost(makeWeapon(), false)).toBe(2)
  })

  it('floor: cost cannot go below 2 CS (except Maitre Martial 3 CS fixed alone)', () => {
    // Stack bonuses + a -1 souffleModifier weapon to push natural cost below 2.
    // martial 11 = legende (incl initie -1 first, entraine -1 melee); ombre with assassin spec adds sans_focus.
    // First attack natural sum: 6 + (-1 souffle) + (-1 attaque_melee) + (-1 meme_cible) + (-1 sans_focus) + (-1 attaque_premiere_melee) = 1.
    // Floor clamps to 2.
    const { conditions, costs } = setup(
      { martial: 11, ombre: 4 },
      { martial: 'pression', ombre: 'assassin' },
    )
    conditions.value.memeCible = true
    conditions.value.sansFocus = true
    expect(costs.attackCost(makeWeapon({ souffleModifier: -1 }), true)).toBe(2)
  })

  it('Maitre Martial 3 CS alone is NOT floored to 2 (stays at 3)', () => {
    const { conditions, costs } = setup({ martial: 7 })
    conditions.value.apresParadeEsquive = true
    expect(costs.attackCost(makeWeapon(), false)).toBe(3)
  })
})

describe('useActionCosts — LOURDE category', () => {
  it('weapon LOURDE adds +1 CS to attack and parry', () => {
    const { costs } = setup()
    expect(costs.attackCost(makeWeapon({ category: 'lourde' }), false)).toBe(7)
    expect(costs.parryCost(makeWeapon({ category: 'lourde' }))).toBe(5)
  })

  it('Force Maitre (Colosse) cancels the +1 LOURDE penalty', () => {
    // force 7 = maitre. The talent text says LOURDE armes have no CS malus.
    const { costs } = setup({ force: 7 })
    expect(costs.attackCost(makeWeapon({ category: 'lourde' }), false)).toBe(6)
    expect(costs.parryCost(makeWeapon({ category: 'lourde' }))).toBe(4)
  })

  it('LOURDE penalty applies to non-Force-Maitre characters', () => {
    const { costs } = setup({ force: 4 })  // competent, not maitre
    expect(costs.attackCost(makeWeapon({ category: 'lourde' }), false)).toBe(7)
  })
})

describe('useActionCosts — applicableToggles', () => {
  it('empty character: no toggles applicable', () => {
    const { costs } = setup()
    expect(costs.applicableToggles.value).toEqual([])
  })

  it('Instinct Entraine unlocks embusque, encercle, attaqueOpportuniteSubie', () => {
    const { costs } = setup({ instinct: 2 })
    const toggles = costs.applicableToggles.value
    expect(toggles).toContain('embusque')
    expect(toggles).toContain('encercle')
    expect(toggles).toContain('attaqueOpportuniteSubie')
  })

  it('Ombre Maitre also unlocks embusque (Chat Gris)', () => {
    const { costs } = setup({ ombre: 7 })
    expect(costs.applicableToggles.value).toContain('embusque')
  })

  it('Pression spec unlocks memeCible', () => {
    const { costs } = setup({ martial: 4 }, { martial: 'pression' })
    expect(costs.applicableToggles.value).toContain('memeCible')
  })

  it('Pression NOT chosen → memeCible not applicable even at competent', () => {
    const { costs } = setup({ martial: 4 })  // competent but no spec chosen
    expect(costs.applicableToggles.value).not.toContain('memeCible')
  })

  it('Assassin spec unlocks sansFocus', () => {
    const { costs } = setup({ ombre: 4 }, { ombre: 'assassin' })
    expect(costs.applicableToggles.value).toContain('sansFocus')
  })

  it('Martial Maitre unlocks apresParadeEsquive', () => {
    const { costs } = setup({ martial: 7 })
    expect(costs.applicableToggles.value).toContain('apresParadeEsquive')
  })

  it('Instinct Legende unlocks premierTourLegende', () => {
    const { costs } = setup({ instinct: 11 })
    expect(costs.applicableToggles.value).toContain('premierTourLegende')
  })
})
