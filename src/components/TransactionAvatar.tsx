import { ArrowDownLeftIcon } from '@heroicons/react/24/outline'
import { getContrastColor } from '@/lib/colorUtils'

interface TransactionAvatarProps {
  name: string
  amount: number
  /** Kategoriefarbe (Hex) – sonst neutrale Fläche */
  color?: string | null
  className?: string
}

/** Runder Avatar für Buchungszeilen: Initiale auf Kategoriefarbe, Einnahmen mit Pfeil. */
export default function TransactionAvatar({
  name,
  amount,
  color,
  className = '',
}: TransactionAvatarProps) {
  const base = `flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${className}`

  if (amount > 0 && !color) {
    return (
      <span className={`${base} bg-income-bg text-income`} aria-hidden="true">
        <ArrowDownLeftIcon className="h-5 w-5" />
      </span>
    )
  }

  const initial = (name.trim()[0] ?? '?').toUpperCase()

  if (color && /^#[0-9a-f]{6}$/i.test(color)) {
    return (
      <span
        className={base}
        style={{ backgroundColor: color, color: getContrastColor(color) }}
        aria-hidden="true"
      >
        {initial}
      </span>
    )
  }

  return (
    <span className={`${base} bg-surface-muted text-secondary`} aria-hidden="true">
      {initial}
    </span>
  )
}
