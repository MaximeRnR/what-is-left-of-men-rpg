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
