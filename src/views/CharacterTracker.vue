<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCharacterStore } from '../stores/characterStore'
import { useCharacterStats } from '../composables/useCharacterStats'
import { useCombatTracker } from '../composables/useCombatTracker'
import { computeSkillTier } from '../composables/useSkillCalculator'
import { getWeaponById } from '../data/weapons'
import type { InventoryItem } from '../models/character'

const route = useRoute()
const store = useCharacterStore()

const characterId = route.params.id as string
const character = computed(() => store.characters.find(c => c.id === characterId))

const characterRef = ref(character.value!)
watch(character, (val) => { if (val) characterRef.value = val }, { deep: true })

const stats = useCharacterStats(characterRef)

const tracker = useCombatTracker(characterRef, stats.maxHP, stats.maxSanity, stats.maxSouffle)

function persist() {
  store.updateCharacter(characterId, {
    tracker: { ...characterRef.value.tracker },
  })
}

// Quick damage/heal inputs
const hpDelta = ref(1)
const sanityDelta = ref(1)
const souffleDelta = ref(1)

function doModifyHP(delta: number) { tracker.modifyHP(delta); persist() }
function doModifySanity(delta: number) { tracker.modifySanity(delta); persist() }
function doModifySouffle(delta: number) { tracker.modifySouffle(delta); persist() }
function doReset() { tracker.resetToMax(); persist() }
function doAddEffect(effect: string) { tracker.addEffect(effect); persist() }
function doRemoveEffect(effect: string) { tracker.removeEffect(effect); persist() }
function doClearEffects() { tracker.clearEffects(); persist() }

// New effect input
const newEffect = ref('')
function submitEffect() {
  const effect = newEffect.value.trim().toUpperCase()
  if (!effect) return
  doAddEffect(effect)
  newEffect.value = ''
}

// Common effects for quick add
const commonEffects = ['BLESSE', 'PEUR', 'EBRANLE', 'CONFUS', 'DESESPERE', 'OMBRE VIVANTE']

// === Attack list from inventory ===
interface AttackInfo {
  item: InventoryItem
  weaponName: string
  damage: string
  skillDie: string
  skillTier: string
  skillName: string
  rollBonus: number
  baseCost: number  // CS after modifiers
  souffleModifier: number
  category: string
  quality: string
  specialEffects: string[]
  notes: string[]
  ranged: boolean
  fragility: number
}

const qualityLabels: Record<string, string> = {
  faible_qualite: 'Faible Qualite',
  standard: 'Standard',
  chef_doeuvre: "Chef-d'oeuvre",
}

