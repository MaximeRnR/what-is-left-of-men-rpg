import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { usePointBudget } from '../composables/usePointBudget'
import { createEmptyCharacter } from '../models/character'

describe('usePointBudget', () => {
  function setup() {
    const character = ref(createEmptyCharacter('test-id', 'Test'))
    return { character, ...usePointBudget(character) }
  }

  it('starts with 15 total points and 0 spent', () => {
    const { totalPoints, spentPoints, remainingPoints } = setup()
    expect(totalPoints.value).toBe(15)
    expect(spentPoints.value).toBe(0)
    expect(remainingPoints.value).toBe(15)
  })

  it('allocates points to a skill', () => {
    const { character, spentPoints, remainingPoints, allocate } = setup()
    allocate('martial', 4)
    expect(character.value.skills.martial.pointsSpent).toBe(4)
    expect(spentPoints.value).toBe(4)
    expect(remainingPoints.value).toBe(11)
  })

  it('deallocates points from a skill', () => {
    const { character, spentPoints, allocate, deallocate } = setup()
    allocate('martial', 4)
    deallocate('martial', 2)
    expect(character.value.skills.martial.pointsSpent).toBe(2)
    expect(spentPoints.value).toBe(2)
  })

  it('cannot allocate more than remaining points', () => {
    const { canAllocate, allocate } = setup()
    allocate('martial', 10)
    expect(canAllocate('archerie', 6)).toBe(false)
    expect(canAllocate('archerie', 5)).toBe(true)
  })

  it('cannot reach maitre tier (7 cumulative) during creation', () => {
    const { canAllocate } = setup()
    expect(canAllocate('martial', 7)).toBe(false)
    expect(canAllocate('martial', 6)).toBe(true)
  })

  it('allows reaching maitre when allowMaster is true', () => {
    const character = ref(createEmptyCharacter('test-id', 'Test'))
    const { canAllocate } = usePointBudget(character, { allowMaster: true })
    expect(canAllocate('martial', 8)).toBe(true)
  })

  it('isValid is true when budget is not exceeded and no maitre', () => {
    const { isValid, allocate } = setup()
    allocate('martial', 6)
    allocate('archerie', 4)
    expect(isValid.value).toBe(true)
  })

  it('cannot deallocate below 0', () => {
    const { character, deallocate } = setup()
    deallocate('martial', 5)
    expect(character.value.skills.martial.pointsSpent).toBe(0)
  })
})
