# Combat Action Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher dans l'ecran combat des boutons (display only) pour chaque action — Attaque 1ʳᵉ/2ᵉ/3ᵉ et Parade par arme, Esquive et Special en global — avec leur cout en CS calcule a partir des talents du personnage et de toggles de conditions actives.

**Architecture:** Nouveau composable `useActionCosts` qui encapsule toute la logique de calcul (couts de base, modifiers passifs, bonus 1ʳᵉ attaque, toggles conditionnels, overrides Maitre Martial / Legende, plancher 2 CS). Extension des fichiers JSON de talents pour encoder les conditions manquantes (`attaque_premiere_melee`, `attaque_premiere_distance`, `defense_embusque_encerle_aoo`, `meme_cible`). Modification de `CharacterTracker.vue` pour ajouter deux nouvelles sections (Conditions actives, Actions generales) et restructurer les cartes d'attaque.

**Tech Stack:** Vue 3 + Composition API + `<script setup>`, TypeScript, Pinia, Vitest, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-05-05-combat-action-buttons-design.md`

---

## File Structure

| Fichier | Action | Responsabilite |
|---------|--------|----------------|
| `src/data/skills/corps.json` | Modify | Ajouter `cs_modifier` sur Martial Initie / Archerie Initie / spec Pression |
| `src/data/skills/esprit.json` | Modify | Ajouter `cs_modifier` sur Instinct Entraine (Anticipation) |
| `src/composables/useActionCosts.ts` | Create | Composable retournant `attackCost`, `parryCost`, `dodgeCost`, `specialCost`, `applicableToggles` |
| `src/__tests__/useActionCosts.test.ts` | Create | Tests unitaires du composable |
| `src/views/CharacterTracker.vue` | Modify | UI : 2 nouvelles sections + restructure carte d'attaque |

Composables connexes (lecture seule, pas modifies) : `useCharacterStats.ts` (consomme via stats.csModifiers), `useSkillCalculator.ts`, `useCombatTracker.ts`.

---

### Task 1: Etendre la data des talents avec les conditions manquantes

**Files:**
- Modify: `src/data/skills/corps.json` (Martial Initie tier, Archerie Initie tier, Martial Pression spec)
- Modify: `src/data/skills/esprit.json` (Instinct Entraine / Anticipation tier)

- [ ] **Step 1: Lancer baseline tests pour s'assurer d'un etat propre**

Run: `npm test`
Expected: PASS — 86 tests passent.

- [ ] **Step 2: Ajouter `attaque_premiere_melee` a Martial Initie**

Dans `src/data/skills/corps.json`, trouver le tier Martial Initie (talentName `"Gestes appris"`, niveau `"initie"`, costToReach `1`). Son `passiveEffects` est actuellement `[]`. Le remplacer par :

```json
"passiveEffects": [
  {
    "type": "cs_modifier",
    "value": -1,
    "condition": "attaque_premiere_melee"
  }
]
```

- [ ] **Step 3: Ajouter `attaque_premiere_distance` a Archerie Initie**

Dans `src/data/skills/corps.json`, trouver le tier Archerie Initie (talentName `"Reflexe Oculaire"`, niveau `"initie"`, costToReach `1`). Son `passiveEffects` est actuellement `[]`. Le remplacer par :

```json
"passiveEffects": [
  {
    "type": "cs_modifier",
    "value": -1,
    "condition": "attaque_premiere_distance"
  }
]
```

- [ ] **Step 4: Ajouter `meme_cible` a la spec Pression (Martial Competent)**

Dans `src/data/skills/corps.json`, dans le tier Martial Competent, trouver la specialization `"id": "pression"`. Son `passiveEffects` est actuellement `[]`. Le remplacer par :

```json
"passiveEffects": [
  {
    "type": "cs_modifier",
    "value": -1,
    "condition": "meme_cible"
  }
]
```

- [ ] **Step 5: Ajouter `defense_embusque_encerle_aoo` a Instinct Entraine**

Dans `src/data/skills/esprit.json`, trouver le tier Instinct Entraine (talentName `"Anticipation"`, niveau `"entraine"`, costToReach `2`). Son `passiveEffects` est actuellement `[]`. Le remplacer par :

```json
"passiveEffects": [
  {
    "type": "cs_modifier",
    "value": -1,
    "condition": "defense_embusque_encerle_aoo"
  }
]
```

- [ ] **Step 6: Verifier que rien n'est casse**

Run: `npm test`
Expected: PASS (86/86) — la data des talents est typee mais consommee tolerament ; les nouvelles conditions ne sont referencees nulle part encore (pas de regression).

Run: `npm run build`
Expected: PASS — vue-tsc + vite build sans erreur. Le `passiveEffects: PassiveEffect[]` du modele accepte deja les nouveaux objets car `condition` est typee `string`.

- [ ] **Step 7: Commit**

```bash
git add src/data/skills/corps.json src/data/skills/esprit.json
git commit -m "feat(skills): encode missing CS modifier conditions"
```

---

### Task 2: Creer le composable `useActionCosts` avec TDD

**Files:**
- Create: `src/composables/useActionCosts.ts`
- Create: `src/__tests__/useActionCosts.test.ts`

Le composable expose :
```ts
interface ActionCostConditions {
  embusque: boolean
  encercle: boolean
  attaqueOpportuniteSubie: boolean
  memeCible: boolean
  sansFocus: boolean
  apresParadeEsquive: boolean
  premierTourLegende: boolean
}