const attacks = computed((): AttackInfo[] => {
  if (!character.value) return []
  const results: AttackInfo[] = []

  for (const item of character.value.inventory) {
    if (!item.weaponId) continue
    const weapon = getWeaponById(item.weaponId)
    if (!weapon) continue

    const isRanged = weapon.ranged
    const skillId = isRanged ? 'archerie' : 'martial'
    const skillName = isRanged ? 'Archerie' : 'Martial'

    const spent = character.value.skills[skillId]?.pointsSpent ?? 0
    const tierResult = computeSkillTier(spent, 0)

    // Base attack cost = 6 CS
    let baseCost = 6

    // CS modifiers from talents (only apply bonuses, not incompetent malus which are handled separately)
    const csM = stats.csModifiers.value
    if (!isRanged) {
      // Martial entraine: -1 CS attaque melee
      if (tierResult.tier !== 'incompetent') {
        baseCost += (csM['attaque_melee'] ?? 0)
      }
    } else {
      // Archerie incompetent: +1 CS attaque distance (only if incompetent)
      // Archerie entraine+: reductions
      baseCost += (csM['attaque_distance'] ?? 0)
    }

    // Post-attack malus (martial incompetent only)
    const postAttackMalus = csM['post_attaque_martiale'] ?? 0

    // Weapon souffle modifier
    const totalCost = baseCost + weapon.souffleModifier
    // CS minimum 2
    const finalCost = Math.max(2, totalCost)

    // Roll bonus (extra points beyond tier)
    const rollBonus = tierResult.extraBonus

    // Damage modifiers
    const dmgM = stats.damageModifiers.value
    const notes: string[] = []

    if (!isRanged && (dmgM['corps_a_corps'] ?? 0) > 0) {
      notes.push(`+${dmgM['corps_a_corps']} degats (Force)`)
    }
    if (isRanged && (dmgM['distance'] ?? 0) > 0) {
      notes.push(`+${dmgM['distance']} degats (Archerie)`)
    }
    if ((dmgM['embusque'] ?? 0) > 0) {
      notes.push(`+${dmgM['embusque']} degats si EMBUSQUE (Ombre)`)
    }
    if ((dmgM['arme_courte'] ?? 0) > 0 && weapon.category === 'legere') {
      notes.push(`+${dmgM['arme_courte']} degats arme COURTE (Ombre)`)
    }
    if ((dmgM['poing_main_nue'] ?? 0) > 0) {
      notes.push(`+${dmgM['poing_main_nue']} degats POING/main nue (Force)`)
    }

    // Quality note
    if (weapon.quality === 'faible_qualite') {
      notes.push('2 des, garder le moins bon')
    } else if (weapon.quality === 'chef_doeuvre') {
      notes.push('2 des, garder le meilleur')
    }

    // Category modifier
    if (weapon.category === 'lourde') {
      notes.push('Arme LOURDE (+1 CS)')
    }

    if (postAttackMalus > 0 && !isRanged && tierResult.tier === 'incompetent') {
      notes.push(`+${postAttackMalus} CS prochaine action martiale (Incompetent)`)
    }

    if (item.currentFragility === 0) {
      notes.push('EMOUSSEE / INUTILISABLE')
    }

    results.push({
      item,
      weaponName: weapon.name,
      damage: weapon.damage,
      skillDie: tierResult.die ?? 'd4',
      skillTier: tierResult.tier ?? 'incompetent',
      skillName,
      rollBonus,
      baseCost: finalCost,
      souffleModifier: weapon.souffleModifier,
      category: weapon.category,
      quality: weapon.quality,
      specialEffects: weapon.specialEffects,
      notes,
      ranged: isRanged,
      fragility: item.currentFragility,
    })
  }

  return results
})

const dieColorMap: Record<string, string> = {
  d4: 'var(--color-die-d4)',
  d6: 'var(--color-die-d6)',
  d8: 'var(--color-die-d8)',
  d10: 'var(--color-die-d10)',
  d12: 'var(--color-die-d12)',
  d20: 'var(--color-die-d20)',
}
</script>

