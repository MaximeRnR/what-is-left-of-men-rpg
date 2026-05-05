# Combat Stats Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher sur la fiche perso (`CharacterSheet.vue`, section "Statistiques") les valeurs courantes PS/PSM/Souffle au format `current / max` avec barre proportionnelle, en lecture seule, pour refleter en direct les modifications faites depuis l'ecran combat.

**Architecture:** Modification template-only dans `CharacterSheet.vue`. Les valeurs courantes existent deja dans `character.tracker.{currentHP, currentSanity, currentSouffle}` et sont persistees par `CharacterTracker.vue` via le store Pinia. La reactivite est deja en place (computed `character` + watch deep ligne 19) — aucun nouveau composable, aucun nouveau modele.

**Tech Stack:** Vue 3 (Composition API + `<script setup>`), TypeScript, Pinia, Tailwind v4, Vite.

**Spec:** `docs/superpowers/specs/2026-05-05-combat-stats-sync-design.md`

---

## File Structure

- Modify: `src/views/CharacterSheet.vue` (section "Statistiques", lignes 284-313)

Pas de creation, pas de suppression, pas de fichier de test (logique purement presentationnelle — confirme dans le spec).

---

### Task 1: Mettre a jour la carte PS

**Files:**
- Modify: `src/views/CharacterSheet.vue:287-291`

- [ ] **Step 1: Lancer baseline tests**

Run: `npm test`
Expected: PASS (tous les tests existants passent — etat propre du worktree).

- [ ] **Step 2: Editer la carte PS**

Remplacer le bloc lignes 287-291 :

```vue
        <div class="bg-surface-container border border-outline-variant p-3 text-center">
          <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">PS</p>
          <p class="die-display text-primary">{{ stats.maxHP.value }}</p>
          <div class="h-1 bg-surface-container-lowest mt-2"><div class="stat-bar-fill hp h-full w-full"></div></div>
        </div>
```

par :

```vue
        <div class="bg-surface-container border border-outline-variant p-3 text-center">
          <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">PS</p>
          <p class="flex items-baseline justify-center gap-1">
            <span class="die-display text-primary">{{ character.tracker.currentHP }}</span>
            <span class="text-on-surface-variant text-sm">/</span>
            <span class="font-headline text-on-surface-variant text-sm">{{ stats.maxHP.value }}</span>
          </p>
          <div class="h-1 bg-surface-container-lowest mt-2">
            <div
              class="stat-bar-fill hp h-full"
              :style="{ width: stats.maxHP.value > 0 ? `${Math.min(100, (character.tracker.currentHP / stats.maxHP.value) * 100)}%` : '0%' }"
            ></div>
          </div>
        </div>
```

Notes :
- `character` est deja defini lignes 14-15 du fichier (`computed(() => store.characters.find(...))`), accessible en template.
- Le cap `Math.min(100, ...)` evite l'overflow visuel si `currentHP > maxHP` (cas rare apres baisse de competence).
- Le garde-fou `maxHP.value > 0 ? ... : '0%'` reproduit la logique de `CharacterTracker.vue:218`.

- [ ] **Step 3: Verifier que rien ne casse**

Run: `npm run build`
Expected: PASS — vue-tsc + vite build sans erreur. Si TS rale sur `character.tracker.currentHP`, c'est qu'on accede a `character` (computed potentiellement undefined). Le `v-if="character"` du wrapper template (ligne 242) garantit `character` defini dans la section, mais TypeScript ne le sait pas dans le template. Si erreur TS, utiliser `character!.tracker.currentHP` (le `!` est cohérent avec les usages existants dans le meme fichier, ligne 362).

- [ ] **Step 4: Test manuel**

