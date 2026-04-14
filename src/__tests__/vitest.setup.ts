import { vi } from 'vitest'

// Provide a proper localStorage mock for the jsdom environment.
// @vue/devtools-kit imports during the module-runner phase can overwrite
// the global localStorage with Node's built-in webstorage (which lacks
// clear/getItem/setItem). This setup file restores a fully-functional mock.
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value) },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: createLocalStorageMock(),
  writable: true,
})
