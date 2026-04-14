# Phase 2 — Fiche Complete + Edition

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full character sheet view (read-only) with computed stats, character editing (re-allocation, story, MJ bonus points), and the routes to support them.

**Architecture:** New composable `useCharacterStats` aggregates all passive effects from unlocked tiers and specializations to compute derived stats (maxHP, maxSanity, maxSouffle, ST, initiative, CS modifiers, damage modifiers). Two new views: CharacterSheet (read) and CharacterEdit (write). Routes added to Vue Router.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vitest

---

## File Map

| File | Responsibility |
|---|---|
| `src/composables/useCharacterStats.ts` | Compute derived stats from character skills + specializations |
| `src/__tests__/useCharacterStats.test.ts` | Tests for stat computation |
| `src/views/CharacterSheet.vue` | Read-only character sheet with all talents and stats |
| `src/views/CharacterEdit.vue` | Edit character: name, story, re-allocate points, MJ bonus |
| `src/router/index.ts` | Add routes for /:id and /:id/edit |

---

### Task 1: useCharacterStats Composable (TDD)

**Files:**
- Create: `src/composables/useCharacterStats.ts`
- Test: `src/__tests__/useCharacterStats.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/useCharacterStats.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useCharacterStats } from '../composables/useCharacterStats'
import { createEmptyCharacter } from '../models/character'
import type { SkillId } from '../models/skill'

describe('useCharacterStats', () => {
  function setup(skills: Partial<Record<SkillId, number>> = {}, specializations: Partial<Record<SkillId, string>> = {}, bonusPoints: Partial<Record<SkillId, number>> = {}) {
    const character = ref(createEmptyCharacter('test-id', 'Test'))
    for (const [id, points] of Object.entries(skills)) {
      character.value.skills[id as SkillId] = { pointsSpent: points as number }
    }
    character.value.specializations = specializations
    character.value.bonusPoints = bonusPoints
    return useCharacterStats(character)
  }

  it('returns base stats with no points allocated', () => {
    const stats = setup()
    expect(stats.maxHP.value).toBe(10)
    expect(stats.maxSanity.value).toBe(10)
    expect(stats.maxSouffle.value).toBe(10)
  })

  it('adds HP from endurance tiers (cumulative)', () => {
    // Endurance: initie +1HP, entraine +1HP, competent +1HP = +3HP at 6 points
    const stats = setup({ endurance: 6 })
    expect(stats.maxHP.value).toBe(13)
  })

  it('subtracts HP from endurance incompetent', () => {
    // Endurance incompetent: -1 HP
    const stats = setup({ endurance: 1 })
    expect(stats.maxHP.value).toBe(9)
  })

  it('adds sanity from courage entraine and competent', () => {
    // Courage: entraine +1 PSM, competent +2 PSM = +3 at 6 points
    const stats = setup({ courage: 6 })
    expect(stats.maxSanity.value).toBe(13)
  })

  it('adds sanity from empathie competent', () => {
    // Empathie competent: +2 PSM
    const stats = setup({ empathie: 6 })
    expect(stats.maxSanity.value).toBe(12)
  })

  it('adds souffle from endurance maitre', () => {
    // Endurance maitre: +2HP +1 Souffle. Cumulative HP: -1+1+1+1+2=4
    const stats = setup({ endurance: 10 })
    expect(stats.maxHP.value).toBe(14)
    expect(stats.maxSouffle.value).toBe(11)
  })

  it('adds souffle from agilite maitre', () => {
    // Agilite maitre: +1 Souffle. Competent: +1 ST
    const stats = setup({ agilite: 10 })
    expect(stats.maxSouffle.value).toBe(11)
    expect(stats.stModifier.value).toBe(1)
  })

  it('computes ST modifier from ombre competent', () => {
    // Ombre competent: +1 ST
    const stats = setup({ ombre: 6 })
    expect(stats.stModifier.value).toBe(1)
  })

  it('adds specialization passive effects', () => {
    // Ombre competent + gredin specialization: +1 ST (tier) + +1 ST (spec) = +2 ST
    const stats = setup({ ombre: 6 }, { ombre: 'gredin' })
    expect(stats.stModifier.value).toBe(2)
  })

  it('computes initiative modifiers', () => {
    // Instinct: incompetent -1, initie +1 => net 0 at initie
    const stats = setup({ instinct: 2 })
    expect(stats.initiativeModifier.value).toBe(0)
  })

  it('instinct incompetent gives -1 initiative', () => {
    const stats = setup({ instinct: 1 })
    expect(stats.initiativeModifier.value).toBe(-1)
  })

  it('perception entraine gives +1 initiative', () => {
    // Perception: incompetent -1 initiative, entraine +1 initiative => net 0
    const stats = setup({ perception: 4 })
    expect(stats.initiativeModifier.value).toBe(0)
  })

  it('collects unlocked talents', () => {
    const stats = setup({ martial: 4, endurance: 2 })
    // Martial at entraine: incompetent + initie + entraine = 3 talents
    // Endurance at initie: incompetent + initie = 2 talents
    expect(stats.unlockedTalents.value).toHaveLength(5)
  })

  it('combines stats from multiple skills', () => {
    // Endurance 6 (+3 HP) + Courage 6 (+3 PSM) + Agilite 10 (+1 Souffle, +1 ST)
    const stats = setup({ endurance: 6, courage: 6, agilite: 10 })
    expect(stats.maxHP.value).toBe(13)
    expect(stats.maxSanity.value).toBe(13)
    expect(stats.maxSouffle.value).toBe(11)
    expect(stats.stModifier.value).toBe(1)
  })

  it('includes bonus points in skill tier calculation for unlocked talents', () => {
    // Martial 2 points (initie) + 2 bonus = entraine level for talent display
    const stats = setup({ martial: 2 }, {}, { martial: 2 })
    const martialTalents = stats.unlockedTalents.value.filter(t => t.skill === 'martial')
    expect(martialTalents).toHaveLength(3) // incompetent + initie + entraine
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/useCharacterStats.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement useCharacterStats**

Create `src/composables/useCharacterStats.ts`:

```typescript
import { computed, type Ref } from 'vue'
import type { Character } from '../models/character'
import type { SkillId, TierLevel, SkillTier, PassiveEffect } from '../models/skill'
import { ALL_SKILL_IDS } from '../models/skill'
import { allSkills } from '../data/skills'
import { computeSkillTier } from './useSkillCalculator'

