# Import/Export Personnage — Plan d'implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un export JSON de personnage depuis `CharacterSheet` et un import JSON depuis `CharacterList`, avec validation minimale et complétion par défaut.

**Architecture:** Logique de mutation + validation dans le store Pinia (`importCharacter`), UI d'export et d'import inline dans les vues concernées. Pas de module utilitaire nouveau. Feedback d'erreur via `alert` natif.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vue Router, Vitest

**Spec source:** `docs/superpowers/specs/2026-04-22-import-export-character-design.md`

---

## File Map

| File | Responsibility |
|---|---|
| `src/stores/characterStore.ts` | Ajout de l'action `importCharacter(data: unknown): string` — validation minimale + construction avec défauts + persistence |
| `src/__tests__/characterStore.test.ts` | Tests TDD pour `importCharacter` (validation, merge, regénération d'id) |
| `src/views/CharacterSheet.vue` | Bouton "Exporter" dans le header + fonction inline `exportCharacter()` (slugify + blob + download) |
| `src/views/CharacterList.vue` | Bouton "Importer" + `<input type="file">` caché + fonction inline `importFromFile()` |

---

## Task 1 : `importCharacter` — validation minimale et création

Ajoute l'action `importCharacter` dans le store, avec la validation minimale (data = objet non-null, `name` = string non-vide) et la création via `createEmptyCharacter`. Sans merge des champs optionnels (traité en Task 2).

**Files:**
- Modify: `src/stores/characterStore.ts`
- Test: `src/__tests__/characterStore.test.ts`

- [ ] **Step 1 : Écrire le test "importe un personnage minimal"**

Ajouter dans `src/__tests__/characterStore.test.ts` avant la dernière ligne `})`:

```ts
  it('imports a character with only a name', () => {
    const store = useCharacterStore()
    const id = store.importCharacter({ name: 'Alice' })
    expect(store.characters).toHaveLength(1)
    const imported = store.characters[0]
    expect(imported.id).toBe(id)
    expect(imported.name).toBe('Alice')
    expect(imported.skills.martial).toEqual({ pointsSpent: 0 })
    expect(imported.tracker).toEqual({ currentHP: 10, currentSanity: 10, currentSouffle: 10, activeEffects: [] })
    expect(imported.inventory).toEqual([])
    expect(imported.abilities).toEqual([])
  })

  it('regenerates id and timestamps on import', () => {
    const store = useCharacterStore()
    const id = store.importCharacter({
      id: 'fake-id-from-file',
      name: 'Bob',
      createdAt: 1000,
      updatedAt: 2000,
    })
    const imported = store.characters[0]
    expect(imported.id).toBe(id)
    expect(imported.id).not.toBe('fake-id-from-file')
    expect(imported.createdAt).toBeGreaterThan(2000)
    expect(imported.updatedAt).toBeGreaterThan(2000)
  })

  it('throws on non-object data', () => {
    const store = useCharacterStore()
    expect(() => store.importCharacter(null)).toThrow()
    expect(() => store.importCharacter('string')).toThrow()
    expect(() => store.importCharacter([1, 2, 3])).toThrow()
    expect(() => store.importCharacter(42)).toThrow()
  })

  it('throws on missing or empty name', () => {
    const store = useCharacterStore()
    expect(() => store.importCharacter({})).toThrow(/name/)
    expect(() => store.importCharacter({ name: '' })).toThrow(/name/)
    expect(() => store.importCharacter({ name: '   ' })).toThrow(/name/)
    expect(() => store.importCharacter({ name: 42 })).toThrow(/name/)
  })

  it('trims the name on import', () => {
    const store = useCharacterStore()
    store.importCharacter({ name: '  Charlie  ' })
    expect(store.characters[0].name).toBe('Charlie')
  })
```

- [ ] **Step 2 : Lancer les tests, vérifier qu'ils échouent**

Run: `npm test -- characterStore`
Expected: FAIL avec `store.importCharacter is not a function`

- [ ] **Step 3 : Implémenter `importCharacter` minimal dans le store**

Dans `src/stores/characterStore.ts`, ajouter l'import de `createEmptyCharacter` si ce n'est pas déjà fait (vérifier ligne 2), puis ajouter l'action juste avant `_persist`:

```ts
    importCharacter(data: unknown): string {
      if (data === null || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('le fichier doit contenir un objet personnage')
      }
      const obj = data as Record<string, unknown>
      if (typeof obj.name !== 'string' || obj.name.trim() === '') {
        throw new Error("le champ 'name' est manquant ou vide")
      }
      const char = createEmptyCharacter(generateId(), obj.name.trim())
      this.characters.push(char)
      this._persist()
      return char.id
    },
```

- [ ] **Step 4 : Lancer les tests, vérifier qu'ils passent**

Run: `npm test -- characterStore`
Expected: PASS (toutes les nouvelles assertions vertes, les anciennes toujours vertes)

- [ ] **Step 5 : Commit**

```bash
git add src/stores/characterStore.ts src/__tests__/characterStore.test.ts
git commit -m "feat: add importCharacter store action with minimal validation"
```

---

## Task 2 : `importCharacter` — merge des champs optionnels

Étend `importCharacter` pour copier les champs optionnels (`story`, `skills`, `specializations`, `bonusPoints`, `inventory`, `abilities`, `tracker`) du JSON importé dans le `Character` de base construit à Task 1. Validation de surface uniquement (type global), pas de validation récursive.

**Files:**
- Modify: `src/stores/characterStore.ts`
- Test: `src/__tests__/characterStore.test.ts`

- [ ] **Step 1 : Écrire les tests pour le merge**

Ajouter dans `src/__tests__/characterStore.test.ts` (toujours avant le `})` final):

```ts
  it('merges story when present as string', () => {
    const store = useCharacterStore()
    store.importCharacter({ name: 'Dina', story: 'Un vieux soldat.' })
    expect(store.characters[0].story).toBe('Un vieux soldat.')
  })

  it('ignores story when not a string', () => {
    const store = useCharacterStore()
    store.importCharacter({ name: 'Dina', story: 42 })
    expect(store.characters[0].story).toBe('')
  })

  it('merges skills, specializations, bonusPoints when objects', () => {
    const store = useCharacterStore()
    store.importCharacter({
      name: 'Eve',
      skills: { martial: { pointsSpent: 3 } },
      specializations: { martial: 'duelliste' },
      bonusPoints: { archerie: 1 },
    })
    const c = store.characters[0]
    expect(c.skills.martial).toEqual({ pointsSpent: 3 })
    expect(c.specializations.martial).toBe('duelliste')
    expect(c.bonusPoints.archerie).toBe(1)
  })

  it('ignores skills/specializations/bonusPoints when not objects', () => {
    const store = useCharacterStore()
    store.importCharacter({
      name: 'Frank',
      skills: 'not-an-object',
      specializations: [1, 2],
      bonusPoints: null,
    })
    const c = store.characters[0]
    expect(c.skills.martial).toEqual({ pointsSpent: 0 })
    expect(c.specializations).toEqual({})
    expect(c.bonusPoints).toEqual({})
  })

  it('merges inventory and abilities when arrays', () => {
    const store = useCharacterStore()
    store.importCharacter({
      name: 'Gwen',
      inventory: [{ id: 'x', weaponId: 'sword', traits: [], currentFragility: 0 }],
      abilities: [{ id: 'a1', title: 'Vision', description: 'voit loin' }],
    })
    const c = store.characters[0]
    expect(c.inventory).toHaveLength(1)
    expect(c.abilities).toHaveLength(1)
    expect(c.abilities[0].title).toBe('Vision')
  })

  it('ignores inventory/abilities when not arrays', () => {
    const store = useCharacterStore()
    store.importCharacter({ name: 'Ian', inventory: 'nope', abilities: {} })
    expect(store.characters[0].inventory).toEqual([])
    expect(store.characters[0].abilities).toEqual([])
  })

  it('merges tracker field by field on top of defaults', () => {
    const store = useCharacterStore()
    store.importCharacter({
      name: 'Jane',
      tracker: { currentHP: 5, activeEffects: ['blessé'] },
    })
    const t = store.characters[0].tracker
    expect(t.currentHP).toBe(5)
    expect(t.currentSanity).toBe(10)
    expect(t.currentSouffle).toBe(10)
    expect(t.activeEffects).toEqual(['blessé'])
  })

  it('ignores tracker when not an object', () => {
    const store = useCharacterStore()
    store.importCharacter({ name: 'Kim', tracker: 'nope' })
    expect(store.characters[0].tracker).toEqual({
      currentHP: 10, currentSanity: 10, currentSouffle: 10, activeEffects: [],
    })
  })

  it('ignores tracker sub-fields with wrong types', () => {
    const store = useCharacterStore()
    store.importCharacter({
      name: 'Leo',
      tracker: { currentHP: 'seven', activeEffects: 'not-array', currentSanity: 3 },
    })
    const t = store.characters[0].tracker
    expect(t.currentHP).toBe(10)
    expect(t.currentSanity).toBe(3)
    expect(t.activeEffects).toEqual([])
  })
```

- [ ] **Step 2 : Lancer les tests, vérifier qu'ils échouent**

Run: `npm test -- characterStore`
Expected: FAIL sur les nouveaux tests de merge (les anciens toujours verts)

- [ ] **Step 3 : Étendre `importCharacter` pour merger les champs**

Remplacer la body de `importCharacter` dans `src/stores/characterStore.ts` par:

```ts
    importCharacter(data: unknown): string {
      if (data === null || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('le fichier doit contenir un objet personnage')
      }
      const obj = data as Record<string, unknown>
      if (typeof obj.name !== 'string' || obj.name.trim() === '') {
        throw new Error("le champ 'name' est manquant ou vide")
      }
      const char = createEmptyCharacter(generateId(), obj.name.trim())

      if (typeof obj.story === 'string') {
        char.story = obj.story
      }
      if (isPlainObject(obj.skills)) {
        char.skills = obj.skills as Character['skills']
      }
      if (isPlainObject(obj.specializations)) {
        char.specializations = obj.specializations as Character['specializations']
      }
      if (isPlainObject(obj.bonusPoints)) {
        char.bonusPoints = obj.bonusPoints as Character['bonusPoints']
      }
      if (Array.isArray(obj.inventory)) {
        char.inventory = obj.inventory as Character['inventory']
      }
      if (Array.isArray(obj.abilities)) {
        char.abilities = obj.abilities as Character['abilities']
      }
      if (isPlainObject(obj.tracker)) {
        const t = obj.tracker as Record<string, unknown>
        if (typeof t.currentHP === 'number') char.tracker.currentHP = t.currentHP
        if (typeof t.currentSanity === 'number') char.tracker.currentSanity = t.currentSanity
        if (typeof t.currentSouffle === 'number') char.tracker.currentSouffle = t.currentSouffle
        if (Array.isArray(t.activeEffects)) char.tracker.activeEffects = t.activeEffects as string[]
      }

      this.characters.push(char)
      this._persist()
      return char.id
    },
```

Et ajouter le helper `isPlainObject` au-dessus de `export const useCharacterStore`, après `saveToStorage`:

```ts
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
```

- [ ] **Step 4 : Lancer les tests, vérifier qu'ils passent**

Run: `npm test -- characterStore`
Expected: PASS (tous les tests verts)

- [ ] **Step 5 : Commit**

```bash
git add src/stores/characterStore.ts src/__tests__/characterStore.test.ts
git commit -m "feat: merge optional character fields on import with defaults"
```

---

## Task 3 : Export depuis `CharacterSheet`

Ajoute un bouton "Exporter" dans le header de `CharacterSheet.vue`, à côté de "Modifier", qui télécharge le personnage actif en JSON. Cette tâche n'a pas de tests unitaires (UI — testée manuellement).

**Files:**
- Modify: `src/views/CharacterSheet.vue`

- [ ] **Step 1 : Ajouter la fonction `exportCharacter` dans le `<script setup>`**

Dans `src/views/CharacterSheet.vue`, ajouter **après** la fonction `goToEdit` (autour de ligne 212, juste avant la ligne `</script>`):

```ts
function slugify(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'personnage'
}

function exportCharacter() {
  if (!character.value) return
  const json = JSON.stringify(character.value, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slugify(character.value.name)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2 : Ajouter le bouton "Exporter" dans le header**

Dans le template de `src/views/CharacterSheet.vue`, localiser le bloc `<div class="grid grid-cols-2 gap-2">` (ligne 230). Ajouter un bouton "Exporter" **après** le bouton "Capacites" (ligne 245) et avant la fermeture `</div>` :

```vue
        <button @click="exportCharacter" class="flex items-center justify-center gap-1">
          <span class="material-symbols-outlined text-sm">download</span> Exporter
        </button>
```

Le grid passe à 6 éléments (3 rangées × 2 colonnes) : Retour, Modifier, Inventaire, Combat, Capacites, **Exporter**.

- [ ] **Step 3 : Vérifier le type check**

Run: `npx vue-tsc -b --noEmit`
Expected: pas d'erreur TypeScript

- [ ] **Step 4 : Test manuel**

Run: `npm run dev`

Dans le navigateur :
1. Ouvrir un personnage existant (`/character/<id>`)
2. Cliquer sur "Exporter"
3. Vérifier qu'un fichier `.json` est téléchargé avec un nom slugifié du personnage
4. Ouvrir le fichier : doit contenir tous les champs du `Character` en JSON indenté
5. Tester avec un nom contenant accents/espaces (ex: "Marie-Ânne Dubois") → fichier `marie-anne-dubois.json`
6. Tester avec un nom entièrement non-alphanumérique (ex: "!!!") → fichier `personnage.json`

- [ ] **Step 5 : Commit**

```bash
git add src/views/CharacterSheet.vue
git commit -m "feat: add character export button to sheet view"
```

---

## Task 4 : Import depuis `CharacterList`

Ajoute un bouton "Importer" dans `CharacterList.vue`, un `<input type="file">` caché, la lecture du fichier, l'appel au store, et la redirection vers la fiche importée.

**Files:**
- Modify: `src/views/CharacterList.vue`

- [ ] **Step 1 : Importer `ref` et ajouter les fonctions dans le `<script setup>`**

Remplacer entièrement le `<script setup lang="ts">` de `src/views/CharacterList.vue` par:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useCharacterStore } from '../stores/characterStore'
import { useRouter } from 'vue-router'

const store = useCharacterStore()
const router = useRouter()
const fileInput = ref<HTMLInputElement | null>(null)

function createNew() {
  router.push('/character/new')
}

function deleteCharacter(id: string) {
  const char = store.characters.find(c => c.id === id)
  if (!confirm(`Supprimer ${char?.name ?? 'ce personnage'} ?`)) return
  store.deleteCharacter(id)
}

function selectCharacter(id: string) {
  store.setActiveCharacter(id)
  router.push(`/character/${id}`)
}

function triggerImport() {
  fileInput.value?.click()
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    let parsed: unknown
    try {
      parsed = JSON.parse(reader.result as string)
    } catch {
      alert("Fichier invalide : le contenu n'est pas du JSON valide.")
      input.value = ''
      return
    }
    try {
      const newId = store.importCharacter(parsed)
      input.value = ''
      router.push(`/character/${newId}`)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      alert('Fichier invalide : ' + message)
      input.value = ''
    }
  }
  reader.onerror = () => {
    alert('Impossible de lire le fichier.')
    input.value = ''
  }
  reader.readAsText(file)
}
</script>
```

- [ ] **Step 2 : Ajouter l'input caché et le bouton "Importer" dans le template**

Dans `src/views/CharacterList.vue`, remplacer le bloc `<div class="mt-8">` (ligne 51-56) par:

```vue
    <div class="mt-8 grid grid-cols-2 gap-2">
      <button class="primary py-3" @click="createNew">
        <span class="material-symbols-outlined text-sm mr-1">add</span>
        Nouveau
      </button>
      <button class="py-3" @click="triggerImport">
        <span class="material-symbols-outlined text-sm mr-1">upload</span>
        Importer
      </button>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept=".json,application/json"
      class="hidden"
      @change="onFileSelected"
    />
```

- [ ] **Step 3 : Vérifier le type check**

Run: `npx vue-tsc -b --noEmit`
Expected: pas d'erreur TypeScript

- [ ] **Step 4 : Test manuel — cas nominal**

Run: `npm run dev`

Dans le navigateur :
1. Exporter un personnage existant (bouton Exporter de Task 3)
2. Revenir à la liste `/`
3. Cliquer "Importer", sélectionner le fichier exporté
4. Vérifier : redirection sur la fiche du nouveau personnage (nouvel id dans l'URL)
5. Retour à la liste : 2 personnages avec le même nom (l'original + le réimporté)

- [ ] **Step 5 : Test manuel — cas erreur**

1. Créer un fichier `test.json` avec `{ "foo": "bar" }` (pas de `name`)
2. Importer → alerte "Fichier invalide : le champ 'name' est manquant ou vide"
3. Créer un fichier `test2.json` avec `hello world` (pas JSON valide)
4. Importer → alerte "Fichier invalide : le contenu n'est pas du JSON valide."
5. Re-sélectionner le même fichier une seconde fois → l'alerte doit se re-déclencher (vérifie le reset de l'input)

- [ ] **Step 6 : Commit**

```bash
git add src/views/CharacterList.vue
git commit -m "feat: add character import button to list view"
```

---

## Task 5 : Nettoyage de l'ancien spec

Supprime l'ancien spec qui a été explicitement remplacé par le nouveau (mentionné dans la section "Résumé" du nouveau spec).

**Files:**
- Delete: `docs/superpowers/specs/2026-04-14-export-import-character-design.md`

- [ ] **Step 1 : Supprimer l'ancien fichier**

```bash
git rm docs/superpowers/specs/2026-04-14-export-import-character-design.md
```

- [ ] **Step 2 : Commit**

```bash
git commit -m "docs: remove superseded export/import spec"
```

---

## Verification finale

Après toutes les tâches :

- [ ] `npm test` — tous les tests passent
- [ ] `npx vue-tsc -b --noEmit` — pas d'erreur TypeScript
- [ ] `npm run build` — build réussit
- [ ] Test end-to-end manuel : créer > exporter > importer > la fiche importée affiche les mêmes données
