import { computed, type Ref, type ComputedRef } from 'vue'
import type { Character } from '../models/character'

export function useCombatTracker(
  character: Ref<Character>,
  maxHP: ComputedRef<number>,
  maxSanity: ComputedRef<number>,
  maxSouffle: ComputedRef<number>,
) {
  const currentHP = computed(() => character.value.tracker.currentHP)
  const currentSanity = computed(() => character.value.tracker.currentSanity)
  const currentSouffle = computed(() => character.value.tracker.currentSouffle)
  const activeEffects = computed(() => character.value.tracker.activeEffects)

  function modifyHP(delta: number): void {
    const newVal = character.value.tracker.currentHP + delta
    character.value.tracker.currentHP = Math.max(0, Math.min(maxHP.value, newVal))
    character.value.updatedAt = Date.now()
  }

  function modifySanity(delta: number): void {
    const newVal = character.value.tracker.currentSanity + delta
    character.value.tracker.currentSanity = Math.max(0, Math.min(maxSanity.value, newVal))
    character.value.updatedAt = Date.now()
  }

  function modifySouffle(delta: number): void {
    const newVal = character.value.tracker.currentSouffle + delta
    character.value.tracker.currentSouffle = Math.max(0, Math.min(maxSouffle.value, newVal))
    character.value.updatedAt = Date.now()
  }

  function resetToMax(): void {
    character.value.tracker.currentHP = maxHP.value
    character.value.tracker.currentSanity = maxSanity.value
    character.value.tracker.currentSouffle = maxSouffle.value
    character.value.tracker.activeEffects = []
    character.value.updatedAt = Date.now()
  }

  function addEffect(effect: string): void {
    if (!character.value.tracker.activeEffects.includes(effect)) {
      character.value.tracker.activeEffects.push(effect)
      character.value.updatedAt = Date.now()
    }
  }

  function removeEffect(effect: string): void {
    character.value.tracker.activeEffects = character.value.tracker.activeEffects.filter(e => e !== effect)
    character.value.updatedAt = Date.now()
  }

  function clearEffects(): void {
    character.value.tracker.activeEffects = []
    character.value.updatedAt = Date.now()
  }

  return {
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
  }
}
