<script setup lang="ts">
import { useCharacterStore } from '../stores/characterStore'
import { useRouter } from 'vue-router'

const store = useCharacterStore()
const router = useRouter()

function createNew() {
  router.push('/character/new')
}

function deleteCharacter(id: string) {
  const char = store.characters.find(c => c.id === id)
  if (!confirm(`Supprimer ${char?.name ?? 'ce personnage'} ?`)) return
  store.deleteCharacter(id)
}

function selectCharacter(id: string) {
  store.setActiveCharacter(id)
  router.push(`/character/${id}`)
}
</script>

<template>
  <div class="min-h-dvh bg-background px-4 py-6 max-w-2xl mx-auto">
    <header class="mb-8">
      <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1">CONTAGION_OS</p>
      <h1 class="font-headline text-2xl uppercase tracking-wider text-on-surface">Personnages</h1>
      <div class="border-t border-outline-variant mt-3"></div>
    </header>

    <p v-if="store.characters.length === 0" class="text-on-surface-variant text-sm py-12 text-center">
      Aucun personnage. Creez-en un pour commencer.
    </p>

    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="char in store.characters"
        :key="char.id"
        @click="selectCharacter(char.id)"
        class="flex items-center justify-between bg-surface-container border border-outline-variant px-4 py-3 cursor-pointer hover:bg-surface-container-high transition-colors"
      >
        <span class="font-headline uppercase tracking-wider text-on-surface">{{ char.name }}</span>
        <button class="danger" @click.stop="deleteCharacter(char.id)">
          <span class="material-symbols-outlined text-sm mr-1">delete</span>
          Supprimer
        </button>
      </li>
    </ul>

    <div class="mt-8">
      <button class="primary w-full py-3" @click="createNew">
        <span class="material-symbols-outlined text-sm mr-1">add</span>
        Nouveau Personnage
      </button>
    </div>
  </div>
</template>
