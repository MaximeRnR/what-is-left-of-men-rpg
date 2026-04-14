# Phase 1 — Fondations + Creation de Personnage

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Contagion PWA project and implement character creation with the 15-point skill allocation system.

**Architecture:** Vue 3 + TypeScript SPA built with Vite, served by a minimal Express server. Pinia store with localStorage plugin for persistence. Game rule data lives in static JSON files. Composables encapsulate all business logic (skill calculation, point budget). UI design comes from Stitch (project ID: `7287220513898071123`) — fetch screens via MCP tools during view implementation.

**Tech Stack:** Vue 3, TypeScript, Vite, Pinia, Vue Router, Vitest, Express

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | Dependencies, scripts |
| `vite.config.ts` | Vite config with Vue plugin |
| `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` | TS config |
| `index.html` | SPA entry point |
| `server.js` | Express: serve `dist/` + SPA fallback |
| `.gitignore` | Ignore node_modules, dist, etc. |
| `src/main.ts` | App bootstrap (Vue + Pinia + Router) |
| `src/App.vue` | Root component with `<router-view>` |
| `src/models/skill.ts` | Types: SkillId, TierLevel, SkillDefinition, SkillTier, PassiveEffect, Specialization |
| `src/models/character.ts` | Types: Character, SkillAllocation, InventoryItem, CombatTracker |
| `src/data/skills/corps.json` | Skill definitions for CORPS (7 skills) |
| `src/data/skills/coeur.json` | Skill definitions for COEUR (6 skills) |
| `src/data/skills/esprit.json` | Skill definitions for ESPRIT (6 skills) |
| `src/data/skills/index.ts` | Re-export all skills as typed array |
| `src/composables/useSkillCalculator.ts` | Compute tier + die + bonus from points spent |
| `src/composables/usePointBudget.ts` | Track 15-point budget, validate allocation |
| `src/stores/characterStore.ts` | Pinia store: CRUD characters, localStorage sync |
| `src/router/index.ts` | Vue Router config |
| `src/views/CharacterList.vue` | List, create, delete characters |
| `src/views/CharacterCreate.vue` | 15-point allocation wizard |
| `src/__tests__/useSkillCalculator.test.ts` | Tests for skill calculator |
| `src/__tests__/usePointBudget.test.ts` | Tests for point budget |
| `src/__tests__/characterStore.test.ts` | Tests for store CRUD + persistence |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `.gitignore`, `src/main.ts`, `src/App.vue`

- [ ] **Step 1: Initialize project with Vite**

```bash
cd /Users/mreynier/projects/what-is-left-of-men
npm create vite@latest . -- --template vue-ts
```

If prompted about existing files, choose to overwrite (the existing files are just README.md, regles-du-jeu.md and docs/).

- [ ] **Step 2: Install dependencies**

```bash
npm install pinia vue-router
npm install -D vitest @vue/test-utils jsdom
```

- [ ] **Step 3: Add vitest config to vite.config.ts**

Replace `vite.config.ts` content with:

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

- [ ] **Step 4: Add test script to package.json**

Add to the `"scripts"` section:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Update .gitignore**

Ensure `.gitignore` contains:

```
node_modules
dist
*.local
.DS_Store
```

- [ ] **Step 6: Setup src/main.ts with Pinia and Router stubs**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./views/CharacterList.vue') },
    { path: '/character/new', component: () => import('./views/CharacterCreate.vue') },
  ],
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

- [ ] **Step 7: Setup src/App.vue**

```vue
<template>
  <router-view />
</template>
```

- [ ] **Step 8: Create stub views so the app compiles**

Create `src/views/CharacterList.vue`:

```vue
<template>
  <div>
    <h1>Personnages</h1>
  </div>
</template>
```

Create `src/views/CharacterCreate.vue`:

```vue
<template>
  <div>
    <h1>Nouveau Personnage</h1>
  </div>
</template>
```

- [ ] **Step 9: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts, page shows "Personnages" at `/`.

- [ ] **Step 10: Verify tests run**

Create `src/__tests__/setup.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('setup', () => {
  it('works', () => {
    expect(1 + 1).toBe(2)
  })
})
```

```bash
npm run test
```

Expected: 1 test passes.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json index.html .gitignore src/ env.d.ts
git commit -m "feat: scaffold Vue 3 + TS project with Vite, Pinia, Vue Router, Vitest"
```

---

### Task 2: TypeScript Models

**Files:**
- Create: `src/models/skill.ts`, `src/models/character.ts`

- [ ] **Step 1: Create src/models/skill.ts**

```typescript
export type SkillId =
  // Corps
  | 'martial' | 'archerie' | 'endurance' | 'force' | 'agilite' | 'ombre' | 'artisanat'
  // Coeur
  | 'charisme' | 'empathie' | 'courage' | 'perception' | 'tromperie' | 'intimidation'
  // Esprit
  | 'instinct' | 'creativite' | 'connaissance' | 'investigation' | 'occultisme' | 'medecine'

export const ALL_SKILL_IDS: SkillId[] = [
  'martial', 'archerie', 'endurance', 'force', 'agilite', 'ombre', 'artisanat',
  'charisme', 'empathie', 'courage', 'perception', 'tromperie', 'intimidation',
  'instinct', 'creativite', 'connaissance', 'investigation', 'occultisme', 'medecine',
]

export type TierLevel = 'incompetent' | 'initie' | 'entraine' | 'competent' | 'maitre' | 'legende'

export const TIER_ORDER: TierLevel[] = ['incompetent', 'initie', 'entraine', 'competent', 'maitre', 'legende']

export const TIER_CUMULATIVE_COST: Record<TierLevel, number> = {
  incompetent: 1,
  initie: 2,
  entraine: 4,
  competent: 6,
  maitre: 10,
  legende: Infinity,
}

export const TIER_DIE: Record<TierLevel, string> = {
  incompetent: 'd4',
  initie: 'd6',
  entraine: 'd8',
  competent: 'd10',
  maitre: 'd12',
  legende: 'd20',
}

export type SkillCategory = 'corps' | 'coeur' | 'esprit'

export interface PassiveEffect {
  type: 'hp' | 'sanity' | 'souffle' | 'st' | 'cs_modifier' | 'damage' | 'initiative'
  value: number
  condition?: string
}

export interface Specialization {
  id: string
  name: string
  description: string
  passiveEffects: PassiveEffect[]
}

export interface SkillTier {
  level: TierLevel
  die: string
  costToReach: number
  talentName: string
  description: string
  isMalus: boolean
  passiveEffects: PassiveEffect[]
  specializations?: Specialization[]
}

export interface SkillDefinition {
  id: SkillId
  name: string
  latinName: string
  category: SkillCategory
  tiers: SkillTier[]
}
```

- [ ] **Step 2: Create src/models/character.ts**

```typescript
import type { SkillId } from './skill'

export interface SkillAllocation {
  pointsSpent: number
}

export interface InventoryItem {
  id: string
  weaponId?: string
  customName?: string
  customDescription?: string
  traits: string[]
  currentFragility: number
}

export interface CombatTracker {
  currentHP: number
  currentSanity: number
  currentSouffle: number
  activeEffects: string[]
}

export interface Character {
  id: string
  name: string
  story: string
  skills: Record<SkillId, SkillAllocation>
  specializations: Partial<Record<SkillId, string>>
  bonusPoints: Partial<Record<SkillId, number>>
  inventory: InventoryItem[]
  tracker: CombatTracker
  createdAt: number
  updatedAt: number
}

