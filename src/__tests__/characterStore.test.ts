import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCharacterStore } from '../stores/characterStore'

describe('useCharacterStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('starts with empty characters', () => {
    const store = useCharacterStore()
    expect(store.characters).toEqual([])
    expect(store.activeCharacterId).toBeNull()
  })

  it('creates a character', () => {
    const store = useCharacterStore()
    const char = store.createCharacter('Jean')
    expect(char.name).toBe('Jean')
    expect(store.characters).toHaveLength(1)
    expect(store.characters[0].id).toBe(char.id)
  })

  it('deletes a character', () => {
    const store = useCharacterStore()
    const char = store.createCharacter('Jean')
    store.deleteCharacter(char.id)
    expect(store.characters).toHaveLength(0)
  })

  it('sets active character', () => {
    const store = useCharacterStore()
    const char = store.createCharacter('Jean')
    store.setActiveCharacter(char.id)
    expect(store.activeCharacterId).toBe(char.id)
    expect(store.activeCharacter?.name).toBe('Jean')
  })

  it('updates a character', () => {
    const store = useCharacterStore()
    const char = store.createCharacter('Jean')
    store.updateCharacter(char.id, { name: 'Pierre' })
    expect(store.characters[0].name).toBe('Pierre')
  })

  it('duplicates a character', () => {
    const store = useCharacterStore()
    const char = store.createCharacter('Jean')
    const dupe = store.duplicateCharacter(char.id)
    expect(dupe.name).toBe('Jean (copie)')
    expect(dupe.id).not.toBe(char.id)
    expect(store.characters).toHaveLength(2)
  })

  it('persists to localStorage on change', () => {
    const store = useCharacterStore()
    store.createCharacter('Jean')
    const saved = localStorage.getItem('contagion-characters')
    expect(saved).not.toBeNull()
    const parsed = JSON.parse(saved!)
    expect(parsed.characters).toHaveLength(1)
  })

  it('hydrates from localStorage on init', () => {
    const store1 = useCharacterStore()
    store1.createCharacter('Jean')

    setActivePinia(createPinia())
    const store2 = useCharacterStore()
    expect(store2.characters).toHaveLength(1)
    expect(store2.characters[0].name).toBe('Jean')
  })

  it('clears active character when deleted', () => {
    const store = useCharacterStore()
    const char = store.createCharacter('Jean')
    store.setActiveCharacter(char.id)
    store.deleteCharacter(char.id)
    expect(store.activeCharacterId).toBeNull()
  })
})
