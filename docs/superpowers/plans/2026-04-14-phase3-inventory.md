# Phase 3 — Inventaire

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the inventory system: weapon JSON data, useInventory composable, and the CharacterInventory view where players can add weapons from the rulebook, create custom items, track fragility, and manage traits.

**Architecture:** New JSON data file for weapons (base + ranged), new composable `useInventory` for CRUD operations on inventory items, new view `CharacterInventory` with route. The inventory is persisted as part of the Character object in localStorage via the existing Pinia store.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vitest

---

## File Map

| File | Responsibility |
|---|---|
| `src/models/weapon.ts` | WeaponDefinition type (already in spec, needs its own file) |
| `src/data/weapons.json` | All weapons from the rulebook (base + ranged) |
| `src/data/weapons.ts` | Typed re-export of weapons.json |
| `src/composables/useInventory.ts` | Add/remove items, update fragility, manage traits |
| `src/__tests__/useInventory.test.ts` | Tests for inventory composable |
| `src/views/CharacterInventory.vue` | Inventory management view |
| `src/router/index.ts` | Add inventory route |

---

### Task 1: Weapon Types and JSON Data

**Files:**
- Create: `src/models/weapon.ts`, `src/data/weapons.json`, `src/data/weapons.ts`

- [ ] **Step 1: Create src/models/weapon.ts**

```typescript
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
```

- [ ] **Step 2: Create src/data/weapons.json**

