import { registerSW } from 'virtual:pwa-register'

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  return registerSW({
    immediate: true,
    onRegisteredSW(_, registration) {
      if (!registration) return

      window.setInterval(() => {
        registration.update().catch(() => {})
      }, 60 * 60 * 1000)
    },
  })
}