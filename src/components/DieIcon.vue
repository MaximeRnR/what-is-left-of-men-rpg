<script setup lang="ts">
defineProps<{
  die: string  // "d4" | "d6" | "d8" | "d10" | "d12" | "d20"
  size?: number // px, default 32
}>()
</script>

<template>
  <!-- d4 — Tetrahedron -->
  <svg v-if="die === 'd4'" :width="size ?? 32" :height="size ?? 32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="die-icon">
    <polygon points="50,8 8,88 92,88" stroke="currentColor" stroke-width="3" fill="none" stroke-linejoin="round"/>
    <line x1="50" y1="8" x2="50" y2="88" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="8" y1="88" x2="71" y2="48" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <text x="50" y="72" text-anchor="middle" fill="currentColor" font-family="Space Grotesk, sans-serif" font-weight="700" font-size="28">4</text>
  </svg>

  <!-- d6 — Cube -->
  <svg v-else-if="die === 'd6'" :width="size ?? 32" :height="size ?? 32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="die-icon">
    <rect x="12" y="12" width="76" height="76" rx="6" stroke="currentColor" stroke-width="3" fill="none"/>
    <line x1="12" y1="12" x2="30" y2="4" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="88" y1="12" x2="96" y2="4" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="30" y1="4" x2="96" y2="4" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="96" y1="4" x2="96" y2="70" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="88" y1="88" x2="96" y2="70" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <text x="50" y="62" text-anchor="middle" fill="currentColor" font-family="Space Grotesk, sans-serif" font-weight="700" font-size="32">6</text>
  </svg>

  <!-- d8 — Octahedron (diamond shape) -->
  <svg v-else-if="die === 'd8'" :width="size ?? 32" :height="size ?? 32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="die-icon">
    <polygon points="50,4 96,50 50,96 4,50" stroke="currentColor" stroke-width="3" fill="none" stroke-linejoin="round"/>
    <line x1="4" y1="50" x2="96" y2="50" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="50" y1="4" x2="30" y2="50" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="50" y1="4" x2="70" y2="50" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <text x="50" y="62" text-anchor="middle" fill="currentColor" font-family="Space Grotesk, sans-serif" font-weight="700" font-size="28">8</text>
  </svg>

  <!-- d10 — Pentagonal shape -->
  <svg v-else-if="die === 'd10'" :width="size ?? 32" :height="size ?? 32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="die-icon">
    <polygon points="50,4 93,35 80,88 20,88 7,35" stroke="currentColor" stroke-width="3" fill="none" stroke-linejoin="round"/>
    <line x1="50" y1="4" x2="50" y2="88" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="7" y1="35" x2="80" y2="88" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="93" y1="35" x2="20" y2="88" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <text x="50" y="66" text-anchor="middle" fill="currentColor" font-family="Space Grotesk, sans-serif" font-weight="700" font-size="26">10</text>
  </svg>

  <!-- d12 — Dodecahedron (hexagonal shape) -->
  <svg v-else-if="die === 'd12'" :width="size ?? 32" :height="size ?? 32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="die-icon">
    <polygon points="50,4 88,20 100,58 76,92 24,92 0,58 12,20" stroke="currentColor" stroke-width="3" fill="none" stroke-linejoin="round"/>
    <line x1="50" y1="4" x2="50" y2="42" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="12" y1="20" x2="50" y2="42" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="88" y1="20" x2="50" y2="42" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="0" y1="58" x2="36" y2="68" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="100" y1="58" x2="64" y2="68" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="36" y1="68" x2="24" y2="92" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="64" y1="68" x2="76" y2="92" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="36" y1="68" x2="64" y2="68" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <text x="50" y="64" text-anchor="middle" fill="currentColor" font-family="Space Grotesk, sans-serif" font-weight="700" font-size="24">12</text>
  </svg>

  <!-- d20 — Icosahedron (triangulated shape) -->
  <svg v-else-if="die === 'd20'" :width="size ?? 32" :height="size ?? 32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" class="die-icon">
    <polygon points="50,2 95,28 95,72 50,98 5,72 5,28" stroke="currentColor" stroke-width="3" fill="none" stroke-linejoin="round"/>
    <line x1="50" y1="2" x2="5" y2="72" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="50" y1="2" x2="95" y2="72" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="5" y1="28" x2="95" y2="72" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="95" y1="28" x2="5" y2="72" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="50" y1="98" x2="5" y2="28" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <line x1="50" y1="98" x2="95" y2="28" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
    <text x="50" y="62" text-anchor="middle" fill="currentColor" font-family="Space Grotesk, sans-serif" font-weight="700" font-size="24">20</text>
  </svg>
</template>