```json
[
  {
    "id": "dague_rouillee",
    "name": "Dague rouillee",
    "category": "legere",
    "damage": "1d4",
    "souffleModifier": -1,
    "specialEffects": ["Perforant 1"],
    "fragility": 2,
    "quality": "faible_qualite",
    "ranged": false
  },
  {
    "id": "couteau_de_soldat",
    "name": "Couteau de soldat",
    "category": "legere",
    "damage": "1d4",
    "souffleModifier": -1,
    "specialEffects": ["Perforant 2"],
    "fragility": 3,
    "quality": "standard",
    "ranged": false
  },
  {
    "id": "epee_courte",
    "name": "Epee courte",
    "category": "moyenne",
    "damage": "1d6",
    "souffleModifier": 0,
    "specialEffects": ["Escrime"],
    "fragility": 4,
    "quality": "standard",
    "ranged": false
  },
  {
    "id": "rapiere_fine",
    "name": "Rapiere fine",
    "category": "moyenne",
    "damage": "1d6",
    "souffleModifier": 0,
    "specialEffects": ["Escrime"],
    "fragility": 2,
    "quality": "chef_doeuvre",
    "ranged": false
  },
  {
    "id": "epee_batarde",
    "name": "Epee batarde",
    "category": "lourde",
    "damage": "1d8",
    "souffleModifier": 1,
    "specialEffects": ["Escrime"],
    "fragility": 5,
    "quality": "standard",
    "ranged": false
  },
  {
    "id": "hache_de_bucheron",
    "name": "Hache de bucheron",
    "category": "moyenne",
    "damage": "1d6",
    "souffleModifier": 0,
    "specialEffects": ["Brise-Bouclier"],
    "fragility": 3,
    "quality": "faible_qualite",
    "ranged": false
  },
  {
    "id": "hache_de_guerre",
    "name": "Hache de guerre",
    "category": "lourde",
    "damage": "1d8",
    "souffleModifier": 1,
    "specialEffects": ["Brise-Bouclier"],
    "fragility": 4,
    "quality": "standard",
    "ranged": false
  },
  {
    "id": "masse_paysanne",
    "name": "Masse paysanne",
    "category": "moyenne",
    "damage": "1d6",
    "souffleModifier": 0,
    "specialEffects": ["Assommant"],
    "fragility": 3,
    "quality": "faible_qualite",
    "ranged": false
  },
  {
    "id": "marteau_darmes",
    "name": "Marteau d'armes",
    "category": "lourde",
    "damage": "1d8",
    "souffleModifier": 1,
    "specialEffects": ["Assommant"],
    "fragility": 4,
    "quality": "standard",
    "ranged": false
  },
  {
    "id": "lance_en_frene",
    "name": "Lance en frene",
    "category": "moyenne",
    "damage": "1d6",
    "souffleModifier": 0,
    "specialEffects": ["Longue Portee (+1 ST)"],
    "fragility": 3,
    "quality": "standard",
    "ranged": false
  },
  {
    "id": "hallebarde",
    "name": "Hallebarde",
    "category": "lourde",
    "damage": "1d8",
    "souffleModifier": 1,
    "specialEffects": ["Longue Portee", "Brise-Bouclier"],
    "fragility": 3,
    "quality": "chef_doeuvre",
    "ranged": false
  },
  {
    "id": "fleau_darme",
    "name": "Fleau d'arme",
    "category": "lourde",
    "damage": "1d8",
    "souffleModifier": 1,
    "specialEffects": ["Assommant", "Brise-Bouclier"],
    "fragility": 2,
    "quality": "faible_qualite",
    "ranged": false
  },
  {
    "id": "glaive_militaire",
    "name": "Glaive militaire",
    "category": "moyenne",
    "damage": "1d6",
    "souffleModifier": 0,
    "specialEffects": ["Escrime"],
    "fragility": 4,
    "quality": "chef_doeuvre",
    "ranged": false
  },
  {
    "id": "baionnette_artisanale",
    "name": "Baionnette artisanale",
    "category": "legere",
    "damage": "1d4",
    "souffleModifier": -1,
    "specialEffects": ["Perforant 2"],
    "fragility": 2,
    "quality": "faible_qualite",
    "ranged": false
  },
  {
    "id": "pique_rouillee",
    "name": "Pique rouillee",
    "category": "lourde",
    "damage": "1d8",
    "souffleModifier": 1,
    "specialEffects": ["Longue Portee"],
    "fragility": 2,
    "quality": "faible_qualite",
    "ranged": false
  },
  {
    "id": "arc_court",
    "name": "Arc court",
    "category": "legere",
    "damage": "1d4",
    "souffleModifier": -1,
    "specialEffects": ["Silencieux : +1 au ST dans la penombre"],
    "fragility": 3,
    "quality": "standard",
    "ranged": true
  },
  {
    "id": "arc_long",
    "name": "Arc long",
    "category": "moyenne",
    "damage": "1d6",
    "souffleModifier": 0,
    "specialEffects": ["Tension : relancer un test rate 1x/jour"],
    "fragility": 2,
    "quality": "standard",
    "ranged": true
  },
  {
    "id": "arbalete_a_manivelle",
    "name": "Arbalete a manivelle",
    "category": "moyenne",
    "damage": "1d6+1",
    "souffleModifier": 0,
    "specialEffects": ["Lente : necessite Special pour recharger"],
    "fragility": 3,
    "quality": "standard",
    "ranged": true
  },
  {
    "id": "arbalete_lourde",
    "name": "Arbalete lourde",
    "category": "lourde",
    "damage": "1d8",
    "souffleModifier": 1,
    "specialEffects": ["Perforant 2", "Lente"],
    "fragility": 2,
    "quality": "standard",
    "ranged": true
  },
  {
    "id": "mousquet_a_silex",
    "name": "Mousquet a silex",
    "category": "lourde",
    "damage": "1d8+1",
    "souffleModifier": 1,
    "specialEffects": ["Deflagration : fait fuir les ennemis faibles"],
    "fragility": 1,
    "quality": "faible_qualite",
    "ranged": true
  },
  {
    "id": "tromblon_modifie",
    "name": "Tromblon modifie",
    "category": "lourde",
    "damage": "2d4",
    "souffleModifier": 1,
    "specialEffects": ["Disperse : touche 2 cibles proches"],
    "fragility": 2,
    "quality": "chef_doeuvre",
    "ranged": true
  },
  {
    "id": "pistolet_rouille",
    "name": "Pistolet rouille",
    "category": "legere",
    "damage": "1d4",
    "souffleModifier": -1,
    "specialEffects": ["Instable : 1 sur 6 -> explose, inflige 1d4"],
    "fragility": 2,
    "quality": "faible_qualite",
    "ranged": true
  },
  {
    "id": "lance_pieux_manuel",
    "name": "Lance-pieux manuel",
    "category": "moyenne",
    "damage": "1d6+1",
    "souffleModifier": 0,
    "specialEffects": ["Brise-Bouclier", "Perforant 1"],
    "fragility": 3,
    "quality": "standard",
    "ranged": true
  }
]
```

- [ ] **Step 3: Create src/data/weapons.ts**

```typescript
import type { WeaponDefinition } from '../models/weapon'
import weaponsData from './weapons.json'

export const allWeapons = weaponsData as WeaponDefinition[]

export function getWeaponById(id: string): WeaponDefinition | undefined {
  return allWeapons.find(w => w.id === id)
}
```

- [ ] **Step 4: Verify compilation**

```bash
npx vue-tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/models/weapon.ts src/data/weapons.json src/data/weapons.ts
git commit -m "feat: add weapon types and JSON data for all base and ranged weapons"
```

