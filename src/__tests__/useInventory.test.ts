import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useInventory } from '../composables/useInventory'
import { createEmptyCharacter } from '../models/character'

describe('useInventory', () => {
  function setup() {
    const character = ref(createEmptyCharacter('test-id', 'Test'))
    return { character, ...useInventory(character) }
  }

  it('starts with empty inventory', () => {
    const { items } = setup()
    expect(items.value).toEqual([])
  })

  it('adds a weapon from the rulebook', () => {
    const { items, addWeapon } = setup()
    addWeapon('epee_courte')
    expect(items.value).toHaveLength(1)
    expect(items.value[0].weaponId).toBe('epee_courte')
    expect(items.value[0].currentFragility).toBe(4)
    expect(items.value[0].traits).toEqual([])
  })

  it('adds a custom item', () => {
    const { items, addCustomItem } = setup()
    addCustomItem('Torche', 'Une torche allumee')
    expect(items.value).toHaveLength(1)
    expect(items.value[0].customName).toBe('Torche')
    expect(items.value[0].customDescription).toBe('Une torche allumee')
  })

  it('removes an item', () => {
    const { items, addWeapon, removeItem } = setup()
    addWeapon('epee_courte')
    const itemId = items.value[0].id
    removeItem(itemId)
    expect(items.value).toHaveLength(0)
  })

  it('updates fragility', () => {
    const { items, addWeapon, updateFragility } = setup()
    addWeapon('epee_courte')
    const itemId = items.value[0].id
    updateFragility(itemId, -1)
    expect(items.value[0].currentFragility).toBe(3)
  })

  it('does not let fragility go below 0', () => {
    const { items, addWeapon, updateFragility } = setup()
    addWeapon('dague_rouillee') // fragility 2
    const itemId = items.value[0].id
    updateFragility(itemId, -5)
    expect(items.value[0].currentFragility).toBe(0)
  })

  it('adds a trait to an item', () => {
    const { items, addWeapon, addTrait } = setup()
    addWeapon('epee_courte')
    const itemId = items.value[0].id
    addTrait(itemId, 'RUDIMENTAIRE')
    expect(items.value[0].traits).toEqual(['RUDIMENTAIRE'])
  })

  it('removes a trait from an item', () => {
    const { items, addWeapon, addTrait, removeTrait } = setup()
    addWeapon('epee_courte')
    const itemId = items.value[0].id
    addTrait(itemId, 'RUDIMENTAIRE')
    removeTrait(itemId, 'RUDIMENTAIRE')
    expect(items.value[0].traits).toEqual([])
  })

  it('can add multiple weapons', () => {
    const { items, addWeapon } = setup()
    addWeapon('epee_courte')
    addWeapon('dague_rouillee')
    expect(items.value).toHaveLength(2)
    expect(items.value[0].weaponId).toBe('epee_courte')
    expect(items.value[1].weaponId).toBe('dague_rouillee')
  })

  it('each item gets a unique id', () => {
    const { items, addWeapon } = setup()
    addWeapon('epee_courte')
    addWeapon('epee_courte')
    expect(items.value[0].id).not.toBe(items.value[1].id)
  })
})
