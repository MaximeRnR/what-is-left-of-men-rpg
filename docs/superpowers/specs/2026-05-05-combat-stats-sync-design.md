# Sync — Affichage des valeurs courantes (PV/PSM/Souffle) sur la fiche perso

Date : 2026-05-05
Statut : design valide

## Contexte

Aujourd'hui, la section "Statistiques" de `CharacterSheet.vue` affiche uniquement les valeurs **maximum** (PS, PSM, Souffle) calculees a partir des competences/talents. Quand le joueur modifie ses PV/PSM/Souffle dans l'ecran combat (`CharacterTracker.vue`), les valeurs courantes sont persistees dans `character.tracker` mais ne sont visibles que sur l'ecran combat. La fiche perso ne refletait donc pas l'etat actuel du personnage.

## Objectif

Sur la fiche perso, afficher les valeurs **courantes / max** (ex: `8 / 12`) avec une barre remplie proportionnellement, en lecture seule. Les modifications continuent de se faire exclusivement depuis l'ecran combat.

## Hors-perimetre

- Pas de modification des valeurs courantes depuis la fiche
- Pas de raccourci clic vers l'ecran combat depuis une stat (le bouton "Combat" existe deja dans le header)
- Pas d'autre vue impactee (CharacterList, CharacterInventory, etc.)
- Pas de nouveau modele, pas de nouveau composable

## Source de donnees

Les valeurs courantes existent deja :
- `character.tracker.currentHP`
- `character.tracker.currentSanity`
- `character.tracker.currentSouffle`

Ces valeurs sont initialisees a `createEmptyCharacter` (egales aux max de base) et persistees par `CharacterTracker.vue` via `store.updateCharacter` apres chaque modification. La reactivite Pinia + le `watch` deja en place dans `CharacterSheet.vue` (ligne 19) garantissent la mise a jour automatique.

## Modifications

Tout le travail est localise dans `src/views/CharacterSheet.vue`, section "Statistiques" (lignes ~284-313).

Pour chacune des trois cartes (PS / PSM / Souffle) :

1. **Affichage chiffre** — remplacer `{{ stats.maxHP.value }}` par un format identique a l'ecran combat :
   - gros chiffre courant (`die-display text-primary` / `text-secondary` / `text-tertiary`)
   - separateur `/` discret
   - petit chiffre max (`text-on-surface-variant`)

2. **Barre proportionnelle** — remplacer la classe `w-full` du `stat-bar-fill` par un style inline `width: percent%` ou `percent = min(100, (current / max) * 100)`. Le cap a 100% gere le cas ou `current > max` (peut arriver si une competence baisse le max apres-coup) : on affiche la vraie valeur courante en chiffre mais la barre ne deborde pas.

3. **Cas max = 0** — garder le garde-fou `max > 0 ? ... : '0%'` deja utilise dans l'ecran combat (ligne 218).

Le format visuel doit rester coherent avec l'ecran combat (`CharacterTracker.vue` lignes 212-218, 234-240, 256-262).

## Reactivite

Aucune action specifique requise. `character` est un computed deja reactif sur `store.characters`. Quand `CharacterTracker.vue` appelle `store.updateCharacter(id, { tracker: {...} })`, Pinia met a jour l'objet et la fiche perso re-render automatiquement.

## Tests

- **Manuel (UI)** : modifier PV/PSM/Souffle dans l'ecran combat, revenir sur la fiche, verifier que les valeurs courantes et la barre refletent l'etat. Tester aussi le reset.
- **Pas de test unitaire** : la logique est purement presentationnelle. Le store (`characterStore.test.ts`), le tracker (`useCombatTracker.test.ts`) et les stats (`useCharacterStats.test.ts`) sont deja couverts.

## Risques

- **Faible** : changement isole, lecture seule, pas d'impact sur la persistence ni sur les autres vues.
- Une competence reduisant le max en-dessous du courant existe en theorie (peu probable en pratique). Le cap a 100% sur la barre evite l'overflow visuel ; le chiffre affiche la verite.
