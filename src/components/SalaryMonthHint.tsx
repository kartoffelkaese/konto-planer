import Link from 'next/link'
import { getSalaryMonthPeriodInfo } from '@/lib/dateUtils'

interface SalaryMonthHintProps {
  salaryDay: number
  /** Zusätzlicher Hinweis wenn der Gehaltsmonats-Filter aktiv ist */
  filterActive?: boolean
}

export default function SalaryMonthHint({
  salaryDay,
  filterActive = false,
}: SalaryMonthHintProps) {
  const { rangeLabel } = getSalaryMonthPeriodInfo(salaryDay)

  return (
    <p className="text-sm text-secondary">
      {filterActive ? (
        <>
          Angezeigt werden nur Buchungen im Gehaltsmonat{' '}
          <span className="font-medium text-primary">({rangeLabel})</span>.
        </>
      ) : (
        <>
          Aktueller Gehaltsmonat:{' '}
          <span className="font-medium text-primary">{rangeLabel}</span>.
        </>
      )}{' '}
      <Link href="/settings" className="text-accent hover:underline">
        Gehaltstag ändern
      </Link>
    </p>
  )
}
