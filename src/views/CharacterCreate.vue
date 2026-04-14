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

function needsSpecialization(skillId: SkillId): boolean {
  const tier = getTierForSkill(skillId)
  return !!tier?.specializations?.length && !character.value.specializations[skillId]
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
  <div class="character-create">
    <header>
      <h1>Nouveau Personnage</h1>
      <router-link to="/">Retour</router-link>
    </header>

    <div class="name-input">
      <label for="name">Nom</label>
      <input id="name" v-model="characterName" type="text" placeholder="Nom du personnage" />
    </div>

    <div class="budget">
      <span>Points : {{ spentPoints }} / {{ totalPoints }}</span>
      <span>Restants : {{ remainingPoints }}</span>
    </div>

    <div v-for="cat in categories" :key="cat.key" class="category">
      <h2>{{ cat.label }}</h2>

      <div v-for="skill in skillsByCategory(cat.key)" :key="skill.id" class="skill-row">
        <div class="skill-header">
          <strong>{{ skill.name }}</strong>
          <em>{{ skill.latinName }}</em>
        </div>

        <div class="skill-controls">
          <button @click="removePoint(skill.id as SkillId)" :disabled="(character.skills[skill.id as SkillId]?.pointsSpent ?? 0) === 0">-</button>
          <span>{{ character.skills[skill.id as SkillId]?.pointsSpent ?? 0 }}</span>
          <button @click="addPoint(skill.id as SkillId)" :disabled="!canAllocate(skill.id as SkillId, 1)">+</button>
        </div>

        <div class="skill-tier" v-if="getSkillTier(skill.id as SkillId).tier">
          <span class="die">{{ getSkillTier(skill.id as SkillId).die }}</span>
          <span class="tier-name">{{ getSkillTier(skill.id as SkillId).tier }}</span>
          <span v-if="getSkillTier(skill.id as SkillId).extraBonus > 0" class="bonus">
            +{{ getSkillTier(skill.id as SkillId).extraBonus }}
          </span>
        </div>

        <!-- Specialization choice -->
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
              :checked="character.specializations[skill.id as SkillId] === spec.id"
              @change="selectSpecialization(skill.id as SkillId, spec.id)"
            />
            <strong>{{ spec.name }}</strong> — {{ spec.description }}
          </label>
        </div>
      </div>
    </div>

    <footer>
      <button @click="save" :disabled="!canSave">Creer le personnage</button>
    </footer>
  </div>
</template>