export function createEmptyCharacter(id: string, name: string): Character {
  const skills = {} as Record<SkillId, SkillAllocation>
  const allSkillIds: SkillId[] = [
    'martial', 'archerie', 'endurance', 'force', 'agilite', 'ombre', 'artisanat',
    'charisme', 'empathie', 'courage', 'perception', 'tromperie', 'intimidation',
    'instinct', 'creativite', 'connaissance', 'investigation', 'occultisme', 'medecine',
  ]
  for (const id of allSkillIds) {
    skills[id] = { pointsSpent: 0 }
  }

  const now = Date.now()
  return {
    id,
    name,
    story: '',
    skills,
    specializations: {},
    bonusPoints: {},
    inventory: [],
    tracker: {
      currentHP: 10,
      currentSanity: 10,
      currentSouffle: 10,
      activeEffects: [],
    },
    createdAt: now,
    updatedAt: now,
  }
}
```

- [ ] **Step 3: Verify compilation**

```bash
npx vue-tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/models/
git commit -m "feat: add TypeScript models for Character and Skill definitions"
```

---

### Task 3: Skill JSON Data Files

**Files:**
- Create: `src/data/skills/corps.json`, `src/data/skills/coeur.json`, `src/data/skills/esprit.json`, `src/data/skills/index.ts`

This task creates the JSON data for all 19 skills. Only the first 2 skills of each category are shown in full below — the remaining skills follow the same structure. The engineer must fill them in from `regles-du-jeu.md`. Key rules for encoding:

- `passiveEffects` only for **calculable permanent bonuses** (e.g., +1 PV, -1 CS, +1 ST, +1 Souffle)
- `description` contains the **full talent text** including contextual/conditional effects
- `isMalus: true` only for `incompetent` tiers
- `specializations` only on tiers that require a choice (usually `competent`)

- [ ] **Step 1: Create src/data/skills/corps.json**

```json
[
  {
    "id": "martial",
    "name": "Martial",
    "latinName": "Arma Artem",
    "category": "corps",
    "tiers": [
      {
        "level": "incompetent",
        "die": "d4",
        "costToReach": 1,
        "talentName": "Violence maladroite",
        "description": "Apres une ATTAQUE, votre prochaine action martiale coute +1 CS.",
        "isMalus": true,
        "passiveEffects": [
          { "type": "cs_modifier", "value": 1, "condition": "post_attaque_martiale" }
        ]
      },
      {
        "level": "initie",
        "die": "d6",
        "costToReach": 2,
        "talentName": "Gestes appris",
        "description": "La premiere ATTAQUE du combat coute -1 CS.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "entraine",
        "die": "d8",
        "costToReach": 4,
        "talentName": "Economie de mouvement",
        "description": "Les ATTAQUES et PARADES coutent -1 CS.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "cs_modifier", "value": -1, "condition": "attaque_melee" },
          { "type": "cs_modifier", "value": -1, "condition": "parade" }
        ]
      },
      {
        "level": "competent",
        "die": "d10",
        "costToReach": 6,
        "talentName": "Lecture du combat",
        "description": "Choisir une specialisation lors de l'acquisition.",
        "isMalus": false,
        "passiveEffects": [],
        "specializations": [
          {
            "id": "pression",
            "name": "Pression",
            "description": "Une fois par Tour, si votre ATTAQUE touche, la prochaine ATTAQUE contre cette cible coute -1 CS.",
            "passiveEffects": []
          },
          {
            "id": "discipline",
            "name": "Discipline",
            "description": "Vos parades beneficient d'un bonus de +1 et vous gagnez ARMURE 1. Ce bonus s'applique aux parades et esquives reactives tant que vous avez au moins 1 Souffle restant.",
            "passiveEffects": []
          }
        ]
      },
      {
        "level": "maitre",
        "die": "d12",
        "costToReach": 10,
        "talentName": "Domination de la Tempo",
        "description": "Une fois par Tour, lorsque vous reussissez une PARADE ou une ESQUIVE, vous pouvez immediatement effectuer une ATTAQUE pour 3 CS, meme si ce n'est pas votre Tour.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "legende",
        "die": "d20",
        "costToReach": 999,
        "talentName": "Arma Artem",
        "description": "Une fois par Combat, pendant un Tour, chaque attaque reussie que vous realisez vous rend 1 Souffle. A la fin de votre round, infligez 1 degats pour chaque attaque reussie.",
        "isMalus": false,
        "passiveEffects": []
      }
    ]
  },
  {
    "id": "archerie",
    "name": "Archerie",
    "latinName": "Sagittariorum",
    "category": "corps",
    "tiers": [
      {
        "level": "incompetent",
        "die": "d4",
        "costToReach": 1,
        "talentName": "Tir maladroit",
        "description": "Ajoutez +1 CS au cout de toute ATTAQUE a distance.",
        "isMalus": true,
        "passiveEffects": [
          { "type": "cs_modifier", "value": 1, "condition": "attaque_distance" }
        ]
      },
      {
        "level": "initie",
        "die": "d6",
        "costToReach": 2,
        "talentName": "Reflexe Oculaire",
        "description": "La premiere ATTAQUE a distance du combat coute -1 CS.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "entraine",
        "die": "d8",
        "costToReach": 4,
        "talentName": "Decocher",
        "description": "Le SPECIAL : RECHARGER coute -1 CS.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "cs_modifier", "value": -1, "condition": "recharger" }
        ]
      },
      {
        "level": "competent",
        "die": "d10",
        "costToReach": 6,
        "talentName": "Choix tactique",
        "description": "Choisir une specialisation lors de l'acquisition.",
        "isMalus": false,
        "passiveEffects": [],
        "specializations": [
          {
            "id": "tireur_precis",
            "name": "Tireur Precis",
            "description": "+1 aux Tirs Moyenne et Longue Portee.",
            "passiveEffects": []
          },
          {
            "id": "tireur_rapide",
            "name": "Tireur Rapide",
            "description": "+1 aux Tirs Courte Portee et -1CS sur l'ATTAQUE a distance.",
            "passiveEffects": [
              { "type": "cs_modifier", "value": -1, "condition": "attaque_distance" }
            ]
          }
        ]
      },
      {
        "level": "maitre",
        "die": "d12",
        "costToReach": 10,
        "talentName": "Oeil de faucon",
        "description": "+1 Degats a Distance. Une fois par Tour, vous pouvez relancer un jet de Tir rate en depensant 1 CS supplementaire.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "damage", "value": 1, "condition": "distance" }
        ]
      },
      {
        "level": "legende",
        "die": "d20",
        "costToReach": 999,
        "talentName": "La 9eme Fleche",
        "description": "Si vous etes Tireur Rapide : Une fois par Combat, pendant un Tour, vous pouvez effectuer une ATTAQUE a distance gratuite sur chaque cible que vous avez deja touche. Si vous etes Tireur Precis : Une fois par combat, votre prochain tir inflige 1d4 Degats en plus, ignore l'armure et a l'effet Zone Courte.",
        "isMalus": false,
        "passiveEffects": []
      }
    ]
  },
  {
    "id": "endurance",
    "name": "Endurance",
    "latinName": "Patientia",
    "category": "corps",
    "tiers": [
      {
        "level": "incompetent",
        "die": "d4",
        "costToReach": 1,
        "talentName": "Corps fragile",
        "description": "Chaque fois que vous subissez un degat, ajoutez +1 au cout de Souffle pour toute action CORPS ce Tour. Vos PV de depart sont -1.",
        "isMalus": true,
        "passiveEffects": [
          { "type": "hp", "value": -1 }
        ]
      },
      {
        "level": "initie",
        "die": "d6",
        "costToReach": 2,
        "talentName": "Premiers pas",
        "description": "+1 PV. De plus, vous pouvez ignorer 1 petit malus temporaire lie a la fatigue ou a l'effort.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "hp", "value": 1 }
        ]
      },
      {
        "level": "entraine",
        "die": "d8",
        "costToReach": 4,
        "talentName": "Tenacite",
        "description": "+1 PV. Vos efforts prolonges coutent 1 CS de moins par Tours pour maintenir une action continue.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "hp", "value": 1 }
        ]
      },
      {
        "level": "competent",
        "die": "d10",
        "costToReach": 6,
        "talentName": "Robustesse",
        "description": "+1 PV. Vous reduisez tout malus appliques aux jets de CORPS lies a l'etat Blesse.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "hp", "value": 1 }
        ]
      },
      {
        "level": "maitre",
        "die": "d12",
        "costToReach": 10,
        "talentName": "Endurance de fer",
        "description": "+2 PV et +1 Souffle. Tous les effets negatifs ont une duree reduite de 1 avec pour minimum 1 tour.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "hp", "value": 2 },
          { "type": "souffle", "value": 1 }
        ]
      },
      {
        "level": "legende",
        "die": "d20",
        "costToReach": 999,
        "talentName": "Coeur de Titan",
        "description": "Une fois par combat, si vous tombez a 0 PV, lancez 1d10 et regagnez autant de PV. Vous recuperez 1 PV a la fin de votre Tour tant que vous avez au moins 1 Souffle restant et sur un jet d'Endurance reussi.",
        "isMalus": false,
        "passiveEffects": []
      }
    ]
  },
  {
    "id": "force",
    "name": "Force",
    "latinName": "Fortitudo",
    "category": "corps",
    "tiers": [
      {
        "level": "incompetent",
        "die": "d4",
        "costToReach": 1,
        "talentName": "Musculature inapte",
        "description": "Les jets pour porter, pousser ou lever des objets lourds sont consideres difficiles (ST+2).",
        "isMalus": true,
        "passiveEffects": []
      },
      {
        "level": "initie",
        "die": "d6",
        "costToReach": 2,
        "talentName": "Force tranquille",
        "description": "+1 aux jets pour porter, soulever ou pousser des objets. Vous pouvez maintenant faire des SPECIAL contextuelles en combat au corps a corps comme ATTRAPER, TACLER, etc.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "entraine",
        "die": "d8",
        "costToReach": 4,
        "talentName": "Puissance maitrisee",
        "description": "1 Relance de Degats par Combat. Vos SPECIAL contextuelles coutent -1 CS.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "cs_modifier", "value": -1, "condition": "special_contextuelles" }
        ]
      },
      {
        "level": "competent",
        "die": "d10",
        "costToReach": 6,
        "talentName": "Mastoque",
        "description": "+1 Degat au Corps a Corps. Choisir une specialisation lors de l'acquisition.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "damage", "value": 1, "condition": "corps_a_corps" }
        ],
        "specializations": [
          {
            "id": "praetor",
            "name": "Praetor",
            "description": "Vos attaques avec des armes LOURDE ont +1 pour toucher.",
            "passiveEffects": []
          },
          {
            "id": "pugiliste",
            "name": "Pugiliste",
            "description": "Vos attaques avec des armes de POING ou a main nue ont +1 Degats.",
            "passiveEffects": [
              { "type": "damage", "value": 1, "condition": "poing_main_nue" }
            ]
          }
        ]
      },
      {
        "level": "maitre",
        "die": "d12",
        "costToReach": 10,
        "talentName": "Colosse",
        "description": "Les armes LOURDE n'ont plus de malus de CS. Vous pouvez depenser 1 CS pour relancer un jet de Corps rate lie a un SPECIAL (ATTRAPER, TACLER, etc.) une fois par Tour.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "legende",
        "die": "d20",
        "costToReach": 999,
        "talentName": "Titan",
        "description": "Une fois par Combat, pendant un Tour vos ATTAQUES au Corps a Corps infligent +2 Degats et tout adversaire touche doit reussir un jet CORPS pour rester debout sinon il tombe. Vous pouvez egalement briser portes, meubles ou obstacles legers sans jet supplementaire et projeter un adversaire sur un autre si le decor le permet.",
        "isMalus": false,
        "passiveEffects": []
      }
    ]
  },
  {
    "id": "agilite",
    "name": "Agilite",
    "latinName": "Agilitas",
    "category": "corps",
    "tiers": [
      {
        "level": "incompetent",
        "die": "d4",
        "costToReach": 1,
        "talentName": "Deux pieds gauches",
        "description": "Toutes vos ESQUIVE ont -1. Lorsque vous etes ENCERCLER, comptez 1 adversaire additionnel.",
        "isMalus": true,
        "passiveEffects": []
      },
      {
        "level": "initie",
        "die": "d6",
        "costToReach": 2,
        "talentName": "Habile",
        "description": "+1 aux jets d'Agilite pour ESQUIVER ou effectuer une action acrobatique simple. Vous augmentez votre ST de 1 lorsque vous declenchez une ATTAQUE D'OPPORTUNITE.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "entraine",
        "die": "d8",
        "costToReach": 4,
        "talentName": "Reflexes affutes",
        "description": "-1 CS pour vos ESQUIVES. Une fois par tour vous pouvez relancer un jet d'Agilite rate. Vous ne pouvez etre ENCERCLER qu'a partir de 3 Adversaires au Corps a Corps.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "cs_modifier", "value": -1, "condition": "esquive" }
        ]
      },
      {
        "level": "competent",
        "die": "d10",
        "costToReach": 6,
        "talentName": "La Voie de l'Eau",
        "description": "+1 ST. Choisir une specialisation lors de l'acquisition.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "st", "value": 1 }
        ],
        "specializations": [
          {
            "id": "danse_de_combat",
            "name": "Danse de Combat",
            "description": "Vos attaques avec des armes LEGERE augmente votre ST de 1 pour chaque touches reussies par Round. (Max 3)",
            "passiveEffects": []
          },
          {
            "id": "ambidextre",
            "name": "Ambidextre",
            "description": "Vous pouvez effectuez une attaque gratuite par tour apres avoir touche avec votre deuxieme arme. Vous avez un malus de -2 pour toucher avec celle-ci.",
            "passiveEffects": []
          }
        ]
      },
      {
        "level": "maitre",
        "die": "d12",
        "costToReach": 10,
        "talentName": "La Voie de l'Air",
        "description": "+1 Souffle. Vous pouvez relancer un jet d'Agilite par Tour. Vos ATTAQUES D'OPPORTUNITE sont gratuites.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "souffle", "value": 1 }
        ]
      },
      {
        "level": "legende",
        "die": "d20",
        "costToReach": 999,
        "talentName": "La Voie de l'Orage",
        "description": "Choisir lors de l'acquisition : A) +1 ST B) +1 Souffle. Vos ATTAQUES D'OPPORTUNITE infligent 1 Degats supplementaire. Une fois par Combat, votre prochaine esquive est automatiquement reussie si vous avez depense au moins 5 de Souffle. Vous ignorez les ATTAQUE D'OPPORTUNITE et ne pouvez pas etre ENCERCLER.",
        "isMalus": false,
        "passiveEffects": []
      }
    ]
  },
  {
    "id": "ombre",
    "name": "Ombre",
    "latinName": "Umbra",
    "category": "corps",
    "tiers": [
      {
        "level": "incompetent",
        "die": "d4",
        "costToReach": 1,
        "talentName": "Silhouette maladroite",
        "description": "Vous etes toujours considere comme ayant le Focus de vos adversaires tant que vous etes engage au Corps a Corps. Lorsque vous tentez une action de dissimulation, la difficulte est augmentee de 1.",
        "isMalus": true,
        "passiveEffects": []
      },
      {
        "level": "initie",
        "die": "d6",
        "costToReach": 2,
        "talentName": "Presence trouble",
        "description": "+1 aux jets d'Ombre pour se cacher, se deplacer discretement ou brouiller l'attention. Si vous frappez un adversaire qui ne vous a pas attaque ce tour-ci, vous etes considere comme EMBUSQUE pour cette attaque et cette attaque uniquement.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "entraine",
        "die": "d8",
        "costToReach": 4,
        "talentName": "Pas feutres",
        "description": "+1 Touche avec les armes COURTE et POING lorsque vous etes EMBUSQUE. Une fois par tour, apres avoir reussi une attaque, vous pouvez changer de position narrative sans cout supplementaire.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "competent",
        "die": "d10",
        "costToReach": 6,
        "talentName": "Angle mort",
        "description": "+1 ST. Choisir une specialisation lors de l'acquisition.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "st", "value": 1 }
        ],
        "specializations": [
          {
            "id": "gredin",
            "name": "Gredin",
            "description": "+1 ST. Vous pouvez rediriger le Focus d'un adversaire sur la cible de votre choix lorsque vous frappez avec l'effet EMBUSQUE.",
            "passiveEffects": [
              { "type": "st", "value": 1 }
            ]
          },
          {
            "id": "assassin",
            "name": "Assassin",
            "description": "Vous infligez +1 Degats avec les armes COURTE, les attaques contre les cibles dont vous n'avez pas le Focus coutent -1 CS.",
            "passiveEffects": [
              { "type": "damage", "value": 1, "condition": "arme_courte" },
              { "type": "cs_modifier", "value": -1, "condition": "sans_focus" }
            ]
          }
        ]
      },
      {
        "level": "maitre",
        "die": "d12",
        "costToReach": 10,
        "talentName": "Chat Gris",
        "description": "+1 Degat lorsque vous frappez un adversaire avec l'effet EMBUSQUE. Votre prochaine attaque declenche une ATTAQUE D'OPPORTUNITE pour tous vos Allies a portee de la cible.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "damage", "value": 1, "condition": "embusque" }
        ]
      },
      {
        "level": "legende",
        "die": "d20",
        "costToReach": 999,
        "talentName": "Ombre Vivante",
        "description": "Une fois par combat, vous pouvez gagner le statut OMBRE VIVANTE en depensant 5 Souffle. Ce statut disparait lorsque vous etes touche une premiere fois ou si vous avez moins d'1 Souffle a la fin du tour. Tant que vous etes OMBRE VIVANTE : +1 ST, vous etes considere sans le Focus de tous les adversaires, votre premiere attaque contre une cible qui ne vous Focus pas pendant le combat inflige +3 Degats et ignore l'Armure.",
        "isMalus": false,
        "passiveEffects": []
      }
    ]
  },
  {
    "id": "artisanat",
    "name": "Artisanat",
    "latinName": "Artificium",
    "category": "corps",
    "tiers": [
      {
        "level": "incompetent",
        "die": "d4",
        "costToReach": 1,
        "talentName": "Mains malhabiles",
        "description": "Toute tentative de creation ou reparation a une consequence negative mineure (temps double, materiau endommage, effet instable) en cas d'echec. Vous ne pouvez pas identifier les Traits d'un objet sans aide.",
        "isMalus": true,
        "passiveEffects": []
      },
      {
        "level": "initie",
        "die": "d6",
        "costToReach": 2,
        "talentName": "Bricoleur",
        "description": "Vous pouvez identifier les objets, substances ou mecanismes simples (hors OCCULTE ou AUTRE MONDE). Vous pouvez reparer ou fabriquer des objets simples avec les materiaux appropries. Vous pouvez ajouter le Trait RUDIMENTAIRE a une creation pour remplacer un materiau manquant.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "entraine",
        "die": "d8",
        "costToReach": 4,
        "talentName": "Inventeur",
        "description": "Vous pouvez fabriquer une creation simple sans materiel mais celle-ci gagne automatiquement un Trait negatif au choix du MJ. Vous pouvez convertir 2 materiaux COMMUN en 1 materiau PEU COMMUN narrativement coherent. Votre capacite de fabrication peut etre utilisee en Combat.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "competent",
        "die": "d10",
        "costToReach": 6,
        "talentName": "Ingenieur",
        "description": "Vous pouvez identifier les objets, substances ou mecanismes complexes (hors OCCULTE ou AUTRE MONDE). Vous pouvez reparer ou fabriquer des objets complexes avec les materiaux appropries. Lorsque vous creez ou modifiez un objet, vous pouvez ajouter OU retirer un Trait narrativement coherent et sur reussite d'un jet d'Artisanat Difficile.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "maitre",
        "die": "d12",
        "costToReach": 10,
        "talentName": "Maitre d'Oeuvre",
        "description": "Vous pouvez augmenter la qualite d'un objet sur reussite d'un jet d'Artisanat Difficile. Vos creations necessitent un materiel en moins narrativement coherent. Vous pouvez convertir 2 materiaux PEU COMMUN en 1 materiau RARE narrativement coherent. Vous pouvez appliquer 1 Effet Negatif sur une Cible si cela est narrativement coherent et sur reussite d'un jet d'Artisanat au choix du MJ.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "legende",
        "die": "d20",
        "costToReach": 999,
        "talentName": "Architecte du Possible",
        "description": "Une fois par Session, vous pouvez concevoir une creation unique : elle possede 2 Traits positifs, ignore un prerequis de materiau, porte le nom que vous desirez. Une fois par Scene vous pouvez reinterpreter librement un Trait existant d'un objet tant que la narration le justifie. Vous avez un bonus de +1 sur vos Jets effectues avec un objet COMPLEXE ou de votre creation.",
        "isMalus": false,
        "passiveEffects": []
      }
    ]
  }
]
```

- [ ] **Step 2: Create src/data/skills/coeur.json**

```json
[
  {
    "id": "charisme",
    "name": "Charisme",
    "latinName": "Praesentia",
    "category": "coeur",
    "tiers": [
      {
        "level": "incompetent",
        "die": "d4",
        "costToReach": 1,
        "talentName": "Presence effacee",
        "description": "Vous avez -1 a tous les jets sociaux de COEUR face a des inconnus. Lorsque vous subissez une intimidation, une provocation ou une humiliation publique, perdez 1 PSM. Vous etes plus facilement ignore : le MJ peut detourner le Focus narratif de vous mais vous etes aussi moins facilement le Focus de vos adversaires.",
        "isMalus": true,
        "passiveEffects": []
      },
      {
        "level": "initie",
        "die": "d6",
        "costToReach": 2,
        "talentName": "Voix posee",
        "description": "+1 aux jets de COEUR pour convaincre, rassurer ou calmer une situation tendue. Une fois par Scene, vous pouvez empecher une escalade immediate (violence, panique, rupture de negociation) sur un jet de Charisme Simple.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "entraine",
        "die": "d8",
        "costToReach": 4,
        "talentName": "Autorite naturelle",
        "description": "1 Relance de jet de COEUR par Scene. Lorsque vous prenez la parole dans un groupe, vous pouvez imposer le rythme : le premier jet de COEUR en opposition contre vous a -1.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "competent",
        "die": "d10",
        "costToReach": 6,
        "talentName": "Ascendant",
        "description": "Choisir une specialisation lors de l'acquisition.",
        "isMalus": false,
        "passiveEffects": [],
        "specializations": [
          {
            "id": "meneur",
            "name": "Meneur",
            "description": "Lorsque vous reussissez un jet de COEUR, un allie qui vous entend ou voit gagne un +1 sur le jet des de son choix pour cette Scene.",
            "passiveEffects": []
          },
          {
            "id": "manipulateur",
            "name": "Manipulateur",
            "description": "Une fois par Scene, si vous reussissez un jet de COEUR, vous pouvez faire agir une cible contre son interet immediat, tant que cela reste plausible narrativement.",
            "passiveEffects": []
          }
        ]
      },
      {
        "level": "maitre",
        "die": "d12",
        "costToReach": 10,
        "talentName": "Presence ecrasante",
        "description": "+1 ST contre les Humains. Lorsque vous reussissez un jet de COEUR Difficile, vous pouvez infliger l'etat EBRANLE a une cible humaine jusqu'a la fin de la Scene.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "st", "value": 1, "condition": "contre_humains" }
        ]
      },
      {
        "level": "legende",
        "die": "d20",
        "costToReach": 999,
        "talentName": "Symbole Vivant",
        "description": "Une fois par Session, vous pouvez redefinir la dynamique emotionnelle d'une Scene. Vous ignorez les malus lies a l'etat DESESPERE. Vos allies a portee peuvent relancer un jet de COEUR rate 1 fois par Scene.",
        "isMalus": false,
        "passiveEffects": []
      }
    ]
  },
  {
    "id": "empathie",
    "name": "Empathie",
    "latinName": "Affectio",
    "category": "coeur",
    "tiers": [
      {
        "level": "incompetent",
        "die": "d4",
        "costToReach": 1,
        "talentName": "Distance emotionnelle",
        "description": "Lorsque vous tentez d'AIDER une cible, le CS de l'Aide augmente de +1. En cas d'echec critique sur un jet de COEUR, vous perdez 1 PSM.",
        "isMalus": true,
        "passiveEffects": [
          { "type": "cs_modifier", "value": 1, "condition": "aider" }
        ]
      },
      {
        "level": "initie",
        "die": "d6",
        "costToReach": 2,
        "talentName": "Ecoute attentive",
        "description": "+1 aux jets d'Empathie pour ressentir l'etat emotionnel d'une cible, detecter le mensonge ou comprendre une reaction. Une fois par Scene, vous pouvez annuler la perte de 1 PSM subie par un allie que vous soutenez verbalement ou physiquement.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "entraine",
        "die": "d8",
        "costToReach": 4,
        "talentName": "Soutien sincere",
        "description": "-1 CS au cout de l'AIDE. Lorsque vous aidez avec succes, la cible peut choisir : soit de relancer son jet, soit de recuperer 1d4 PSM.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "cs_modifier", "value": -1, "condition": "aider" }
        ]
      },
      {
        "level": "competent",
        "die": "d10",
        "costToReach": 6,
        "talentName": "Ancrage",
        "description": "+2 PSM. Une fois par Scene, lorsque vous reussissez un jet d'Empathie, vous pouvez retirer un effet negatif MENTAL a une cible consentante.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "sanity", "value": 2 }
        ]
      },
      {
        "level": "maitre",
        "die": "d12",
        "costToReach": 10,
        "talentName": "Apaisement",
        "description": "Votre AIDE peut etre relancee 1 fois par Scene. Vous pouvez enlever l'etat DESESPERE d'une cible sur un jet d'Empathie de Difficulte Simple.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "legende",
        "die": "d20",
        "costToReach": 999,
        "talentName": "Coeur Ouvert",
        "description": "Une fois par Session, vous pouvez partager votre stabilite emotionnelle, choisissez jusqu'a 3 allies a portee : ils recuperent 1d8 PSM chacun, ils ignorent les malus lies a la peur, au doute ou au desespoir jusqu'a la fin de la Scene.",
        "isMalus": false,
        "passiveEffects": []
      }
    ]
  },
  {
    "id": "courage",
    "name": "Courage",
    "latinName": "Animo",
    "category": "coeur",
    "tiers": [
      {
        "level": "incompetent",
        "die": "d4",
        "costToReach": 1,
        "talentName": "Volonte Fragile",
        "description": "En cas d'echec sur vos jets de COURAGE, vous perdez 1 PSM supplementaire.",
        "isMalus": true,
        "passiveEffects": []
      },
      {
        "level": "initie",
        "die": "d6",
        "costToReach": 2,
        "talentName": "Rationnel",
        "description": "Choisissez 1 Trait d'opposants, vous obtenez un +1 aux jets de COURAGE contre eux. Une fois par Scene, vous pouvez reduire de 1 la perte de PSM causee par un effet de peur ou de stress.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "entraine",
        "die": "d8",
        "costToReach": 4,
        "talentName": "Inspirant",
        "description": "+1 PSM. Une fois par Scene, lorsque vous reussissez un jet de COURAGE, vous pouvez choisir : soit de donner un bonus de +1 sur son prochain jet, soit de reduire de 1 la perte de PSM subie suite a cet evenement pour vous ou un allie a porte de voix.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "sanity", "value": 1 }
        ]
      },
      {
        "level": "competent",
        "die": "d10",
        "costToReach": 6,
        "talentName": "Sang-Froid",
        "description": "+2 PSM. Une fois par Scene, vous pouvez decider de perdre 1d4 PSM pour relancer un Jet de COEUR lie a un contexte narratif de pression, peur ou de tension.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "sanity", "value": 2 }
        ]
      },
      {
        "level": "maitre",
        "die": "d12",
        "costToReach": 10,
        "talentName": "Refus de ceder",
        "description": "Une fois par Scene, vous pouvez relancer un Jet de Courage. Tant que vous etes sous l'effet d'un etat MENTAL, vous ne subissez pas de malus sur vos actions offensives ou defensives.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "legende",
        "die": "d20",
        "costToReach": 999,
        "talentName": "Inebranlable",
        "description": "Une fois par Session, lorsque vous ou un allie a portee devriez subir un effet MENTAL, vous pouvez l'annuler immediatement. Gagnez un effet positif au choix du MJ et en coherence narrative a la place. Les allies a portee gagnent +1 a leur jets de COURAGE tant qu'ils peuvent vous voir ou vous entendre pour le reste de la scene.",
        "isMalus": false,
        "passiveEffects": []
      }
    ]
  },
  {
    "id": "perception",
    "name": "Perception",
    "latinName": "Sensus",
    "category": "coeur",
    "tiers": [
      {
        "level": "incompetent",
        "die": "d4",
        "costToReach": 1,
        "talentName": "Vision biaisee",
        "description": "Lorsque vous ratez un jet de Perception, le MJ peut vous fournir une information partielle ou trompeuse sans vous le signaler. Vous avez -1 a l'Initiative.",
        "isMalus": true,
        "passiveEffects": [
          { "type": "initiative", "value": -1 }
        ]
      },
      {
        "level": "initie",
        "die": "d6",
        "costToReach": 2,
        "talentName": "Regard affute",
        "description": "+1 aux jets de Perception pour reperer un danger, une incoherence ou une presence dissimulee. Une fois par Scene, vous pouvez poser une question factuelle au MJ sur l'environnement immediat.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "entraine",
        "die": "d8",
        "costToReach": 4,
        "talentName": "Lecture du terrain",
        "description": "+1 a l'Initiative. Au debut d'un combat ou d'une Scene tendue, vous pouvez designer un element de decor ou une position : la premiere action exploitant cet element gagne +1 ou -1 ST (au choix du MJ selon usage).",
        "isMalus": false,
        "passiveEffects": [
          { "type": "initiative", "value": 1 }
        ]
      },
      {
        "level": "competent",
        "die": "d10",
        "costToReach": 6,
        "talentName": "Cible prioritaire",
        "description": "+1 pour Toucher une cible que vous avez designe comme menace. Une fois par Scene, lorsque vous touchez cette cible, vous pouvez annuler un bonus defensif circonstanciel.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "maitre",
        "die": "d12",
        "costToReach": 10,
        "talentName": "Prevoyant",
        "description": "Une fois par Scene, vous pouvez relancer un jet base sur la vue. Vous ne subissez pas de malus lorsque vous etes surpris.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "legende",
        "die": "d20",
        "costToReach": 999,
        "talentName": "6eme Sens",
        "description": "Une fois par Session, vous pouvez declarer une lecture parfaite : vous agissez en premier, quel que soit le resultat d'Initiative, jusqu'a la fin du tour vous ignorez les malus lies a la vue, la premiere attaque ou action hostile contre vous ce tour-ci subit -1, vous pouvez reconstituer ce qui s'est passe dans un lieu recemment tant que des traces existent.",
        "isMalus": false,
        "passiveEffects": []
      }
    ]
  },
  {
    "id": "tromperie",
    "name": "Tromperie",
    "latinName": "Deceptio",
    "category": "coeur",
    "tiers": [
      {
        "level": "incompetent",
        "die": "d4",
        "costToReach": 1,
        "talentName": "Livre ouvert",
        "description": "Lorsque vous ratez un jet de Tromperie, la cible comprend que vous tentez de la tromper, meme si elle ne decouvre pas toute la verite. Les jets de COEUR en opposition contre vous gagnent +1 lorsqu'ils servent a detecter vos intentions.",
        "isMalus": true,
        "passiveEffects": []
      },
      {
        "level": "initie",
        "die": "d6",
        "costToReach": 2,
        "talentName": "Dissimulation instinctive",
        "description": "Vous pouvez mentir, omettre ou detourner une question simple sans eveiller immediatement les soupcons. Une fois par Scene, sur un echec de Tromperie, vous pouvez choisir : soit que la cible doute sans vous demasquer, soit que le mensonge tienne mais genere une consequence narrative differee.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "entraine",
        "die": "d8",
        "costToReach": 4,
        "talentName": "Masque social",
        "description": "+1 a vos jets de TROMPERIE par Niveau de CHARISME (max +3) si coherent narrativement. Lorsque vous reussissez un jet de Tromperie, la cible subit un -1 a son prochain jet de COEUR lie a cette interaction.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "competent",
        "die": "d10",
        "costToReach": 6,
        "talentName": "Narration biaisee",
        "description": "TROMPERIE peut etre utilisee en opposition a EMPATHIE ou PERCEPTION. Une fois par Scene, apres une TROMPERIE reussie, vous pouvez : deplacer le Focus narratif vers un autre personnage ou un autre enjeu, creer une certitude fragile qui ne disparait qu'en cas de preuve flagrante.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "maitre",
        "die": "d12",
        "costToReach": 10,
        "talentName": "Manipulation froide",
        "description": "TROMPERIE ne peut jamais etre affectee par des Malus sur des etats MENTAL. Une fois par Scene, lorsque vous reussissez un jet de Tromperie Difficile : la cible peut etre amenee a agir contre son interet immediat si cela reste en coherence narrative, la cible gagne l'etat CONFUS jusqu'a la fin de la Scene.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "legende",
        "die": "d20",
        "costToReach": 999,
        "talentName": "Maitre des Murmures",
        "description": "Une fois par Session, vous pouvez instaurer une verite alternative durable : elle affecte un groupe, une organisation ou une situation entiere, elle est consideree comme vraie tant qu'elle n'est pas activement deconstruite, toute tentative de la contredire entraine une resistance sociale ou emotionnelle, toutes les cibles perdent 1d4 PSM. Une fois par Scene vous pouvez remplacer un jet de COEUR rate par un jet de TROMPERIE, en acceptant une consequence narrative ulterieure decidee par le MJ.",
        "isMalus": false,
        "passiveEffects": []
      }
    ]
  },
  {
    "id": "intimidation",
    "name": "Intimidation",
    "latinName": "Metus",
    "category": "coeur",
    "tiers": [
      {
        "level": "incompetent",
        "die": "d4",
        "costToReach": 1,
        "talentName": "Menace creuse",
        "description": "Si vous echouez un jet d'INTIMIDATION, votre prochain jet de COEUR subit -1 dans cette interaction.",
        "isMalus": true,
        "passiveEffects": []
      },
      {
        "level": "initie",
        "die": "d6",
        "costToReach": 2,
        "talentName": "Regard percant",
        "description": "Vous pouvez imposer un malaise leger : une cible subit un -1 a ses jets de COEUR dans cette interaction sur un echec de Jet de COURAGE adverse. Une fois par Scene, vous pouvez faire perdre 1 PSM a une cible par la force de votre presence, si cela reste narrativement coherent.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "entraine",
        "die": "d8",
        "costToReach": 4,
        "talentName": "Pression physique",
        "description": "Une fois par Scene, au choix une cible : sur un echec de jet de COURAGE, subit -1 a ses jets de Combat au prochain Tour, ou sur un echec de jet de COURAGE, subit -1 a son ST au prochain Tour.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "competent",
        "die": "d10",
        "costToReach": 6,
        "talentName": "Autorite strategique",
        "description": "Une fois par Scene, sur un echec de jet de COURAGE adverse, aggravez un effet negatif Mental d'1 si coherent narrativement. Les cibles proches de vous subissent -1 a leurs jets d'ESPRIT.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "maitre",
        "die": "d12",
        "costToReach": 10,
        "talentName": "Maitre du frisson",
        "description": "Une fois par Scene, une cible subit EBRANLE ou PEUR sur un echec de jet de COURAGE et subit 1d4 PSM.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "legende",
        "die": "d20",
        "costToReach": 999,
        "talentName": "Terreur incarnee",
        "description": "+1 ST. Une fois par Session, vous pouvez transformer la dynamique d'une scene par votre simple presence : les cibles fuient ou se soumettent sur un echec de jet de COURAGE, toute action hostile contre vous subit -1, toutes cibles restantes subissent l'effet PEUR et EBRANLE.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "st", "value": 1 }
        ]
      }
    ]
  }
]
```

- [ ] **Step 3: Create src/data/skills/esprit.json**

```json
[
  {
    "id": "instinct",
    "name": "Instinct",
    "latinName": "Instinctus",
    "category": "esprit",
    "tiers": [
      {
        "level": "incompetent",
        "die": "d4",
        "costToReach": 1,
        "talentName": "Flou instinctif",
        "description": "-1 a l'Initiative. Vous ne pouvez pas effectuer d'ATTAQUE D'OPPORTUNITE.",
        "isMalus": true,
        "passiveEffects": [
          { "type": "initiative", "value": -1 }
        ]
      },
      {
        "level": "initie",
        "die": "d6",
        "costToReach": 2,
        "talentName": "Reflexes primitifs",
        "description": "+1 a l'Initiative. Une fois par Scene, vous pouvez eviter un danger immediat (piege, chute, objet qui tombe) sans lancer de des, mais l'action est limitee a un mouvement simple ou un geste reflexe.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "initiative", "value": 1 }
        ]
      },
      {
        "level": "entraine",
        "die": "d8",
        "costToReach": 4,
        "talentName": "Anticipation",
        "description": "Une fois par Scene, vous pouvez jouer une premiere fois avant tous les autres personnages puis lors de votre tour avec votre Souffle restant. Vos actions defensives coutent -1 CS si vous etes EMBUSQUE, ENCERCLER ou subissez une ATTAQUE D'OPPORTUNITE.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "competent",
        "die": "d10",
        "costToReach": 6,
        "talentName": "Intuition strategique",
        "description": "Vous pouvez relancer votre jet d'Initiative. Une fois par Scene, vous pouvez anticiper une action ennemie, choisissez un adversaire qui subit un malus OFFENSIF ou DEFENSIF de -1 au choix.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "maitre",
        "die": "d12",
        "costToReach": 10,
        "talentName": "Esprit Vif",
        "description": "Une fois par tour et si vous avez au moins 1 Souffle, vos jets de PARADE ou d'ESQUIVE ont AUGURE, vous lancez 2 des et prenez le meilleur resultat.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "legende",
        "die": "d20",
        "costToReach": 999,
        "talentName": "3eme Oeil",
        "description": "Une fois par Session, vous pouvez anticiper une action ennemie majeure (attaque ou piege) et la neutraliser partiellement avant qu'elle ne se produise. Le premier tour lors d'un Combat, toutes vos actions coutent la moitie de leur CS.",
        "isMalus": false,
        "passiveEffects": []
      }
    ]
  },
  {
    "id": "creativite",
    "name": "Creativite",
    "latinName": "Lorem",
    "category": "esprit",
    "tiers": [
      {
        "level": "incompetent",
        "die": "d4",
        "costToReach": 1,
        "talentName": "Pensee rigide",
        "description": "Lorsque vous tentez une solution non conventionnelle, le MJ peut augmenter la Difficulte ou imposer une contrainte supplementaire.",
        "isMalus": true,
        "passiveEffects": []
      },
      {
        "level": "initie",
        "die": "d6",
        "costToReach": 2,
        "talentName": "Esprit fecond",
        "description": "Une fois par Scene, vous pouvez proposer une approche alternative credible pour resoudre un probleme : le MJ doit en accepter la faisabilite narrative et la difficulte ne peut pas etre augmentee uniquement parce que la solution est inhabituelle. Vous pouvez utiliser CREATIVITE a la place d'ARTISANAT ou de CHARISME pour improviser, mais jamais pour une action planifiee ou repetable.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "entraine",
        "die": "d8",
        "costToReach": 4,
        "talentName": "Connexions inattendues",
        "description": "Une fois par Scene, vous pouvez relancer un de lors d'un jet d'ARTISANAT, de CHARISME ou de CONNAISSANCE si vous decrivez une approche creative ou detournee. Lorsque vous AIDEZ un allie, vous pouvez remplacer le bonus au des par : une reduction de CS de 2, ou l'annulation d'une contrainte narrative mineure.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "competent",
        "die": "d10",
        "costToReach": 6,
        "talentName": "Improvisation brillante",
        "description": "Une fois par Scene, sur coherence narrative, vous pouvez donne AUGURE a votre prochain jet et +1 au resultat.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "maitre",
        "die": "d12",
        "costToReach": 10,
        "talentName": "Genie contextuel",
        "description": "Une fois par Jour, lorsque vous proposez une idee particulierement creative pour resoudre un probleme : elle est consideree comme un succes automatique mais genere une complication nouvelle ou un cout futur decide par le MJ. Une fois par Scene, vous pouvez donner a jusqu'a 2 allies +1d4 sur leur prochain jet.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "legende",
        "die": "d20",
        "costToReach": 999,
        "talentName": "Vision Transformatrice",
        "description": "L'effet de Genie contextuel devient +1d6 et peut cibler jusqu'a 3 allies. Une fois par Session et pendant une Scene, tous les allies a portee peuvent relancer un jet rate selon une justification narrative coherente.",
        "isMalus": false,
        "passiveEffects": []
      }
    ]
  },
  {
    "id": "connaissance",
    "name": "Connaissance",
    "latinName": "Conscientia",
    "category": "esprit",
    "tiers": [
      {
        "level": "incompetent",
        "die": "d4",
        "costToReach": 1,
        "talentName": "Savoir fragmentaire",
        "description": "Lorsque vous ratez un jet de CONNAISSANCE, le MJ peut vous fournir une information incomplete, datee ou biaisee sans vous l'indiquer. Lorsqu'un effet repose sur une mauvaise comprehension (rituel, mecanisme, doctrine, strategie), ses consequences sont aggravees narrativement.",
        "isMalus": true,
        "passiveEffects": []
      },
      {
        "level": "initie",
        "die": "d6",
        "costToReach": 2,
        "talentName": "Education",
        "description": "Choisissez un domaine de savoir, vous obtenez +1 a vos jets le concernant. Une fois par Scene, vous pouvez poser une question factuelle au MJ liee a un domaine de savoir precis.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "entraine",
        "die": "d8",
        "costToReach": 4,
        "talentName": "Analyse methodique",
        "description": "Une fois par Scene, apres avoir observe ou etudie une cible, vous pouvez reveler une faiblesse exploitable : le ST de la cible est reduit de 1, ou un Malus Defensif ou Offensif de -1. Ce dernier reste actif sur la reussite d'un Jet de Connaissance chaque tours.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "competent",
        "die": "d10",
        "costToReach": 6,
        "talentName": "Savoir eprouve",
        "description": "+1 PSM. Choisissez un domaine de savoir, vous obtenez +1 a vos jets le concernant. Une fois par Scene, vous pouvez recuperer 1d4 PSM ou PS.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "sanity", "value": 1 }
        ]
      },
      {
        "level": "maitre",
        "die": "d12",
        "costToReach": 10,
        "talentName": "Erudition complete",
        "description": "Vous obtenez +1 pour utiliser, comprendre ou detourner des objets COMPLEXE ou AUTRE MONDE. Une fois par Scene, lorsque vous reussissez un jet de CONNAISSANCE : vous pouvez cumuler deux effets d'Analyse methodique sur une meme cible, ou augmenter de +1 la valeur d'un malus ou d'une reduction deja appliquee par CONNAISSANCE.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "legende",
        "die": "d20",
        "costToReach": 999,
        "talentName": "Cogito Ergo Sum",
        "description": "Une fois par Scene, lorsque vous ratez un jet de CONNAISSANCE, vous pouvez considerer le resultat comme un succes partiel. Choisissez un domaine de savoir, vous obtenez +1 a vos jets le concernant. Vos domaines de savoir choisis conferent desormais : +2 au lieu de +1 et une interaction secondaire (a definir par domaine).",
        "isMalus": false,
        "passiveEffects": []
      }
    ]
  },
  {
    "id": "investigation",
    "name": "Investigation",
    "latinName": "Inquisitionis",
    "category": "esprit",
    "tiers": [
      {
        "level": "incompetent",
        "die": "d4",
        "costToReach": 1,
        "talentName": "Lecture desorganisee",
        "description": "Lorsque plusieurs indices, pistes ou elements exploitables sont disponibles, vous devez en choisir un seul a traiter. Les autres restent accessibles, mais necessitent plus de temps ou autre selon le contexte.",
        "isMalus": true,
        "passiveEffects": []
      },
      {
        "level": "initie",
        "die": "d6",
        "costToReach": 2,
        "talentName": "Observation structuree",
        "description": "Une fois par Scene, vous pouvez poser une question suffisamment large sur un element de cette derniere pour obtenir une reponse du MJ. Sur un jet d'INVESTIGATION reussi a la difficulte definie par le MJ vous obtenez l'effet PALACE MENTAL selon le contexte narratif.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "entraine",
        "die": "d8",
        "costToReach": 4,
        "talentName": "Reconstruction logique",
        "description": "Une fois par Scene, vous pouvez relancer un jet d'INVESTIGATION. Vous pouvez utiliser votre effet PALACE MENTAL pour donner un +1 a votre prochain jet si il y a une coherence narrative.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "competent",
        "die": "d10",
        "costToReach": 6,
        "talentName": "Schema explicatif",
        "description": "Pour une Scene, vous appliquez -1 ST a une cible au choix. Vous pouvez utiliser votre effet PALACE MENTAL pour appliquer -2 ST si il y a une coherence narrative mais l'effet ne dure qu'un tour.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "maitre",
        "die": "d12",
        "costToReach": 10,
        "talentName": "Architecture mentale",
        "description": "Vous pouvez maintenir 2 PALACE MENTAL simultanement, mais un seul peut etre exploite par tour. Une fois par Scene, lorsque vous exploitez un PALACE MENTAL, vous pouvez faire beneficier un allie d'un +1 sur son prochain Jet d'ESPRIT.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "legende",
        "die": "d20",
        "costToReach": 999,
        "talentName": "Palais de Verre",
        "description": "Une fois par Session, lorsque vous etes sous l'effet de PALACE MENTAL vous pouvez l'utiliser pour jouer 1 tour supplementaire en reaction a une action adverse. Vous obtenez un bonus de +1 a toutes vos actions pour ce tour. Vous ne recuperez que la moitie de votre Souffle au prochain tour.",
        "isMalus": false,
        "passiveEffects": []
      }
    ]
  },
  {
    "id": "occultisme",
    "name": "Occultisme",
    "latinName": "Fabula",
    "category": "esprit",
    "tiers": [
      {
        "level": "incompetent",
        "die": "d4",
        "costToReach": 1,
        "talentName": "Superstition naive",
        "description": "Lorsque vous entrez en contact avec des objets OCCULTE ou AUTRE MONDE, vous perdez 1d4 PSM sur un echec de Jet de COURAGE.",
        "isMalus": true,
        "passiveEffects": []
      },
      {
        "level": "initie",
        "die": "d6",
        "costToReach": 2,
        "talentName": "Heritage etrange",
        "description": "Vous obtenez un objet OCCULTE ou AUTRE MONDE tire au hasard ou cree par le MJ.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "entraine",
        "die": "d8",
        "costToReach": 4,
        "talentName": "Initie a l'Autre",
        "description": "+1 PSM. Une fois par Session, vous pouvez identifier 1d4 Traits d'un objet OCCULTE sur reussite d'un jet de difficulte Moyenne.",
        "isMalus": false,
        "passiveEffects": [
          { "type": "sanity", "value": 1 }
        ]
      },
      {
        "level": "competent",
        "die": "d10",
        "costToReach": 6,
        "talentName": "Occultiste",
        "description": "Vous pouvez utiliser les objets OCCULTE sans faire de Jet d'OCCULTISME a chaque fois. Une fois par Session, vous pouvez identifier 1d4 Traits d'un objet AUTRE MONDE sur reussite d'un jet de difficulte Moyenne.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "maitre",
        "die": "d12",
        "costToReach": 10,
        "talentName": "Savoir ancien",
        "description": "Vous pouvez utiliser les objets AUTRE MONDE sans faire de Jet d'OCCULTISME a chaque fois. Choisir une specialisation lors de l'acquisition.",
        "isMalus": false,
        "passiveEffects": [],
        "specializations": [
          {
            "id": "harmonie",
            "name": "Harmonie",
            "description": "Lorsque vous utilisez un objet OCCULTE ou AUTRE MONDE, les actions liees a celui-ci vous coutent -1 CS.",
            "passiveEffects": [
              { "type": "cs_modifier", "value": -1, "condition": "objet_occulte" }
            ]
          },
          {
            "id": "synthonie",
            "name": "Synthonie",
            "description": "Les objets OCCULTE ou AUTRE MONDE que vous utilisez gagnent un Trait additionnel choisi par le MJ.",
            "passiveEffects": []
          }
        ]
      },
      {
        "level": "legende",
        "die": "d20",
        "costToReach": 999,
        "talentName": "Genome Antediluvien",
        "description": "Une fois par Scene, vous gagnez AUGURE sur vos objets OCCULTE ou AUTRE MONDE. Vous gagnez +1 a vos jets qui utilisent des objets OCCULTE ou AUTRE MONDE. Choisir lors de l'acquisition : A) Sang des Geants — Gagnez +1d4 PS, B) Esprit des Anciens — Gagnez +1d4 PSM, C) Corps des Anges — Gagnez +1 Armure.",
        "isMalus": false,
        "passiveEffects": []
      }
    ]
  },
  {
    "id": "medecine",
    "name": "Medecine",
    "latinName": "Medicamentum",
    "category": "esprit",
    "tiers": [
      {
        "level": "incompetent",
        "die": "d4",
        "costToReach": 1,
        "talentName": "Pratique maladroite",
        "description": "Vos soins sont inefficaces : tout soin reussi rend seulement la moitie des PS attendus (arrondi inferieur).",
        "isMalus": true,
        "passiveEffects": []
      },
      {
        "level": "initie",
        "die": "d6",
        "costToReach": 2,
        "talentName": "Premiers gestes",
        "description": "Une fois par Scene, vous pouvez soigner 1d4 PS sur une cible blessee sur une reussite d'un jet de MEDECINE de Difficulte Simple.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "entraine",
        "die": "d8",
        "costToReach": 4,
        "talentName": "Rebouteur",
        "description": "Vos soins rendent 1 PS supplementaire. Vous pouvez stabiliser un allie en Agonie qui lui permet de rajouter +1 a ses Jets d'Agonie.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "competent",
        "die": "d10",
        "costToReach": 6,
        "talentName": "Apothicaire",
        "description": "Vos soins rendent 1 PS supplementaire. Sur un jet de MEDECINE de Difficulte Moyenne reussi, vous pouvez enlever l'effet BLESSE d'une cible. Un des Jets d'Agonie d'un allie que vous traitez est automatiquement reussi. Vous pouvez cibler 2 fois par Scene pour vos soins.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "maitre",
        "die": "d12",
        "costToReach": 10,
        "talentName": "Medecin-Chirurgien",
        "description": "Sur un jet de MEDECINE de Difficulte Moyenne reussi, vous pouvez reduire les Effets Negatifs PHYSIQUE de 1. Si une cible est BLESSE, vos soins rendent 1 PS supplementaire. Les Cibles de vos Soins gagnent +1 PS Temporaire et +1 Armure non cumulables jusqu'a la fin de la Scene.",
        "isMalus": false,
        "passiveEffects": []
      },
      {
        "level": "legende",
        "die": "d20",
        "costToReach": 999,
        "talentName": "Saint Guerisseur",
        "description": "Vos soins se font sur 1d6. Les Cibles de vos soins gagnent desormais +2 PS Temporaire et +2 Armure non cumulables jusqu'a la fin de la Scene. Une fois par Session, vous pouvez soigner tous les allies a portee d'1d8 PS et reduire les Effets Negatifs de 1.",
        "isMalus": false,
        "passiveEffects": []
      }
    ]
  }
]
```

- [ ] **Step 4: Create src/data/skills/index.ts**

```typescript
import type { SkillDefinition } from '../../models/skill'
import corpsData from './corps.json'
import coeurData from './coeur.json'
import espritData from './esprit.json'