---

### Task 2: useInventory Composable (TDD)

**Files:**
- Create: `src/composables/useInventory.ts`
- Test: `src/__tests__/useInventory.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/useInventory.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useInventory } from '../composables/useInventory'
import { createEmptyCharacter } from '../models/character'

describe('useInventory', () => {
  function setup() {
    const character = ref(createEmptyCharacter('test-id', 'Test'))
    return { character, ...useInventory(character) }
  }

  it('starts with empty inventory', () => {
    const { items } = setup()
    expect(items.value).toEqual([])
  })

  it('adds a weapon from the rulebook', () => {
    const { items, addWeapon } = setup()
    addWeapon('epee_courte')
    expect(items.value).toHaveLength(1)
    expect(items.value[0].weaponId).toBe('epee_courte')
    expect(items.value[0].currentFragility).toBe(4)
    expect(items.value[0].traits).toEqual([])
  })

  it('adds a custom item', () => {
    const { items, addCustomItem } = setup()
    addCustomItem('Torche', 'Une torche allumee')
    expect(items.value).toHaveLength(1)
    expect(items.value[0].customName).toBe('Torche')
    expect(items.value[0].customDescription).toBe('Une torche allumee')
  })

  it('removes an item', () => {
    const { items, addWeapon, removeItem } = setup()
    addWeapon('epee_courte')
    const itemId = items.value[0].id
    removeItem(itemId)
    expect(items.value).toHaveLength(0)
  })

  it('updates fragility', () => {
    const { items, addWeapon, updateFragility } = setup()
    addWeapon('epee_courte')
    const itemId = items.value[0].id
    updateFragility(itemId, -1)
    expect(items.value[0].currentFragility).toBe(3)
  })

  it('does not let fragility go below 0', () => {
    const { items, addWeapon, updateFragility } = setup()
    addWeapon('dague_rouillee') // fragility 2
    const itemId = items.value[0].id
    updateFragility(itemId, -5)
    expect(items.value[0].currentFragility).toBe(0)
  })

  it('adds a trait to an item', () => {
    const { items, addWeapon, addTrait } = setup()
    addWeapon('epee_courte')
    const itemId = items.value[0].id
    addTrait(itemId, 'RUDIMENTAIRE')
    expect(items.value[0].traits).toEqual(['RUDIMENTAIRE'])
  })

  it('removes a trait from an item', () => {
    const { items, addWeapon, addTrait, removeTrait } = setup()
    addWeapon('epee_courte')
    const itemId = items.value[0].id
    addTrait(itemId, 'RUDIMENTAIRE')
    removeTrait(itemId, 'RUDIMENTAIRE')
    expect(items.value[0].traits).toEqual([])
  })

  it('can add multiple weapons', () => {
    const { items, addWeapon } = setup()
    addWeapon('epee_courte')
    addWeapon('dague_rouillee')
    expect(items.value).toHaveLength(2)
    expect(items.value[0].weaponId).toBe('epee_courte')
    expect(items.value[1].weaponId).toBe('dague_rouillee')
  })

  it('each item gets a unique id', () => {
    const { items, addWeapon } = setup()
    addWeapon('epee_courte')
    addWeapon('epee_courte')
    expect(items.value[0].id).not.toBe(items.value[1].id)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/useInventory.test.ts
```

- [ ] **Step 3: Implement useInventory**

Create `src/composables/useInventory.ts`:

```typescript
import { computed, type Ref } from 'vue'
import type { Character, InventoryItem } from '../models/character'
import { getWeaponById } from '../data/weapons'

export function useInventory(character: Ref<Character>) {
  const items = computed(() => character.value.inventory)

  function addWeapon(weaponId: string): void {
    const weapon = getWeaponById(weaponId)
    if (!weapon) return

    const item: InventoryItem = {
      id: crypto.randomUUID(),
      weaponId,
      traits: [],
      currentFragility: weapon.fragility,
    }
    character.value.inventory.push(item)
    character.value.updatedAt = Date.now()
  }

  function addCustomItem(name: string, description: string): void {
    const item: InventoryItem = {
      id: crypto.randomUUID(),
      customName: name,
      customDescription: description,
      traits: [],
      currentFragility: 0,
    }
    character.value.inventory.push(item)
    character.value.updatedAt = Date.now()
  }

  function removeItem(itemId: string): void {
    character.value.inventory = character.value.inventory.filter(i => i.id !== itemId)
    character.value.updatedAt = Date.now()
  }

  function updateFragility(itemId: string, delta: number): void {
    const item = character.value.inventory.find(i => i.id === itemId)
    if (!item) return
    item.currentFragility = Math.max(0, item.currentFragility + delta)
    character.value.updatedAt = Date.now()
  }

  function addTrait(itemId: string, trait: string): void {
    const item = character.value.inventory.find(i => i.id === itemId)
    if (!item) return
    if (!item.traits.includes(trait)) {
      item.traits.push(trait)
      character.value.updatedAt = Date.now()
    }
  }

  function removeTrait(itemId: string, trait: string): void {
    const item = character.value.inventory.find(i => i.id === itemId)
    if (!item) return
    item.traits = item.traits.filter(t => t !== trait)
    character.value.updatedAt = Date.now()
  }

  return {
    items,
    addWeapon,
    addCustomItem,
    removeItem,
    updateFragility,
    addTrait,
    removeTrait,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/useInventory.test.ts
```

