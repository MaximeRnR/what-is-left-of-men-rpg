<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCharacterStore } from '../stores/characterStore'
import { usePointBudget } from '../composables/usePointBudget'
import { computeSkillTier } from '../composables/useSkillCalculator'
import { allSkills } from '../data/skills'
import type { SkillId, SkillCategory } from '../models/skill'
import type { Character } from '../models/character'
import DieIcon from '../components/DieIcon.vue'

const route = useRoute()
const router = useRouter()
const store = useCharacterStore()

const characterId = route.params.id as string
const original = computed(() => store.characters.find(c => c.id === characterId))

// Create a deep copy for editing
const draft = ref<Character>(JSON.parse(JSON.stringify(original.value!)))

const { totalPoints, spentPoints, remainingPoints, canAllocate, allocate, deallocate, isValid } =
  usePointBudget(draft)

const categories: { key: SkillCategory; label: string }[] = [
  { key: 'corps', label: 'CORPS' },
  { key: 'coeur', label: 'COEUR' },
  { key: 'esprit', label: 'ESPRIT' },
]

function skillsByCategory(category: SkillCategory) {
  return allSkills.filter(s => s.category === category)
}

function getSkillTier(skillId: SkillId) {
  const spent = draft.value.skills[skillId]?.pointsSpent ?? 0
  const bonus = draft.value.bonusPoints[skillId] ?? 0
  return computeSkillTier(spent, bonus)
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
  draft.value.specializations[skillId] = specId
}

// MJ bonus points management
function addBonusPoint(skillId: SkillId) {
  const current = draft.value.bonusPoints[skillId] ?? 0
  const totalBonus = Object.values(draft.value.bonusPoints).reduce((sum, v) => sum + (v ?? 0), 0)
  if (totalBonus >= 5) return
  draft.value.bonusPoints[skillId] = current + 1
}

function removeBonusPoint(skillId: SkillId) {
  const current = draft.value.bonusPoints[skillId] ?? 0
  if (current <= 0) return
  draft.value.bonusPoints[skillId] = current - 1
  if (draft.value.bonusPoints[skillId] === 0) {
    delete draft.value.bonusPoints[skillId]
  }
}

const totalBonusSpent = computed(() => {
  return Object.values(draft.value.bonusPoints).reduce((sum, v) => sum + (v ?? 0), 0)
})

const canSave = computed(() => {
  if (!draft.value.name.trim()) return false
  if (!isValid.value) return false
  return true
})

function save() {
  if (!canSave.value) return
  store.updateCharacter(characterId, {
    name: draft.value.name,
    story: draft.value.story,
    skills: { ...draft.value.skills },
    specializations: { ...draft.value.specializations },
    bonusPoints: { ...draft.value.bonusPoints },
  })
  router.push(`/character/${characterId}`)
}

function cancel() {
  router.push(`/character/${characterId}`)
}
</script>

