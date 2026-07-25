import { useRegisterSW } from 'virtual:pwa-register/react'

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('SW registration error', error)
    },
  })

  if (!needRefresh) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        maxWidth: 420,
        margin: '0 auto',
        background: '#FFFFFF',
        borderRadius: 16,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        padding: 16,
        zIndex: 9999,
        fontFamily: "'Nunito', sans-serif",
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
      role="alert"
    >
      <div style={{ fontSize: 28 }}>🚀</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, color: '#1A1A2E', fontSize: 15 }}>
          Neue Version verfügbar
        </div>
        <div style={{ color: '#666', fontSize: 13 }}>
          Jetzt neu laden, um zu aktualisieren.
        </div>
      </div>
      <button
        onClick={() => setNeedRefresh(false)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#888',
          fontWeight: 700,
          padding: '8px 10px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 13,
        }}
      >
        Später
      </button>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          background: '#863bff',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '10px 14px',
          fontWeight: 800,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 13,
        }}
      >
        Neu laden
      </button>
    </div>
  )
}
