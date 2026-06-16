'use client'

type SplitTabBarProps<T extends string> = {
  tabs: { id: T; label: string }[]
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
          className={`rounded-control border px-3 py-2.5 text-sm font-medium transition-colors duration-feedback focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
            activeTab === tab.id
              ? 'border-accent bg-accent-subtle text-accent'
              : 'border-border bg-surface text-primary hover:border-accent-border hover:bg-surface-muted'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
