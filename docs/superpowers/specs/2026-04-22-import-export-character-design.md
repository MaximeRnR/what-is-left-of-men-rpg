# Import/Export de personnages en JSON

## Résumé

Permettre à l'utilisateur d'exporter un personnage dans un fichier JSON et d'importer un fichier JSON pour créer un nouveau personnage. L'export se fait depuis la fiche personnage, l'import depuis la liste des personnages.

Cette spec remplace `2026-04-14-export-import-character-design.md` (non implémenté) en simplifiant la validation (minimale + complétion par défaut, plutôt que stricte) et le feedback d'erreur (`alert` natif).

## Export

- **Emplacement** : bouton "Exporter" dans le header de `CharacterSheet.vue`, à côté du bouton "Modifier"
- **Action** :
  1. Sérialiser le `Character` actif via `JSON.stringify(character, null, 2)` (JSON indenté pour lisibilité humaine)
  2. Créer un `Blob` de type `application/json`
  3. Générer une URL via `URL.createObjectURL`
  4. Créer un élément `<a>` avec attribut `download`, effectuer un click programmatique
  5. `URL.revokeObjectURL` après le click
- **Nom du fichier** : `{nom-slugifié}.json`
  - `slugify` : 
    1. Normaliser les accents : `name.normalize('NFD').replace(/[̀-ͯ]/g, '')`
    2. Lowercase
    3. Remplacer les espaces par des tirets
    4. Supprimer tout caractère hors `[a-z0-9-]` (les tirets existants sont donc préservés)
    5. Collapse les séquences de tirets consécutifs en un seul tiret
    6. Trim les tirets en début/fin
  - Exemple : `"Marie-Ânne Dubois"` → `"marie-anne-dubois.json"`
  - Fallback : si le nom slugifié est vide, utiliser `"personnage.json"`
- **Feedback** : aucun (le navigateur affiche son propre toast de téléchargement)

## Import

- **Emplacement** : bouton "Importer" dans `CharacterList.vue`, à côté du bouton "Nouveau personnage". Visible même quand la liste est vide.
- **Mécanisme** : un `<input type="file" accept=".json">` caché, déclenché programmatiquement via `ref` + `.click()` sur le bouton "Importer"
- **Flux** :
  1. Sélection de fichier → `FileReader.readAsText(file)`
  2. Dans `onload` : `JSON.parse(reader.result)` dans un `try/catch`
  3. Si parse OK → appel `store.importCharacter(parsed)` qui retourne le nouvel `id` (ou throw)
  4. Succès → `router.push('/character/' + newId)`
  5. Échec → `alert` avec un message adapté :
     - Si l'erreur vient de `JSON.parse` : `alert('Fichier invalide : le contenu n\'est pas du JSON valide.')` (on ne remonte pas le message technique de `JSON.parse`)
     - Si l'erreur vient de `importCharacter` (validation) : `alert('Fichier invalide : ' + error.message)` (messages métier rédigés dans le store, ex: `"le champ 'name' est manquant ou vide"`)
  6. **Toujours réinitialiser** la valeur de l'input (`inputRef.value = ''`) après la sélection, pour permettre la ré-sélection du même fichier

## Validation et construction du personnage

Action `importCharacter(data: unknown): string` dans `src/stores/characterStore.ts`.

### Validation minimale

Throw une `Error` avec un message lisible dans ces cas (capturé par la vue pour l'alert) :

- `data` n'est pas un objet non-null (tableau ou primitive rejeté)
- `data.name` n'est pas une `string` ou est vide après `.trim()`

Aucune autre validation. Les types incorrects à l'intérieur des sous-objets ne sont pas détectés ici — c'est une conséquence assumée du choix "validation minimale".

### Construction

1. Créer une base complète : `createEmptyCharacter(generateId(), data.name.trim())` — fournit tous les champs par défaut
2. Merger les champs optionnels du JSON **uniquement s'ils sont présents ET du bon type global** (pas de validation récursive) :
   - `story` si `typeof === 'string'`
   - `skills` si objet non-null, non-array → écrase le défaut
   - `specializations` si objet non-null, non-array
   - `bonusPoints` si objet non-null, non-array
   - `inventory` si `Array.isArray`
   - `abilities` si `Array.isArray`
   - `tracker` si objet non-null, non-array → merge champ par champ **sur le tracker par défaut** (10/10/10 + `activeEffects: []`), pour qu'un fichier avec un tracker partiel ne produise pas un tracker incomplet
3. `id`, `createdAt`, `updatedAt` : toujours régénérés, jamais lus du fichier
4. `push` dans `state.characters`, persister via `_persist()`, retourner le nouvel `id`

## Architecture

- **Aucun module utilitaire nouveau**. La logique est courte et appartient naturellement aux consommateurs :
  - Le **store** héberge `importCharacter` (mutation + validation + persistence), cohérent avec `createCharacter` / `duplicateCharacter` déjà présents
  - La **vue `CharacterSheet.vue`** gère l'export inline (slugify + blob + download, ~10 lignes)
  - La **vue `CharacterList.vue`** gère l'UI d'import inline (input caché + FileReader + appel store)
- Pas de fichier `src/utils/characterIO.ts` : éviter l'abstraction prématurée sur du code trivial

## Hors scope

- Pas de versioning du format JSON
- Pas d'export/import multiple (un personnage à la fois)
- Pas de validation stricte des champs internes (types de surface seulement)
- Pas de migration entre versions du modèle `Character`
- Pas de page dédiée à la gestion des personnages
- Pas de toast ou composant de notification — `alert` natif suffit
- Pas de drag-and-drop de fichier — input file classique
