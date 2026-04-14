import { computed, type Ref } from 'vue'
import type { Character, InventoryItem } from '../models/character'
import { getWeaponById } from '../data/weapons'

export function useInventory(character: Ref<Character>) {
  const items = computed(() => character.value.inventory)

  function addWeapon(weaponId: string): void {
    const weapon = getWeaponById(weaponId)
    if (!weapon) return

    const item: InventoryItem = {
      id: crypto.randomUUID(),
      weaponId,
      traits: [],
      currentFragility: weapon.fragility,
    }
    character.value.inventory.push(item)
    character.value.updatedAt = Date.now()
  }

  function addCustomItem(name: string, description: string): void {
    const item: InventoryItem = {
      id: crypto.randomUUID(),
      customName: name,
      customDescription: description,
      traits: [],
      currentFragility: 0,
    }
    character.value.inventory.push(item)
    character.value.updatedAt = Date.now()
  }

  function removeItem(itemId: string): void {
    character.value.inventory = character.value.inventory.filter(i => i.id !== itemId)
    character.value.updatedAt = Date.now()
  }

  function updateFragility(itemId: string, delta: number): void {
    const item = character.value.inventory.find(i => i.id === itemId)
    if (!item) return
    item.currentFragility = Math.max(0, item.currentFragility + delta)
    character.value.updatedAt = Date.now()
  }

  function addTrait(itemId: string, trait: string): void {
    const item = character.value.inventory.find(i => i.id === itemId)
    if (!item) return
    if (!item.traits.includes(trait)) {
      item.traits.push(trait)
      character.value.updatedAt = Date.now()
    }
  }

  function removeTrait(itemId: string, trait: string): void {
    const item = character.value.inventory.find(i => i.id === itemId)
    if (!item) return
    item.traits = item.traits.filter(t => t !== trait)
    character.value.updatedAt = Date.now()
  }

  return {
    items,
    addWeapon,
    addCustomItem,
    removeItem,
    updateFragility,
    addTrait,
    removeTrait,
  }
}
