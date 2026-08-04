import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Fehlt der VAPID-Key, faltet der Minifier `if (!VAPID_KEY) return …` zur
// Konstante und wirft den Rest von registerPush() als toten Code weg. Das
// Bundle baut dann fehlerfrei durch, hat aber stillschweigend kein Push mehr.
// Deshalb: Build hart abbrechen, statt so etwas auszuliefern.
function requireVapidKey() {
  return {
    name: 'require-vapid-key',
    apply: 'build',
    configResolved(config) {
      const key = config.env.VITE_FIREBASE_VAPID_KEY
      if (!key) {
        throw new Error(
          'VITE_FIREBASE_VAPID_KEY fehlt — Push wäre in diesem Build still deaktiviert.\n' +
          'Der Key gehört in .env im Projektroot (Firebase Console → Project Settings →\n' +
          'Cloud Messaging → Web Push certificates). Er ist öffentlich, kein Geheimnis.'
        )
      }
      if (key.length !== 87) {
        throw new Error(
          `VITE_FIREBASE_VAPID_KEY hat ${key.length} statt 87 Zeichen — sieht abgeschnitten\n` +
          'oder falsch kopiert aus. Erwartet wird ein base64url-kodierter P-256-Punkt.'
        )
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    requireVapidKey(),
    react(),
    VitePWA({
      // 'prompt' hat das "Neue Version"-Banner mehrmals täglich gezeigt: Wer
      // "Später" drückte, blendete nur das Banner aus — der neue Service Worker
      // blieb im Zustand "waiting" stehen, und Workbox meldet einen bereits
      // wartenden SW bei jedem App-Start erneut. Immer dieselbe Version, immer
      // wieder das Popup. 'autoUpdate' lässt den neuen SW sofort übernehmen
      // (skipWaiting + clientsClaim setzt das Plugin dafür automatisch).
      registerType: 'autoUpdate',
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
