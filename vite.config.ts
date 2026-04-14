/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.svg'],
      manifest: {
        name: 'Contagion — Gestion de personnages',
        short_name: 'Contagion',
        description: 'Gestionnaire de personnages pour le JDR Contagion',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/icons/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/__tests__/vitest.setup.ts'],
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
  },
})
