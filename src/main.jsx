import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import UpdatePrompt from './UpdatePrompt.jsx'

// Frühere Versionen haben firebase-messaging-sw.js unter Scope "/" registriert und
// damit den Vite-PWA-SW verdrängt. Ergebnis: das "Neue Version"-Popup blieb hängen
// und der Reload-Button verpuffte. Einmalig aufräumen, bevor der PWA-SW mountet.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) {
      const scriptURL = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || ''
      if (scriptURL.endsWith('/firebase-messaging-sw.js') && !reg.scope.endsWith('/firebase-cloud-messaging-push-scope/')) {
        reg.unregister().catch(() => {})
      }
    }
  }).catch(() => {})
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <UpdatePrompt />
  </StrictMode>,
)
