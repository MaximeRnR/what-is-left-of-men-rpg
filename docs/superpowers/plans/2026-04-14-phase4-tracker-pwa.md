# Phase 4 — Tracker Combat + PWA

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the combat tracker (live PS/PSM/Souffle modification, active effects management, reset) and configure the PWA (service worker, manifest, offline support).

**Architecture:** New composable `useCombatTracker` for HP/Sanity/Souffle mutations and effect management. New view `CharacterTracker`. PWA via `vite-plugin-pwa` with Workbox service worker, CacheFirst for assets, NetworkFirst for HTML.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vitest, vite-plugin-pwa

---

## File Map

| File | Responsibility |
|---|---|
| `src/composables/useCombatTracker.ts` | Modify current PS/PSM/Souffle, manage active effects, reset |
| `src/__tests__/useCombatTracker.test.ts` | Tests for combat tracker |
| `src/views/CharacterTracker.vue` | Combat tracker view |
| `src/router/index.ts` | Add tracker route |
| `vite.config.ts` | Add vite-plugin-pwa config |
| `public/icons/icon-192x192.png` | PWA icon 192px |
| `public/icons/icon-512x512.png` | PWA icon 512px |

---

### Task 1: useCombatTracker Composable (TDD)

**Files:**
- Create: `src/composables/useCombatTracker.ts`
- Test: `src/__tests__/useCombatTracker.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/useCombatTracker.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { ref, computed } from 'vue'
import { useCombatTracker } from '../composables/useCombatTracker'
import { createEmptyCharacter } from '../models/character'

describe('useCombatTracker', () => {
  function setup(maxHP = 12, maxSanity = 13, maxSouffle = 11) {
    const character = ref(createEmptyCharacter('test-id', 'Test'))
    // Set initial tracker values to match max
    character.value.tracker.currentHP = maxHP
    character.value.tracker.currentSanity = maxSanity
    character.value.tracker.currentSouffle = maxSouffle
    const mHP = computed(() => maxHP)
    const mSanity = computed(() => maxSanity)
    const mSouffle = computed(() => maxSouffle)
    return { character, ...useCombatTracker(character, mHP, mSanity, mSouffle) }
  }

  it('reads current values from character tracker', () => {
    const { currentHP, currentSanity, currentSouffle } = setup()
    expect(currentHP.value).toBe(12)
    expect(currentSanity.value).toBe(13)
    expect(currentSouffle.value).toBe(11)
  })

  it('modifies HP', () => {
    const { currentHP, modifyHP } = setup()
    modifyHP(-3)
    expect(currentHP.value).toBe(9)
  })

  it('does not let HP go below 0', () => {
    const { currentHP, modifyHP } = setup()
    modifyHP(-20)
    expect(currentHP.value).toBe(0)
  })

  it('does not let HP exceed max', () => {
    const { currentHP, modifyHP } = setup()
    modifyHP(-5)
    modifyHP(10)
    expect(currentHP.value).toBe(12)
  })

  it('modifies sanity', () => {
    const { currentSanity, modifySanity } = setup()
    modifySanity(-4)
    expect(currentSanity.value).toBe(9)
  })

  it('does not let sanity go below 0', () => {
    const { currentSanity, modifySanity } = setup()
    modifySanity(-20)
    expect(currentSanity.value).toBe(0)
  })

  it('does not let sanity exceed max', () => {
    const { currentSanity, modifySanity } = setup()
    modifySanity(-5)
    modifySanity(20)
    expect(currentSanity.value).toBe(13)
  })

  it('modifies souffle', () => {
    const { currentSouffle, modifySouffle } = setup()
    modifySouffle(-6)
    expect(currentSouffle.value).toBe(5)
  })

  it('does not let souffle go below 0', () => {
    const { currentSouffle, modifySouffle } = setup()
    modifySouffle(-20)
    expect(currentSouffle.value).toBe(0)
  })

  it('does not let souffle exceed max', () => {
    const { currentSouffle, modifySouffle } = setup()
    modifySouffle(-3)
    modifySouffle(10)
    expect(currentSouffle.value).toBe(11)
  })

  it('resets all values to max', () => {
    const { currentHP, currentSanity, currentSouffle, modifyHP, modifySanity, modifySouffle, resetToMax } = setup()
    modifyHP(-5)
    modifySanity(-5)
    modifySouffle(-5)
    resetToMax()
    expect(currentHP.value).toBe(12)
    expect(currentSanity.value).toBe(13)
    expect(currentSouffle.value).toBe(11)
  })

  it('adds an active effect', () => {
    const { activeEffects, addEffect } = setup()
    addEffect('BLESSE')
    expect(activeEffects.value).toEqual(['BLESSE'])
  })

  it('does not add duplicate effects', () => {
    const { activeEffects, addEffect } = setup()
    addEffect('BLESSE')
    addEffect('BLESSE')
    expect(activeEffects.value).toEqual(['BLESSE'])
  })

  it('removes an active effect', () => {
    const { activeEffects, addEffect, removeEffect } = setup()
    addEffect('BLESSE')
    addEffect('PEUR')
    removeEffect('BLESSE')
    expect(activeEffects.value).toEqual(['PEUR'])
  })

  it('clears all effects', () => {
    const { activeEffects, addEffect, clearEffects } = setup()
    addEffect('BLESSE')
    addEffect('PEUR')
    clearEffects()
    expect(activeEffects.value).toEqual([])
  })

  it('reset also clears effects', () => {
    const { activeEffects, addEffect, resetToMax } = setup()
    addEffect('BLESSE')
    resetToMax()
    expect(activeEffects.value).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/useCombatTracker.test.ts
```

