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

  it('imports a character with only a name', () => {
    const store = useCharacterStore()
    const id = store.importCharacter({ name: 'Alice' })
    expect(store.characters).toHaveLength(1)
    const imported = store.characters[0]
    expect(imported.id).toBe(id)
    expect(imported.name).toBe('Alice')
    expect(imported.skills.martial).toEqual({ pointsSpent: 0 })
    expect(imported.tracker).toEqual({ currentHP: 10, currentSanity: 10, currentSouffle: 10, activeEffects: [] })
    expect(imported.inventory).toEqual([])
    expect(imported.abilities).toEqual([])
  })

  it('regenerates id and timestamps on import', () => {
    const store = useCharacterStore()
    const id = store.importCharacter({
      id: 'fake-id-from-file',
      name: 'Bob',
      createdAt: 1000,
      updatedAt: 2000,
    })
    const imported = store.characters[0]
    expect(imported.id).toBe(id)
    expect(imported.id).not.toBe('fake-id-from-file')
    expect(imported.createdAt).toBeGreaterThan(2000)
    expect(imported.updatedAt).toBeGreaterThan(2000)
  })

  it('throws on non-object data', () => {
    const store = useCharacterStore()
    expect(() => store.importCharacter(null)).toThrow()
    expect(() => store.importCharacter('string')).toThrow()
    expect(() => store.importCharacter([1, 2, 3])).toThrow()
    expect(() => store.importCharacter(42)).toThrow()
  })

  it('throws on missing or empty name', () => {
    const store = useCharacterStore()
    expect(() => store.importCharacter({})).toThrow(/name/)
    expect(() => store.importCharacter({ name: '' })).toThrow(/name/)
    expect(() => store.importCharacter({ name: '   ' })).toThrow(/name/)
    expect(() => store.importCharacter({ name: 42 })).toThrow(/name/)
  })

  it('trims the name on import', () => {
    const store = useCharacterStore()
    store.importCharacter({ name: '  Charlie  ' })
    expect(store.characters[0].name).toBe('Charlie')
  })

  it('merges story when present as string', () => {
    const store = useCharacterStore()
    store.importCharacter({ name: 'Dina', story: 'Un vieux soldat.' })
    expect(store.characters[0].story).toBe('Un vieux soldat.')
  })

  it('ignores story when not a string', () => {
    const store = useCharacterStore()
    store.importCharacter({ name: 'Dina', story: 42 })
    expect(store.characters[0].story).toBe('')
  })

  it('merges skills, specializations, bonusPoints when objects', () => {
    const store = useCharacterStore()
    store.importCharacter({
      name: 'Eve',
      skills: { martial: { pointsSpent: 3 } },
      specializations: { martial: 'duelliste' },
      bonusPoints: { archerie: 1 },
    })
    const c = store.characters[0]
    expect(c.skills.martial).toEqual({ pointsSpent: 3 })
    expect(c.specializations.martial).toBe('duelliste')
    expect(c.bonusPoints.archerie).toBe(1)
  })

  it('ignores skills/specializations/bonusPoints when not objects', () => {
    const store = useCharacterStore()
    store.importCharacter({
      name: 'Frank',
      skills: 'not-an-object',
      specializations: [1, 2],
      bonusPoints: null,
    })
    const c = store.characters[0]
    expect(c.skills.martial).toEqual({ pointsSpent: 0 })
    expect(c.specializations).toEqual({})
    expect(c.bonusPoints).toEqual({})
  })

  it('merges inventory and abilities when arrays', () => {
    const store = useCharacterStore()
    store.importCharacter({
      name: 'Gwen',
      inventory: [{ id: 'x', weaponId: 'sword', traits: [], currentFragility: 0 }],
      abilities: [{ id: 'a1', title: 'Vision', description: 'voit loin' }],
    })
    const c = store.characters[0]
    expect(c.inventory).toHaveLength(1)
    expect(c.abilities).toHaveLength(1)
    expect(c.abilities[0].title).toBe('Vision')
  })

  it('ignores inventory/abilities when not arrays', () => {
    const store = useCharacterStore()
    store.importCharacter({ name: 'Ian', inventory: 'nope', abilities: {} })
    expect(store.characters[0].inventory).toEqual([])
    expect(store.characters[0].abilities).toEqual([])
  })

  it('merges tracker field by field on top of defaults', () => {
    const store = useCharacterStore()
    store.importCharacter({
      name: 'Jane',
      tracker: { currentHP: 5, activeEffects: ['blessé'] },
    })
    const t = store.characters[0].tracker
    expect(t.currentHP).toBe(5)
    expect(t.currentSanity).toBe(10)
    expect(t.currentSouffle).toBe(10)
    expect(t.activeEffects).toEqual(['blessé'])
  })

  it('ignores tracker when not an object', () => {
    const store = useCharacterStore()
    store.importCharacter({ name: 'Kim', tracker: 'nope' })
    expect(store.characters[0].tracker).toEqual({
      currentHP: 10, currentSanity: 10, currentSouffle: 10, activeEffects: [],
    })
  })

  it('ignores tracker sub-fields with wrong types', () => {
    const store = useCharacterStore()
    store.importCharacter({
      name: 'Leo',
      tracker: { currentHP: 'seven', activeEffects: 'not-array', currentSanity: 3 },
    })
    const t = store.characters[0].tracker
    expect(t.currentHP).toBe(10)
    expect(t.currentSanity).toBe(3)
    expect(t.activeEffects).toEqual([])
  })
})