export const corpsSkills = corpsData as SkillDefinition[]
export const coeurSkills = coeurData as SkillDefinition[]
export const espritSkills = espritData as SkillDefinition[]

export const allSkills: SkillDefinition[] = [
  ...corpsSkills,
  ...coeurSkills,
  ...espritSkills,
]

export function getSkillById(id: string): SkillDefinition | undefined {
  return allSkills.find(s => s.id === id)
}
```

- [ ] **Step 5: Add resolveJsonModule to tsconfig.app.json**

Ensure `tsconfig.app.json` has `"resolveJsonModule": true` in `compilerOptions`.

- [ ] **Step 6: Verify compilation**

```bash
npx vue-tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 7: Commit**

```bash
git add src/data/ src/models/
git commit -m "feat: add skill JSON data files for all 19 skills with passive effects"
```

---

### Task 4: useSkillCalculator Composable (TDD)

**Files:**
- Create: `src/composables/useSkillCalculator.ts`
- Test: `src/__tests__/useSkillCalculator.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from 'vitest'
import { computeSkillTier } from '../composables/useSkillCalculator'

describe('computeSkillTier', () => {
  it('returns no tier for 0 points', () => {
    const result = computeSkillTier(0, 0)
    expect(result.tier).toBeNull()
    expect(result.die).toBeNull()
    expect(result.extraBonus).toBe(0)
    expect(result.totalBonus).toBe(0)
  })

  it('returns incompetent for 1 point', () => {
    const result = computeSkillTier(1, 0)
    expect(result.tier).toBe('incompetent')
    expect(result.die).toBe('d4')
    expect(result.extraBonus).toBe(0)
  })

  it('returns initie for 2 points', () => {
    const result = computeSkillTier(2, 0)
    expect(result.tier).toBe('initie')
    expect(result.die).toBe('d6')
    expect(result.extraBonus).toBe(0)
  })

  it('returns initie +1 for 3 points', () => {
    const result = computeSkillTier(3, 0)
    expect(result.tier).toBe('initie')
    expect(result.die).toBe('d6')
    expect(result.extraBonus).toBe(1)
  })

  it('returns entraine for 4 points', () => {
    const result = computeSkillTier(4, 0)
    expect(result.tier).toBe('entraine')
    expect(result.die).toBe('d8')
    expect(result.extraBonus).toBe(0)
  })

  it('returns entraine +1 for 5 points', () => {
    const result = computeSkillTier(5, 0)
    expect(result.tier).toBe('entraine')
    expect(result.die).toBe('d8')
    expect(result.extraBonus).toBe(1)
  })

  it('returns competent for 6 points', () => {
    const result = computeSkillTier(6, 0)
    expect(result.tier).toBe('competent')
    expect(result.die).toBe('d10')
    expect(result.extraBonus).toBe(0)
  })

  it('returns maitre for 10 points', () => {
    const result = computeSkillTier(10, 0)
    expect(result.tier).toBe('maitre')
    expect(result.die).toBe('d12')
    expect(result.extraBonus).toBe(0)
  })

  it('adds bonusPoints to totalBonus', () => {
    const result = computeSkillTier(3, 2)
    expect(result.tier).toBe('initie')
    expect(result.extraBonus).toBe(1)
    expect(result.totalBonus).toBe(3) // 1 extra + 2 bonus
  })

  it('returns competent +3 for 9 points', () => {
    const result = computeSkillTier(9, 0)
    expect(result.tier).toBe('competent')
    expect(result.die).toBe('d10')
    expect(result.extraBonus).toBe(3)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/useSkillCalculator.test.ts
```