<template>
  <div class="min-h-dvh bg-background px-4 py-6 max-w-2xl mx-auto" v-if="character">
    <header class="mb-6">
      <div class="flex items-center justify-between mb-2">
        <router-link :to="`/character/${characterId}`" class="text-secondary text-xs font-label uppercase tracking-widest inline-flex items-center gap-1">
          <span class="material-symbols-outlined text-sm">arrow_back</span> Retour a la fiche
        </router-link>
        <button class="danger" @click="doReset">
          <span class="material-symbols-outlined text-sm">restart_alt</span> Reinitialiser
        </button>
      </div>
      <h1 class="font-headline text-2xl uppercase tracking-wider text-on-surface">Combat — {{ character.name }}</h1>
      <div class="border-t border-outline-variant mt-3"></div>
    </header>

    <!-- HP -->
    <section class="bg-surface-container border border-outline-variant p-4 mb-4">
      <h2 class="mb-3">Points de Sante (PS)</h2>
      <div class="flex items-baseline gap-2 mb-3">
        <span class="die-display text-primary">{{ tracker.currentHP.value }}</span>
        <span class="text-on-surface-variant text-lg">/</span>
        <span class="font-headline text-on-surface-variant text-lg">{{ stats.maxHP.value }}</span>
      </div>
      <div class="h-1 bg-surface-container-lowest mb-3">
        <div class="stat-bar-fill hp h-full" :style="{ width: stats.maxHP.value > 0 ? `${(tracker.currentHP.value / stats.maxHP.value) * 100}%` : '0%' }"></div>
      </div>
      <div class="flex items-center gap-2">
        <input v-model.number="hpDelta" type="number" min="1" max="99" class="w-16 text-center" />
        <button class="danger flex-1" @click="doModifyHP(-hpDelta)">
          <span class="material-symbols-outlined text-sm">remove</span> Degats
        </button>
        <button class="primary flex-1" @click="doModifyHP(hpDelta)">
          <span class="material-symbols-outlined text-sm">add</span> Soins
        </button>
      </div>
    </section>

    <!-- Sanity -->
    <section class="bg-surface-container border border-outline-variant p-4 mb-4">
      <h2 class="mb-3">Sante Mentale (PSM)</h2>
      <div class="flex items-baseline gap-2 mb-3">
        <span class="die-display text-secondary">{{ tracker.currentSanity.value }}</span>
        <span class="text-on-surface-variant text-lg">/</span>
        <span class="font-headline text-on-surface-variant text-lg">{{ stats.maxSanity.value }}</span>
      </div>
      <div class="h-1 bg-surface-container-lowest mb-3">
        <div class="stat-bar-fill sanity h-full" :style="{ width: stats.maxSanity.value > 0 ? `${(tracker.currentSanity.value / stats.maxSanity.value) * 100}%` : '0%' }"></div>
      </div>
      <div class="flex items-center gap-2">
        <input v-model.number="sanityDelta" type="number" min="1" max="99" class="w-16 text-center" />
        <button class="danger flex-1" @click="doModifySanity(-sanityDelta)">
          <span class="material-symbols-outlined text-sm">remove</span> Perte
        </button>
        <button class="primary flex-1" @click="doModifySanity(sanityDelta)">
          <span class="material-symbols-outlined text-sm">add</span> Recup
        </button>
      </div>
    </section>

    <!-- Souffle -->
    <section class="bg-surface-container border border-outline-variant p-4 mb-4">
      <h2 class="mb-3">Souffle</h2>
      <div class="flex items-baseline gap-2 mb-3">
        <span class="die-display text-tertiary">{{ tracker.currentSouffle.value }}</span>
        <span class="text-on-surface-variant text-lg">/</span>
        <span class="font-headline text-on-surface-variant text-lg">{{ stats.maxSouffle.value }}</span>
      </div>
      <div class="h-1 bg-surface-container-lowest mb-3">
        <div class="stat-bar-fill souffle h-full" :style="{ width: stats.maxSouffle.value > 0 ? `${(tracker.currentSouffle.value / stats.maxSouffle.value) * 100}%` : '0%' }"></div>
      </div>
      <div class="flex items-center gap-2">
        <input v-model.number="souffleDelta" type="number" min="1" max="99" class="w-16 text-center" />
        <button class="danger flex-1" @click="doModifySouffle(-souffleDelta)">
          <span class="material-symbols-outlined text-sm">remove</span> Depense
        </button>
        <button class="primary flex-1" @click="doModifySouffle(souffleDelta)">
          <span class="material-symbols-outlined text-sm">add</span> Recup
        </button>
      </div>
    </section>

    <!-- Attacks -->
    <section class="bg-surface-container border border-outline-variant p-4 mb-4">
      <h2 class="mb-3">Attaques</h2>

      <div v-if="attacks.length === 0" class="text-on-surface-variant text-sm py-4 text-center">
        Aucune arme dans l'inventaire.
      </div>

      <div v-for="atk in attacks" :key="atk.item.id" class="border border-outline-variant p-3 mb-2" :class="{ 'opacity-40': atk.fragility === 0 }">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2 flex-wrap">
            <strong class="text-on-surface text-sm">{{ atk.weaponName }}</strong>
            <span class="tag" :class="atk.ranged ? 'secondary' : ''">{{ atk.ranged ? 'DISTANCE' : 'MELEE' }}</span>
            <span class="tag">{{ atk.category }}</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 mb-2">
          <!-- Skill die -->
          <div class="bg-surface-container-low p-2 text-center">
            <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">{{ atk.skillName }}</p>
            <p class="die-display font-bold" :style="{ color: dieColorMap[atk.skillDie] }">{{ atk.skillDie }}</p>
            <p v-if="atk.rollBonus > 0" class="font-headline text-sm" :style="{ color: dieColorMap[atk.skillDie] }">+{{ atk.rollBonus }}</p>
          </div>
          <!-- Damage -->
          <div class="bg-surface-container-low p-2 text-center">
            <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Degats</p>
            <p class="die-display font-bold text-primary">{{ atk.damage }}</p>
            <p class="font-label text-xs text-on-surface-variant">{{ qualityLabels[atk.quality] }}</p>
          </div>
          <!-- Cost -->
          <div class="bg-surface-container-low p-2 text-center">
            <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Cout</p>
            <p class="die-display font-bold text-tertiary">{{ atk.baseCost }} CS</p>
            <p class="font-label text-xs text-on-surface-variant">Fragilite: {{ atk.fragility }}</p>
          </div>
        </div>

        <!-- Special effects -->
        <div v-if="atk.specialEffects.length > 0" class="flex flex-wrap gap-1 mb-2">
          <span v-for="eff in atk.specialEffects" :key="eff" class="tag primary">{{ eff }}</span>
        </div>

        <!-- Notes (bonus/malus) -->
        <div v-if="atk.notes.length > 0">
          <p v-for="note in atk.notes" :key="note" class="text-xs text-on-surface-variant">
            <span class="text-die-d20">*</span> {{ note }}
          </p>
        </div>
      </div>
    </section>

    <!-- Active Effects -->
    <section class="bg-surface-container border border-outline-variant p-4 mb-4">
      <h2 class="mb-3">Etats actifs</h2>

      <div v-if="tracker.activeEffects.value.length === 0" class="text-on-surface-variant text-sm py-4 text-center">
        Aucun etat actif.
      </div>

      <div v-else class="flex flex-wrap gap-1 mb-3">
        <span v-for="effect in tracker.activeEffects.value" :key="effect" class="tag error inline-flex items-center gap-1">
          {{ effect }}
          <button class="border-0 bg-transparent text-error p-0 text-xs hover:text-on-error-container" @click="doRemoveEffect(effect)">x</button>
        </span>
        <button v-if="tracker.activeEffects.value.length > 0" class="danger text-xs" @click="doClearEffects">
          Tout retirer
        </button>
      </div>

      <div class="flex gap-2 mb-3">
        <input
          v-model="newEffect"
          type="text"
          placeholder="Ajouter un etat..."
          class="flex-1"
          @keyup.enter="submitEffect"
        />
        <button class="primary shrink-0" @click="submitEffect" :disabled="!newEffect.trim()">
          <span class="material-symbols-outlined text-sm">add</span> Ajouter
        </button>
      </div>

      <div class="pt-3 border-t border-outline-variant">
        <span class="font-label text-xs uppercase tracking-widest text-on-surface-variant mr-2">Etats courants :</span>
        <div class="flex flex-wrap gap-1 mt-2">
          <button
            v-for="effect in commonEffects"
            :key="effect"
            class="text-xs"
            @click="doAddEffect(effect)"
            :disabled="tracker.activeEffects.value.includes(effect)"
          >
            {{ effect }}
          </button>
        </div>
      </div>
    </section>
  </div>

  <div v-else class="min-h-dvh bg-background px-4 py-6 max-w-2xl mx-auto">
    <p class="text-on-surface-variant">Personnage introuvable.</p>
    <router-link to="/" class="text-secondary text-xs font-label uppercase tracking-widest">Retour</router-link>
  </div>
</template>
