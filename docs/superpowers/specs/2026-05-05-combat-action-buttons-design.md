# Boutons d'action en combat (Attaque / Parade / Esquive / Special)

Date : 2026-05-05
Statut : design valide

## Contexte

L'ecran combat (`CharacterTracker.vue`) affiche actuellement, pour chaque arme de l'inventaire, une cellule "Cout" unique avec le cout d'ATTAQUE. Ce cout :

- Ne distingue pas la 1ʳᵉ attaque du combat des suivantes (le bonus -1 CS de Martial Initie / Archerie Initie n'est pas applique)
- N'affiche pas les couts des autres actions (PARADE, ESQUIVE, SPECIAL) qui peuvent aussi etre modifies par les talents
- N'expose pas les bonus conditionnels lies aux talents/specialisations (Pression, Assassin, Maitre Martial, Instinct Legende, etc.)

## Objectif

Donner au joueur une vision exhaustive des couts en CS de toutes ses actions de combat, en tenant compte des modificateurs des talents possedes (passifs et conditionnels).

## Vue d'ensemble UI

Insertion dans l'ecran combat, entre la section "Souffle" et la section "Attaques" :

1. **Conditions actives** (nouvelle section, conditionnelle)
2. **Actions generales** (nouvelle section : Esquive, Special)
3. **Attaques** (section existante, cartes par arme — cellule "Cout" remplacee par 4 boutons : Attaque 1ʳᵉ, 2ᵉ, 3ᵉ, Parade)

L'ordre des autres sections (PV, PSM, Souffle, Etats actifs) reste inchange.

## Coûts de base et regles de calcul

### Bases

| Action | Cout CS de base |
|--------|-----------------|
| ATTAQUE | 6 |
| PARADE | 4 |
| ESQUIVE | 6 |
| SPECIAL | 6 |

### Sequence de calcul

Pour chaque bouton, le cout est calcule dans cet ordre :

1. Cout de base
2. + modificateur de l'arme (`weapon.souffleModifier`, applicable a ATTAQUE et PARADE)
3. + categorie LOURDE = +1 CS, **annule** si Force Maitre (Colosse) debloque
4. + `cs_modifier` passifs *non conditionnels* des talents debloques (Martial Entraine `attaque_melee` / `parade`, Agilite Entraine `esquive`, Empathie Entraine `aider`, Tireur Rapide `attaque_distance`, etc.)
5. + `cs_modifier` *conditionnels* — appliques uniquement si le toggle correspondant est actif (voir Toggles)
6. + bonus 1ʳᵉ attaque (`attaque_premiere_melee` / `attaque_premiere_distance`) — **uniquement** sur le bouton "Attaque 1ʳᵉ", pas sur 2ᵉ/3ᵉ
7. **Overrides** (court-circuitent le calcul ci-dessus) :
   - Toggle "Apres parade/esquive reussie" actif (Maitre Martial) → ATTAQUE = **3 CS fixe** (ne s'applique qu'a ATTAQUE, pas aux autres actions)
   - Toggle "1ᵉʳ tour Legende" actif (Instinct Legende) → cout final divise par 2, arrondi superieur (s'applique a toutes les actions)
   - Si les deux overrides sont actifs simultanement sur ATTAQUE : Maitre Martial prime (cost = 3 CS), puis Legende le divise par 2 → 2 CS (arrondi sup de 1.5)
8. Plancher **min 2 CS** (le 3 CS de Maitre Martial seul reste a 3 ; combine a Legende il chute a 2 par le plancher)

## Toggles de conditions

Les toggles ne sont affiches que si **au moins un talent debloque** par le personnage en a l'usage. Sinon la section "Conditions actives" est entierement masquee.

| Toggle | Active si le perso a... | Effet |
|--------|--------------------------|-------|
| EMBUSQUE | Instinct Entraine OU Ombre Maitre (Chat Gris) | -1 CS sur PARADE/ESQUIVE (via Instinct) ; le bonus +1 degats Chat Gris reste gere par les notes existantes (hors perimetre cout) |
| ENCERCLE | Instinct Entraine | -1 CS sur PARADE/ESQUIVE |
| Attaque d'opportunite subie | Instinct Entraine | -1 CS sur PARADE/ESQUIVE |
| Meme cible que la precedente | Martial Pression (Competent spe) | -1 CS sur ATTAQUE |
| Cible non-Focus | Ombre Assassin (Competent spe) | -1 CS sur ATTAQUE (deja encode `sans_focus` dans la data) |
| Apres parade/esquive reussie | Martial Maitre | ATTAQUE = 3 CS **fixe** (override) |
| 1ᵉʳ tour Legende | Instinct Legende | Tous les couts / 2 arrondi sup (override) |

L'etat des toggles est **ephemere** (refs locales du composant, pas persiste dans le store).

## Architecture

### Nouveau composable : `src/composables/useActionCosts.ts`

```ts
interface ActionCostConditions {
  embusque: boolean
  encercle: boolean
  attaqueOpportuniteSubie: boolean
  memeCible: boolean
  sansFocus: boolean
  apresParadeEsquive: boolean
  premierTourLegende: boolean
}

interface UseActionCosts {
  attackCost(weapon: Weapon, isFirst: boolean): number
  parryCost(weapon: Weapon): number
  dodgeCost(): number
  specialCost(): number
  // Toggles applicables (filtres selon les talents debloques)
  applicableToggles: ComputedRef<Array<keyof ActionCostConditions>>
}

export function useActionCosts(
  character: Ref<Character>,
  stats: ReturnType<typeof useCharacterStats>,
  conditions: Ref<ActionCostConditions>,
): UseActionCosts
```

Le composable encapsule toute la logique de calcul (etapes 1-8 ci-dessus). Les overrides (Maitre Martial, Legende) sont implementes en code, pas en data.

### Extensions de la data `src/data/skills/*.json`

Ajouter les `cs_modifier` manquants :

| Talent | Fichier | Condition a ajouter |
|--------|---------|---------------------|
| Martial Initie (Gestes appris) | `corps.json` | `cs_modifier` value -1 condition `attaque_premiere_melee` |
| Archerie Initie (Reflexe Oculaire) | `corps.json` | `cs_modifier` value -1 condition `attaque_premiere_distance` |
| Instinct Entraine (Anticipation) | `esprit.json` | `cs_modifier` value -1 condition `defense_embusque_encerle_aoo` |
| Pression (Martial Competent spe) | `corps.json` | `cs_modifier` value -1 condition `meme_cible` |

Les overrides ne sont **pas** ajoutes en data (Maitre Martial et Instinct Legende restent en code).

### Modifications de `src/views/CharacterTracker.vue`

1. Importer le nouveau composable et instancier avec un `ref<ActionCostConditions>` initialise a tout `false`.
2. Ajouter la section "Conditions actives" — `v-if="costs.applicableToggles.value.length > 0"`, contenant des checkboxes liees au `ref` de conditions.
3. Ajouter la section "Actions generales" avec deux boutons (Esquive, Special).
4. Dans la boucle des cartes d'attaque : remplacer la cellule "Cout" du grid par une ligne flex de 4 boutons (`Attaque 1ʳᵉ`, `2ᵉ`, `3ᵉ`, `Parade`), chaque bouton appelant `costs.attackCost(weapon, true|false)` ou `costs.parryCost(weapon)`.
5. Conserver les notes existantes telles quelles (les bonus de degats restent geres separement).

### Tests

Nouveau fichier `src/__tests__/useActionCosts.test.ts` :

- Personnage vierge : couts de base par defaut (6/4/6/6)
- Modifiers passifs un par un (Martial Entraine, Agilite Entraine, Empathie Entraine, Tireur Rapide, Force Entraine, Archerie Entraine recharger, etc.)
- Bonus 1ʳᵉ attaque applique uniquement sur `attackCost(weapon, true)`
- Toggles conditionnels (EMBUSQUE/ENCERCLE/AOO sur defense, meme cible, sans Focus)
- Override Maitre Martial : `apresParadeEsquive=true` → 3 CS fixe (ignore autres modifs)
- Override Instinct Legende : `premierTourLegende=true` → cout / 2 arrondi sup
- Cumul Martial Entraine + Initie sur 1ʳᵉ attaque
- Plancher min 2 CS respecte (sauf override 3 CS Maitre Martial)
- LOURDE +1 annule par Force Maitre

Pas de test de composant Vue. Verification manuelle de l'UI via `npm run dev` (smoke test : creer un perso avec des talents varies, basculer les toggles, verifier les couts affiches).

## Hors-perimetre

- Bouton AIDE (non demande)
- Boutons cliquables qui depensent automatiquement le souffle (display only confirme)
- Persistance des toggles entre rechargements
- Affichage des modificateurs de **degats** lies aux toggles (deja gere par les notes existantes ; `damageModifiers` non touche)
- Suivi automatique du compteur d'attaques effectuees dans le tour
- Refactor du systeme `cs_modifier` existant (on l'etend, on ne le reecrit pas)

## Risques

- **Modere** : ajout de conditions dans la data JSON. Verifier qu'aucune condition existante n'est renommee ou cassee (les calculs actuels dans `CharacterTracker.vue` utilisent `attaque_melee`, `attaque_distance`, `post_attaque_martiale` — on ne change rien a ces cles existantes).
- **Faible** : la logique d'override (Maitre Martial fixe a 3 CS, Instinct Legende ÷ 2) doit etre soigneusement testee — suite de tests dediee.
- **Faible** : la liste des toggles applicables est filtree selon les talents debloques. Verifier qu'un personnage vierge ne voit aucun toggle parasite (la section "Conditions actives" doit etre entierement masquee).
