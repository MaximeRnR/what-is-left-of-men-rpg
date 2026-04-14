# Export/Import de personnages en JSON

## Résumé

Permettre aux utilisateurs d'exporter un personnage en fichier JSON et d'importer un fichier JSON pour créer un nouveau personnage. L'export se fait depuis la fiche personnage, l'import depuis la liste des personnages.

## Export

- **Emplacement** : Page `CharacterSheet` (`/character/:id`), bouton à côté de "Modifier"
- **Action** : Télécharge un fichier `{nom-du-personnage}.json` contenant l'objet `Character` complet
- **Format** : JSON brut, objet `Character` sérialisé tel quel
- **Mécanisme** : `URL.createObjectURL` + élément `<a download>` pour déclencher le téléchargement

## Import

- **Emplacement** : Page `CharacterList` (`/`), bouton à côté du bouton de création
- **Action** : Bouton "Importer" ouvre un sélecteur de fichier `.json` via `<input type="file" accept=".json">` caché
- **Comportement** :
  - Toujours créer un nouveau personnage avec un nouvel `id` et nouveaux timestamps
  - Validation stricte avant insertion
  - Message d'erreur clair si le fichier est invalide (toast/alerte inline)
  - Redirection vers la fiche du personnage importé en cas de succès

## Validation

Fonction `validateCharacterJson(data: unknown)` dans `src/models/character.ts` :

- Retourne `{ valid: true, character: Character } | { valid: false, error: string }`
- Vérifie :
  - JSON valide (parsing)
  - Champs obligatoires présents : `name`, `skills`, `inventory`, `tracker`, `abilities`
  - `skills` référence des `SkillId` valides
  - Chaque `SkillAllocation` a la forme `{ pointsSpent: number }`
  - `inventory` est un tableau d'`InventoryItem` valides
  - `tracker` contient `currentHP`, `currentSanity`, `currentSouffle` (numbers) et `activeEffects` (array)
  - `abilities` est un tableau avec des objets `{ id, title, description }` (strings)

## Store

Ajout d'une action `importCharacter(data: Character): string` dans `characterStore.ts` :

- Génère un nouvel `id` (UUID)
- Remplace `createdAt` et `updatedAt` par `Date.now()`
- Persiste et retourne le nouvel `id`

## Hors scope

- Pas d'export/import multiple (un personnage à la fois)
- Pas de versioning du format JSON
- Pas de page dédiée