type ToggleKey = keyof ActionCostConditions

interface UseActionCosts {
  attackCost: (weapon: WeaponDefinition, isFirst: boolean) => number
  parryCost: (weapon: WeaponDefinition) => number
  dodgeCost: () => number
  specialCost: () => number
  applicableToggles: ComputedRef<ToggleKey[]>
}
```

Implementation suit la sequence de calcul de la spec : base → modificateurs arme/LOURDE → modifiers passifs (csModifiers de useCharacterStats) → modifiers conditionnels (selon toggles) → bonus 1ʳᵉ attaque → overrides → plancher 2 CS.

- [ ] **Step 1: Creer le fichier de test avec un test minimal (base costs sans talents)**

Creer `src/__tests__/useActionCosts.test.ts` avec :

```ts
import { describe, it, expect } from 'vitest'
import { ref, computed } from 'vue'
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
```

- [ ] **Step 2: Lancer le test pour verifier qu'il echoue (composable n'existe pas)**

Run: `npm test -- useActionCosts`
Expected: FAIL — module `'../composables/useActionCosts'` not found.

- [ ] **Step 3: Creer `src/composables/useActionCosts.ts` avec une implementation minimale**

```ts
import { computed, type Ref, type ComputedRef } from 'vue'
import type { Character } from '../models/character'
import type { WeaponDefinition } from '../models/weapon'
import type { useCharacterStats } from './useCharacterStats'

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

