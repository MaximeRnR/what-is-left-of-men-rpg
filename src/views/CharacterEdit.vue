<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCharacterStore } from '../stores/characterStore'
import { usePointBudget } from '../composables/usePointBudget'
import { computeSkillTier } from '../composables/useSkillCalculator'
import { allSkills } from '../data/skills'
import type { SkillId, SkillCategory } from '../models/skill'
import type { Character } from '../models/character'

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
  <div class="character-edit" v-if="original">
    <header>
      <h1>Modifier {{ draft.name }}</h1>
      <button @click="cancel">Annuler</button>
    </header>

    <div class="name-input">
      <label for="name">Nom</label>
      <input id="name" v-model="draft.name" type="text" />
    </div>

    <div class="story-input">
      <label for="story">Histoire</label>
      <textarea id="story" v-model="draft.story" rows="4" placeholder="L'histoire de votre personnage..."></textarea>
    </div>

    <div class="budget">
      <span>Points : {{ spentPoints }} / {{ totalPoints }}</span>
      <span>Restants : {{ remainingPoints }}</span>
    </div>

    <div class="bonus-budget">
      <span>Bonus MJ : {{ totalBonusSpent }} / 5</span>
    </div>

    <div v-for="cat in categories" :key="cat.key" class="category">
      <h2>{{ cat.label }}</h2>

      <div v-for="skill in skillsByCategory(cat.key)" :key="skill.id" class="skill-row">
        <div class="skill-header">
          <strong>{{ skill.name }}</strong>
          <em>{{ skill.latinName }}</em>
        </div>

        <div class="skill-controls">
          <span>Points :</span>
          <button @click="removePoint(skill.id as SkillId)" :disabled="(draft.skills[skill.id as SkillId]?.pointsSpent ?? 0) === 0">-</button>
          <span>{{ draft.skills[skill.id as SkillId]?.pointsSpent ?? 0 }}</span>
          <button @click="addPoint(skill.id as SkillId)" :disabled="!canAllocate(skill.id as SkillId, 1)">+</button>
        </div>

        <div class="bonus-controls">
          <span>Bonus MJ :</span>
          <button @click="removeBonusPoint(skill.id as SkillId)" :disabled="(draft.bonusPoints[skill.id as SkillId] ?? 0) === 0">-</button>
          <span>{{ draft.bonusPoints[skill.id as SkillId] ?? 0 }}</span>
          <button @click="addBonusPoint(skill.id as SkillId)" :disabled="totalBonusSpent >= 5">+</button>
        </div>

        <div class="skill-tier" v-if="getSkillTier(skill.id as SkillId).tier">
          <span class="die">{{ getSkillTier(skill.id as SkillId).die }}</span>
          <span class="tier-name">{{ getSkillTier(skill.id as SkillId).tier }}</span>
          <span v-if="getSkillTier(skill.id as SkillId).totalBonus > 0" class="bonus">
            +{{ getSkillTier(skill.id as SkillId).totalBonus }}
          </span>
        </div>

        <div v-if="getTierForSkill(skill.id as SkillId)?.specializations?.length" class="specializations">
          <p>Specialisation :</p>
          <label
            v-for="spec in getTierForSkill(skill.id as SkillId)!.specializations"
            :key="spec.id"
          >
            <input
              type="radio"
              :name="`spec-${skill.id}`"
              :value="spec.id"
              :checked="draft.specializations[skill.id as SkillId] === spec.id"
              @change="selectSpecialization(skill.id as SkillId, spec.id)"
            />
            <strong>{{ spec.name }}</strong> — {{ spec.description }}
          </label>
        </div>
      </div>
    </div>

    <footer>
      <button @click="cancel">Annuler</button>
      <button @click="save" :disabled="!canSave">Sauvegarder</button>
    </footer>
  </div>

  <div v-else>
    <p>Personnage introuvable.</p>
    <router-link to="/">Retour</router-link>
  </div>
</template>
