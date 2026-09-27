/** Gemeinsame Tailwind-Klassen für Split-UI — angeglichen an Transaktionen/Einstellungen */

export const splitInputClass =
  'block w-full rounded-control border-border focus:border-accent bg-surface text-primary disabled:opacity-50'

export const splitLabelClass = 'block text-sm font-medium text-primary'

export const splitHintClass = 'mt-1 text-sm text-secondary'

export const splitSectionCardClass = 'card p-4 md:p-5'

export const splitSectionTitleClass = 'text-lg font-medium text-primary mb-4'

export const splitListItemClass =
  'flex flex-col sm:flex-row sm:items-center gap-3 rounded-control border border-hairline bg-surface p-3'

export const splitSegmentButtonClass = (selected: boolean) =>
  `rounded-control border px-3 py-2.5 text-left text-sm font-medium transition-colors duration-feedback focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
    selected
      ? 'border-accent bg-accent-subtle text-accent'
      : 'border-transparent bg-surface-muted text-primary hover:border-border'
  }`
