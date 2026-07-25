import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.v2.png'],
      manifest: {
        name: 'Haushalts-Helden',
        short_name: 'HH',
        description: 'Familien-Aufgaben und Belohnungen',
        lang: 'de',
        theme_color: '#1A1A2E',
        background_color: '#FFF8ED',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-64x64.v2.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.v2.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.v2.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.v2.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
