export const GERMAN_BANKS = [
  { id: 'deutsche-bank', name: 'Deutsche Bank', logoPath: '/banks/deutsche-bank.svg' },
  { id: 'commerzbank', name: 'Commerzbank', logoPath: '/banks/commerzbank.svg' },
  { id: 'sparkasse', name: 'Sparkasse', logoPath: '/banks/sparkasse.svg' },
  { id: 'volksbank', name: 'Volksbank Raiffeisenbank', logoPath: '/banks/volksbank.svg' },
  { id: 'ing', name: 'ING', logoPath: '/banks/ing.svg' },
  { id: 'dkb', name: 'DKB', logoPath: '/banks/dkb.svg' },
  { id: 'postbank', name: 'Postbank', logoPath: '/banks/postbank.svg' },
  { id: 'hypovereinsbank', name: 'HypoVereinsbank', logoPath: '/banks/hypovereinsbank.svg' },
  { id: 'targobank', name: 'Targobank', logoPath: '/banks/targobank.svg' },
  { id: 'santander', name: 'Santander', logoPath: '/banks/santander.svg' },
  { id: 'comdirect', name: 'comdirect', logoPath: '/banks/comdirect.svg' },
  { id: 'consorsbank', name: 'Consorsbank', logoPath: '/banks/consorsbank.svg' },
  { id: 'n26', name: 'N26', logoPath: '/banks/n26.svg' },
  { id: 'revolut', name: 'Revolut', logoPath: '/banks/revolut.svg' },
  { id: 'trade-republic', name: 'Trade Republic', logoPath: '/banks/trade-republic.svg' },
  { id: 'c24', name: 'C24 Bank', logoPath: '/banks/c24.svg' },
  { id: 'sparda-bank', name: 'Sparda-Bank', logoPath: '/banks/sparda-bank.svg' },
  { id: 'psd-bank', name: 'PSD Bank', logoPath: '/banks/psd-bank.svg' },
] as const

export type GermanBankId = (typeof GERMAN_BANKS)[number]['id']

const bankById = new Map(GERMAN_BANKS.map((bank) => [bank.id, bank]))

export function isGermanBankId(value: string): value is GermanBankId {
  return bankById.has(value as GermanBankId)
}

export function getBankById(bankId: string | null | undefined) {
  if (!bankId) return null
  return bankById.get(bankId as GermanBankId) ?? null
}

export const GERMAN_BANK_IDS = GERMAN_BANKS.map((bank) => bank.id)
