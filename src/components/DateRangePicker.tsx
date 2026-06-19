'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import 'dayjs/locale/de'
import { formatDate, formatDateForInput } from '@/lib/dateUtils'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale('de')

const TZ = 'Europe/Berlin'

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

type DateRangePickerProps = {
  startDate: string
  endDate: string
  onRangeChange: (startDate: string, endDate: string) => void
  invalid?: boolean
  statusMessage?: string
  id?: string
}

function parseIsoDate(value: string): dayjs.Dayjs | null {
  if (!value) return null
  const parsed = dayjs.tz(value, TZ).startOf('day')
  return parsed.isValid() ? parsed : null
}

function startOfWeekMonday(date: dayjs.Dayjs): dayjs.Dayjs {
  const day = date.day()
  const diff = day === 0 ? 6 : day - 1
  return date.subtract(diff, 'day').startOf('day')
}

function isSameDay(a: dayjs.Dayjs, b: dayjs.Dayjs): boolean {
  return a.isSame(b, 'day')
}

function isBetweenDays(
  day: dayjs.Dayjs,
  from: dayjs.Dayjs,
  to: dayjs.Dayjs
): boolean {
  const start = from.isBefore(to, 'day') ? from : to
  const end = from.isBefore(to, 'day') ? to : from
  return day.isAfter(start, 'day') && day.isBefore(end, 'day')
}

function formatRangeLabel(startDate: string, endDate: string): string {
  const from = parseIsoDate(startDate)
  const to = parseIsoDate(endDate)
  if (from && to) {
    return `${formatDate(from.toDate())} – ${formatDate(to.toDate())}`
  }
  if (from) {
    return `${formatDate(from.toDate())} – …`
  }
  return 'Zeitraum wählen'
}