Expected: FAIL — module `../composables/useSkillCalculator` not found.

- [ ] **Step 3: Implement useSkillCalculator**

```typescript
import { TIER_ORDER, TIER_CUMULATIVE_COST, TIER_DIE } from '../models/skill'
import type { TierLevel } from '../models/skill'

export interface SkillTierResult {
  tier: TierLevel | null
  die: string | null
  extraBonus: number
  totalBonus: number
}

export function computeSkillTier(pointsSpent: number, bonusPoints: number): SkillTierResult {
  if (pointsSpent === 0) {
    return { tier: null, die: null, extraBonus: 0, totalBonus: bonusPoints }
  }

  let currentTier: TierLevel = 'incompetent'

  for (const tier of TIER_ORDER) {
    if (TIER_CUMULATIVE_COST[tier] <= pointsSpent) {
      currentTier = tier
    } else {
      break
    }
  }

  const extraBonus = pointsSpent - TIER_CUMULATIVE_COST[currentTier]

  return {
    tier: currentTier,
    die: TIER_DIE[currentTier],
    extraBonus,
    totalBonus: extraBonus + bonusPoints,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/useSkillCalculator.test.ts
```

Expected: All 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useSkillCalculator.ts src/__tests__/useSkillCalculator.test.ts
git commit -m "feat: add useSkillCalculator composable with TDD"
```

---

### Task 5: usePointBudget Composable (TDD)

**Files:**
- Create: `src/composables/usePointBudget.ts`
- Test: `src/__tests__/usePointBudget.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
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

  it('cannot reach maitre tier (10 cumulative) during creation', () => {
    const { canAllocate } = setup()
    expect(canAllocate('martial', 10)).toBe(false)
    expect(canAllocate('martial', 9)).toBe(true)
  })

  it('allows reaching maitre when allowMaster is true', () => {
    const character = ref(createEmptyCharacter('test-id', 'Test'))
    const { canAllocate } = usePointBudget(character, { allowMaster: true })
    expect(canAllocate('martial', 10)).toBe(true)
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/usePointBudget.test.ts
```

Expected: FAIL — module `../composables/usePointBudget` not found.

- [ ] **Step 3: Implement usePointBudget**

```typescript
import { computed, type Ref } from 'vue'
import type { Character } from '../models/character'
import type { SkillId } from '../models/skill'
import { ALL_SKILL_IDS, TIER_CUMULATIVE_COST } from '../models/skill'

interface PointBudgetOptions {
  allowMaster?: boolean
}

export function usePointBudget(character: Ref<Character>, options: PointBudgetOptions = {}) {
  const { allowMaster = false } = options

  const totalPoints = computed(() => 15)

  const spentPoints = computed(() => {
    return ALL_SKILL_IDS.reduce((sum, id) => {
      return sum + (character.value.skills[id]?.pointsSpent ?? 0)
    }, 0)
  })

  const remainingPoints = computed(() => totalPoints.value - spentPoints.value)

  function canAllocate(skillId: SkillId, points: number): boolean {
    const current = character.value.skills[skillId]?.pointsSpent ?? 0
    const newTotal = current + points

    if (points > remainingPoints.value) return false
    if (!allowMaster && newTotal >= TIER_CUMULATIVE_COST.maitre) return false

    return true
  }

  function allocate(skillId: SkillId, points: number): void {
    const current = character.value.skills[skillId]?.pointsSpent ?? 0
    character.value.skills[skillId] = { pointsSpent: current + points }
    character.value.updatedAt = Date.now()
  }

  function deallocate(skillId: SkillId, points: number): void {
    const current = character.value.skills[skillId]?.pointsSpent ?? 0
    character.value.skills[skillId] = { pointsSpent: Math.max(0, current - points) }
    character.value.updatedAt = Date.now()
  }

  const isValid = computed(() => {
    if (spentPoints.value > totalPoints.value) return false
    if (!allowMaster) {
      for (const id of ALL_SKILL_IDS) {
        const spent = character.value.skills[id]?.pointsSpent ?? 0
        if (spent >= TIER_CUMULATIVE_COST.maitre) return false
      }
    }
    return true
  })

  return {
    totalPoints,
    spentPoints,
    remainingPoints,
    canAllocate,
    allocate,
    deallocate,
    isValid,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/usePointBudget.test.ts
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/usePointBudget.ts src/__tests__/usePointBudget.test.ts
git commit -m "feat: add usePointBudget composable with TDD"
```

---

### Task 6: Pinia Character Store with localStorage Plugin

**Files:**
- Create: `src/stores/characterStore.ts`
- Test: `src/__tests__/characterStore.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCharacterStore } from '../stores/characterStore'

describe('useCharacterStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('starts with empty characters', () => {
    const store = useCharacterStore()
    expect(store.characters).toEqual([])
    expect(store.activeCharacterId).toBeNull()
  })

  it('creates a character', () => {
    const store = useCharacterStore()
    const char = store.createCharacter('Jean')
    expect(char.name).toBe('Jean')
    expect(store.characters).toHaveLength(1)
    expect(store.characters[0].id).toBe(char.id)
  })

  it('deletes a character', () => {
    const store = useCharacterStore()
    const char = store.createCharacter('Jean')
    store.deleteCharacter(char.id)
    expect(store.characters).toHaveLength(0)
  })

  it('sets active character', () => {
    const store = useCharacterStore()
    const char = store.createCharacter('Jean')
    store.setActiveCharacter(char.id)
    expect(store.activeCharacterId).toBe(char.id)
    expect(store.activeCharacter?.name).toBe('Jean')
  })

  it('updates a character', () => {
    const store = useCharacterStore()
    const char = store.createCharacter('Jean')
    store.updateCharacter(char.id, { name: 'Pierre' })
    expect(store.characters[0].name).toBe('Pierre')
  })

  it('duplicates a character', () => {
    const store = useCharacterStore()
    const char = store.createCharacter('Jean')
    const dupe = store.duplicateCharacter(char.id)
    expect(dupe.name).toBe('Jean (copie)')
    expect(dupe.id).not.toBe(char.id)
    expect(store.characters).toHaveLength(2)
  })

  it('persists to localStorage on change', () => {
    const store = useCharacterStore()
    store.createCharacter('Jean')
    const saved = localStorage.getItem('contagion-characters')
    expect(saved).not.toBeNull()
    const parsed = JSON.parse(saved!)
    expect(parsed.characters).toHaveLength(1)
  })

  it('hydrates from localStorage on init', () => {
    // Seed localStorage
    const store1 = useCharacterStore()
    store1.createCharacter('Jean')

    // New pinia instance reads from localStorage
    setActivePinia(createPinia())
    const store2 = useCharacterStore()
    expect(store2.characters).toHaveLength(1)
    expect(store2.characters[0].name).toBe('Jean')
  })

  it('clears active character when deleted', () => {
    const store = useCharacterStore()
    const char = store.createCharacter('Jean')
    store.setActiveCharacter(char.id)
    store.deleteCharacter(char.id)
    expect(store.activeCharacterId).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/characterStore.test.ts
```

Expected: FAIL — module `../stores/characterStore` not found.

- [ ] **Step 3: Implement the store**

```typescript
import { defineStore } from 'pinia'
import { createEmptyCharacter } from '../models/character'
import type { Character } from '../models/character'

const STORAGE_KEY = 'contagion-characters'

interface CharacterStoreState {
  characters: Character[]
  activeCharacterId: string | null
}

function generateId(): string {
  return crypto.randomUUID()
}

function loadFromStorage(): CharacterStoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      return {
        characters: data.characters ?? [],
        activeCharacterId: data.activeCharacterId ?? null,
      }
    }
  } catch {
    // Corrupted data — start fresh
  }
  return { characters: [], activeCharacterId: null }
}

function saveToStorage(state: CharacterStoreState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    characters: state.characters,
    activeCharacterId: state.activeCharacterId,
  }))
}

