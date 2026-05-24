import { useEffect, useState } from 'react'

function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

    setIsInstalled(standalone)

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      setIsInstallable(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) {
      return 'unavailable'
    }

    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setIsInstallable(false)

    if (choice.outcome === 'accepted') {
      setIsInstalled(true)
    }

    return choice.outcome
  }

  return {
    isInstallable,
    isInstalled,
    promptInstall,
  }
}

export default function InstallAppPrompt() {
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (isInstallable) {
      setDismissed(false)
    }
  }, [isInstallable])

  if (!isInstallable || isInstalled || dismissed) {
    return null
  }

  return (
    <div className="fixed bottom-[calc(7.25rem+4.5rem)] left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-2xl border border-sky-200 bg-white/95 p-4 text-left shadow-lg backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-inner">
          <span className="text-lg font-semibold">W</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Install app</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            Add WaterFlow to your home screen for a fullscreen app experience with offline support.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                await promptInstall()
              }}
              className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Install App
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}