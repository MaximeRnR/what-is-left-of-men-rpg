<script setup lang="ts">
import { useCharacterStore } from '../stores/characterStore'
import { useRouter } from 'vue-router'

const store = useCharacterStore()
const router = useRouter()

function createNew() {
  router.push('/character/new')
}

function deleteCharacter(id: string) {
  store.deleteCharacter(id)
}

function selectCharacter(id: string) {
  store.setActiveCharacter(id)
  // Phase 2 will navigate to /character/:id
}
</script>

<template>
  <div class="character-list">
    <header>
      <h1>Personnages</h1>
      <button @click="createNew">Nouveau Personnage</button>
    </header>

    <p v-if="store.characters.length === 0">
      Aucun personnage. Creez-en un pour commencer.
    </p>

    <ul v-else>
      <li
        v-for="char in store.characters"
        :key="char.id"
        @click="selectCharacter(char.id)"
      >
        <span class="name">{{ char.name }}</span>
        <button @click.stop="deleteCharacter(char.id)">Supprimer</button>
      </li>
    </ul>
  </div>
</template>
