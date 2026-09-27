'use client'

type SplitTabBarProps<T extends string> = {
  tabs: { id: T; label: string; badge?: number }[]
  activeTab: T
  onChange: (tab: T) => void
  ariaLabel?: string
}

export default function SplitTabBar<T extends string>({
  tabs,
  activeTab,
  onChange,
  ariaLabel = 'Bereiche',
}: SplitTabBarProps<T>) {
  return (
    <div className="relative mb-6">
      <div
        className="-mx-1 overflow-x-auto px-1 pb-1 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:overflow-visible md:px-0 md:snap-none"
        role="tablist"
        aria-label={ariaLabel}
      >
        <div className="flex min-w-min gap-1 rounded-pill bg-surface-muted p-1 md:grid md:min-w-0 md:grid-cols-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => onChange(tab.id)}
              className={`shrink-0 snap-start rounded-pill px-4 min-h-10 text-sm font-medium transition-colors duration-feedback focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:shrink md:px-3 ${
                activeTab === tab.id
                  ? 'bg-surface text-primary shadow-card'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                {tab.label}
                {tab.badge != null && tab.badge > 0 && (
                  <span
                    className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                      activeTab === tab.id
                        ? 'bg-accent text-accent-foreground'
                        : tab.id === 'balances'
                          ? 'bg-expense-bg text-expense'
                          : 'bg-surface-muted text-secondary'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-canvas to-transparent md:hidden"
        aria-hidden="true"
      />
    </div>
  )
}
