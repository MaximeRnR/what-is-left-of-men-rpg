import { describe, it, expect } from 'vitest'
import { ref, computed } from 'vue'
import { useCombatTracker } from '../composables/useCombatTracker'
import { createEmptyCharacter } from '../models/character'

describe('useCombatTracker', () => {
  function setup(maxHP = 12, maxSanity = 13, maxSouffle = 11) {
    const character = ref(createEmptyCharacter('test-id', 'Test'))
    // Set initial tracker values to match max
    character.value.tracker.currentHP = maxHP
    character.value.tracker.currentSanity = maxSanity
    character.value.tracker.currentSouffle = maxSouffle
    const mHP = computed(() => maxHP)
    const mSanity = computed(() => maxSanity)
    const mSouffle = computed(() => maxSouffle)
    return { character, ...useCombatTracker(character, mHP, mSanity, mSouffle) }
  }

  it('reads current values from character tracker', () => {
    const { currentHP, currentSanity, currentSouffle } = setup()
    expect(currentHP.value).toBe(12)
    expect(currentSanity.value).toBe(13)
    expect(currentSouffle.value).toBe(11)
  })

  it('modifies HP', () => {
    const { currentHP, modifyHP } = setup()
    modifyHP(-3)
    expect(currentHP.value).toBe(9)
  })

  it('does not let HP go below 0', () => {
    const { currentHP, modifyHP } = setup()
    modifyHP(-20)
    expect(currentHP.value).toBe(0)
  })

  it('does not let HP exceed max', () => {
    const { currentHP, modifyHP } = setup()
    modifyHP(-5)
    modifyHP(10)
    expect(currentHP.value).toBe(12)
  })

  it('modifies sanity', () => {
    const { currentSanity, modifySanity } = setup()
    modifySanity(-4)
    expect(currentSanity.value).toBe(9)
  })

  it('does not let sanity go below 0', () => {
    const { currentSanity, modifySanity } = setup()
    modifySanity(-20)
    expect(currentSanity.value).toBe(0)
  })

  it('does not let sanity exceed max', () => {
    const { currentSanity, modifySanity } = setup()
    modifySanity(-5)
    modifySanity(20)
    expect(currentSanity.value).toBe(13)
  })

  it('modifies souffle', () => {
    const { currentSouffle, modifySouffle } = setup()
    modifySouffle(-6)
    expect(currentSouffle.value).toBe(5)
  })

  it('does not let souffle go below 0', () => {
    const { currentSouffle, modifySouffle } = setup()
    modifySouffle(-20)
    expect(currentSouffle.value).toBe(0)
  })

  it('does not let souffle exceed max', () => {
    const { currentSouffle, modifySouffle } = setup()
    modifySouffle(-3)
    modifySouffle(10)
    expect(currentSouffle.value).toBe(11)
  })

  it('resets all values to max', () => {
    const { currentHP, currentSanity, currentSouffle, modifyHP, modifySanity, modifySouffle, resetToMax } = setup()
    modifyHP(-5)
    modifySanity(-5)
    modifySouffle(-5)
    resetToMax()
    expect(currentHP.value).toBe(12)
    expect(currentSanity.value).toBe(13)
    expect(currentSouffle.value).toBe(11)
  })

  it('adds an active effect', () => {
    const { activeEffects, addEffect } = setup()
    addEffect('BLESSE')
    expect(activeEffects.value).toEqual(['BLESSE'])
  })

  it('does not add duplicate effects', () => {
    const { activeEffects, addEffect } = setup()
    addEffect('BLESSE')
    addEffect('BLESSE')
    expect(activeEffects.value).toEqual(['BLESSE'])
  })

  it('removes an active effect', () => {
    const { activeEffects, addEffect, removeEffect } = setup()
    addEffect('BLESSE')
    addEffect('PEUR')
    removeEffect('BLESSE')
    expect(activeEffects.value).toEqual(['PEUR'])
  })

  it('clears all effects', () => {
    const { activeEffects, addEffect, clearEffects } = setup()
    addEffect('BLESSE')
    addEffect('PEUR')
    clearEffects()
    expect(activeEffects.value).toEqual([])
  })

  it('reset also clears effects', () => {
    const { activeEffects, addEffect, resetToMax } = setup()
    addEffect('BLESSE')
    resetToMax()
    expect(activeEffects.value).toEqual([])
  })
})
