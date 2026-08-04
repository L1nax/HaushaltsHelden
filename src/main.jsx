import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PwaUpdater from './PwaUpdater.jsx'

// Frühere Versionen haben firebase-messaging-sw.js unter Scope "/" registriert und
// damit den Vite-PWA-SW verdrängt. Ergebnis: das "Neue Version"-Popup blieb hängen
// und der Reload-Button verpuffte. Einmalig aufräumen, bevor der PWA-SW mountet.
//
// Aufgeräumt wird ausschließlich der Root-Scope. Auf den Push-Scope zu prüfen ginge
// schief: registerPush() übergibt "/firebase-cloud-messaging-push-scope" ohne
// abschließenden Slash, und der Browser hängt auch keinen an — eine Prüfung auf
// ".../push-scope/" trifft also nie zu und würde die FCM-Registrierung bei jedem
// Start mit abräumen (neuer Token bei jedem App-Start).
if ('serviceWorker' in navigator) {
  const rootScope = new URL('/', location.href).href
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) {
      const scriptURL = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || ''
      if (scriptURL.endsWith('/firebase-messaging-sw.js') && reg.scope === rootScope) {
        reg.unregister().catch(() => {})
      }
    }
  }).catch(() => {})
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <PwaUpdater />
  </StrictMode>,
)
