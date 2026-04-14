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

const searchQuery = ref('')

function skillsByCategory(category: SkillCategory) {
  const query = searchQuery.value.toLowerCase().trim()
  return allSkills.filter(s => {
    if (s.category !== category) return false
    if (!query) return true
    return s.name.toLowerCase().includes(query) || s.latinName.toLowerCase().includes(query)
  })
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

function hasReroll(description: string): boolean {
  const lower = description.toLowerCase()
  return lower.includes('relance') || lower.includes('relancer')
}

function getSkillTierIndex(skillId: SkillId): number {
  // Returns how many tiers above incompetent: 0=incompetent, 1=initie, 2=entraine, 3=competent, 4=maitre, 5=legende
  if (!character.value) return 0
  const info = getSkillInfo(skillId)
  if (!info?.tier) return 0
  const tierOrder = ['incompetent', 'initie', 'entraine', 'competent', 'maitre', 'legende']
  return tierOrder.indexOf(info.tier)
}

function detectTags(description: string): { label: string, color: string }[] {
  const tags: { label: string, color: string }[] = []
  const d = description.toLowerCase()

  if (/\+\d+\s*(pv|ps\b)/.test(d) || /\+\d+\s*hp/.test(d)) tags.push({ label: '+PV', color: 'var(--color-primary)' })
  if (/\+\d+\s*psm/.test(d)) tags.push({ label: '+PSM', color: 'var(--color-secondary)' })
  if (/\+\d+\s*souffle/.test(d)) tags.push({ label: '+SOUFFLE', color: 'var(--color-tertiary)' })
  if (/\+\d+\s*st\b/.test(d)) tags.push({ label: '+ST', color: 'var(--color-die-d20)' })
  if (/\+\d+\s*(degat|degats|dégât|dégâts)/i.test(d)) tags.push({ label: '+DEGATS', color: 'var(--color-die-d4)' })
  if (/\+\d+\s*(a l'initiative|à l'initiative|initiative)/i.test(d)) tags.push({ label: '+INITIATIVE', color: 'var(--color-die-d8)' })
  if (/\+\d+\s*(pour toucher|touche\b|aux tirs)/i.test(d)) tags.push({ label: '+TOUCHE', color: 'var(--color-die-d10)' })
  if (/\+\d+\s*armure/i.test(d)) tags.push({ label: '+ARMURE', color: 'var(--color-on-surface-variant)' })
  if (/\-\d+\s*cs\b/i.test(d)) tags.push({ label: '-CS', color: 'var(--color-tertiary)' })

  // Cross-skill: Tromperie Entraine — "+1 par Niveau de CHARISME (max +3)"
  if (d.includes('par niveau de charisme')) {
    const charismeLevel = getSkillTierIndex('charisme')
    // Bonus = tiers above incompetent, capped at 3
    const bonus = Math.min(charismeLevel, 3)
    if (bonus > 0) {
      tags.push({ label: `+${bonus} (CHARISME)`, color: 'var(--color-secondary)' })
    }
  }

  return tags
}

// Roll bonus definitions: skill + tier -> bonus to dice rolls
interface RollBonus {
  skillId: SkillId
  tier: string         // tier level
  specId?: string      // if from a specialization
  value: string        // "+1", "+2", dynamic
  conditional: boolean // true = asterisk
  label: string        // short description
}

const ROLL_BONUSES: Omit<RollBonus, 'value'>[] = [
  // CORPS
  { skillId: 'archerie', tier: 'competent', specId: 'tireur_precis', conditional: true, label: 'Tirs Moy./Longue Portee' },
  { skillId: 'archerie', tier: 'competent', specId: 'tireur_rapide', conditional: true, label: 'Tirs Courte Portee' },
  { skillId: 'force', tier: 'initie', conditional: true, label: 'Porter, soulever, pousser' },
  { skillId: 'force', tier: 'competent', specId: 'praetor', conditional: true, label: 'Toucher armes LOURDE' },
  { skillId: 'agilite', tier: 'initie', conditional: false, label: 'Jets d\'Agilite' },
  { skillId: 'ombre', tier: 'initie', conditional: false, label: 'Jets d\'Ombre' },
  { skillId: 'ombre', tier: 'entraine', conditional: true, label: 'Touche EMBUSQUE (COURTE/POING)' },
  // COEUR
  { skillId: 'charisme', tier: 'initie', conditional: false, label: 'Jets de COEUR' },
  { skillId: 'empathie', tier: 'initie', conditional: false, label: 'Jets d\'Empathie' },
  { skillId: 'courage', tier: 'initie', conditional: true, label: 'COURAGE vs Trait choisi' },
  { skillId: 'courage', tier: 'entraine', conditional: true, label: 'Prochain jet allie (1x/Scene)' },
  { skillId: 'courage', tier: 'legende', conditional: true, label: 'COURAGE allies a portee' },
  { skillId: 'perception', tier: 'initie', conditional: false, label: 'Jets de Perception' },
  { skillId: 'perception', tier: 'entraine', conditional: false, label: 'Initiative' },
  { skillId: 'perception', tier: 'competent', conditional: true, label: 'Toucher cible designee' },
  { skillId: 'tromperie', tier: 'entraine', conditional: true, label: 'Jets TROMPERIE (par Charisme)' },
  // ESPRIT
  { skillId: 'instinct', tier: 'initie', conditional: false, label: 'Initiative' },
  { skillId: 'creativite', tier: 'competent', conditional: true, label: 'Resultat (AUGURE, 1x/Scene)' },
  { skillId: 'connaissance', tier: 'initie', conditional: true, label: 'Domaine de savoir choisi' },
  { skillId: 'connaissance', tier: 'competent', conditional: true, label: '2e domaine de savoir' },
  { skillId: 'connaissance', tier: 'legende', conditional: true, label: '3e domaine (+2 sur domaines)' },
  { skillId: 'investigation', tier: 'entraine', conditional: true, label: 'Via PALACE MENTAL' },
  { skillId: 'investigation', tier: 'maitre', conditional: true, label: 'Jet ESPRIT allie (1x/Scene)' },
  { skillId: 'occultisme', tier: 'legende', conditional: true, label: 'Objets OCCULTE/AUTRE MONDE' },
  { skillId: 'medecine', tier: 'entraine', conditional: true, label: 'Jets d\'Agonie allie' },
]

function getRollBonusesForSkill(skillId: SkillId): (RollBonus & { anchorId: string })[] {
  if (!character.value) return []
  const info = getSkillInfo(skillId)
  if (!info?.tier) return []

  const tierOrder = ['incompetent', 'initie', 'entraine', 'competent', 'maitre', 'legende']
  const currentIndex = tierOrder.indexOf(info.tier)

  const results: (RollBonus & { anchorId: string })[] = []

  for (const def of ROLL_BONUSES) {
    if (def.skillId !== skillId) continue
    const defIndex = tierOrder.indexOf(def.tier)
    if (defIndex > currentIndex) continue

    // Check specialization match if required
    if (def.specId && character.value.specializations[skillId] !== def.specId) continue

    // Compute value
    let value = '+1'
    if (def.skillId === 'tromperie' && def.tier === 'entraine') {
      const bonus = Math.min(getSkillTierIndex('charisme'), 3)
      if (bonus === 0) continue
      value = `+${bonus}`
    }
    if (def.skillId === 'connaissance' && def.tier === 'legende') {
      value = '+2'
    }

    const anchorId = `talent-${skillId}-${def.tier}${def.specId ? '-' + def.specId : ''}`
    results.push({ ...def, value, anchorId })
  }

  return results
}

function scrollToTalent(anchorId: string) {
  const el = document.getElementById(anchorId)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.add('highlight-talent')
  setTimeout(() => el.classList.remove('highlight-talent'), 2000)
}

function goToEdit() {
  router.push(`/character/${characterId}/edit`)
}
</script>

<template>
  <div class="min-h-dvh bg-background px-4 py-6 max-w-2xl mx-auto" v-if="character">
    <header class="mb-6">
      <div class="flex items-center gap-3 mb-3">
        <h1 class="font-headline text-2xl uppercase tracking-wider text-on-surface">{{ character.name }}</h1>
        <div class="flex-1 relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Filtrer..."
            class="pr-10 py-1.5 text-xs w-full"
          />
          <span class="material-symbols-outlined text-base absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">search</span>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <router-link to="/" class="flex items-center justify-center gap-1 text-secondary text-xs font-label uppercase tracking-widest py-2 border border-outline-variant">
          <span class="material-symbols-outlined text-sm">arrow_back</span> Retour
        </router-link>
        <button @click="goToEdit" class="flex items-center justify-center gap-1">
          <span class="material-symbols-outlined text-sm">edit</span> Modifier
        </button>
        <router-link :to="`/character/${characterId}/inventory`" class="flex items-center justify-center gap-1 text-secondary text-xs font-label uppercase tracking-widest py-2 border border-outline-variant">
          <span class="material-symbols-outlined text-sm">inventory_2</span> Inventaire
        </router-link>
        <router-link :to="`/character/${characterId}/tracker`" class="flex items-center justify-center gap-1 text-secondary text-xs font-label uppercase tracking-widest py-2 border border-outline-variant">
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

    <section v-for="cat in categories" :key="cat.key" class="mb-6" v-show="skillsByCategory(cat.key).length > 0">
      <h2 class="mb-3 pb-2 border-b border-outline-variant">{{ cat.label }}</h2>

      <div v-for="skill in skillsByCategory(cat.key)" :key="skill.id" class="bg-surface-container border border-outline-variant p-3 mb-2">
        <div class="flex items-center justify-between">
          <div>
            <strong class="text-on-surface text-sm">{{ skill.name }}</strong>
            <em class="text-on-surface-variant text-xs ml-2">{{ skill.latinName }}</em>
          </div>
          <div class="flex items-center gap-1.5 justify-end">
            <template v-if="getSkillInfo(skill.id as SkillId)?.tier">
              <span class="die-display text-lg font-bold" :class="dieColorClass[getSkillInfo(skill.id as SkillId)!.die!] ?? ''">{{ getSkillInfo(skill.id as SkillId)!.die }}</span>
              <span class="tag" :style="{ borderColor: `var(--color-die-${getSkillInfo(skill.id as SkillId)!.die})`, color: `var(--color-die-${getSkillInfo(skill.id as SkillId)!.die})` }">{{ getSkillInfo(skill.id as SkillId)!.tier }}</span>
              <span v-if="getSkillInfo(skill.id as SkillId)!.totalBonus > 0" class="die-display text-lg font-bold" :class="dieColorClass[getSkillInfo(skill.id as SkillId)!.die!] ?? ''">
                +{{ getSkillInfo(skill.id as SkillId)!.totalBonus }}
              </span>
              <span
                v-for="rb in getRollBonusesForSkill(skill.id as SkillId)"
                :key="rb.anchorId"
                class="tag cursor-pointer hover:opacity-80 transition-opacity"
                style="border-color: var(--color-die-d20); color: var(--color-die-d20);"
                :title="rb.label"
                @click="scrollToTalent(rb.anchorId)"
              >{{ rb.value }}{{ rb.conditional ? '*' : '' }}</span>
            </template>
            <span v-else class="text-on-surface-variant text-xs">—</span>
          </div>
        </div>

        <div v-if="getVisibleTalentsForSkill(skill.id as SkillId).length > 0" class="mt-2 pt-2 border-t border-outline-variant">
          <div
            v-for="tier in getVisibleTalentsForSkill(skill.id as SkillId)"
            :key="tier.level"
            :id="`talent-${skill.id}-${tier.level}`"
            class="mb-3 transition-colors duration-500"
          >
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-label text-xs uppercase tracking-widest" :class="dieColorClass[tier.die] ?? 'text-on-surface'">{{ tier.talentName }}</span>
              <span class="tag" :style="{ borderColor: `var(--color-die-${tier.die})`, color: `var(--color-die-${tier.die})` }">{{ tier.die }}</span>
              <span v-if="hasReroll(tier.description)" class="tag" style="border-color: var(--color-die-d20); color: var(--color-die-d20);">RELANCE</span>
              <span v-for="t in detectTags(tier.description)" :key="t.label" class="tag" :style="{ borderColor: t.color, color: t.color }">{{ t.label }}</span>
            </div>
            <p class="text-on-surface-variant text-xs mt-1">{{ tier.description }}</p>
          </div>

          <div
            v-if="getChosenSpecialization(skill.id as SkillId)"
            :id="`talent-${skill.id}-competent-${character.specializations[skill.id as SkillId]}`"
            class="bg-primary-container border border-primary-container p-2 mt-2 transition-colors duration-500"
          >
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
