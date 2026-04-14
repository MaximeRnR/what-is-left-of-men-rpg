<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCharacterStore } from '../stores/characterStore'
import type { Ability } from '../models/character'

const route = useRoute()
const store = useCharacterStore()

const characterId = route.params.id as string
const character = computed(() => store.characters.find(c => c.id === characterId))

const characterRef = ref(character.value!)
watch(character, (val) => { if (val) characterRef.value = val }, { deep: true })

const abilities = computed(() => characterRef.value.abilities ?? [])

// Form
const showForm = ref(false)
const formTitle = ref('')
const formDescription = ref('')

function addAbility() {
  if (!formTitle.value.trim()) return
  const ability: Ability = {
    id: crypto.randomUUID(),
    title: formTitle.value.trim(),
    description: formDescription.value.trim(),
  }
  if (!characterRef.value.abilities) {
    characterRef.value.abilities = []
  }
  characterRef.value.abilities.push(ability)
  store.updateCharacter(characterId, { abilities: [...characterRef.value.abilities] })
  formTitle.value = ''
  formDescription.value = ''
  showForm.value = false
}

function removeAbility(id: string) {
  if (!confirm('Supprimer cette capacite ?')) return
  characterRef.value.abilities = characterRef.value.abilities.filter(a => a.id !== id)
  store.updateCharacter(characterId, { abilities: [...characterRef.value.abilities] })
}
</script>

<template>
  <div class="min-h-dvh bg-background px-4 py-6 max-w-2xl mx-auto" v-if="character">
    <header class="mb-6">
      <router-link :to="`/character/${characterId}`" class="text-secondary text-xs font-label uppercase tracking-widest inline-flex items-center gap-1 mb-2">
        <span class="material-symbols-outlined text-sm">arrow_back</span> Retour a la fiche
      </router-link>
      <h1 class="font-headline text-2xl uppercase tracking-wider text-on-surface">Capacites — {{ character.name }}</h1>
      <div class="border-t border-outline-variant mt-3"></div>
    </header>

    <!-- Ability list -->
    <section class="mb-6">
      <div v-if="abilities.length === 0" class="text-on-surface-variant text-sm py-8 text-center">
        Aucune capacite. Ajoutez-en une ci-dessous.
      </div>

      <div v-for="ability in abilities" :key="ability.id" class="bg-surface-container border border-outline-variant p-4 mb-2">
        <div class="flex items-start justify-between gap-2">
          <div>
            <h3 class="font-headline text-sm uppercase tracking-wider text-on-surface">{{ ability.title }}</h3>
            <p class="text-on-surface-variant text-sm mt-2 leading-relaxed whitespace-pre-line">{{ ability.description }}</p>
          </div>
          <button class="danger shrink-0" @click="removeAbility(ability.id)">
            <span class="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Add ability -->
    <section>
      <div class="flex items-center justify-between mb-3">
        <h2>Nouvelle capacite</h2>
        <button class="text-xs" @click="showForm = !showForm">
          <span class="material-symbols-outlined text-sm">{{ showForm ? 'expand_less' : 'expand_more' }}</span>
          {{ showForm ? 'Fermer' : 'Ouvrir' }}
        </button>
      </div>

      <div v-if="showForm" class="bg-surface-container border border-outline-variant p-4">
        <div class="mb-3">
          <label class="block mb-1">Titre</label>
          <input v-model="formTitle" type="text" placeholder="Nom de la capacite" />
        </div>
        <div class="mb-4">
          <label class="block mb-1">Description</label>
          <textarea v-model="formDescription" rows="4" placeholder="Decrivez l'effet de cette capacite..."></textarea>
        </div>
        <button class="primary w-full" @click="addAbility" :disabled="!formTitle.trim()">
          <span class="material-symbols-outlined text-sm">add</span> Ajouter la capacite
        </button>
      </div>
    </section>
  </div>

  <div v-else class="min-h-dvh bg-background px-4 py-6 max-w-2xl mx-auto">
    <p class="text-on-surface-variant">Personnage introuvable.</p>
    <router-link to="/" class="text-secondary text-xs font-label uppercase tracking-widest">Retour</router-link>
  </div>
</template>
