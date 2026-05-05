# Fix: Malus d'incompétence ne disparaît pas quand le skill est entraîné

## Contexte

Dans Contagion, chaque skill a un palier "incompétent" (0 point dépensé) qui inflige un malus passif tant que le personnage est à ce palier. Dès que le personnage atteint Initié (1 point), il n'est plus incompétent : le malus doit disparaître.

L'UI de la fiche personnage masque déjà visuellement le talent malus une fois le palier dépassé (`CharacterSheet.vue:54-58`), mais `useCharacterStats.ts:collectPassiveEffects` continue d'appliquer ses effets passifs cumulés. Résultat : un personnage avec Instinct Initié obtient `incompétent(-1) + initié(+1) = 0` à l'initiative, alors qu'il devrait obtenir `+1`.

## Tiers `isMalus: true` concernés

Tous les `incompetent` avec `passiveEffects` non vides :

| Skill      | Effet                                  | Comportement actuel à Initié | Comportement attendu |
| ---------- | -------------------------------------- | ---------------------------- | -------------------- |
| Endurance  | `hp: -1`                               | net 0                        | +1                   |
| Instinct   | `initiative: -1`                       | net 0                        | +1                   |
| Perception | `initiative: -1`                       | net 0 (à Entraîné)           | +1                   |
| Empathie   | `cs_modifier +1` (aider)               | toujours présent             | absent               |
| Archerie   | `cs_modifier +1` (attaque_distance)    | toujours présent             | absent               |
| Martial    | `cs_modifier +1` (post_attaque_martiale) | toujours présent           | absent               |

## Changement

Dans `src/composables/useCharacterStats.ts`, fonction `collectPassiveEffects` :

```ts
for (const tier of skillDef.tiers) {
  if (tier.costToReach > totalPoints) break
  if (tier.isMalus && totalPoints > 0) continue
  effects.push(...tier.passiveEffects)
  // specializations bloc inchangé
}
```

Une seule ligne ajoutée. Pas d'autre modification de logique métier.

## Conséquences

**Calculées correctement à partir du fix :**

- Initiative : Instinct ≥ Initié et Perception ≥ Entraîné contribuent chacun `+1`.
- PV max : Endurance ≥ Initié rapporte `+1` au lieu de net 0. Endurance Maître passe de `+4` à `+5` (somme `+1+1+1+2`).
- Modificateurs CS : les pénalités d'incompétence (Empathie aider, Archerie distance, Martial post-attaque) disparaissent dès Initié.

**Code voisin :**

- `CharacterTracker.vue:100-103` contient `if (tierResult.tier !== 'incompetent')` autour de l'application de `csM['attaque_melee']`. Devient redondant mais reste correct (le modificateur n'existe plus une fois entraîné). Non modifié pour limiter le scope.
- `unlockedTalents` (uniquement consommé par les tests) continue d'inclure le palier malus. Pas de changement.
- Structure JSON des skills, type `PassiveEffect`, et `isMalus` flag : inchangés.

## Tests

Tests existants à mettre à jour dans `src/__tests__/useCharacterStats.test.ts` :

| Ligne | Cas                                          | Ancien attendu | Nouveau attendu |
| ----- | -------------------------------------------- | -------------- | --------------- |
| 33    | base stats (tous incompétents)               | initiative -2  | initiative -2 (inchangé : à incompétent le malus s'applique) |
| 43    | endurance 5 (competent)                      | maxHP 12       | maxHP 13        |
| 56    | endurance 1 (initie) net 0                   | maxHP 10       | maxHP 11        |
| 74-75 | endurance 9 (maitre)                         | maxHP 14       | maxHP 15        |
| 102   | instinct 1 (initie)                          | initiative -1  | initiative 0    |
| 108   | instinct 0 (incompetent)                     | initiative -2  | initiative -2 (inchangé) |
| 116   | perception 3 (entraine)                      | initiative -1  | initiative 0    |
| 130   | combo endurance 5 / courage 5 / agilite 9    | maxHP 12       | maxHP 13        |

Les commentaires explicatifs dans le fichier de tests (lignes 18-24, 37-41, 53-54, 71-72, 98-100, 105-106, 111-114, 127-128) sont à réécrire pour refléter la nouvelle règle.

Nouveaux tests à ajouter pour cadrer la règle :

- **Régression initiative** : `setup({ instinct: 2 })` → `initiativeModifier === 0` (Instinct Entraîné +1, Perception incompétent -1).
- **Sanité du flag** : un skill `isMalus: true` avec `totalPoints === 0` voit toujours son malus appliqué (cas incompétent).
- **CS modifier** : `setup({ archerie: 1 })` → `csModifiers['attaque_distance']` indéfini ou 0 (le malus a disparu à Initié).

## Hors scope

- Refactor du flag `isMalus` ou de la structure des skills.
- Modification de `CharacterTracker.vue` (le garde-fou redondant reste).
- Changement d'affichage des talents sur la fiche.