- [ ] **Step 3: Implement useCombatTracker**

Create `src/composables/useCombatTracker.ts`:

```typescript
import { computed, type Ref, type ComputedRef } from 'vue'
import type { Character } from '../models/character'

export function useCombatTracker(
  character: Ref<Character>,
  maxHP: ComputedRef<number>,
  maxSanity: ComputedRef<number>,
  maxSouffle: ComputedRef<number>,
) {
  const currentHP = computed(() => character.value.tracker.currentHP)
  const currentSanity = computed(() => character.value.tracker.currentSanity)
  const currentSouffle = computed(() => character.value.tracker.currentSouffle)
  const activeEffects = computed(() => character.value.tracker.activeEffects)

  function modifyHP(delta: number): void {
    const newVal = character.value.tracker.currentHP + delta
    character.value.tracker.currentHP = Math.max(0, Math.min(maxHP.value, newVal))
    character.value.updatedAt = Date.now()
  }

  function modifySanity(delta: number): void {
    const newVal = character.value.tracker.currentSanity + delta
    character.value.tracker.currentSanity = Math.max(0, Math.min(maxSanity.value, newVal))
    character.value.updatedAt = Date.now()
  }

  function modifySouffle(delta: number): void {
    const newVal = character.value.tracker.currentSouffle + delta
    character.value.tracker.currentSouffle = Math.max(0, Math.min(maxSouffle.value, newVal))
    character.value.updatedAt = Date.now()
  }

  function resetToMax(): void {
    character.value.tracker.currentHP = maxHP.value
    character.value.tracker.currentSanity = maxSanity.value
    character.value.tracker.currentSouffle = maxSouffle.value
    character.value.tracker.activeEffects = []
    character.value.updatedAt = Date.now()
  }

  function addEffect(effect: string): void {
    if (!character.value.tracker.activeEffects.includes(effect)) {
      character.value.tracker.activeEffects.push(effect)
      character.value.updatedAt = Date.now()
    }
  }

  function removeEffect(effect: string): void {
    character.value.tracker.activeEffects = character.value.tracker.activeEffects.filter(e => e !== effect)
    character.value.updatedAt = Date.now()
  }

  function clearEffects(): void {
    character.value.tracker.activeEffects = []
    character.value.updatedAt = Date.now()
  }

  return {
    currentHP,
    currentSanity,
    currentSouffle,
    activeEffects,
    modifyHP,
    modifySanity,
    modifySouffle,
    resetToMax,
    addEffect,
    removeEffect,
    clearEffects,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/useCombatTracker.test.ts
```

