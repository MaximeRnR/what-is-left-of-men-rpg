<script setup lang="ts">
import { ref } from 'vue'
import { useCharacterStore } from '../stores/characterStore'
import { useRouter } from 'vue-router'

const store = useCharacterStore()
const router = useRouter()
const fileInput = ref<HTMLInputElement | null>(null)

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

function triggerImport() {
  fileInput.value?.click()
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    let parsed: unknown
    try {
      parsed = JSON.parse(reader.result as string)
    } catch {
      alert("Fichier invalide : le contenu n'est pas du JSON valide.")
      input.value = ''
      return
    }
    try {
      const newId = store.importCharacter(parsed)
      input.value = ''
      router.push(`/character/${newId}`)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      alert('Fichier invalide : ' + message)
      input.value = ''
    }
  }
  reader.onerror = () => {
    alert('Impossible de lire le fichier.')
    input.value = ''
  }
  reader.readAsText(file)
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

    <div class="mt-8 grid grid-cols-2 gap-2">
      <button class="primary py-3" @click="createNew">
        <span class="material-symbols-outlined text-sm mr-1">add</span>
        Nouveau
      </button>
      <button class="py-3" @click="triggerImport">
        <span class="material-symbols-outlined text-sm mr-1">upload</span>
        Importer
      </button>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept=".json,application/json"
      class="hidden"
      @change="onFileSelected"
    />
  </div>
</template>
