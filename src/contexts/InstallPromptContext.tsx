'use client'

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import { isIosDevice, isRunningInstalled, type BeforeInstallPromptEvent } from '@/lib/installApp'

type InstallPromptState = {
  /** Erst nach dem Laden im Browser bekannt – vorher nichts anzeigen */
  ready: boolean
  isInstalled: boolean
  /** Browser bietet ein eigenes Installationsfenster an (Chrome, Edge, Android) */
  canPrompt: boolean
  /** iPhone/iPad: nur per „Teilen → Zum Home-Bildschirm“ */
  isIos: boolean
  promptInstall: () => Promise<void>
}

const InstallPromptContext = createContext<InstallPromptState>({
  ready: false,
  isInstalled: false,
  canPrompt: false,
  isIos: false,
  promptInstall: async () => {},
})

const noopSubscribe = () => () => {}

function subscribeStandalone(onChange: () => void) {
  const media = window.matchMedia('(display-mode: standalone)')
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function readStandalone() {
  return isRunningInstalled(
    window.matchMedia('(display-mode: standalone)').matches,
    (window.navigator as Navigator & { standalone?: boolean }).standalone
  )
}

function readIos() {
  return isIosDevice(window.navigator.userAgent, window.navigator.maxTouchPoints)
}

/** Fängt das Installationsangebot früh ab – der Browser schickt es nur einmal beim Laden */
export function InstallPromptProvider({ children }: { children: React.ReactNode }) {
  // Auf dem Server unbekannt: dort nichts anzeigen, im Browser sofort richtig
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false)
  const standalone = useSyncExternalStore(subscribeStandalone, readStandalone, () => false)
  const isIos = useSyncExternalStore(noopSubscribe, readIos, () => false)
  const [installedNow, setInstalledNow] = useState(false)
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const isInstalled = standalone || installedNow

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // Eigener Knopf statt der Browser-Leiste
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setPromptEvent(null)
      setInstalledNow(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!promptEvent) return
    await promptEvent.prompt()
    await promptEvent.userChoice
    // Das Angebot gilt nur einmal; ein neues kommt beim nächsten Laden
    setPromptEvent(null)
  }, [promptEvent])

  return (
    <InstallPromptContext.Provider
      value={{ ready, isInstalled, canPrompt: promptEvent !== null, isIos, promptInstall }}
    >
      {children}
    </InstallPromptContext.Provider>
  )
}

export function useInstallPrompt() {
  return useContext(InstallPromptContext)
}

/** Lässt sich die App hier überhaupt installieren (und ist sie es noch nicht)? */
export function useCanInstallApp() {
  const state = useInstallPrompt()
  return state.ready && !state.isInstalled && (state.canPrompt || state.isIos)
}
