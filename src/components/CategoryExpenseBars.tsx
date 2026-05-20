export interface CategoryExpenseItem {
  name: string
  value: number
  color: string
}

interface CategoryExpenseBarsProps {
  categories: CategoryExpenseItem[]
  formatCurrency: (amount: number) => string
  className?: string
}

export default function CategoryExpenseBars({
  categories,
  formatCurrency,
  className = '',
}: CategoryExpenseBarsProps) {
  const total = categories.reduce((sum, item) => sum + item.value, 0)
  const sorted = [...categories].sort((a, b) => b.value - a.value)

  if (sorted.length === 0) {
    return null
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {sorted.map((category) => {
        const share = total > 0 ? (category.value / total) * 100 : 0
        const shareRounded = Math.round(share)

        return (
          <div key={category.name}>
            <div className="mb-1 flex justify-between gap-3 text-xs sm:text-sm">
              <span className="truncate text-secondary">{category.name}</span>
              <span className="shrink-0 text-right font-medium text-primary tabular-nums">
                {formatCurrency(category.value)}
                <span className="font-normal text-secondary"> · {shareRounded}%</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${share}%`,
                  backgroundColor: category.color,
                }}
                role="presentation"
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