export const useCharacterStore = defineStore('characters', {
  state: (): CharacterStoreState => loadFromStorage(),

  getters: {
    activeCharacter(state): Character | undefined {
      return state.characters.find(c => c.id === state.activeCharacterId)
    },
    characterList(state): { id: string; name: string }[] {
      return state.characters.map(c => ({ id: c.id, name: c.name }))
    },
  },

  actions: {
    createCharacter(name: string): Character {
      const char = createEmptyCharacter(generateId(), name)
      this.characters.push(char)
      this._persist()
      return char
    },

    updateCharacter(id: string, patch: Partial<Character>): void {
      const index = this.characters.findIndex(c => c.id === id)
      if (index === -1) return
      Object.assign(this.characters[index], patch, { updatedAt: Date.now() })
      this._persist()
    },

    deleteCharacter(id: string): void {
      this.characters = this.characters.filter(c => c.id !== id)
      if (this.activeCharacterId === id) {
        this.activeCharacterId = null
      }
      this._persist()
    },

    setActiveCharacter(id: string): void {
      this.activeCharacterId = id
      this._persist()
    },

    duplicateCharacter(id: string): Character {
      const original = this.characters.find(c => c.id === id)
      if (!original) throw new Error(`Character ${id} not found`)
      const dupe: Character = JSON.parse(JSON.stringify(original))
      dupe.id = generateId()
      dupe.name = `${original.name} (copie)`
      dupe.createdAt = Date.now()
      dupe.updatedAt = Date.now()
      this.characters.push(dupe)
      this._persist()
      return dupe
    },

    _persist(): void {
      saveToStorage({ characters: this.characters, activeCharacterId: this.activeCharacterId })
    },
  },
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/characterStore.test.ts
```

Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/characterStore.ts src/__tests__/characterStore.test.ts
git commit -m "feat: add Pinia character store with localStorage persistence"
```

---

### Task 7: Vue Router Setup

**Files:**
- Create: `src/router/index.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create src/router/index.ts**

```typescript
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'character-list',
      component: () => import('../views/CharacterList.vue'),
    },
    {
      path: '/character/new',
      name: 'character-create',
      component: () => import('../views/CharacterCreate.vue'),
    },
  ],
})

