import { useEffect } from 'react'
import Header from './components/Header'
import AppRouter from './components/AppRouter'
import BottomNav from './components/ui/BottomNav'
import InstallAppPrompt from './components/pwa/InstallAppPrompt'
import { useAppStore } from './store/useAppStore'

function App() {
  const notification = useAppStore((s) => s.notification)
  const clearNotification = useAppStore((s) => s.clearNotification)
  const initializeDeliveries = useAppStore((s) => s.initializeDeliveries)
  const refreshSnapshot = useAppStore((s) => s.refreshSnapshot)

  useEffect(() => {
    initializeDeliveries()
  }, [initializeDeliveries])

  useEffect(() => {
    let cancelled = false
    let inFlight = false

    const syncNow = async () => {
      if (cancelled || inFlight) return
      inFlight = true
      try {
        await refreshSnapshot({ silent: true })
      } finally {
        inFlight = false
      }
    }

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncNow()
      }
    }

    syncNow()
    const intervalId = window.setInterval(syncNow, 5000)
    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
    }
  }, [refreshSnapshot])

  return (
    <div className="min-h-dvh bg-[#F7F9FC] text-slate-900 antialiased">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-white pt-[env(safe-area-inset-top)] shadow-[0_0_0_1px_rgba(226,232,240,0.8)]">
        <Header />
        <main className="flex-1 overflow-y-auto px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4">
          <AppRouter />
        </main>
        {notification ? (
          <button
            type="button"
            onClick={clearNotification}
            className={[
              'fixed bottom-[7.25rem] left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border px-4 py-3 text-left shadow-lg transition',
              notification.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : notification.tone === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : notification.tone === 'danger'
                    ? 'border-rose-200 bg-rose-50 text-rose-900'
                    : 'border-sky-200 bg-sky-50 text-sky-900',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <p className="text-sm font-semibold uppercase tracking-wide opacity-80">Update</p>
            <p className="mt-1 text-base font-medium">{notification.message}</p>
          </button>
        ) : null}
        <InstallAppPrompt />
        <BottomNav />
      </div>
    </div>
  )
}

export default App
