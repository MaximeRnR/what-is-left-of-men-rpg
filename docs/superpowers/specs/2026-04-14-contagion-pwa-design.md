# Contagion — PWA de gestion de personnages

## Resume

Application Progressive Web App pour gerer un ou plusieurs personnages du JDR "Contagion". Persistence 100% locale (localStorage), fonctionnement offline complet. Le serveur Express ne fait que servir les fichiers statiques du build Vite.

## Contraintes et decisions

| Decision | Choix |
|---|---|
| Framework front | Vue 3 + TypeScript |
| State management | Pinia + plugin localStorage |
| Build tool | Vite |
| Serveur | Express minimal (serve static + SPA fallback) |
| Persistence | localStorage (un seul utilisateur, multi-personnages) |
| PWA | vite-plugin-pwa, CacheFirst assets, NetworkFirst HTML |
| Donnees de regles | Fichiers JSON statiques importes dans le front |
| Effets des talents | Passifs calcules automatiquement, contextuels en texte |
| UI | Designee separement via Stitch (voir section dediee) |
| Routing | Vue Router, mode history |

## Design UI — Stitch

Le design de l'interface est gere dans un projet Stitch separe. Les ecrans et le design system sont la reference pour l'implementation des composants et vues Vue.

**Projet** : Gestionnaire Personnage Contagion (ID: `7287220513898071123`)

| Ecran | ID Stitch |
|---|---|
| Contagion Rulebook Summary | `b703d24ba8a84019ab6cb98a1c74ea38` |
| Character Dashboard | `7906af12c3a449d3b6bf3fc877116884` |
| Design System | `asset-stub-assets-0eb48ade3a3f4ecaa904acb92fb092e6-1776186895789` |
| Skills & Talents | `8b0fdc7fa52d4ae7abd6261e5dd23bb9` |
| Rules Reference | `f0fc86b55cb545478a752c80abe9a84f` |
| Combat & Inventory | `61676844f022474585f5483344d19030` |
| Wizard: Attribute Allocation | `25896772ef0a4238968fd646ae6f7d7a` |
| Wizard: Gear Selection | `92c723a043aa46d6a12c86fcbbfa87a1` |
| Wizard: Operative Summary | `2fd04d34e2354c559613ef5e8254992a` |

Lors de l'implementation, les composants UI doivent respecter le design system et les ecrans definis dans Stitch. Utiliser les outils MCP Stitch (`get_screen`, `get_project`) pour recuperer les assets et le code genere.

## Structure du projet

```
what-is-left-of-men/
├── src/
│   ├── data/
│   │   ├── skills/
│   │   │   ├── corps.json
│   │   │   ├── coeur.json
│   │   │   └── esprit.json
│   │   ├── weapons.json
│   │   └── effects.json
│   ├── models/
│   │   ├── character.ts
│   │   ├── skill.ts
│   │   └── weapon.ts
│   ├── composables/
│   │   ├── useCharacterStats.ts
│   │   ├── useSkillCalculator.ts
│   │   ├── usePointBudget.ts
│   │   ├── useInventory.ts
│   │   └── useCombatTracker.ts
│   ├── stores/
│   │   └── characterStore.ts
│   ├── router/
│   │   └── index.ts
│   ├── views/
│   │   ├── CharacterList.vue
│   │   ├── CharacterCreate.vue
│   │   ├── CharacterSheet.vue
│   │   ├── CharacterEdit.vue
│   │   ├── CharacterInventory.vue
│   │   └── CharacterTracker.vue
│   ├── components/       # Composants UI (fournis par Stitch)
│   ├── App.vue
│   └── main.ts
├── public/
│   └── icons/            # Icones PWA
├── docs/
│   └── superpowers/specs/
├── server.js
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── regles-du-jeu.md
```

## Modele de donnees

### Types du personnage (persistes en localStorage)

