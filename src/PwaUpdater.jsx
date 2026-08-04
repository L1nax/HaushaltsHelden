import { useRegisterSW } from 'virtual:pwa-register/react'

const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5min

// Der neue Service Worker übernimmt sofort (registerType: 'autoUpdate'), die
// laufende Seite zeigt aber weiterhin den alten Code. Ein Reload mitten im
// Tippen wäre unhöflich, deshalb warten wir, bis die App im Hintergrund ist.
function reloadWhenHidden() {
  if (document.visibilityState === 'hidden') {
    window.location.reload()
    return
  }
  const onHidden = () => {
    if (document.visibilityState !== 'hidden') return
    document.removeEventListener('visibilitychange', onHidden)
    window.location.reload()
  }
  document.addEventListener('visibilitychange', onHidden)
}

export default function PwaUpdater() {
  useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return

      const check = () => {
        if (registration.installing || !navigator) return
        if ('connection' in navigator && !navigator.onLine) return
        registration.update().catch(() => {})
      }

      // Periodic background check for installed PWAs that stay open
      setInterval(check, UPDATE_CHECK_INTERVAL_MS)

      // Check when the app comes back to the foreground
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      window.addEventListener('focus', check)

      // Initial nudge in case the SW was already registered when we mounted
      check()
    },
    onNeedReload() {
      reloadWhenHidden()
    },
    onRegisterError(error) {
      console.error('SW registration error', error)
    },
  })

  return null
}