interface UnlockedTalent {
  skill: SkillId
  tier: TierLevel
  talent: SkillTier
}

export function useCharacterStats(character: Ref<Character>) {
  function collectPassiveEffects(): PassiveEffect[] {
    const effects: PassiveEffect[] = []

    for (const skillId of ALL_SKILL_IDS) {
      const spent = character.value.skills[skillId]?.pointsSpent ?? 0
      const bonus = character.value.bonusPoints[skillId] ?? 0
      const totalPoints = spent + bonus
      if (totalPoints === 0) continue

      const result = computeSkillTier(totalPoints, 0)
      if (!result.tier) continue

      const skillDef = allSkills.find(s => s.id === skillId)
      if (!skillDef) continue

      for (const tier of skillDef.tiers) {
        if (tier.costToReach > totalPoints) break
        effects.push(...tier.passiveEffects)

        // Add specialization effects if chosen and this tier has specializations
        if (tier.specializations?.length) {
          const chosenSpecId = character.value.specializations[skillId]
          if (chosenSpecId) {
            const spec = tier.specializations.find(s => s.id === chosenSpecId)
            if (spec) {
              effects.push(...spec.passiveEffects)
            }
          }
        }
      }
    }

    return effects
  }

  const maxHP = computed(() => {
    const effects = collectPassiveEffects()
    return 10 + effects.filter(e => e.type === 'hp').reduce((sum, e) => sum + e.value, 0)
  })

  const maxSanity = computed(() => {
    const effects = collectPassiveEffects()
    return 10 + effects.filter(e => e.type === 'sanity').reduce((sum, e) => sum + e.value, 0)
  })

  const maxSouffle = computed(() => {
    const effects = collectPassiveEffects()
    return 10 + effects.filter(e => e.type === 'souffle').reduce((sum, e) => sum + e.value, 0)
  })

  const stModifier = computed(() => {
    const effects = collectPassiveEffects()
    return effects.filter(e => e.type === 'st').reduce((sum, e) => sum + e.value, 0)
  })

  const initiativeModifier = computed(() => {
    const effects = collectPassiveEffects()
    return effects.filter(e => e.type === 'initiative').reduce((sum, e) => sum + e.value, 0)
  })

  const csModifiers = computed(() => {
    const effects = collectPassiveEffects()
    const result: Record<string, number> = {}
    for (const e of effects.filter(e => e.type === 'cs_modifier')) {
      const key = e.condition ?? 'general'
      result[key] = (result[key] ?? 0) + e.value
    }
    return result
  })

  const damageModifiers = computed(() => {
    const effects = collectPassiveEffects()
    const result: Record<string, number> = {}
    for (const e of effects.filter(e => e.type === 'damage')) {
      const key = e.condition ?? 'general'
      result[key] = (result[key] ?? 0) + e.value
    }
    return result
  })

  const unlockedTalents = computed((): UnlockedTalent[] => {
    const talents: UnlockedTalent[] = []

    for (const skillId of ALL_SKILL_IDS) {
      const spent = character.value.skills[skillId]?.pointsSpent ?? 0
      const bonus = character.value.bonusPoints[skillId] ?? 0
      const totalPoints = spent + bonus
      if (totalPoints === 0) continue

      const skillDef = allSkills.find(s => s.id === skillId)
      if (!skillDef) continue

      for (const tier of skillDef.tiers) {
        if (tier.costToReach > totalPoints) break
        talents.push({ skill: skillId, tier: tier.level, talent: tier })
      }
    }

    return talents
  })

  return {
    maxHP,
    maxSanity,
    maxSouffle,
    stModifier,
    initiativeModifier,
    csModifiers,
    damageModifiers,
    unlockedTalents,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/useCharacterStats.test.ts
```

Expected: All 15 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useCharacterStats.ts src/__tests__/useCharacterStats.test.ts
git commit -m "feat: add useCharacterStats composable with TDD"
```

---

### Task 2: Add Routes for Sheet and Edit

**Files:**
- Modify: `src/router/index.ts`

- [ ] **Step 1: Update router**

Add two new routes to `src/router/index.ts`:

```typescript
{
  path: '/character/:id',
  name: 'character-sheet',
  component: () => import('../views/CharacterSheet.vue'),
  props: true,
},
{
  path: '/character/:id/edit',
  name: 'character-edit',
  component: () => import('../views/CharacterEdit.vue'),
  props: true,
},
```

- [ ] **Step 2: Create stub views**

Create `src/views/CharacterSheet.vue`:

```vue
<template>
  <div><h1>Fiche (stub)</h1></div>
</template>
```

Create `src/views/CharacterEdit.vue`:

```vue
<template>
  <div><h1>Edition (stub)</h1></div>
</template>
```

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev
```

- [ ] **Step 4: Commit**

```bash
git add src/router/index.ts src/views/CharacterSheet.vue src/views/CharacterEdit.vue
git commit -m "feat: add routes and stubs for character sheet and edit views"
```

---

### Task 3: CharacterSheet View

**Files:**
- Modify: `src/views/CharacterSheet.vue`

Before implementing, fetch the Stitch screen designs:
```
Use MCP tool: mcp__stitch__get_screen with screen_id "7906af12c3a449d3b6bf3fc877116884" (Character Dashboard)
Use MCP tool: mcp__stitch__get_screen with screen_id "8b0fdc7fa52d4ae7abd6261e5dd23bb9" (Skills & Talents)
```

- [ ] **Step 1: Implement CharacterSheet.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCharacterStore } from '../stores/characterStore'
import { useCharacterStats } from '../composables/useCharacterStats'
import { computeSkillTier } from '../composables/useSkillCalculator'
import { allSkills } from '../data/skills'
import type { SkillId, SkillCategory } from '../models/skill'
import { ref } from 'vue'

const route = useRoute()
const router = useRouter()
const store = useCharacterStore()

const characterId = route.params.id as string
const character = computed(() => store.characters.find(c => c.id === characterId))

// Wrap in a ref-like computed for useCharacterStats
const characterRef = computed(() => character.value!)
const stats = useCharacterStats(ref(character.value!))

// Re-create stats reactively when character changes
const reactiveStats = computed(() => {
  if (!character.value) return null
  // We need a stable ref — useCharacterStats is called once
  return stats
})

const categories: { key: SkillCategory; label: string }[] = [
  { key: 'corps', label: 'CORPS' },
  { key: 'coeur', label: 'COEUR' },
  { key: 'esprit', label: 'ESPRIT' },
]

function skillsByCategory(category: SkillCategory) {
  return allSkills.filter(s => s.category === category)
}

function getSkillInfo(skillId: SkillId) {
  if (!character.value) return null
  const spent = character.value.skills[skillId]?.pointsSpent ?? 0
  const bonus = character.value.bonusPoints[skillId] ?? 0
  const result = computeSkillTier(spent + bonus, 0)
  return result
}

function getUnlockedTalentsForSkill(skillId: SkillId) {
  if (!character.value) return []
  const spent = character.value.skills[skillId]?.pointsSpent ?? 0
  const bonus = character.value.bonusPoints[skillId] ?? 0
  const totalPoints = spent + bonus
  if (totalPoints === 0) return []

  const skillDef = allSkills.find(s => s.id === skillId)
  if (!skillDef) return []

  return skillDef.tiers.filter(t => t.costToReach <= totalPoints)
}

function getChosenSpecialization(skillId: SkillId) {
  if (!character.value) return null
  const specId = character.value.specializations[skillId]
  if (!specId) return null
  const skillDef = allSkills.find(s => s.id === skillId)
  if (!skillDef) return null
  for (const tier of skillDef.tiers) {
    const spec = tier.specializations?.find(s => s.id === specId)
    if (spec) return spec
  }
  return null
}

function goToEdit() {
  router.push(`/character/${characterId}/edit`)
}
</script>

<template>
  <div class="character-sheet" v-if="character">
    <header>
      <h1>{{ character.name }}</h1>
      <div class="actions">
        <router-link to="/">Retour</router-link>
        <button @click="goToEdit">Modifier</button>
      </div>
    </header>

    <section v-if="character.story" class="story">
      <h2>Histoire</h2>
      <p>{{ character.story }}</p>
    </section>

    <section class="stats-summary">
      <h2>Statistiques</h2>
      <div class="stat-grid">
        <div class="stat">
          <span class="stat-label">PS</span>
          <span class="stat-value">{{ stats.maxHP.value }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">PSM</span>
          <span class="stat-value">{{ stats.maxSanity.value }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Souffle</span>
          <span class="stat-value">{{ stats.maxSouffle.value }}</span>
        </div>
        <div class="stat" v-if="stats.stModifier.value !== 0">
          <span class="stat-label">ST</span>
          <span class="stat-value">{{ stats.stModifier.value > 0 ? '+' : '' }}{{ stats.stModifier.value }}</span>
        </div>
        <div class="stat" v-if="stats.initiativeModifier.value !== 0">
          <span class="stat-label">Initiative</span>
          <span class="stat-value">{{ stats.initiativeModifier.value > 0 ? '+' : '' }}{{ stats.initiativeModifier.value }}</span>
        </div>
      </div>
    </section>

    <section v-for="cat in categories" :key="cat.key" class="skill-category">
      <h2>{{ cat.label }}</h2>

      <div v-for="skill in skillsByCategory(cat.key)" :key="skill.id" class="skill-block">
        <div class="skill-header">
          <strong>{{ skill.name }}</strong>
          <em>{{ skill.latinName }}</em>
          <template v-if="getSkillInfo(skill.id as SkillId)?.tier">
            <span class="die">{{ getSkillInfo(skill.id as SkillId)!.die }}</span>
            <span class="tier">{{ getSkillInfo(skill.id as SkillId)!.tier }}</span>
            <span v-if="getSkillInfo(skill.id as SkillId)!.totalBonus > 0" class="bonus">
              +{{ getSkillInfo(skill.id as SkillId)!.totalBonus }}
            </span>
          </template>
          <span v-else class="no-points">—</span>
        </div>

        <div class="talents" v-if="getUnlockedTalentsForSkill(skill.id as SkillId).length > 0">
          <div
            v-for="tier in getUnlockedTalentsForSkill(skill.id as SkillId)"
            :key="tier.level"
            class="talent"
            :class="{ malus: tier.isMalus }"
          >
            <span class="talent-name">{{ tier.talentName }}</span>
            <span class="talent-die">{{ tier.die }}</span>
            <p class="talent-desc">{{ tier.description }}</p>
          </div>

          <div v-if="getChosenSpecialization(skill.id as SkillId)" class="specialization">
            <strong>Specialisation : {{ getChosenSpecialization(skill.id as SkillId)!.name }}</strong>
            <p>{{ getChosenSpecialization(skill.id as SkillId)!.description }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>

  <div v-else>
    <p>Personnage introuvable.</p>
    <router-link to="/">Retour</router-link>
  </div>
</template>
```

- [ ] **Step 2: Update CharacterList to navigate to sheet on click**

In `src/views/CharacterList.vue`, update `selectCharacter`:

```typescript
function selectCharacter(id: string) {
  store.setActiveCharacter(id)
  router.push(`/character/${id}`)
}
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Create a character, click it in the list, verify the sheet displays correctly.

- [ ] **Step 4: Verify build**

```bash
npx vue-tsc --noEmit && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/views/CharacterSheet.vue src/views/CharacterList.vue
git commit -m "feat: implement CharacterSheet view with stats and talents"
```

---

### Task 4: CharacterEdit View

**Files:**
- Modify: `src/views/CharacterEdit.vue`

- [ ] **Step 1: Implement CharacterEdit.vue**

```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCharacterStore } from '../stores/characterStore'
import { usePointBudget } from '../composables/usePointBudget'
import { computeSkillTier } from '../composables/useSkillCalculator'
import { allSkills } from '../data/skills'
import type { SkillId, SkillCategory } from '../models/skill'
import type { Character } from '../models/character'

const route = useRoute()
const router = useRouter()
const store = useCharacterStore()

const characterId = route.params.id as string
const original = computed(() => store.characters.find(c => c.id === characterId))

// Create a deep copy for editing
const draft = ref<Character>(JSON.parse(JSON.stringify(original.value!)))

const { totalPoints, spentPoints, remainingPoints, canAllocate, allocate, deallocate, isValid } =
  usePointBudget(draft)

const categories: { key: SkillCategory; label: string }[] = [
  { key: 'corps', label: 'CORPS' },
  { key: 'coeur', label: 'COEUR' },
  { key: 'esprit', label: 'ESPRIT' },
]

function skillsByCategory(category: SkillCategory) {
  return allSkills.filter(s => s.category === category)
}

function getSkillTier(skillId: SkillId) {
  const spent = draft.value.skills[skillId]?.pointsSpent ?? 0
  const bonus = draft.value.bonusPoints[skillId] ?? 0
  return computeSkillTier(spent, bonus)
}

function addPoint(skillId: SkillId) {
  if (canAllocate(skillId, 1)) {
    allocate(skillId, 1)
  }
}

function removePoint(skillId: SkillId) {
  deallocate(skillId, 1)
}

function getTierForSkill(skillId: SkillId) {
  const result = getSkillTier(skillId)
  if (!result.tier) return null
  const skillDef = allSkills.find(s => s.id === skillId)
  return skillDef?.tiers.find(t => t.level === result.tier)
}

function selectSpecialization(skillId: SkillId, specId: string) {
  draft.value.specializations[skillId] = specId
}

// MJ bonus points management
function addBonusPoint(skillId: SkillId) {
  const current = draft.value.bonusPoints[skillId] ?? 0
  const totalBonus = Object.values(draft.value.bonusPoints).reduce((sum, v) => sum + (v ?? 0), 0)
  if (totalBonus >= 5) return
  draft.value.bonusPoints[skillId] = current + 1
}

function removeBonusPoint(skillId: SkillId) {
  const current = draft.value.bonusPoints[skillId] ?? 0
  if (current <= 0) return
  draft.value.bonusPoints[skillId] = current - 1
  if (draft.value.bonusPoints[skillId] === 0) {
    delete draft.value.bonusPoints[skillId]
  }
}

const totalBonusSpent = computed(() => {
  return Object.values(draft.value.bonusPoints).reduce((sum, v) => sum + (v ?? 0), 0)
})

const canSave = computed(() => {
  if (!draft.value.name.trim()) return false
  if (!isValid.value) return false
  return true
})

function save() {
  if (!canSave.value) return
  store.updateCharacter(characterId, {
    name: draft.value.name,
    story: draft.value.story,
    skills: { ...draft.value.skills },
    specializations: { ...draft.value.specializations },
    bonusPoints: { ...draft.value.bonusPoints },
  })
  router.push(`/character/${characterId}`)
}

function cancel() {
  router.push(`/character/${characterId}`)
}
</script>

<template>
  <div class="character-edit" v-if="original">
    <header>
      <h1>Modifier {{ draft.name }}</h1>
      <button @click="cancel">Annuler</button>
    </header>

    <div class="name-input">
      <label for="name">Nom</label>
      <input id="name" v-model="draft.name" type="text" />
    </div>

    <div class="story-input">
      <label for="story">Histoire</label>
      <textarea id="story" v-model="draft.story" rows="4" placeholder="L'histoire de votre personnage..."></textarea>
    </div>

    <div class="budget">
      <span>Points : {{ spentPoints }} / {{ totalPoints }}</span>
      <span>Restants : {{ remainingPoints }}</span>
    </div>

    <div class="bonus-budget">
      <span>Bonus MJ : {{ totalBonusSpent }} / 5</span>
    </div>

    <div v-for="cat in categories" :key="cat.key" class="category">
      <h2>{{ cat.label }}</h2>

      <div v-for="skill in skillsByCategory(cat.key)" :key="skill.id" class="skill-row">
        <div class="skill-header">
          <strong>{{ skill.name }}</strong>
          <em>{{ skill.latinName }}</em>
        </div>

        <div class="skill-controls">
          <span>Points :</span>
          <button @click="removePoint(skill.id as SkillId)" :disabled="(draft.skills[skill.id as SkillId]?.pointsSpent ?? 0) === 0">-</button>
          <span>{{ draft.skills[skill.id as SkillId]?.pointsSpent ?? 0 }}</span>
          <button @click="addPoint(skill.id as SkillId)" :disabled="!canAllocate(skill.id as SkillId, 1)">+</button>
        </div>

        <div class="bonus-controls">
          <span>Bonus MJ :</span>
          <button @click="removeBonusPoint(skill.id as SkillId)" :disabled="(draft.bonusPoints[skill.id as SkillId] ?? 0) === 0">-</button>
          <span>{{ draft.bonusPoints[skill.id as SkillId] ?? 0 }}</span>
          <button @click="addBonusPoint(skill.id as SkillId)" :disabled="totalBonusSpent >= 5">+</button>
        </div>

        <div class="skill-tier" v-if="getSkillTier(skill.id as SkillId).tier">
          <span class="die">{{ getSkillTier(skill.id as SkillId).die }}</span>
          <span class="tier-name">{{ getSkillTier(skill.id as SkillId).tier }}</span>
          <span v-if="getSkillTier(skill.id as SkillId).totalBonus > 0" class="bonus">
            +{{ getSkillTier(skill.id as SkillId).totalBonus }}
          </span>
        </div>

        <div v-if="getTierForSkill(skill.id as SkillId)?.specializations?.length" class="specializations">
          <p>Specialisation :</p>
          <label
            v-for="spec in getTierForSkill(skill.id as SkillId)!.specializations"
            :key="spec.id"
          >
            <input
              type="radio"
              :name="`spec-${skill.id}`"
              :value="spec.id"
              :checked="draft.specializations[skill.id as SkillId] === spec.id"
              @change="selectSpecialization(skill.id as SkillId, spec.id)"
            />
            <strong>{{ spec.name }}</strong> — {{ spec.description }}
          </label>
        </div>
      </div>
    </div>

    <footer>
      <button @click="cancel">Annuler</button>
      <button @click="save" :disabled="!canSave">Sauvegarder</button>
    </footer>
  </div>

  <div v-else>
    <p>Personnage introuvable.</p>
    <router-link to="/">Retour</router-link>
  </div>
</template>
```

- [ ] **Step 2: Verify build**

```bash
npx vue-tsc --noEmit && npm run build
```

- [ ] **Step 3: Verify in browser**

Create a character, view sheet, click Modifier, edit name/story/points/bonus, save, verify changes persist.

- [ ] **Step 4: Commit**

```bash
git add src/views/CharacterEdit.vue
git commit -m "feat: implement CharacterEdit view with MJ bonus points"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Run all tests**

```bash
npm run test
```

Expected: All tests pass (including new useCharacterStats tests).

- [ ] **Step 2: Type check + build**

```bash
npx vue-tsc --noEmit && npm run build
```

- [ ] **Step 3: Commit if needed**

```bash
git add -A && git status
```

Only commit if there are changes.