Expected: All 16 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useCombatTracker.ts src/__tests__/useCombatTracker.test.ts
git commit -m "feat: add useCombatTracker composable with TDD"
```

---

### Task 2: Tracker Route and View

**Files:**
- Modify: `src/router/index.ts`
- Create: `src/views/CharacterTracker.vue`
- Modify: `src/views/CharacterSheet.vue`

- [ ] **Step 1: Add route to router**

Add to `src/router/index.ts` after the inventory route:

```typescript
{
  path: '/character/:id/tracker',
  name: 'character-tracker',
  component: () => import('../views/CharacterTracker.vue'),
  props: true,
},
```

- [ ] **Step 2: Create CharacterTracker.vue**

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCharacterStore } from '../stores/characterStore'
import { useCharacterStats } from '../composables/useCharacterStats'
import { useCombatTracker } from '../composables/useCombatTracker'

const route = useRoute()
const store = useCharacterStore()

const characterId = route.params.id as string
const character = computed(() => store.characters.find(c => c.id === characterId))

const characterRef = ref(character.value!)
watch(character, (val) => { if (val) characterRef.value = val }, { deep: true })

const stats = useCharacterStats(characterRef)

const {
  currentHP,
  currentSanity,
  currentSouffle,
  activeEffects,
  modifyHP,
  modifySanity,
  modifySouffle,
  resetToMax,
  addEffect,
  removeEffect,
  clearEffects,
} = useCombatTracker(characterRef, stats.maxHP, stats.maxSanity, stats.maxSouffle)

// Persist changes to store
watch(
  () => character.value?.tracker,
  () => {
    if (!character.value) return
    store.updateCharacter(characterId, {
      tracker: { ...characterRef.value.tracker },
    })
  },
  { deep: true },
)

// Quick damage/heal inputs
const hpDelta = ref(1)
const sanityDelta = ref(1)
const souffleDelta = ref(1)

// New effect input
const newEffect = ref('')
function submitEffect() {
  const effect = newEffect.value.trim().toUpperCase()
  if (!effect) return
  addEffect(effect)
  newEffect.value = ''
}

// Common effects for quick add
const commonEffects = ['BLESSE', 'PEUR', 'EBRANLE', 'CONFUS', 'DESESPERE', 'OMBRE VIVANTE']
</script>

<template>
  <div class="character-tracker" v-if="character">
    <header>
      <h1>Combat — {{ character.name }}</h1>
      <div class="actions">
        <router-link :to="`/character/${characterId}`">Retour a la fiche</router-link>
        <button @click="resetToMax">Reinitialiser</button>
      </div>
    </header>

    <!-- HP -->
    <section class="stat-tracker">
      <h2>Points de Sante (PS)</h2>
      <div class="stat-bar">
        <span class="current">{{ currentHP }}</span>
        <span class="separator">/</span>
        <span class="max">{{ stats.maxHP.value }}</span>
      </div>
      <div class="stat-controls">
        <input v-model.number="hpDelta" type="number" min="1" max="99" />
        <button @click="modifyHP(-hpDelta)">- Degats</button>
        <button @click="modifyHP(hpDelta)">+ Soins</button>
      </div>
    </section>

    <!-- Sanity -->
    <section class="stat-tracker">
      <h2>Sante Mentale (PSM)</h2>
      <div class="stat-bar">
        <span class="current">{{ currentSanity }}</span>
        <span class="separator">/</span>
        <span class="max">{{ stats.maxSanity.value }}</span>
      </div>
      <div class="stat-controls">
        <input v-model.number="sanityDelta" type="number" min="1" max="99" />
        <button @click="modifySanity(-sanityDelta)">- Perte</button>
        <button @click="modifySanity(sanityDelta)">+ Recup</button>
      </div>
    </section>

    <!-- Souffle -->
    <section class="stat-tracker">
      <h2>Souffle</h2>
      <div class="stat-bar">
        <span class="current">{{ currentSouffle }}</span>
        <span class="separator">/</span>
        <span class="max">{{ stats.maxSouffle.value }}</span>
      </div>
      <div class="stat-controls">
        <input v-model.number="souffleDelta" type="number" min="1" max="99" />
        <button @click="modifySouffle(-souffleDelta)">- Depense</button>
        <button @click="modifySouffle(souffleDelta)">+ Recup</button>
      </div>
    </section>

    <!-- Active Effects -->
    <section class="effects-tracker">
      <h2>Etats actifs</h2>

      <div v-if="activeEffects.length === 0" class="no-effects">
        Aucun etat actif.
      </div>

      <div v-else class="active-effects">
        <span v-for="effect in activeEffects" :key="effect" class="effect-tag">
          {{ effect }}
          <button @click="removeEffect(effect)">x</button>
        </span>
        <button v-if="activeEffects.length > 0" @click="clearEffects" class="clear-all">
          Tout retirer
        </button>
      </div>

      <div class="add-effect">
        <input
          v-model="newEffect"
          type="text"
          placeholder="Ajouter un etat..."
          @keyup.enter="submitEffect"
        />
        <button @click="submitEffect" :disabled="!newEffect.trim()">Ajouter</button>
      </div>

      <div class="common-effects">
        <span>Etats courants :</span>
        <button
          v-for="effect in commonEffects"
          :key="effect"
          @click="addEffect(effect)"
          :disabled="activeEffects.includes(effect)"
        >
          {{ effect }}
        </button>
      </div>
    </section>
  </div>

  <div v-else>
    <p>Personnage introuvable.</p>
    <router-link to="/">Retour</router-link>
  </div>
</template>
```