```typescript
interface Character {
  id: string                              // uuid v4
  name: string
  story: string                           // histoire du personnage, texte libre
  skills: Record<SkillId, SkillAllocation>
  specializations: Record<SkillId, string> // ex: { "martial": "pression" }
  bonusPoints: Record<SkillId, number>     // les (+i) attribues par le MJ
  inventory: InventoryItem[]
  tracker: CombatTracker
  createdAt: number                        // timestamp
  updatedAt: number                        // timestamp
}

interface SkillAllocation {
  pointsSpent: number  // 0 a 10
}
// Le palier et le bonus extra sont CALCULES depuis pointsSpent, jamais stockes.
// Logique : on consomme les points en suivant le schema d'evolution.
// Ex: pointsSpent=5 => Entraine (d8) avec +1 extra.
// Calcul : 1 (Incompetent) + 1 (Initie) + 2 (Entraine) = 4. Reste 1 => +1 extra.

interface InventoryItem {
  id: string
  weaponId?: string           // reference vers WeaponDefinition.id
  customName?: string         // pour items libres (non-referentiel)
  customDescription?: string
  traits: string[]            // traits modifies/ajoutes (ex: Artisanat)
  currentFragility: number    // diminue quand le de de Parade tombe sur la valeur
}

interface CombatTracker {
  currentHP: number
  currentSanity: number
  currentSouffle: number
  activeEffects: string[]     // etats actifs en texte libre: "BLESSE", "PEUR", etc.
}
// maxHP, maxSanity, maxSouffle sont calcules par useCharacterStats, jamais stockes.
// Le tracker ne persiste que les valeurs courantes et les etats actifs.
```

### Types du referentiel de regles (JSON statiques)

```typescript
type SkillId =
  // Corps
  | "martial" | "archerie" | "endurance" | "force" | "agilite" | "ombre" | "artisanat"
  // Coeur
  | "charisme" | "empathie" | "courage" | "perception" | "tromperie" | "intimidation"
  // Esprit
  | "instinct" | "creativite" | "connaissance" | "investigation" | "occultisme" | "medecine"

type TierLevel = "incompetent" | "initie" | "entraine" | "competent" | "maitre" | "legende"

type SkillCategory = "corps" | "coeur" | "esprit"

interface SkillDefinition {
  id: SkillId
  name: string                // "Martial"
  latinName: string           // "Arma Artem"
  category: SkillCategory
  tiers: SkillTier[]
}

interface SkillTier {
  level: TierLevel
  die: string                 // "d4", "d6", "d8", "d10", "d12", "d20"
  costToReach: number         // cout cumule depuis 0 : 1, 2, 4, 6, 10
  talentName: string          // "Violence maladroite"
  description: string         // texte complet du talent contextuel
  isMalus: boolean            // true pour les talents Incompetent
  passiveEffects: PassiveEffect[]
  specializations?: Specialization[]
}

interface PassiveEffect {
  type: "hp" | "sanity" | "souffle" | "st" | "cs_modifier" | "damage" | "initiative"
  value: number
  condition?: string          // pour affichage uniquement, ex: "corps_a_corps"
}

interface Specialization {
  id: string                  // "pression", "discipline"
  name: string                // "Pression"
  description: string
  passiveEffects: PassiveEffect[]
}

interface WeaponDefinition {
  id: string
  name: string
  category: "legere" | "moyenne" | "lourde"
  damage: string              // "1d6", "1d8+1", "2d4"
  souffleModifier: number     // -1, 0, +1
  specialEffects: string[]    // ["Escrime", "Perforant 2"]
  fragility: number
  quality: "faible_qualite" | "standard" | "chef_doeuvre"
  ranged: boolean
}
```

## Store Pinia

```typescript
// stores/characterStore.ts
{
  // State
  characters: Character[]
  activeCharacterId: string | null

  // Getters
  activeCharacter: Character | undefined
  characterList: { id: string, name: string }[]

  // Actions
  createCharacter(name: string): Character
  updateCharacter(id: string, patch: Partial<Character>): void
  deleteCharacter(id: string): void
  setActiveCharacter(id: string): void
  duplicateCharacter(id: string): Character
}
```

Persistence via un plugin Pinia qui :
- Au chargement : hydrate le state depuis `localStorage.getItem('contagion-characters')`
- A chaque mutation : serialise et ecrit via `localStorage.setItem('contagion-characters', ...)`

## Composables

### useSkillCalculator

Entree : `pointsSpent: number`, `bonusPoints: number`

Sortie :
- `tier: TierLevel` — palier atteint
- `die: string` — de associe
- `extraBonus: number` — points investis au-dela du palier
- `totalBonus: number` — extraBonus + bonusPoints du MJ
- `canReachMaster: boolean` — false a la creation

Logique de calcul du palier :
```
Points cumules par palier :
  incompetent: 1
  initie: 2       (1+1)
  entraine: 4     (1+1+2)
  competent: 6    (1+1+2+2)
  maitre: 10      (1+1+2+2+4)

On consomme les points dans l'ordre. Le reste apres le dernier palier atteint = extraBonus.
```

### useCharacterStats

Entree : `Character` (reactif)

