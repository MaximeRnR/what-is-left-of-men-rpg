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

function getVisibleTalentsForSkill(skillId: SkillId) {
  if (!character.value) return []
  const spent = character.value.skills[skillId]?.pointsSpent ?? 0
  const bonus = character.value.bonusPoints[skillId] ?? 0
  const totalPoints = spent + bonus

  const skillDef = allSkills.find(s => s.id === skillId)
  if (!skillDef) return []

  const unlocked = skillDef.tiers.filter(t => t.costToReach <= totalPoints)
  // Show incompetent malus ONLY when still at incompetent tier, hide once surpassed
  if (unlocked.length > 1) {
    return unlocked.filter(t => !t.isMalus)
  }
  return unlocked
}

const dieColorClass: Record<string, string> = {
  d4: 'text-die-d4',
  d6: 'text-die-d6',
  d8: 'text-die-d8',
  d10: 'text-die-d10',
  d12: 'text-die-d12',
  d20: 'text-die-d20',
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
  <div class="min-h-dvh bg-background px-4 py-6 max-w-2xl mx-auto" v-if="character">
    <header class="mb-6">
      <h1 class="font-headline text-2xl uppercase tracking-wider text-on-surface mb-3">{{ character.name }}</h1>
      <div class="flex flex-wrap gap-2">
        <router-link to="/" class="inline-flex items-center gap-1 text-secondary text-xs font-label uppercase tracking-widest">
          <span class="material-symbols-outlined text-sm">arrow_back</span> Retour
        </router-link>
        <button @click="goToEdit" class="inline-flex items-center gap-1">
          <span class="material-symbols-outlined text-sm">edit</span> Modifier
        </button>
        <router-link :to="`/character/${characterId}/inventory`" class="inline-flex items-center gap-1 text-secondary text-xs font-label uppercase tracking-widest">
          <span class="material-symbols-outlined text-sm">inventory_2</span> Inventaire
        </router-link>
        <router-link :to="`/character/${characterId}/tracker`" class="inline-flex items-center gap-1 text-secondary text-xs font-label uppercase tracking-widest">
          <span class="material-symbols-outlined text-sm">swords</span> Combat
        </router-link>
      </div>
      <div class="border-t border-outline-variant mt-3"></div>
    </header>

    <section v-if="character.story" class="mb-6">
      <h2 class="mb-2">Histoire</h2>
      <p class="text-on-surface-variant text-sm leading-relaxed">{{ character.story }}</p>
    </section>

    <section class="mb-6">
      <h2 class="mb-3">Statistiques</h2>
      <div class="grid grid-cols-3 gap-2">
        <div class="bg-surface-container border border-outline-variant p-3 text-center">
          <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">PS</p>
          <p class="die-display text-primary">{{ stats.maxHP.value }}</p>
          <div class="h-1 bg-surface-container-lowest mt-2"><div class="stat-bar-fill hp h-full w-full"></div></div>
        </div>
        <div class="bg-surface-container border border-outline-variant p-3 text-center">
          <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">PSM</p>
          <p class="die-display text-secondary">{{ stats.maxSanity.value }}</p>
          <div class="h-1 bg-surface-container-lowest mt-2"><div class="stat-bar-fill sanity h-full w-full"></div></div>
        </div>
        <div class="bg-surface-container border border-outline-variant p-3 text-center">
          <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Souffle</p>
          <p class="die-display text-tertiary">{{ stats.maxSouffle.value }}</p>
          <div class="h-1 bg-surface-container-lowest mt-2"><div class="stat-bar-fill souffle h-full w-full"></div></div>
        </div>
      </div>
      <div class="flex gap-2 mt-2" v-if="stats.stModifier.value !== 0 || stats.initiativeModifier.value !== 0">
        <div v-if="stats.stModifier.value !== 0" class="bg-surface-container border border-outline-variant px-4 py-2 text-center">
          <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">ST</p>
          <p class="font-headline text-lg text-on-surface">{{ stats.stModifier.value > 0 ? '+' : '' }}{{ stats.stModifier.value }}</p>
        </div>
        <div v-if="stats.initiativeModifier.value !== 0" class="bg-surface-container border border-outline-variant px-4 py-2 text-center">
          <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Initiative</p>
          <p class="font-headline text-lg text-on-surface">{{ stats.initiativeModifier.value > 0 ? '+' : '' }}{{ stats.initiativeModifier.value }}</p>
        </div>
      </div>
    </section>

    <section v-for="cat in categories" :key="cat.key" class="mb-6">
      <h2 class="mb-3 pb-2 border-b border-outline-variant">{{ cat.label }}</h2>

      <div v-for="skill in skillsByCategory(cat.key)" :key="skill.id" class="bg-surface-container border border-outline-variant p-3 mb-2">
        <div class="flex items-center justify-between">
          <div>
            <strong class="text-on-surface text-sm">{{ skill.name }}</strong>
            <em class="text-on-surface-variant text-xs ml-2">{{ skill.latinName }}</em>
          </div>
          <div class="flex items-center gap-2">
            <template v-if="getSkillInfo(skill.id as SkillId)?.tier">
              <span class="die-display text-lg font-bold" :class="dieColorClass[getSkillInfo(skill.id as SkillId)!.die!] ?? ''">{{ getSkillInfo(skill.id as SkillId)!.die }}</span>
              <span class="tag" :style="{ borderColor: `var(--color-die-${getSkillInfo(skill.id as SkillId)!.die})`, color: `var(--color-die-${getSkillInfo(skill.id as SkillId)!.die})` }">{{ getSkillInfo(skill.id as SkillId)!.tier }}</span>
              <span v-if="getSkillInfo(skill.id as SkillId)!.totalBonus > 0" class="tag secondary">
                +{{ getSkillInfo(skill.id as SkillId)!.totalBonus }}
              </span>
            </template>
            <span v-else class="text-on-surface-variant text-xs">—</span>
          </div>
        </div>

        <div v-if="getVisibleTalentsForSkill(skill.id as SkillId).length > 0" class="mt-2 pt-2 border-t border-outline-variant">
          <div
            v-for="tier in getVisibleTalentsForSkill(skill.id as SkillId)"
            :key="tier.level"
            class="mb-3"
          >
            <div class="flex items-center gap-2">
              <span class="font-label text-xs uppercase tracking-widest" :class="dieColorClass[tier.die] ?? 'text-on-surface'">{{ tier.talentName }}</span>
              <span class="tag" :style="{ borderColor: `var(--color-die-${tier.die})`, color: `var(--color-die-${tier.die})` }">{{ tier.die }}</span>
            </div>
            <p class="text-on-surface-variant text-xs mt-1">{{ tier.description }}</p>
          </div>

          <div v-if="getChosenSpecialization(skill.id as SkillId)" class="bg-primary-container border border-primary-container p-2 mt-2">
            <strong class="text-on-primary-container text-xs font-label uppercase tracking-widest">Specialisation : {{ getChosenSpecialization(skill.id as SkillId)!.name }}</strong>
            <p class="text-on-primary-container text-xs mt-1 opacity-80">{{ getChosenSpecialization(skill.id as SkillId)!.description }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>

  <div v-else class="min-h-dvh bg-background px-4 py-6 max-w-2xl mx-auto">
    <p class="text-on-surface-variant">Personnage introuvable.</p>
    <router-link to="/" class="text-secondary text-xs font-label uppercase tracking-widest">Retour</router-link>
  </div>
</template>
