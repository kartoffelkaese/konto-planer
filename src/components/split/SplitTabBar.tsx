'use client'

import SegmentedControl from '@/components/SegmentedControl'

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
      <div className="-mx-1 overflow-x-auto px-1 pb-1 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:overflow-visible md:px-0">
        <SegmentedControl
          role="tablist"
          ariaLabel={ariaLabel}
          className="flex min-w-min md:grid md:min-w-0 md:grid-cols-4"
          buttonClassName="shrink-0 px-4 md:shrink md:px-3"
          value={activeTab}
          onChange={onChange}
          options={tabs.map((tab) => ({
            value: tab.id,
            label: tab.label,
            badge: tab.badge,
            badgeTone: tab.id === 'balances' ? 'expense' : 'neutral',
          }))}
        />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-canvas to-transparent md:hidden"
        aria-hidden="true"
      />
    </div>
  )
}