Run: `npm run dev` (puis ouvrir http://localhost:5173).
Etapes :
1. Ouvrir un personnage existant (ou en creer un).
2. Aller sur la fiche perso → verifier que la carte PS affiche `<currentHP> / <maxHP>` avec barre remplie a fond (par defaut current = max).
3. Aller sur l'ecran combat (bouton "Combat" du header).
4. Appliquer "Degats" (-3 par exemple).
5. Revenir sur la fiche perso.
6. Verifier : la carte PS affiche bien la nouvelle valeur courante (ex: `7 / 10`) et la barre est remplie a 70%.
7. Retour combat → bouton "Reinitialiser".
8. Retour fiche → barre pleine, chiffre courant = max.

Expected: tous les pas OK. Si la barre ne reagit pas a la mise a jour, verifier que `:style="..."` est bien lie reactivement (et non `style="..."` litteral).

- [ ] **Step 5: Commit**

```bash
git add src/views/CharacterSheet.vue
git commit -m "feat(sheet): show current PS on character sheet stats"
```

---

### Task 2: Mettre a jour la carte PSM

**Files:**
- Modify: `src/views/CharacterSheet.vue` (carte PSM, qui suit la carte PS)

- [ ] **Step 1: Editer la carte PSM**

Remplacer la carte PSM (couleur `text-secondary`, classe de barre `sanity`) :

```vue
        <div class="bg-surface-container border border-outline-variant p-3 text-center">
          <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">PSM</p>
          <p class="die-display text-secondary">{{ stats.maxSanity.value }}</p>
          <div class="h-1 bg-surface-container-lowest mt-2"><div class="stat-bar-fill sanity h-full w-full"></div></div>
        </div>
```

par :

```vue
        <div class="bg-surface-container border border-outline-variant p-3 text-center">
          <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">PSM</p>
          <p class="flex items-baseline justify-center gap-1">
            <span class="die-display text-secondary">{{ character.tracker.currentSanity }}</span>
            <span class="text-on-surface-variant text-sm">/</span>
            <span class="font-headline text-on-surface-variant text-sm">{{ stats.maxSanity.value }}</span>
          </p>
          <div class="h-1 bg-surface-container-lowest mt-2">
            <div
              class="stat-bar-fill sanity h-full"
              :style="{ width: stats.maxSanity.value > 0 ? `${Math.min(100, (character.tracker.currentSanity / stats.maxSanity.value) * 100)}%` : '0%' }"
            ></div>
          </div>
        </div>
```

(Si Task 1 a necessite `character!.tracker...`, faire pareil ici.)

- [ ] **Step 2: Test manuel rapide**

Run: `npm run dev` (deja lance, sinon le relancer).
Verifier : carte PSM affiche `current/max`, perdre du PSM en combat, verifier mise a jour sur la fiche.

Expected: comportement identique a la carte PS.

- [ ] **Step 3: Commit**

```bash
git add src/views/CharacterSheet.vue
git commit -m "feat(sheet): show current PSM on character sheet stats"
```

---

### Task 3: Mettre a jour la carte Souffle

**Files:**
- Modify: `src/views/CharacterSheet.vue` (carte Souffle, suit la carte PSM)

- [ ] **Step 1: Editer la carte Souffle**

Remplacer la carte Souffle (couleur `text-tertiary`, classe de barre `souffle`) :

```vue
        <div class="bg-surface-container border border-outline-variant p-3 text-center">
          <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Souffle</p>
          <p class="die-display text-tertiary">{{ stats.maxSouffle.value }}</p>
          <div class="h-1 bg-surface-container-lowest mt-2"><div class="stat-bar-fill souffle h-full w-full"></div></div>
        </div>
```

par :

```vue
        <div class="bg-surface-container border border-outline-variant p-3 text-center">
          <p class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Souffle</p>
          <p class="flex items-baseline justify-center gap-1">
            <span class="die-display text-tertiary">{{ character.tracker.currentSouffle }}</span>
            <span class="text-on-surface-variant text-sm">/</span>
            <span class="font-headline text-on-surface-variant text-sm">{{ stats.maxSouffle.value }}</span>
          </p>
          <div class="h-1 bg-surface-container-lowest mt-2">
            <div
              class="stat-bar-fill souffle h-full"
              :style="{ width: stats.maxSouffle.value > 0 ? `${Math.min(100, (character.tracker.currentSouffle / stats.maxSouffle.value) * 100)}%` : '0%' }"
            ></div>
          </div>
        </div>
```

- [ ] **Step 2: Test manuel rapide**

Verifier : carte Souffle affiche `current/max`, depenser du Souffle en combat, verifier mise a jour.

Expected: comportement identique aux autres cartes.

- [ ] **Step 3: Commit**

```bash
git add src/views/CharacterSheet.vue
git commit -m "feat(sheet): show current Souffle on character sheet stats"
```

---

### Task 4: Verification finale

**Files:** aucun

- [ ] **Step 1: Build complet**

Run: `npm run build`
Expected: PASS — pas d'erreur TS, pas d'erreur Vite.

- [ ] **Step 2: Suite de tests**

Run: `npm test`
Expected: PASS — tous les tests existants restent verts (aucun ne touche au template, mais on verifie qu'on n'a rien casse via dependances transitives).

- [ ] **Step 3: Test manuel scenario complet**

Run: `npm run dev`

Scenario :
1. Creer ou ouvrir un personnage avec quelques competences (au moins une qui ajoute des PS/PSM/Souffle, pour ne pas etre a 10/10/10 partout).
2. Fiche perso → verifier les trois cartes : `currentHP/maxHP`, `currentSanity/maxSanity`, `currentSouffle/maxSouffle`. Barres remplies a 100% (current=max au depart).
3. Combat → -3 PS, -2 PSM, -4 Souffle.
4. Retour fiche → verifier les trois cartes refletent les nouvelles valeurs courantes ET les barres sont proportionnelles.
5. Combat → "Reinitialiser".
6. Retour fiche → barres pleines, chiffres = max.
7. (Optionnel) Modifier une competence qui change un max (Edit perso) → verifier que la fiche affiche bien le nouveau max ET que la barre s'adapte (le current reste le meme tant qu'on n'a pas reset).

Expected: tous les pas OK.

- [ ] **Step 4: Commit final si necessaire**

Si aucune correction necessaire, rien a committer. Sinon :

```bash
git add src/views/CharacterSheet.vue
git commit -m "fix(sheet): <description correction>"
```