export default function DateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  invalid = false,
  statusMessage,
  id = 'date-range-picker',
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const fromProp = useMemo(() => parseIsoDate(startDate), [startDate])
  const toProp = useMemo(() => parseIsoDate(endDate), [endDate])

  const [viewMonth, setViewMonth] = useState(() =>
    (fromProp ?? dayjs.tz(undefined, TZ)).startOf('month')
  )
  const [draftFrom, setDraftFrom] = useState<dayjs.Dayjs | null>(fromProp)
  const [draftTo, setDraftTo] = useState<dayjs.Dayjs | null>(toProp)
  const [hoverDay, setHoverDay] = useState<dayjs.Dayjs | null>(null)

  useEffect(() => {
    if (open) return

    setDraftFrom((prev) =>
      prev && fromProp && prev.isSame(fromProp, 'day')
        ? prev
        : fromProp
    )
    setDraftTo((prev) =>
      prev && toProp && prev.isSame(toProp, 'day') ? prev : toProp
    )
    setHoverDay(null)
  }, [open, fromProp, toProp])

  useEffect(() => {
    if (fromProp) {
      setViewMonth((prev) =>
        prev.isSame(fromProp, 'month') ? prev : fromProp.startOf('month')
      )
    }
  }, [fromProp])

  const calendarDays = useMemo(() => {
    const monthStart = viewMonth.startOf('month')
    const gridStart = startOfWeekMonday(monthStart)
    return Array.from({ length: 42 }, (_, index) => gridStart.add(index, 'day'))
  }, [viewMonth])

  const previewTo =
    draftFrom && !draftTo && hoverDay && !hoverDay.isSame(draftFrom, 'day')
      ? hoverDay
      : draftTo

  const handleDayClick = (day: dayjs.Dayjs) => {
    if (!draftFrom || (draftFrom && draftTo)) {
      setDraftFrom(day)
      setDraftTo(null)
      onRangeChange(formatDateForInput(day.toDate()), '')
      return
    }

    let nextFrom = draftFrom
    let nextTo = day
    if (day.isBefore(draftFrom, 'day')) {
      nextFrom = day
      nextTo = draftFrom
    }

    setDraftFrom(nextFrom)
    setDraftTo(nextTo)
    onRangeChange(
      formatDateForInput(nextFrom.toDate()),
      formatDateForInput(nextTo.toDate())
    )
    setOpen(false)
  }

  const borderClass = invalid
    ? 'border-danger focus-visible:ring-danger/30'
    : 'border-border focus-visible:border-accent focus-visible:ring-accent/30'

  const buttonLabel = formatRangeLabel(startDate, endDate)

  return (
    <div className="space-y-2">
      <label id={`${id}-label`} className="block text-xs font-medium text-secondary">
        Datumszeitraum
      </label>

      <div className="relative">
        <button
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-labelledby={`${id}-label`}
          aria-invalid={invalid || undefined}
          onClick={() => setOpen((value) => !value)}
          className={`flex w-full items-center gap-3 rounded-control border bg-surface px-3 py-2.5 text-left text-sm shadow-sm transition-colors duration-feedback focus:outline-none focus-visible:ring-2 ${borderClass} ${
            open ? 'border-accent ring-2 ring-accent/30' : 'hover:border-accent-border'
          }`}
        >
          <CalendarDaysIcon className="h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
          <span className={startDate && endDate ? 'text-primary' : 'text-secondary'}>
            {buttonLabel}
          </span>
        </button>

        {open && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default bg-transparent"
              aria-label="Kalender schließen"
              onClick={() => setOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${id}-label`}
              className="absolute left-0 right-0 z-50 mt-2 rounded-card border border-border bg-surface p-4 shadow-[0_16px_40px_var(--shadow-color)] sm:right-auto sm:w-[20rem]"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setViewMonth((month) => month.subtract(1, 'month'))}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-secondary hover:bg-surface-muted hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-0 md:min-w-0 md:p-1.5"
                  aria-label="Vorheriger Monat"
                >
                  <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                <p className="text-sm font-medium capitalize text-primary">
                  {viewMonth.format('MMMM YYYY')}
                </p>
                <button
                  type="button"
                  onClick={() => setViewMonth((month) => month.add(1, 'month'))}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-secondary hover:bg-surface-muted hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:min-h-0 md:min-w-0 md:p-1.5"
                  aria-label="Nächster Monat"
                >
                  <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="mb-1 grid grid-cols-7 gap-1">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="py-1 text-center text-[11px] font-medium text-secondary"
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const inMonth = day.month() === viewMonth.month()
                  const isToday = isSameDay(day, dayjs.tz(undefined, TZ))
                  const isStart =
                    draftFrom !== null && isSameDay(day, draftFrom)
                  const isEnd =
                    previewTo !== null && isSameDay(day, previewTo)
                  const inRange =
                    draftFrom &&
                    previewTo &&
                    isBetweenDays(day, draftFrom, previewTo)

                  let cellClass =
                    'relative flex h-11 w-11 md:h-9 md:w-9 items-center justify-center rounded-control text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent '

                  if (!inMonth) {
                    cellClass += 'text-secondary/40 '
                  } else {
                    cellClass += 'text-primary '
                  }

                  if (isStart || isEnd) {
                    cellClass += 'bg-accent font-semibold text-accent-foreground '
                  } else if (inRange) {
                    cellClass += 'bg-accent-subtle text-accent '
                  } else if (inMonth) {
                    cellClass += 'hover:bg-surface-muted '
                  }

                  if (isToday && !isStart && !isEnd) {
                    cellClass += 'ring-1 ring-accent-border '
                  }

                  return (
                    <button
                      key={day.format('YYYY-MM-DD')}
                      type="button"
                      onClick={() => handleDayClick(day)}
                      onMouseEnter={() => setHoverDay(day)}
                      onMouseLeave={() => setHoverDay(null)}
                      className={cellClass}
                      aria-label={formatDate(day.toDate())}
                      aria-pressed={isStart || isEnd || Boolean(inRange)}
                    >
                      {day.date()}
                    </button>
                  )
                })}
              </div>

              <p className="mt-3 text-xs text-secondary">
                {draftTo
                  ? 'Zeitraum ausgewählt.'
                  : draftFrom
                    ? 'Enddatum wählen.'
                    : 'Startdatum wählen.'}
              </p>
            </div>
          </>
        )}
      </div>

      {statusMessage && (
        <p
          className={`text-xs ${invalid ? 'text-danger' : 'text-secondary'}`}
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      )}
    </div>
  )
}
