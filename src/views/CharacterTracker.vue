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
