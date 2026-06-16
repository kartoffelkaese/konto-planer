'use client'

type SplitTabBarProps<T extends string> = {
  tabs: { id: T; label: string; badge?: number }[]
  activeTab: T
  onChange: (tab: T) => void
  ariaLabel?: string
}

const gridColsClass: Record<number, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
}

export default function SplitTabBar<T extends string>({
  tabs,
  activeTab,
  onChange,
  ariaLabel = 'Bereiche',
}: SplitTabBarProps<T>) {
  const colClass = gridColsClass[Math.min(tabs.length, 4)] ?? 'sm:grid-cols-4'

  return (
    <div
      className={`mb-6 grid grid-cols-2 gap-2 ${colClass}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative rounded-control border px-3 py-2.5 text-sm font-medium transition-colors duration-feedback focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
            activeTab === tab.id
              ? 'border-accent bg-accent-subtle text-accent'
              : 'border-border bg-surface text-primary hover:border-accent-border hover:bg-surface-muted'
          }`}
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span
                className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  activeTab === tab.id
                    ? 'bg-accent text-white'
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
  )
}
