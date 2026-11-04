/**
 * Installation als Web-App (PWA): reine Erkennung, ohne Browser-Zugriff testbar.
 * Chrome, Edge und Android bieten ein eigenes Installationsfenster an; iPhone und iPad nur
 * „Teilen → Zum Home-Bildschirm“.
 */

/** iPhone/iPad – iPadOS meldet sich als Mac, verrät sich aber über die Touch-Bedienung */
export function isIosDevice(userAgent: string, maxTouchPoints = 0): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1
}

/** Läuft die Seite schon als installierte App (ohne Browser-Leisten)? */
export function isRunningInstalled(displayModeStandalone: boolean, iosStandalone?: boolean): boolean {
  return displayModeStandalone || iosStandalone === true
}

/** Ereignis, mit dem Chromium-Browser die Installation anbieten (nicht in den DOM-Typen) */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