<template>
  <div class="min-h-dvh bg-background px-4 py-6 pb-24 max-w-2xl mx-auto" v-if="original">
    <header class="mb-6">
      <div class="flex items-center justify-between mb-2">
        <h1 class="font-headline text-2xl uppercase tracking-wider text-on-surface">Modifier {{ draft.name }}</h1>
        <button @click="cancel" class="inline-flex items-center gap-1">
          <span class="material-symbols-outlined text-sm">close</span> Annuler
        </button>
      </div>
      <div class="border-t border-outline-variant mt-2"></div>
    </header>

    <div class="mb-4">
      <label for="name" class="block mb-1">Nom</label>
      <input id="name" v-model="draft.name" type="text" />
    </div>

    <div class="mb-6">
      <label for="story" class="block mb-1">Histoire</label>
      <textarea id="story" v-model="draft.story" rows="4" placeholder="L'histoire de votre personnage..."></textarea>
    </div>

    <div class="bg-surface-container-low border border-outline-variant p-4 mb-4 flex items-center justify-between">
      <div>
        <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Points depenses</p>
        <p class="text-on-surface text-sm">{{ spentPoints }} / {{ totalPoints }}</p>
      </div>
      <div class="text-right">
        <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Restants</p>
        <p class="die-display text-primary">{{ remainingPoints }}</p>
      </div>
    </div>

    <div class="bg-secondary-container border border-secondary-container p-4 mb-6 flex items-center justify-between">
      <p class="font-label text-xs uppercase tracking-widest text-on-secondary-container">Bonus MJ</p>
      <p class="font-headline text-lg text-on-secondary-container">{{ totalBonusSpent }} / 5</p>
    </div>

    <div v-for="cat in categories" :key="cat.key" class="mb-8">
      <h2 class="mb-3 pb-2 border-b border-outline-variant">{{ cat.label }}</h2>

      <div v-for="skill in skillsByCategory(cat.key)" :key="skill.id" class="bg-surface-container border border-outline-variant p-3 mb-2">
        <div class="mb-2">
          <strong class="text-on-surface text-sm">{{ skill.name }}</strong>
          <em class="text-on-surface-variant text-xs ml-2">{{ skill.latinName }}</em>
        </div>

        <div class="flex items-center gap-4 mb-2">
          <div class="flex items-center gap-2">
            <span class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Points :</span>
            <button class="px-2 py-1" @click="removePoint(skill.id as SkillId)" :disabled="(draft.skills[skill.id as SkillId]?.pointsSpent ?? 0) === 0">
              <span class="material-symbols-outlined text-sm">remove</span>
            </button>
            <span class="font-headline text-on-surface w-6 text-center">{{ draft.skills[skill.id as SkillId]?.pointsSpent ?? 0 }}</span>
            <button class="px-2 py-1" @click="addPoint(skill.id as SkillId)" :disabled="!canAllocate(skill.id as SkillId, 1)">
              <span class="material-symbols-outlined text-sm">add</span>
            </button>
          </div>

          <div class="flex items-center gap-2">
            <span class="font-label text-xs uppercase tracking-widest text-secondary">Bonus MJ :</span>
            <button class="px-2 py-1" @click="removeBonusPoint(skill.id as SkillId)" :disabled="(draft.bonusPoints[skill.id as SkillId] ?? 0) === 0">
              <span class="material-symbols-outlined text-sm">remove</span>
            </button>
            <span class="font-headline text-secondary w-6 text-center">{{ draft.bonusPoints[skill.id as SkillId] ?? 0 }}</span>
            <button class="px-2 py-1" @click="addBonusPoint(skill.id as SkillId)" :disabled="totalBonusSpent >= 5">
              <span class="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
        </div>

        <div v-if="getSkillTier(skill.id as SkillId).tier" class="flex items-center gap-2 mt-1">
          <DieIcon :die="getSkillTier(skill.id as SkillId).die!" :size="28" class="text-primary" />
          <span class="die-display text-lg text-primary">{{ getSkillTier(skill.id as SkillId).die }}</span>
          <span class="tag primary">{{ getSkillTier(skill.id as SkillId).tier }}</span>
          <span v-if="getSkillTier(skill.id as SkillId).totalBonus > 0" class="tag secondary">
            +{{ getSkillTier(skill.id as SkillId).totalBonus }}
          </span>
        </div>

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
              :checked="draft.specializations[skill.id as SkillId] === spec.id"
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
      <div class="max-w-2xl mx-auto flex gap-2">
        <button class="flex-1" @click="cancel">Annuler</button>
        <button class="primary flex-1" @click="save" :disabled="!canSave">Sauvegarder</button>
      </div>
    </div>
  </div>

  <div v-else class="min-h-dvh bg-background px-4 py-6 max-w-2xl mx-auto">
    <p class="text-on-surface-variant">Personnage introuvable.</p>
    <router-link to="/" class="text-secondary text-xs font-label uppercase tracking-widest">Retour</router-link>
  </div>
</template>
