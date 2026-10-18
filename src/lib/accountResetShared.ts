/** Typen und Konstanten zu „Konto zurücksetzen“ – ohne Datenbankzugriff, auch im Browser nutzbar */

/**
 * Stufen beim Zurücksetzen – jede schließt die vorige ein:
 * - `transactions`: Buchungen (auch angelegte Instanzen wiederkehrender Zahlungen); die Vorlagen bleiben
 * - `recurring`: zusätzlich die wiederkehrenden Zahlungen
 * - `everything`: zusätzlich Kategorien und Händler
 */
export const RESET_LEVELS = ['transactions', 'recurring', 'everything'] as const
export type ResetLevel = (typeof RESET_LEVELS)[number]

/** Bestätigungstext, wenn mehrere Konten zurückgesetzt werden (sonst der Kontoname) */
export const RESET_ALL_CONFIRM_TEXT = 'ZURÜCKSETZEN'

export type ResettableAccount = {
  id: string
  name: string
  /** Buchungen ohne die Vorlagen wiederkehrender Zahlungen */
  transactions: number
  recurring: number
  categories: number
  merchants: number
}

export type ResetResult = {
  transactions: number
  recurring: number
  categories: number
  merchants: number
}