- [ ] **Step 3: Add tracker link to CharacterSheet**

In `src/views/CharacterSheet.vue`, add alongside the existing action links in the header:

```html
<router-link :to="`/character/${characterId}/tracker`">Combat</router-link>
```

- [ ] **Step 4: Verify build**

```bash
npx vue-tsc --noEmit && npm run test && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/router/index.ts src/views/CharacterTracker.vue src/views/CharacterSheet.vue
git commit -m "feat: implement CharacterTracker view with combat stat management"
```

---

### Task 3: PWA Configuration

**Files:**
- Modify: `vite.config.ts`
- Create: `public/icons/icon-192x192.svg`, `public/icons/icon-512x512.svg`

- [ ] **Step 1: Install vite-plugin-pwa**

```bash
npm install -D vite-plugin-pwa
```

- [ ] **Step 2: Create PWA icons**

Create simple SVG placeholder icons (these can be replaced with proper designs later).

Create `public/icons/icon-192x192.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" fill="#1a1a2e" rx="24"/>
  <text x="96" y="110" font-family="serif" font-size="72" fill="#e94560" text-anchor="middle">C</text>
</svg>
```

Create `public/icons/icon-512x512.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1a1a2e" rx="64"/>
  <text x="256" y="300" font-family="serif" font-size="200" fill="#e94560" text-anchor="middle">C</text>
</svg>
```

- [ ] **Step 3: Update vite.config.ts with PWA plugin**

Replace `vite.config.ts` with:

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.svg'],
      manifest: {
        name: 'Contagion — Gestion de personnages',
        short_name: 'Contagion',
        description: 'Gestionnaire de personnages pour le JDR Contagion',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/icons/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^\/$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/__tests__/vitest.setup.ts'],
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
  },
})
```

- [ ] **Step 4: Verify everything**

```bash
npm run test && npx vue-tsc --noEmit && npm run build
```

Verify that `dist/` contains a `sw.js` or `registerSW.js` and a `manifest.webmanifest`.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts public/icons/ package.json package-lock.json
git commit -m "feat: configure PWA with vite-plugin-pwa for offline support"
```

---

### Task 4: Final Verification

- [ ] **Step 1: Run all tests**

```bash
npm run test
```

Expected: All tests pass (52 previous + 16 new = 68).

- [ ] **Step 2: Type check + build**

```bash
npx vue-tsc --noEmit && npm run build
```

- [ ] **Step 3: Test production server**

```bash
npm start
```

Verify app loads at http://localhost:3000, all routes work.

- [ ] **Step 4: Commit if needed**

Only commit if there are uncommitted changes.
