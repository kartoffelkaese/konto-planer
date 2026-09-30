/** Desktop-Seitenleiste: Breiten und gespeicherter Zustand (gemeinsam für Init-Skript und Navigation) */

export const SIDEBAR_WIDTH_EXPANDED = '15rem'
export const SIDEBAR_WIDTH_COLLAPSED = '4.5rem'

/** '1' = eingeklappt (nur Icons) */
export const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed'
/** '1' = Navigation sichtbar (angemeldet) – damit die Seite ohne Sprung in der richtigen Breite startet */
export const SIDEBAR_VISIBLE_KEY = 'sidebarVisible'

export function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export function storeSidebarState(visible: boolean, collapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_VISIBLE_KEY, visible ? '1' : '0')
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0')
  } catch {
    // Speicher nicht verfügbar – Zustand gilt nur für diese Sitzung
  }
}

/** Inline-Script im <head>: setzt --sidebar-width vor dem ersten Rendern */
export const SIDEBAR_INIT_SCRIPT = `(function(){try{var w='0';if(localStorage.getItem('${SIDEBAR_VISIBLE_KEY}')==='1'){w=localStorage.getItem('${SIDEBAR_COLLAPSED_KEY}')==='1'?'${SIDEBAR_WIDTH_COLLAPSED}':'${SIDEBAR_WIDTH_EXPANDED}';}document.documentElement.style.setProperty('--sidebar-width',w);}catch(_){}})();`
