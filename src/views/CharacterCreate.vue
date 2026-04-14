<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCharacterStore } from '../stores/characterStore'
import { usePointBudget } from '../composables/usePointBudget'
import { computeSkillTier } from '../composables/useSkillCalculator'
import { createEmptyCharacter } from '../models/character'
import { allSkills } from '../data/skills'
import type { SkillId, SkillCategory } from '../models/skill'

const router = useRouter()
const store = useCharacterStore()

const characterName = ref('')
const character = ref(createEmptyCharacter('draft', ''))

const { totalPoints, spentPoints, remainingPoints, canAllocate, allocate, deallocate, isValid } =
  usePointBudget(character)

const categories: { key: SkillCategory; label: string }[] = [
  { key: 'corps', label: 'CORPS' },
  { key: 'coeur', label: 'COEUR' },
  { key: 'esprit', label: 'ESPRIT' },
]

function skillsByCategory(category: SkillCategory) {
  return allSkills.filter(s => s.category === category)
}

function getSkillTier(skillId: SkillId) {
  const spent = character.value.skills[skillId]?.pointsSpent ?? 0
  return computeSkillTier(spent, 0)
}

function addPoint(skillId: SkillId) {
  if (canAllocate(skillId, 1)) {
    allocate(skillId, 1)
  }
}

function removePoint(skillId: SkillId) {
  deallocate(skillId, 1)
}

function getTierForSkill(skillId: SkillId) {
  const result = getSkillTier(skillId)
  if (!result.tier) return null
  const skillDef = allSkills.find(s => s.id === skillId)
  return skillDef?.tiers.find(t => t.level === result.tier)
}

function selectSpecialization(skillId: SkillId, specId: string) {
  character.value.specializations[skillId] = specId
}

const canSave = computed(() => {
  if (!characterName.value.trim()) return false
  if (!isValid.value) return false
  // Check all required specializations are chosen
  for (const skill of allSkills) {
    const spent = character.value.skills[skill.id as SkillId]?.pointsSpent ?? 0
    const result = computeSkillTier(spent, 0)
    if (!result.tier) continue
    for (const tier of skill.tiers) {
      if (tier.costToReach > spent) break
      if (tier.specializations?.length && !character.value.specializations[skill.id as SkillId]) {
        return false
      }
    }
  }
  return true
})

function save() {
  if (!canSave.value) return
  const created = store.createCharacter(characterName.value.trim())
  store.updateCharacter(created.id, {
    skills: { ...character.value.skills },
    specializations: { ...character.value.specializations },
  })
  router.push('/')
}
</script>

<template>
  <div class="min-h-dvh bg-background px-4 py-6 pb-24 max-w-2xl mx-auto">
    <header class="mb-6">
      <router-link to="/" class="text-secondary text-xs font-label uppercase tracking-widest inline-flex items-center gap-1 mb-2">
        <span class="material-symbols-outlined text-sm">arrow_back</span> Retour
      </router-link>
      <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-1">ALLOCATION_SEQUENCE</p>
      <h1 class="font-headline text-2xl uppercase tracking-wider text-on-surface">Nouveau Personnage</h1>
      <div class="border-t border-outline-variant mt-3"></div>
    </header>

    <div class="mb-6">
      <label for="name" class="block mb-1">Nom</label>
      <input id="name" v-model="characterName" type="text" placeholder="Nom du personnage" />
    </div>

    <div class="bg-surface-container-low border border-outline-variant p-4 mb-6 flex items-center justify-between">
      <div>
        <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Points depenses</p>
        <p class="text-on-surface text-sm">{{ spentPoints }} / {{ totalPoints }}</p>
      </div>
      <div class="text-right">
        <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Restants</p>
        <p class="die-display text-primary">{{ remainingPoints }}</p>
      </div>
    </div>

    <div v-for="cat in categories" :key="cat.key" class="mb-8">
      <h2 class="mb-3 pb-2 border-b border-outline-variant">{{ cat.label }}</h2>

      <div v-for="skill in skillsByCategory(cat.key)" :key="skill.id" class="bg-surface-container border border-outline-variant p-3 mb-2">
        <div class="flex items-center justify-between mb-2">
          <div>
            <strong class="text-on-surface text-sm">{{ skill.name }}</strong>
            <em class="text-on-surface-variant text-xs ml-2">{{ skill.latinName }}</em>
          </div>
          <div class="flex items-center gap-2">
            <button class="px-2 py-1" @click="removePoint(skill.id as SkillId)" :disabled="(character.skills[skill.id as SkillId]?.pointsSpent ?? 0) === 0">
              <span class="material-symbols-outlined text-sm">remove</span>
            </button>
            <span class="font-headline text-on-surface w-6 text-center">{{ character.skills[skill.id as SkillId]?.pointsSpent ?? 0 }}</span>
            <button class="px-2 py-1" @click="addPoint(skill.id as SkillId)" :disabled="!canAllocate(skill.id as SkillId, 1)">
              <span class="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
        </div>

        <div v-if="getSkillTier(skill.id as SkillId).tier" class="flex items-center gap-2 mt-1">
          <span class="die-display text-lg text-primary">{{ getSkillTier(skill.id as SkillId).die }}</span>
          <span class="tag primary">{{ getSkillTier(skill.id as SkillId).tier }}</span>
          <span v-if="getSkillTier(skill.id as SkillId).extraBonus > 0" class="tag secondary">
            +{{ getSkillTier(skill.id as SkillId).extraBonus }}
          </span>
        </div>

        <!-- Specialization choice -->
        <div v-if="getTierForSkill(skill.id as SkillId)?.specializations?.length" class="mt-3 pt-3 border-t border-outline-variant">
          <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-2">Specialisation :</p>
          <label
            v-for="spec in getTierForSkill(skill.id as SkillId)!.specializations"
            :key="spec.id"
            class="block bg-surface-container-low border border-outline-variant p-3 mb-1 cursor-pointer hover:border-primary transition-colors"
          >
            <input
              type="radio"
              :name="`spec-${skill.id}`"
              :value="spec.id"
              :checked="character.specializations[skill.id as SkillId] === spec.id"
              @change="selectSpecialization(skill.id as SkillId, spec.id)"
              class="mr-2"
            />
            <strong class="text-on-surface text-sm">{{ spec.name }}</strong>
            <span class="text-on-surface-variant text-xs"> — {{ spec.description }}</span>
          </label>
        </div>
      </div>
    </div>

    <div class="fixed bottom-0 left-0 right-0 bg-surface-container-lowest border-t border-outline-variant p-4">
      <div class="max-w-2xl mx-auto">
        <button class="primary w-full py-3" @click="save" :disabled="!canSave">Creer le personnage</button>
      </div>
    </div>
  </div>
</template>