Sortie (computed) :
- `maxHP: number` — 10 + somme de tous les passiveEffects de type "hp" des paliers debloques + specialisations choisies
- `maxSanity: number` — idem type "sanity"
- `maxSouffle: number` — idem type "souffle"
- `stModifier: number` — somme des bonus ST
- `initiativeModifier: number` — somme des bonus initiative
- `csModifiers: Record<string, number>` — modificateurs de CS par action
- `damageModifiers: Record<string, number>` — modificateurs de degats par contexte
- `unlockedTalents: { skill: SkillId, tier: TierLevel, talent: SkillTier }[]` — tous les talents actifs

Logique : pour chaque competence, on collecte les passiveEffects de TOUS les paliers debloques (pas juste le courant — les effets se cumulent). Si une specialisation est choisie, on ajoute ses effets.

### usePointBudget

Entree : `Character` (reactif)

Sortie :
- `totalPoints: number` — 15
- `spentPoints: number` — somme de tous les pointsSpent
- `remainingPoints: number`
- `canAllocate(skillId, points): boolean` — verifie budget + contrainte Maitre
- `allocate(skillId, points): void`
- `deallocate(skillId, points): void`
- `isValid: boolean` — true si budget respecte et pas de Maitre

Contrainte : aucune competence ne peut atteindre le palier Maitre (10 points cumules) a la creation.

### useInventory

Entree : `Character` (reactif)

Sortie :
- `items: InventoryItem[]`
- `addWeapon(weaponId: string): void` — ajoute depuis le referentiel
- `addCustomItem(name, description): void`
- `removeItem(itemId: string): void`
- `updateFragility(itemId: string, delta: number): void`
- `addTrait(itemId: string, trait: string): void`
- `removeTrait(itemId: string, trait: string): void`

### useCombatTracker

Entree : `Character` (reactif), `maxHP`, `maxSanity`, `maxSouffle` (depuis useCharacterStats)

Sortie :
- `modifyHP(delta: number): void`
- `modifySanity(delta: number): void`
- `modifySouffle(delta: number): void`
- `resetToMax(): void` — reinitialise les valeurs courantes aux max
- `addEffect(effect: string): void`
- `removeEffect(effect: string): void`
- `clearEffects(): void`

## Routing

| Route | Vue | Description |
|---|---|---|
| `/` | CharacterList | Liste des personnages, creer, supprimer |
| `/character/new` | CharacterCreate | Attribution des 15 points, specialisations |
| `/character/:id` | CharacterSheet | Fiche complete en lecture |
| `/character/:id/edit` | CharacterEdit | Re-attribution points, histoire, bonus MJ |
| `/character/:id/inventory` | CharacterInventory | Gestion inventaire et armes |
| `/character/:id/tracker` | CharacterTracker | Tracker en jeu (PS/PSM/Souffle/etats) |

## PWA

- **Plugin** : vite-plugin-pwa
- **Service Worker** : Workbox, genere automatiquement
- **Strategie de cache** :
  - CacheFirst pour les assets statiques (JS, CSS, JSON, icones, fonts)
  - NetworkFirst pour index.html
- **Manifest** :
  - `name`: "Contagion — Gestion de personnages"
  - `short_name`: "Contagion"
  - `display`: "standalone"
  - `start_url`: "/"
  - Icones : 192x192 et 512x512

## Express (server.js)

```javascript
const express = require('express')
const path = require('path')
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.static(path.join(__dirname, 'dist')))

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT)
```

## Phases d'implementation

### Phase 1 — Fondations + Creation de personnage
- Scaffolding projet (Vite + Vue 3 + TS + Pinia + Vue Router)
- server.js
- Fichiers JSON des competences (corps, coeur, esprit)
- Types TypeScript (models/)
- Store Pinia + plugin localStorage
- useSkillCalculator + usePointBudget
- Vue CharacterList : lister, creer, supprimer
- Vue CharacterCreate : attribution des 15 points, choix des specialisations, validation (pas de Maitre, budget)

### Phase 2 — Fiche complete
- useCharacterStats (calcul stats derivees)
- Gestion des points bonus MJ (+i)
- Vue CharacterSheet : competences avec palier, de, talent, stats calculees (PS/PSM/Souffle)
- Vue CharacterEdit : re-attribution, histoire, bonus MJ

### Phase 3 — Inventaire
- JSON des armes (base + distance)
- useInventory
- Vue CharacterInventory : ajout armes depuis referentiel, items libres, suivi fragilite, effets speciaux, qualite

### Phase 4 — Tracker en jeu + PWA
- useCombatTracker
- Vue CharacterTracker : modification PS/PSM/Souffle courants, etats actifs, reset
- Configuration PWA (vite-plugin-pwa, manifest, service worker, icones)
