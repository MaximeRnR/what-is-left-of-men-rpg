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
  <div class="min-h-dvh bg-background px-4 py-6 max-w-2xl mx-auto" v-if="character">
    <header class="mb-6">
      <div class="flex items-center justify-between mb-2">
        <router-link :to="`/character/${characterId}`" class="text-secondary text-xs font-label uppercase tracking-widest inline-flex items-center gap-1">
          <span class="material-symbols-outlined text-sm">arrow_back</span> Retour a la fiche
        </router-link>
        <button class="danger" @click="resetToMax">
          <span class="material-symbols-outlined text-sm">restart_alt</span> Reinitialiser
        </button>
      </div>
      <h1 class="font-headline text-2xl uppercase tracking-wider text-on-surface">Combat — {{ character.name }}</h1>
      <div class="border-t border-outline-variant mt-3"></div>
    </header>

    <!-- HP -->
    <section class="bg-surface-container border border-outline-variant p-4 mb-4">
      <h2 class="mb-3">Points de Sante (PS)</h2>
      <div class="flex items-baseline gap-2 mb-3">
        <span class="die-display text-primary">{{ currentHP }}</span>
        <span class="text-on-surface-variant text-lg">/</span>
        <span class="font-headline text-on-surface-variant text-lg">{{ stats.maxHP.value }}</span>
      </div>
      <div class="h-1 bg-surface-container-lowest mb-3">
        <div class="stat-bar-fill hp h-full" :style="{ width: stats.maxHP.value > 0 ? `${(currentHP / stats.maxHP.value) * 100}%` : '0%' }"></div>
      </div>
      <div class="flex items-center gap-2">
        <input v-model.number="hpDelta" type="number" min="1" max="99" class="w-16 text-center" />
        <button class="danger flex-1" @click="modifyHP(-hpDelta)">
          <span class="material-symbols-outlined text-sm">remove</span> Degats
        </button>
        <button class="primary flex-1" @click="modifyHP(hpDelta)">
          <span class="material-symbols-outlined text-sm">add</span> Soins
        </button>
      </div>
    </section>

    <!-- Sanity -->
    <section class="bg-surface-container border border-outline-variant p-4 mb-4">
      <h2 class="mb-3">Sante Mentale (PSM)</h2>
      <div class="flex items-baseline gap-2 mb-3">
        <span class="die-display text-secondary">{{ currentSanity }}</span>
        <span class="text-on-surface-variant text-lg">/</span>
        <span class="font-headline text-on-surface-variant text-lg">{{ stats.maxSanity.value }}</span>
      </div>
      <div class="h-1 bg-surface-container-lowest mb-3">
        <div class="stat-bar-fill sanity h-full" :style="{ width: stats.maxSanity.value > 0 ? `${(currentSanity / stats.maxSanity.value) * 100}%` : '0%' }"></div>
      </div>
      <div class="flex items-center gap-2">
        <input v-model.number="sanityDelta" type="number" min="1" max="99" class="w-16 text-center" />
        <button class="danger flex-1" @click="modifySanity(-sanityDelta)">
          <span class="material-symbols-outlined text-sm">remove</span> Perte
        </button>
        <button class="primary flex-1" @click="modifySanity(sanityDelta)">
          <span class="material-symbols-outlined text-sm">add</span> Recup
        </button>
      </div>
    </section>

    <!-- Souffle -->
    <section class="bg-surface-container border border-outline-variant p-4 mb-4">
      <h2 class="mb-3">Souffle</h2>
      <div class="flex items-baseline gap-2 mb-3">
        <span class="die-display text-tertiary">{{ currentSouffle }}</span>
        <span class="text-on-surface-variant text-lg">/</span>
        <span class="font-headline text-on-surface-variant text-lg">{{ stats.maxSouffle.value }}</span>
      </div>
      <div class="h-1 bg-surface-container-lowest mb-3">
        <div class="stat-bar-fill souffle h-full" :style="{ width: stats.maxSouffle.value > 0 ? `${(currentSouffle / stats.maxSouffle.value) * 100}%` : '0%' }"></div>
      </div>
      <div class="flex items-center gap-2">
        <input v-model.number="souffleDelta" type="number" min="1" max="99" class="w-16 text-center" />
        <button class="danger flex-1" @click="modifySouffle(-souffleDelta)">
          <span class="material-symbols-outlined text-sm">remove</span> Depense
        </button>
        <button class="primary flex-1" @click="modifySouffle(souffleDelta)">
          <span class="material-symbols-outlined text-sm">add</span> Recup
        </button>
      </div>
    </section>

    <!-- Active Effects -->
    <section class="bg-surface-container border border-outline-variant p-4 mb-4">
      <h2 class="mb-3">Etats actifs</h2>

      <div v-if="activeEffects.length === 0" class="text-on-surface-variant text-sm py-4 text-center">
        Aucun etat actif.
      </div>

      <div v-else class="flex flex-wrap gap-1 mb-3">
        <span v-for="effect in activeEffects" :key="effect" class="tag error inline-flex items-center gap-1">
          {{ effect }}
          <button class="border-0 bg-transparent text-error p-0 text-xs hover:text-on-error-container" @click="removeEffect(effect)">x</button>
        </span>
        <button v-if="activeEffects.length > 0" class="danger text-xs" @click="clearEffects">
          Tout retirer
        </button>
      </div>

      <div class="flex gap-2 mb-3">
        <input
          v-model="newEffect"
          type="text"
          placeholder="Ajouter un etat..."
          class="flex-1"
          @keyup.enter="submitEffect"
        />
        <button class="primary shrink-0" @click="submitEffect" :disabled="!newEffect.trim()">
          <span class="material-symbols-outlined text-sm">add</span> Ajouter
        </button>
      </div>

      <div class="pt-3 border-t border-outline-variant">
        <span class="font-label text-xs uppercase tracking-widest text-on-surface-variant mr-2">Etats courants :</span>
        <div class="flex flex-wrap gap-1 mt-2">
          <button
            v-for="effect in commonEffects"
            :key="effect"
            class="text-xs"
            @click="addEffect(effect)"
            :disabled="activeEffects.includes(effect)"
          >
            {{ effect }}
          </button>
        </div>
      </div>
    </section>
  </div>

  <div v-else class="min-h-dvh bg-background px-4 py-6 max-w-2xl mx-auto">
    <p class="text-on-surface-variant">Personnage introuvable.</p>
    <router-link to="/" class="text-secondary text-xs font-label uppercase tracking-widest">Retour</router-link>
  </div>
</template>
