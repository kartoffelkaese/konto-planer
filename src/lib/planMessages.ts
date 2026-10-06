import { PLAN_LABELS } from '@/lib/plans'

/** Texte zu Level-Sperren – für Server-Antworten und Hinweise in der Oberfläche */
const START = `„${PLAN_LABELS.BASIC}“`
const FULL = `„${PLAN_LABELS.FULL}“`

export const PLAN_MESSAGES = {
  accountLimit: `Mit dem Level ${START} kannst du ein Konto führen. Weitere Konten gehören zum Level ${FULL}.`,
  shareAccounts: `Konten mit anderen teilen gehört zum Level ${FULL}.`,
  statistics: `Statistiken gehören zum Level ${FULL}.`,
  csvImport: `Der CSV-Import gehört zum Level ${FULL}.`,
  splitOwnLists: `Eigene Split-Listen gehören zum Level ${FULL}.`,
  accountLockedLimit: `Dieses Konto ist schreibgeschützt, weil das Level ${START} nur ein Konto umfasst.`,
  accountLockedShared: `Dieses Konto ist schreibgeschützt, weil der Inhaber das Level ${START} hat.`,
  splitListLocked: `Diese Liste ist schreibgeschützt, weil eigene Split-Listen zum Level ${FULL} gehören.`,
} as const
