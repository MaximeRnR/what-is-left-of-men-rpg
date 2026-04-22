import { defineStore } from 'pinia'
import { createEmptyCharacter } from '../models/character'
import type { Character } from '../models/character'

const STORAGE_KEY = 'contagion-characters'

interface CharacterStoreState {
  characters: Character[]
  activeCharacterId: string | null
}

function generateId(): string {
  return crypto.randomUUID()
}

function loadFromStorage(): CharacterStoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      return {
        characters: data.characters ?? [],
        activeCharacterId: data.activeCharacterId ?? null,
      }
    }
  } catch {
    // Corrupted data — start fresh
  }
  return { characters: [], activeCharacterId: null }
}

function saveToStorage(state: CharacterStoreState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    characters: state.characters,
    activeCharacterId: state.activeCharacterId,
  }))
}

export const useCharacterStore = defineStore('characters', {
  state: (): CharacterStoreState => loadFromStorage(),

  getters: {
    activeCharacter(state): Character | undefined {
      return state.characters.find(c => c.id === state.activeCharacterId)
    },
    characterList(state): { id: string; name: string }[] {
      return state.characters.map(c => ({ id: c.id, name: c.name }))
    },
  },

  actions: {
    createCharacter(name: string): Character {
      const char = createEmptyCharacter(generateId(), name)
      this.characters.push(char)
      this._persist()
      return char
    },

    updateCharacter(id: string, patch: Partial<Character>): void {
      const index = this.characters.findIndex(c => c.id === id)
      if (index === -1) return
      Object.assign(this.characters[index], patch, { updatedAt: Date.now() })
      this._persist()
    },

    deleteCharacter(id: string): void {
      this.characters = this.characters.filter(c => c.id !== id)
      if (this.activeCharacterId === id) {
        this.activeCharacterId = null
      }
      this._persist()
    },

    setActiveCharacter(id: string): void {
      this.activeCharacterId = id
      this._persist()
    },

    duplicateCharacter(id: string): Character {
      const original = this.characters.find(c => c.id === id)
      if (!original) throw new Error(`Character ${id} not found`)
      const dupe: Character = JSON.parse(JSON.stringify(original))
      dupe.id = generateId()
      dupe.name = `${original.name} (copie)`
      dupe.createdAt = Date.now()
      dupe.updatedAt = Date.now()
      this.characters.push(dupe)
      this._persist()
      return dupe
    },

    importCharacter(data: unknown): string {
      if (data === null || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('le fichier doit contenir un objet personnage')
      }
      const obj = data as Record<string, unknown>
      if (typeof obj.name !== 'string' || obj.name.trim() === '') {
        throw new Error("le champ 'name' est manquant ou vide")
      }
      const char = createEmptyCharacter(generateId(), obj.name.trim())
      this.characters.push(char)
      this._persist()
      return char.id
    },

    _persist(): void {
      saveToStorage({ characters: this.characters, activeCharacterId: this.activeCharacterId })
    },
  },
})