export function useActionCosts(
  _character: Ref<Character>,
  _stats: Stats,
  _conditions: Ref<ActionCostConditions>,
) {
  function attackCost(_weapon: WeaponDefinition, _isFirst: boolean): number {
    return BASE_ATTACK
  }
  function parryCost(_weapon: WeaponDefinition): number {
    return BASE_PARRY
  }
  function dodgeCost(): number {
    return BASE_DODGE
  }
  function specialCost(): number {
    return BASE_SPECIAL
  }
  const applicableToggles: ComputedRef<ToggleKey[]> = computed(() => [])

  return { attackCost, parryCost, dodgeCost, specialCost, applicableToggles }
}
```

- [ ] **Step 4: Verifier que les tests de base passent**

Run: `npm test -- useActionCosts`
Expected: PASS — 4/4.

- [ ] **Step 5: Ajouter les tests pour les modifiers passifs non conditionnels**

Append au fichier de test :

```ts
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
```

- [ ] **Step 6: Lancer les tests, ils echouent**

Run: `npm test -- useActionCosts`
Expected: FAIL — implementation returns base costs ignoring talents.

- [ ] **Step 7: Implementer la logique de modifiers passifs**

Remplacer le corps de `useActionCosts` dans `src/composables/useActionCosts.ts` par :

```ts
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

  function attackCost(weapon: WeaponDefinition, _isFirst: boolean): number {
    const passive = weapon.ranged ? rangedAttackPassive() : meleeAttackPassive()
    return BASE_ATTACK + (weapon.souffleModifier ?? 0) + passive
  }
  function parryCost(weapon: WeaponDefinition): number {
    return BASE_PARRY + (weapon.souffleModifier ?? 0) + parryPassive()
  }
  function dodgeCost(): number {
    return BASE_DODGE + dodgePassive()
  }
  function specialCost(): number {
    return BASE_SPECIAL  // contextual modifiers stay manual
  }

  const applicableToggles: ComputedRef<ToggleKey[]> = computed(() => [])

  return { attackCost, parryCost, dodgeCost, specialCost, applicableToggles }
}
```

- [ ] **Step 8: Lancer les tests, ils passent**

Run: `npm test -- useActionCosts`
Expected: PASS — 10/10.

- [ ] **Step 9: Ajouter les tests pour le bonus 1ʳᵉ attaque**

```ts
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
```

- [ ] **Step 10: Lancer les tests pour qu'ils echouent**

Run: `npm test -- useActionCosts`
Expected: FAIL — `attackCost` ignores `isFirst`.

- [ ] **Step 11: Implementer le bonus 1ʳᵉ attaque**

Modifier `attackCost` dans `src/composables/useActionCosts.ts` :

```ts
function attackCost(weapon: WeaponDefinition, isFirst: boolean): number {
  const passive = weapon.ranged ? rangedAttackPassive() : meleeAttackPassive()
  let cost = BASE_ATTACK + (weapon.souffleModifier ?? 0) + passive
  if (isFirst) {
    const firstKey = weapon.ranged ? 'attaque_premiere_distance' : 'attaque_premiere_melee'
    cost += csModifierFor(firstKey)
  }
  return cost
}
```

- [ ] **Step 12: Verifier les tests**

Run: `npm test -- useActionCosts`
Expected: PASS — 13/13.

- [ ] **Step 13: Ajouter les tests pour les toggles conditionnels**

```ts
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
})
```

- [ ] **Step 14: Lancer les tests**

Run: `npm test -- useActionCosts`
Expected: FAIL — toggles ignored.

- [ ] **Step 15: Implementer les toggles conditionnels**

Modifier les fonctions dans `src/composables/useActionCosts.ts` :

```ts
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
```

Et integrer :

```ts
function attackCost(weapon: WeaponDefinition, isFirst: boolean): number {
  const passive = weapon.ranged ? rangedAttackPassive() : meleeAttackPassive()
  let cost = BASE_ATTACK + (weapon.souffleModifier ?? 0) + passive + attackConditionalDelta()
  if (isFirst) {
    const firstKey = weapon.ranged ? 'attaque_premiere_distance' : 'attaque_premiere_melee'
    cost += csModifierFor(firstKey)
  }
  return cost
}
function parryCost(weapon: WeaponDefinition): number {
  return BASE_PARRY + (weapon.souffleModifier ?? 0) + parryPassive() + defenseConditionalDelta()
}
function dodgeCost(): number {
  return BASE_DODGE + dodgePassive() + defenseConditionalDelta()
}
```

- [ ] **Step 16: Verifier les tests**

Run: `npm test -- useActionCosts`
Expected: PASS — 19/19.

- [ ] **Step 17: Ajouter les tests pour les overrides (Maitre Martial, Legende) et le plancher 2 CS**

```ts
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
    // Stack many bonuses to push cost below 2
    // martial 11 = legende (incl entraine -1 melee, -1 parade); also martial initie -1 first attack.
    // First attack: 6 - 1 (entraine) - 1 (initie) = 4. Add -1 meme_cible if pression chosen.
    const { conditions, costs } = setup(
      { martial: 11, ombre: 4 },
      { martial: 'pression', ombre: 'assassin' },
    )
    conditions.value.memeCible = true
    conditions.value.sansFocus = true
    // 6 + (-1 attaque_melee) + (-1 meme_cible) + (-1 sans_focus) + (-1 attaque_premiere_melee on first)
    // = 6 - 4 = 2. Floor respected.
    expect(costs.attackCost(makeWeapon(), true)).toBe(2)
  })

  it('Maitre Martial 3 CS alone is NOT floored to 2 (stays at 3)', () => {
    const { conditions, costs } = setup({ martial: 7 })
    conditions.value.apresParadeEsquive = true
    expect(costs.attackCost(makeWeapon(), false)).toBe(3)
  })
})
```

- [ ] **Step 18: Lancer les tests, ils echouent**

Run: `npm test -- useActionCosts`
Expected: FAIL — overrides and floor not implemented.

- [ ] **Step 19: Implementer overrides et plancher**

Mettre a jour `src/composables/useActionCosts.ts` pour ajouter une detection des tiers debloques et appliquer overrides et plancher :

```ts
import { TIER_CUMULATIVE_COST } from '../models/skill'
import type { TierLevel, SkillId } from '../models/skill'

