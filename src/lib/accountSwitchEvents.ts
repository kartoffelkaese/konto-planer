export const ACCOUNT_SWITCHING_EVENT = 'account-switching'
export const ACCOUNT_CHANGED_EVENT = 'account-changed'
/** Buchungen des aktiven Kontos haben sich im Hintergrund geändert (z. B. automatisch eingetragen) */
export const TRANSACTIONS_CHANGED_EVENT = 'transactions-changed'

export const ACCOUNT_SWITCH_EXIT_MS = 120
export const ACCOUNT_SWITCH_ENTER_MS = 280

export function dispatchAccountSwitching() {
  window.dispatchEvent(new Event(ACCOUNT_SWITCHING_EVENT))
}

export function dispatchAccountChanged() {
  window.dispatchEvent(new Event(ACCOUNT_CHANGED_EVENT))
}

export function dispatchTransactionsChanged() {
  window.dispatchEvent(new Event(TRANSACTIONS_CHANGED_EVENT))
}
