<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCharacterStore } from '../stores/characterStore'
import { useCharacterStats } from '../composables/useCharacterStats'
import { computeSkillTier } from '../composables/useSkillCalculator'
import { allSkills } from '../data/skills'
import type { SkillId, SkillCategory } from '../models/skill'

const route = useRoute()
const router = useRouter()
const store = useCharacterStore()

const characterId = route.params.id as string
const character = computed(() => store.characters.find(c => c.id === characterId))

// Create a writable ref that stays in sync with the computed character
const characterRef = ref(character.value!)
watch(character, (val) => { if (val) characterRef.value = val }, { deep: true })

const stats = useCharacterStats(characterRef)

const categories: { key: SkillCategory; label: string }[] = [
  { key: 'corps', label: 'CORPS' },
  { key: 'coeur', label: 'COEUR' },
  { key: 'esprit', label: 'ESPRIT' },
]

function skillsByCategory(category: SkillCategory) {
  return allSkills.filter(s => s.category === category)
}

function getSkillInfo(skillId: SkillId) {
  if (!character.value) return null
  const spent = character.value.skills[skillId]?.pointsSpent ?? 0
  const bonus = character.value.bonusPoints[skillId] ?? 0
  const result = computeSkillTier(spent + bonus, 0)
  return result
}

function getUnlockedTalentsForSkill(skillId: SkillId) {
  if (!character.value) return []
  const spent = character.value.skills[skillId]?.pointsSpent ?? 0
  const bonus = character.value.bonusPoints[skillId] ?? 0
  const totalPoints = spent + bonus
  if (totalPoints === 0) return []

  const skillDef = allSkills.find(s => s.id === skillId)
  if (!skillDef) return []

  return skillDef.tiers.filter(t => t.costToReach <= totalPoints)
}

function getChosenSpecialization(skillId: SkillId) {
  if (!character.value) return null
  const specId = character.value.specializations[skillId]
  if (!specId) return null
  const skillDef = allSkills.find(s => s.id === skillId)
  if (!skillDef) return null
  for (const tier of skillDef.tiers) {
    const spec = tier.specializations?.find(s => s.id === specId)
    if (spec) return spec
  }
  return null
}

function goToEdit() {
  router.push(`/character/${characterId}/edit`)
}
</script>

<template>
  <div class="character-sheet" v-if="character">
    <header>
      <h1>{{ character.name }}</h1>
      <div class="actions">
        <router-link to="/">Retour</router-link>
        <button @click="goToEdit">Modifier</button>
        <router-link :to="`/character/${characterId}/inventory`">Inventaire</router-link>
      </div>
    </header>

    <section v-if="character.story" class="story">
      <h2>Histoire</h2>
      <p>{{ character.story }}</p>
    </section>

    <section class="stats-summary">
      <h2>Statistiques</h2>
      <div class="stat-grid">
        <div class="stat">
          <span class="stat-label">PS</span>
          <span class="stat-value">{{ stats.maxHP.value }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">PSM</span>
          <span class="stat-value">{{ stats.maxSanity.value }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Souffle</span>
          <span class="stat-value">{{ stats.maxSouffle.value }}</span>
        </div>
        <div class="stat" v-if="stats.stModifier.value !== 0">
          <span class="stat-label">ST</span>
          <span class="stat-value">{{ stats.stModifier.value > 0 ? '+' : '' }}{{ stats.stModifier.value }}</span>
        </div>
        <div class="stat" v-if="stats.initiativeModifier.value !== 0">
          <span class="stat-label">Initiative</span>
          <span class="stat-value">{{ stats.initiativeModifier.value > 0 ? '+' : '' }}{{ stats.initiativeModifier.value }}</span>
        </div>
      </div>
    </section>

    <section v-for="cat in categories" :key="cat.key" class="skill-category">
      <h2>{{ cat.label }}</h2>

      <div v-for="skill in skillsByCategory(cat.key)" :key="skill.id" class="skill-block">
        <div class="skill-header">
          <strong>{{ skill.name }}</strong>
          <em>{{ skill.latinName }}</em>
          <template v-if="getSkillInfo(skill.id as SkillId)?.tier">
            <span class="die">{{ getSkillInfo(skill.id as SkillId)!.die }}</span>
            <span class="tier">{{ getSkillInfo(skill.id as SkillId)!.tier }}</span>
            <span v-if="getSkillInfo(skill.id as SkillId)!.totalBonus > 0" class="bonus">
              +{{ getSkillInfo(skill.id as SkillId)!.totalBonus }}
            </span>
          </template>
          <span v-else class="no-points">—</span>
        </div>

        <div class="talents" v-if="getUnlockedTalentsForSkill(skill.id as SkillId).length > 0">
          <div
            v-for="tier in getUnlockedTalentsForSkill(skill.id as SkillId)"
            :key="tier.level"
            class="talent"
            :class="{ malus: tier.isMalus }"
          >
            <span class="talent-name">{{ tier.talentName }}</span>
            <span class="talent-die">{{ tier.die }}</span>
            <p class="talent-desc">{{ tier.description }}</p>
          </div>

          <div v-if="getChosenSpecialization(skill.id as SkillId)" class="specialization">
            <strong>Specialisation : {{ getChosenSpecialization(skill.id as SkillId)!.name }}</strong>
            <p>{{ getChosenSpecialization(skill.id as SkillId)!.description }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>

  <div v-else>
    <p>Personnage introuvable.</p>
    <router-link to="/">Retour</router-link>
  </div>
</template>