// helper: determine if a skill has reached at least the given tier
function hasReachedTier(character: Character, skill: SkillId, tier: TierLevel): boolean {
  const spent = character.skills[skill]?.pointsSpent ?? 0
  const bonus = character.bonusPoints[skill] ?? 0
  return (spent + bonus) >= TIER_CUMULATIVE_COST[tier]
}
```

Puis ajouter les helpers et reorganiser le calcul (remplacer les 4 fonctions de cout) :

```ts
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
  return applyFloor(applyLegendeOverride(cost))
}

function parryCost(weapon: WeaponDefinition): number {
  const cost = BASE_PARRY + (weapon.souffleModifier ?? 0) + parryPassive() + defenseConditionalDelta()
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
```

Note : la guard sur `apresParadeEsquive` ignore le toggle si le talent Maitre Martial n'est pas debloque — le test verifie cela.

- [ ] **Step 20: Verifier les tests**

Run: `npm test -- useActionCosts`
Expected: PASS — 26/26.

- [ ] **Step 21: Ajouter les tests pour LOURDE + Force Maitre Colosse**

```ts
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
```

- [ ] **Step 22: Lancer les tests**

Run: `npm test -- useActionCosts`
Expected: FAIL — LOURDE not handled.

- [ ] **Step 23: Implementer LOURDE handling**

Ajouter une fonction utilitaire et l'integrer dans `attackCost` et `parryCost` :

```ts
function lourdePenalty(weapon: WeaponDefinition): number {
  if (weapon.category !== 'lourde') return 0
  if (hasReachedTier(character.value, 'force', 'maitre')) return 0
  return 1
}
```

Puis dans `attackCost` (apres calcul du `cost` normal et avant override Legende) :

```ts
cost += lourdePenalty(weapon)
```

Et de meme dans `parryCost`. **Important** : le LOURDE n'est pas applique sur le 3 CS fixe Maitre Martial (l'override ignore tout calcul intermediaire).

Code final de `attackCost` et `parryCost` :

```ts
function attackCost(weapon: WeaponDefinition, isFirst: boolean): number {
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
  cost += lourdePenalty(weapon)
  return applyFloor(applyLegendeOverride(cost))
}

function parryCost(weapon: WeaponDefinition): number {
  let cost = BASE_PARRY + (weapon.souffleModifier ?? 0) + parryPassive() + defenseConditionalDelta()
  cost += lourdePenalty(weapon)
  return applyFloor(applyLegendeOverride(cost))
}
```

- [ ] **Step 24: Verifier les tests**

Run: `npm test -- useActionCosts`
Expected: PASS — 29/29.

- [ ] **Step 25: Ajouter les tests pour `applicableToggles`**

```ts
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
```

- [ ] **Step 26: Lancer les tests**

Run: `npm test -- useActionCosts`
Expected: FAIL — `applicableToggles` returns `[]`.

- [ ] **Step 27: Implementer `applicableToggles`**

Remplacer le `applicableToggles` placeholder dans `src/composables/useActionCosts.ts` :

```ts
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
```

- [ ] **Step 28: Verifier les tests**

Run: `npm test -- useActionCosts`
Expected: PASS — 37/37.

- [ ] **Step 29: Run full suite + build**

Run: `npm test`
Expected: PASS — au moins 86 + 37 = 123 tests, tous verts.

Run: `npm run build`
Expected: PASS — pas d'erreur TS, pas d'erreur Vite.

- [ ] **Step 30: Commit**

```bash
git add src/composables/useActionCosts.ts src/__tests__/useActionCosts.test.ts
git commit -m "feat(combat): add useActionCosts composable for action CS calculations"
```

---

### Task 3: Integrer le composable dans `CharacterTracker.vue`

**Files:**
- Modify: `src/views/CharacterTracker.vue`

L'integration se fait en plusieurs sections distinctes. Pour chaque etape, modifier puis tester que rien d'autre ne casse.

- [ ] **Step 1: Importer et instancier le composable**

Dans `src/views/CharacterTracker.vue`, ajouter aux imports en haut de `<script setup>` :

```ts
import { useActionCosts, type ActionCostConditions } from '../composables/useActionCosts'
```

Apres la ligne `const tracker = useCombatTracker(...)`, ajouter :

```ts
const conditions = ref<ActionCostConditions>({
  embusque: false,
  encercle: false,
  attaqueOpportuniteSubie: false,
  memeCible: false,
  sansFocus: false,
  apresParadeEsquive: false,
  premierTourLegende: false,
})

const actionCosts = useActionCosts(characterRef, stats, conditions)

const toggleLabels: Record<keyof ActionCostConditions, string> = {
  embusque: 'EMBUSQUE',
  encercle: 'ENCERCLE',
  attaqueOpportuniteSubie: 'Attaque d\'opportunite subie',
  memeCible: 'Meme cible que la precedente',
  sansFocus: 'Cible non-Focus',
  apresParadeEsquive: 'Apres parade/esquive reussie',
  premierTourLegende: '1er tour Legende',
}
```

- [ ] **Step 2: Verifier que rien ne casse encore**

Run: `npm run build`
Expected: PASS — l'import est utilise, pas d'erreur TS.

- [ ] **Step 3: Ajouter la section "Conditions actives" dans le template**

Dans `src/views/CharacterTracker.vue`, dans le `<template>`, **inserer** entre la section Souffle (qui se termine par `</section>` apres le bloc Souffle) et la section Attaques (qui commence par `<!-- Attacks -->`), le bloc suivant :

```vue
    <!-- Active conditions toggles -->
    <section v-if="actionCosts.applicableToggles.value.length > 0" class="bg-surface-container border border-outline-variant p-4 mb-4">
      <h2 class="mb-3">Conditions actives</h2>
      <div class="flex flex-col gap-2">
        <label
          v-for="key in actionCosts.applicableToggles.value"
          :key="key"
          class="flex items-center gap-2 cursor-pointer text-sm"
        >
          <input type="checkbox" v-model="conditions[key]" class="w-4 h-4" />
          <span>{{ toggleLabels[key] }}</span>
        </label>
      </div>
    </section>

    <!-- Generic actions (Esquive, Special) -->
    <section class="bg-surface-container border border-outline-variant p-4 mb-4">
      <h2 class="mb-3">Actions generales</h2>
      <div class="grid grid-cols-2 gap-2">
        <div class="bg-surface-container-low p-2 text-center">
          <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Esquive</p>
          <p class="die-display font-bold text-tertiary">{{ actionCosts.dodgeCost() }} CS</p>
        </div>
        <div class="bg-surface-container-low p-2 text-center">
          <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Special</p>
          <p class="die-display font-bold text-tertiary">{{ actionCosts.specialCost() }} CS</p>
        </div>
      </div>
    </section>
```

- [ ] **Step 4: Modifier la cellule "Cout" des cartes d'attaque**

Dans `src/views/CharacterTracker.vue`, dans la boucle `<div v-for="atk in attacks">`, **remplacer** le `grid grid-cols-3` actuel (lignes contenant les 3 cellules : skill / damage / cost) par un layout a 2 colonnes (skill + damage) suivi d'une rangee dediee de boutons d'action.

Avant :
```vue
        <div class="grid grid-cols-3 gap-2 mb-2">
          <!-- Skill die -->
          <div class="bg-surface-container-low p-2 text-center">
            <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">{{ atk.skillName }}</p>
            <p class="die-display font-bold" :style="{ color: dieColorMap[atk.skillDie] }">{{ atk.skillDie }}</p>
            <p v-if="atk.rollBonus > 0" class="font-headline text-sm" :style="{ color: dieColorMap[atk.skillDie] }">+{{ atk.rollBonus }}</p>
          </div>
          <!-- Damage -->
          <div class="bg-surface-container-low p-2 text-center">
            <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Degats</p>
            <p class="die-display font-bold text-primary">{{ atk.damage }}</p>
            <p class="font-label text-xs text-on-surface-variant">{{ qualityLabels[atk.quality] }}</p>
          </div>
          <!-- Cost -->
          <div class="bg-surface-container-low p-2 text-center">
            <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Cout</p>
            <p class="die-display font-bold text-tertiary">{{ atk.baseCost }} CS</p>
            <p class="font-label text-xs text-on-surface-variant">Fragilite: {{ atk.fragility }}</p>
          </div>
        </div>
```

Apres :
```vue
        <div class="grid grid-cols-2 gap-2 mb-2">
          <!-- Skill die -->
          <div class="bg-surface-container-low p-2 text-center">
            <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">{{ atk.skillName }}</p>
            <p class="die-display font-bold" :style="{ color: dieColorMap[atk.skillDie] }">{{ atk.skillDie }}</p>
            <p v-if="atk.rollBonus > 0" class="font-headline text-sm" :style="{ color: dieColorMap[atk.skillDie] }">+{{ atk.rollBonus }}</p>
          </div>
          <!-- Damage -->
          <div class="bg-surface-container-low p-2 text-center">
            <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Degats</p>
            <p class="die-display font-bold text-primary">{{ atk.damage }}</p>
            <p class="font-label text-xs text-on-surface-variant">{{ qualityLabels[atk.quality] }}</p>
          </div>
        </div>

        <!-- Action cost buttons -->
        <div class="flex flex-wrap gap-2 mb-2">
          <div class="bg-surface-container-low p-2 text-center flex-1 min-w-[70px]">
            <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Attaque 1ere</p>
            <p class="die-display font-bold text-tertiary">{{ actionCosts.attackCost(atk.item.customWeapon ?? getWeaponById(atk.item.weaponId!)!, true) }} CS</p>
          </div>
          <div class="bg-surface-container-low p-2 text-center flex-1 min-w-[60px]">
            <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">2e</p>
            <p class="die-display font-bold text-tertiary">{{ actionCosts.attackCost(atk.item.customWeapon ?? getWeaponById(atk.item.weaponId!)!, false) }} CS</p>
          </div>
          <div class="bg-surface-container-low p-2 text-center flex-1 min-w-[60px]">
            <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">3e</p>
            <p class="die-display font-bold text-tertiary">{{ actionCosts.attackCost(atk.item.customWeapon ?? getWeaponById(atk.item.weaponId!)!, false) }} CS</p>
          </div>
          <div class="bg-surface-container-low p-2 text-center flex-1 min-w-[70px]">
            <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Parade</p>
            <p class="die-display font-bold text-tertiary">{{ actionCosts.parryCost(atk.item.customWeapon ?? getWeaponById(atk.item.weaponId!)!) }} CS</p>
          </div>
        </div>

        <!-- Fragility info (moved out of grid since cost cell is gone) -->
        <p class="text-xs text-on-surface-variant mb-2">Fragilite : {{ atk.fragility }}</p>
```

Note : `atk.item.customWeapon ?? getWeaponById(atk.item.weaponId!)!` peut etre simplifie en exposant un nouveau champ `weapon: WeaponDefinition` dans `AttackInfo`. **Faire ce refactor :**

Modifier l'interface `AttackInfo` pour ajouter `weapon: WeaponDefinition`. Dans la boucle `attacks`, juste avant `results.push(...)`, capturer la reference de l'arme deja calculee et l'inclure dans l'objet :

```ts
results.push({
  item,
  weapon,           // <-- NEW
  weaponName: weapon.name,
  // ... rest unchanged
})
```

Et ajouter l'import `WeaponDefinition` :
```ts
import type { WeaponDefinition } from '../models/weapon'
```

Puis dans le template, simplifier les appels :

```vue
{{ actionCosts.attackCost(atk.weapon, true) }} CS
{{ actionCosts.attackCost(atk.weapon, false) }} CS
{{ actionCosts.parryCost(atk.weapon) }} CS
```

- [ ] **Step 5: Build et lancer la suite de tests**

Run: `npm run build`
Expected: PASS — pas d'erreur TS.

Run: `npm test`
Expected: PASS — au moins 123 tests verts (les tests existants + ceux du nouveau composable).

- [ ] **Step 6: Test manuel**

Run: `npm run dev`

Scenario :
1. Creer ou ouvrir un personnage. Aller dans l'onglet combat.
2. Personnage vierge (skills a 0) : la section "Conditions actives" doit etre **masquee** (aucun toggle applicable). La section "Actions generales" doit afficher Esquive 6 / Special 6.
3. Si le perso a au moins 1 arme, verifier les 4 boutons (Attaque 1ere, 2e, 3e, Parade) avec leurs couts (par defaut : 6, 6, 6, 4).
4. Aller editer le perso, mettre instinct a 2 (Entraine). Revenir au combat. La section "Conditions actives" doit apparaitre avec EMBUSQUE / ENCERCLE / Attaque d'opportunite. Cocher EMBUSQUE → Esquive et Parade passent a -1 CS.
5. Mettre martial a 7 (Maitre). Le toggle "Apres parade/esquive reussie" apparait. L'activer → Attaque 1ere/2e/3e affichent 3 CS sur toutes les armes. Decocher → revient a la normale.
6. Mettre instinct a 11 (Legende). Toggle "1er tour Legende" apparait. L'activer → tous les couts divises par 2.

Expected: tous les pas OK, pas de bug visuel, pas de NaN.

- [ ] **Step 7: Commit**

```bash
git add src/views/CharacterTracker.vue
git commit -m "feat(combat): action cost buttons (attack/parry/dodge/special) with toggles"
```

---

### Task 4: Verification finale

**Files:** aucun

- [ ] **Step 1: Build complet**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 2: Suite de tests complete**

Run: `npm test`
Expected: PASS — au moins 123 tests verts.

- [ ] **Step 3: Test manuel scenario complet**

Run: `npm run dev`

Scenarios :
1. **Vide** : perso sans aucun talent — Conditions actives masquee ; Actions generales 6/6 ; pas d'arme = pas de cartes.
2. **Avec arme** : perso vierge avec une arme moyenne sans modificateur de souffle — boutons 6/6/6/4.
3. **Martial Entraine** : verifier 1ere = 4 (6 -1 entraine -1 initie), 2e/3e = 5 (6 -1 entraine), Parade = 3 (4 -1).
4. **Archerie incompetent** : arme distance, perso sans archerie — Attaque 1ere/2e/3e = 7 (6 +1 incompetent), pas de parade reduite.
5. **Tireur Rapide** : archerie 4 + spec tireur_rapide — Attaque distance = 5 (6 -1).
6. **LOURDE** : arme lourde, perso sans Force Maitre — +1 CS partout sur cette arme. Avec Force 7 (Maitre) — pas de penalite.
7. **Instinct Entraine** : toggles EMBUSQUE/ENCERCLE/AOO apparaissent ; cocher l'un d'eux → Esquive/Parade -1.
8. **Pression** : martial 4 + spec pression → toggle "Meme cible" apparait ; cocher → -1 CS attaque.
9. **Maitre Martial** : martial 7 → toggle "Apres parade/esquive reussie" → Attaque = 3 CS partout.
10. **Legende Instinct** : instinct 11 → toggle "1er tour Legende" → tous les couts /2 ceil.
11. **Combine Maitre + Legende** : Attaque = 2 CS (3/2 ceil = 2, plancher).

Expected: tous OK.

- [ ] **Step 4: Commit final si correction**

S'il a fallu corriger un bug pendant le test manuel :

```bash
git add <fichiers>
git commit -m "fix(combat): <description>"
```

Sinon rien a committer.