Expected: All 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useInventory.ts src/__tests__/useInventory.test.ts
git commit -m "feat: add useInventory composable with TDD"
```

---

### Task 3: Inventory Route and View

**Files:**
- Modify: `src/router/index.ts`
- Modify: `src/views/CharacterInventory.vue` (create)

- [ ] **Step 1: Add route to router**

Add to `src/router/index.ts` after the edit route:

```typescript
{
  path: '/character/:id/inventory',
  name: 'character-inventory',
  component: () => import('../views/CharacterInventory.vue'),
  props: true,
},
```

- [ ] **Step 2: Create CharacterInventory.vue**

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCharacterStore } from '../stores/characterStore'
import { useInventory } from '../composables/useInventory'
import { allWeapons, getWeaponById } from '../data/weapons'
import type { InventoryItem } from '../models/character'

const route = useRoute()
const router = useRouter()
const store = useCharacterStore()

const characterId = route.params.id as string
const character = computed(() => store.characters.find(c => c.id === characterId))

// Writable ref synced with store
const characterRef = ref(character.value!)
watch(character, (val) => { if (val) characterRef.value = val }, { deep: true })

const { items, addWeapon, addCustomItem, removeItem, updateFragility, addTrait, removeTrait } =
  useInventory(characterRef)

// Weapon selector
const selectedWeaponId = ref('')
function addSelectedWeapon() {
  if (!selectedWeaponId.value) return
  addWeapon(selectedWeaponId.value)
  // Persist to store
  store.updateCharacter(characterId, { inventory: [...characterRef.value.inventory] })
  selectedWeaponId.value = ''
}

// Custom item form
const customName = ref('')
const customDescription = ref('')
function addCustom() {
  if (!customName.value.trim()) return
  addCustomItem(customName.value.trim(), customDescription.value.trim())
  store.updateCharacter(characterId, { inventory: [...characterRef.value.inventory] })
  customName.value = ''
  customDescription.value = ''
}

function removeInventoryItem(itemId: string) {
  removeItem(itemId)
  store.updateCharacter(characterId, { inventory: [...characterRef.value.inventory] })
}

function changeFragility(itemId: string, delta: number) {
  updateFragility(itemId, delta)
  store.updateCharacter(characterId, { inventory: [...characterRef.value.inventory] })
}

// Trait management
const newTraitInputs = ref<Record<string, string>>({})
function addItemTrait(itemId: string) {
  const trait = newTraitInputs.value[itemId]?.trim()
  if (!trait) return
  addTrait(itemId, trait)
  store.updateCharacter(characterId, { inventory: [...characterRef.value.inventory] })
  newTraitInputs.value[itemId] = ''
}

function removeItemTrait(itemId: string, trait: string) {
  removeTrait(itemId, trait)
  store.updateCharacter(characterId, { inventory: [...characterRef.value.inventory] })
}

function getItemName(item: InventoryItem): string {
  if (item.customName) return item.customName
  if (item.weaponId) {
    const weapon = getWeaponById(item.weaponId)
    return weapon?.name ?? item.weaponId
  }
  return 'Objet inconnu'
}

function getItemDetails(item: InventoryItem) {
  if (!item.weaponId) return null
  return getWeaponById(item.weaponId)
}

const qualityLabels: Record<string, string> = {
  faible_qualite: 'Faible Qualite',
  standard: 'Standard',
  chef_doeuvre: "Chef-d'oeuvre",
}
</script>

<template>
  <div class="character-inventory" v-if="character">
    <header>
      <h1>Inventaire — {{ character.name }}</h1>
      <div class="actions">
        <router-link :to="`/character/${characterId}`">Retour a la fiche</router-link>
      </div>
    </header>

    <!-- Add weapon from rulebook -->
    <section class="add-weapon">
      <h2>Ajouter une arme</h2>
      <div class="weapon-selector">
        <select v-model="selectedWeaponId">
          <option value="">-- Choisir une arme --</option>
          <optgroup label="Armes de melee">
            <option v-for="w in allWeapons.filter(w => !w.ranged)" :key="w.id" :value="w.id">
              {{ w.name }} ({{ w.damage }}, {{ w.category }})
            </option>
          </optgroup>
          <optgroup label="Armes a distance">
            <option v-for="w in allWeapons.filter(w => w.ranged)" :key="w.id" :value="w.id">
              {{ w.name }} ({{ w.damage }}, {{ w.category }})
            </option>
          </optgroup>
        </select>
        <button @click="addSelectedWeapon" :disabled="!selectedWeaponId">Ajouter</button>
      </div>
    </section>

    <!-- Add custom item -->
    <section class="add-custom">
      <h2>Ajouter un objet</h2>
      <div class="custom-form">
        <input v-model="customName" type="text" placeholder="Nom de l'objet" />
        <input v-model="customDescription" type="text" placeholder="Description (optionnel)" />
        <button @click="addCustom" :disabled="!customName.trim()">Ajouter</button>
      </div>
    </section>

    <!-- Inventory list -->
    <section class="inventory-list">
      <h2>Objets ({{ items.length }})</h2>

      <p v-if="items.length === 0">Inventaire vide.</p>

      <div v-for="item in items" :key="item.id" class="inventory-item">
        <div class="item-header">
          <strong>{{ getItemName(item) }}</strong>
          <button @click="removeInventoryItem(item.id)">Supprimer</button>
        </div>

        <!-- Weapon details -->
        <div v-if="getItemDetails(item)" class="weapon-details">
          <span>Degats : {{ getItemDetails(item)!.damage }}</span>
          <span>Categorie : {{ getItemDetails(item)!.category }}</span>
          <span>Qualite : {{ qualityLabels[getItemDetails(item)!.quality] ?? getItemDetails(item)!.quality }}</span>
          <span v-if="getItemDetails(item)!.souffleModifier !== 0">
            Souffle : {{ getItemDetails(item)!.souffleModifier > 0 ? '+' : '' }}{{ getItemDetails(item)!.souffleModifier }}
          </span>
          <div v-if="getItemDetails(item)!.specialEffects.length > 0" class="effects">
            Effets : {{ getItemDetails(item)!.specialEffects.join(', ') }}
          </div>
        </div>

        <!-- Custom item description -->
        <div v-if="item.customDescription" class="custom-description">
          <p>{{ item.customDescription }}</p>
        </div>

        <!-- Fragility tracker -->
        <div class="fragility" v-if="item.weaponId">
          <span>Fragilite : {{ item.currentFragility }}</span>
          <button @click="changeFragility(item.id, -1)" :disabled="item.currentFragility <= 0">-</button>
          <button @click="changeFragility(item.id, 1)">+</button>
          <span v-if="item.currentFragility === 0" class="broken">Emoussee / Inutilisable</span>
        </div>

        <!-- Traits -->
        <div class="traits">
          <span v-for="trait in item.traits" :key="trait" class="trait">
            {{ trait }}
            <button @click="removeItemTrait(item.id, trait)">x</button>
          </span>
          <div class="add-trait">
            <input
              v-model="newTraitInputs[item.id]"
              type="text"
              placeholder="Ajouter un trait"
              @keyup.enter="addItemTrait(item.id)"
            />
            <button @click="addItemTrait(item.id)">+</button>
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

- [ ] **Step 3: Add inventory link to CharacterSheet**

In `src/views/CharacterSheet.vue`, add a link in the header actions:

```html
<router-link :to="`/character/${characterId}/inventory`">Inventaire</router-link>
```

- [ ] **Step 4: Verify build**

```bash
npx vue-tsc --noEmit && npm run test && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/router/index.ts src/views/CharacterInventory.vue src/views/CharacterSheet.vue
git commit -m "feat: implement CharacterInventory view with weapon management"
```

---

### Task 4: Final Verification

- [ ] **Step 1: Run all tests**

```bash
npm run test
```

Expected: All tests pass (42 previous + 10 new = 52).

- [ ] **Step 2: Type check + build**

```bash
npx vue-tsc --noEmit && npm run build
```

- [ ] **Step 3: Commit if needed**

Only commit if there are uncommitted changes.