export default router
```

- [ ] **Step 2: Update src/main.ts to use the router module**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

- [ ] **Step 3: Verify dev server works**

```bash
npm run dev
```

Navigate to `/` and `/character/new`. Both should render their stub content.

- [ ] **Step 4: Commit**

```bash
git add src/router/index.ts src/main.ts
git commit -m "feat: add Vue Router with character list and create routes"
```

---

### Task 8: Express Server

**Files:**
- Create: `server.js`

- [ ] **Step 1: Create server.js**

```javascript
const express = require('express')
const path = require('path')
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.static(path.join(__dirname, 'dist')))

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
```

- [ ] **Step 2: Add express as a dependency**

```bash
npm install express
```

- [ ] **Step 3: Add start script to package.json**

Add to `"scripts"`:

```json
"start": "node server.js"
```

- [ ] **Step 4: Test the production flow**

```bash
npm run build && npm start
```

Expected: Server starts on port 3000, page loads at `http://localhost:3000`, SPA routing works.

- [ ] **Step 5: Commit**

```bash
git add server.js package.json package-lock.json
git commit -m "feat: add Express server for production static serving"
```

---

### Task 9: CharacterList View

**Files:**
- Modify: `src/views/CharacterList.vue`

Before implementing, fetch the Stitch screen design:

```
Use MCP tool: mcp__stitch__get_screen with screen_id "7906af12c3a449d3b6bf3fc877116884"
```

Use the design as reference for layout and styling.

- [ ] **Step 1: Implement CharacterList.vue**

```vue
<script setup lang="ts">
import { useCharacterStore } from '../stores/characterStore'
import { useRouter } from 'vue-router'

const store = useCharacterStore()
const router = useRouter()

function createNew() {
  router.push('/character/new')
}

function deleteCharacter(id: string) {
  store.deleteCharacter(id)
}

function selectCharacter(id: string) {
  store.setActiveCharacter(id)
  // Phase 2 will navigate to /character/:id
}
</script>

<template>
  <div class="character-list">
    <header>
      <h1>Personnages</h1>
      <button @click="createNew">Nouveau Personnage</button>
    </header>

    <p v-if="store.characters.length === 0">
      Aucun personnage. Creez-en un pour commencer.
    </p>

    <ul v-else>
      <li
        v-for="char in store.characters"
        :key="char.id"
        @click="selectCharacter(char.id)"
      >
        <span class="name">{{ char.name }}</span>
        <button @click.stop="deleteCharacter(char.id)">Supprimer</button>
      </li>
    </ul>
  </div>
</template>
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

At `/`: shows empty state message. Click "Nouveau Personnage" navigates to `/character/new`.

- [ ] **Step 3: Commit**

```bash
git add src/views/CharacterList.vue
git commit -m "feat: implement CharacterList view with create and delete"
```

---

### Task 10: CharacterCreate View

**Files:**
- Modify: `src/views/CharacterCreate.vue`

Before implementing, fetch the Stitch screen design:

```
Use MCP tool: mcp__stitch__get_screen with screen_id "25896772ef0a4238968fd646ae6f7d7a"
```

Use the design as reference for the allocation wizard layout and styling.

- [ ] **Step 1: Implement CharacterCreate.vue**

```vue
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
    const spent = character.value.skills[skill.id]?.pointsSpent ?? 0
    const result = computeSkillTier(spent, 0)
    if (!result.tier) continue
    for (const tier of skill.tiers) {
      if (tier.costToReach > spent) break
      if (tier.specializations?.length && !character.value.specializations[skill.id]) {
        return false
      }
    }
  }
  return true
})

function save() {
  if (!canSave.value) return
  const created = store.createCharacter(characterName.value.trim())
  // Copy skill allocations and specializations to the created character
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
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

At `/character/new`:
- Enter a name
- Allocate points using +/- buttons
- Budget counter updates
- Cannot exceed 15 points
- Cannot reach Maitre (10 points in one skill)
- Specialization radio buttons appear when reaching Competent on skills that have them
- "Creer le personnage" button is disabled until valid
- Creating redirects to `/` and character appears in the list

- [ ] **Step 3: Commit**

```bash
git add src/views/CharacterCreate.vue
git commit -m "feat: implement CharacterCreate view with point allocation wizard"
```

---

### Task 11: Delete setup test and run full test suite

**Files:**
- Delete: `src/__tests__/setup.test.ts`

- [ ] **Step 1: Remove the scaffold test**

```bash
rm src/__tests__/setup.test.ts
```

- [ ] **Step 2: Run full test suite**

```bash
npm run test
```

Expected: All tests pass (useSkillCalculator + usePointBudget + characterStore).

- [ ] **Step 3: Run type check**

```bash
npx vue-tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: Build succeeds, `dist/` created.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: clean up scaffold test, verify full build"
```
