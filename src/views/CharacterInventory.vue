<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCharacterStore } from '../stores/characterStore'
import { useInventory } from '../composables/useInventory'
import { allWeapons, getWeaponById } from '../data/weapons'
import type { InventoryItem } from '../models/character'

const route = useRoute()
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
  <div class="min-h-dvh bg-background px-4 py-6 max-w-2xl mx-auto" v-if="character">
    <header class="mb-6">
      <router-link :to="`/character/${characterId}`" class="text-secondary text-xs font-label uppercase tracking-widest inline-flex items-center gap-1 mb-2">
        <span class="material-symbols-outlined text-sm">arrow_back</span> Retour a la fiche
      </router-link>
      <h1 class="font-headline text-2xl uppercase tracking-wider text-on-surface">Inventaire — {{ character.name }}</h1>
      <div class="border-t border-outline-variant mt-3"></div>
    </header>

    <!-- Add weapon from rulebook -->
    <section class="mb-6">
      <h2 class="mb-3">Ajouter une arme</h2>
      <div class="flex gap-2">
        <select v-model="selectedWeaponId" class="flex-1">
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
        <button class="primary shrink-0" @click="addSelectedWeapon" :disabled="!selectedWeaponId">
          <span class="material-symbols-outlined text-sm">add</span> Ajouter
        </button>
      </div>
    </section>

    <!-- Add custom item -->
    <section class="mb-6">
      <h2 class="mb-3">Ajouter un objet</h2>
      <div class="flex gap-2 flex-wrap">
        <input v-model="customName" type="text" placeholder="Nom de l'objet" class="flex-1 min-w-[150px]" />
        <input v-model="customDescription" type="text" placeholder="Description (optionnel)" class="flex-1 min-w-[150px]" />
        <button class="primary shrink-0" @click="addCustom" :disabled="!customName.trim()">
          <span class="material-symbols-outlined text-sm">add</span> Ajouter
        </button>
      </div>
    </section>

    <!-- Inventory list -->
    <section>
      <h2 class="mb-3">Objets ({{ items.length }})</h2>

      <p v-if="items.length === 0" class="text-on-surface-variant text-sm py-8 text-center">Inventaire vide.</p>

      <div v-for="item in items" :key="item.id" class="bg-surface-container border border-outline-variant p-4 mb-2">
        <div class="flex items-center justify-between mb-2">
          <strong class="text-on-surface">{{ getItemName(item) }}</strong>
          <button class="danger" @click="removeInventoryItem(item.id)">
            <span class="material-symbols-outlined text-sm">delete</span> Supprimer
          </button>
        </div>

        <!-- Weapon details -->
        <div v-if="getItemDetails(item)" class="flex flex-wrap gap-2 mb-2">
          <span class="tag primary">Degats : {{ getItemDetails(item)!.damage }}</span>
          <span class="tag">Categorie : {{ getItemDetails(item)!.category }}</span>
          <span class="tag secondary">Qualite : {{ qualityLabels[getItemDetails(item)!.quality] ?? getItemDetails(item)!.quality }}</span>
          <span v-if="getItemDetails(item)!.souffleModifier !== 0" class="tag">
            Souffle : {{ getItemDetails(item)!.souffleModifier > 0 ? '+' : '' }}{{ getItemDetails(item)!.souffleModifier }}
          </span>
          <div v-if="getItemDetails(item)!.specialEffects.length > 0" class="w-full text-on-surface-variant text-xs mt-1">
            Effets : {{ getItemDetails(item)!.specialEffects.join(', ') }}
          </div>
        </div>

        <!-- Custom item description -->
        <div v-if="item.customDescription" class="mb-2">
          <p class="text-on-surface-variant text-sm">{{ item.customDescription }}</p>
        </div>

        <!-- Fragility tracker -->
        <div v-if="item.weaponId" class="flex items-center gap-2 mb-2 pt-2 border-t border-outline-variant">
          <span class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Fragilite :</span>
          <span class="font-headline text-on-surface">{{ item.currentFragility }}</span>
          <button class="px-2 py-1" @click="changeFragility(item.id, -1)" :disabled="item.currentFragility <= 0">
            <span class="material-symbols-outlined text-sm">remove</span>
          </button>
          <button class="px-2 py-1" @click="changeFragility(item.id, 1)">
            <span class="material-symbols-outlined text-sm">add</span>
          </button>
          <span v-if="item.currentFragility === 0" class="tag error">Emoussee / Inutilisable</span>
        </div>

        <!-- Traits -->
        <div class="flex flex-wrap items-center gap-1 pt-2 border-t border-outline-variant">
          <span v-for="trait in item.traits" :key="trait" class="tag inline-flex items-center gap-1">
            {{ trait }}
            <button class="border-0 bg-transparent text-on-surface-variant p-0 text-xs hover:text-error" @click="removeItemTrait(item.id, trait)">x</button>
          </span>
          <div class="flex items-center gap-1 mt-1">
            <input
              v-model="newTraitInputs[item.id]"
              type="text"
              placeholder="Ajouter un trait"
              class="text-xs py-1 px-2 w-32"
              @keyup.enter="addItemTrait(item.id)"
            />
            <button class="px-2 py-1" @click="addItemTrait(item.id)">
              <span class="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>

  <div v-else class="min-h-dvh bg-background px-4 py-6 max-w-2xl mx-auto">
    <p class="text-on-surface-variant">Personnage introuvable.</p>
    <router-link to="/" class="text-secondary text-xs font-label uppercase tracking-widest">Retour</router-link>
  </div>
</template>
