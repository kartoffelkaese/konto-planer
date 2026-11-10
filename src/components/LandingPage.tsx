'use client'

import Link from 'next/link'
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  DocumentArrowUpIcon,
  EyeSlashIcon,
  QuestionMarkCircleIcon,
  ScaleIcon,
  SparklesIcon,
  WalletIcon,
} from '@heroicons/react/24/outline'
import { getButtonClassName } from '@/components/Button'
import InstallAppHint from '@/components/InstallAppHint'
import KpiCard from '@/components/KpiCard'
import {
  features,
  LandingFooter,
  LandingHeader,
  LandingPricing,
  SectionIntro,
  trustPoints,
} from '@/components/landing/LandingParts'
import { formatCurrency } from '@/lib/formatters'
import { PLAN_LABELS, PLAN_PRICE, PLANS_ENABLED_PUBLIC, TRIAL_DAYS } from '@/lib/plans'
import { AVAILABLE_LEGAL_PAGES } from '@/lib/legalPages'

/** Kontaktweg für Kontoexporte weiterer Banken – nur, wenn es ein Impressum gibt */
const HAS_IMPRINT = AVAILABLE_LEGAL_PAGES.some((page) => page.slug === 'impressum')

/** Startseite für Abgemeldete – rund um das Versprechen „Was bleibt bis zum nächsten Gehalt?“ */


/** Beispiel: Kontostand und die Zahlungen bis zum nächsten Gehalt – die Werte gehen auf */
const BALANCE = 2430
const UPCOMING = [
  { name: 'Miete', date: '01.12.', category: 'Wohnen', amount: 850, entered: true },
  { name: 'Strom', date: '05.12.', category: 'Nebenkosten', amount: 74, entered: true },
  { name: 'Kfz-Versicherung', date: '15.12.', category: 'Versicherungen', amount: 191.42, entered: false },
  { name: 'Handy', date: '18.12.', category: 'Kommunikation', amount: 19.99, entered: false },
  { name: 'Fitnessstudio', date: '20.12.', category: 'Freizeit', amount: 29.9, entered: false },
  { name: 'Streaming', date: '22.12.', category: 'Abos', amount: 13.99, entered: false },
]
const round = (value: number) => Math.round(value * 100) / 100
const STILL_DUE = round(UPCOMING.reduce((sum, p) => sum + p.amount, 0))
const PENDING = round(UPCOMING.filter((p) => p.entered).reduce((sum, p) => sum + p.amount, 0))
const NOT_ENTERED = round(STILL_DUE - PENDING)
const REMAINING = round(BALANCE - STILL_DUE)
/** Kennzahlen des laufenden Gehaltsmonats (Beispiel) */
const PERIOD_LABEL = '25.11. – 24.12.'
const MONTH_INCOME = 3240
const MONTH_EXPENSES = 810

const problems = [
  {
    icon: CalendarDaysIcon,
    title: 'Abbuchungen kommen verteilt',
    text: 'Miete am Ersten, Strom am Fünften, Abos irgendwann dazwischen. Den Überblick behält niemand im Kopf.',
  },
  {
    icon: EyeSlashIcon,
    title: 'Seltenes wird vergessen',
    text: 'Versicherungen, Beiträge oder Jahresabos kommen alle drei, sechs oder zwölf Monate – und dann überraschend.',
  },
  {
    icon: ScaleIcon,
    title: 'Der Kontostand täuscht',
    text: 'Er zeigt, was jetzt da ist – nicht, was davon schon verplant ist. Was wirklich frei ist, bleibt unklar.',
  },
]

const steps = [
  {
    icon: DocumentArrowUpIcon,
    title: 'Kontoauszug hochladen',
    text: 'Lade den Export der letzten 18 Monate von deiner Bank hoch. KontoPlaner erkennt regelmäßige Zahlungen – auch vierteljährliche und jährliche – und deinen Gehaltstag. Die Datei wird nur ausgewertet, nicht gespeichert.',
  },
  {
    icon: CheckIcon,
    title: 'Vorschläge übernehmen',
    text: 'Prüfe die gefundenen Zahlungen und übernimm, was passt. Fehlt etwas, legst du es in wenigen Sekunden von Hand an.',
  },
  {
    icon: WalletIcon,
    title: 'Sehen, was bleibt',
    text: '„Verfügbar“ zeigt dir jederzeit, was bis zum nächsten Gehalt übrig bleibt. Fällige Zahlungen trägt KontoPlaner automatisch ein.',
  },
]

/** Bereits auf der Seite erklärt – im Raster „Außerdem drin“ nicht noch einmal */
const EXPLAINED = new Set(['Alles auf einen Blick', 'Wiederkehrende Zahlungen'])

const faqs = [
  {
    question: 'Muss ich meine Bankzugangsdaten eingeben?',
    answer:
      'Nein. KontoPlaner verbindet sich nicht mit deiner Bank. Du lädst einen Kontoauszug als Datei hoch oder erfasst Zahlungen von Hand.',
  },
  {
    question: 'Mit welchen Banken funktioniert das Erkennen?',
    answer:
      'Mit dem CSV-Export von DKB und ING. Bei anderen Banken legst du deine regelmäßigen Zahlungen von Hand an – das ist einmalige Arbeit. ' +
      'Deine Bank fehlt? Schick mir gern einen anonymisierten Kontoexport, dann nehme ich sie auf' +
      (HAS_IMPRINT ? ' – die Kontaktdaten stehen im Impressum.' : '.'),
  },
  {
    question: 'Was kostet KontoPlaner?',
    answer: PLANS_ENABLED_PUBLIC
      ? `„${PLAN_LABELS.BASIC}“ mit einem Konto ist kostenlos, inklusive „Verfügbar“ und wiederkehrender Zahlungen. „${PLAN_LABELS.FULL}“ kostet ${formatCurrency(PLAN_PRICE.yearly)} im Jahr – die ersten ${TRIAL_DAYS} Tage kannst du alles kostenlos testen.`
      : 'Nichts. KontoPlaner ist kostenlos und ohne Werbung.',
  },
  {
    question: 'Wo liegen meine Daten?',
    answer:
      'Auf Servern in Deutschland (Nürnberg) – nicht bei einer Bank oder einem Finanzdienst. Keine Werbung, kein Datenverkauf. Du kannst deine Daten jederzeit herunterladen oder löschen.',
  },
]

/** Nachbau der Übersicht der App: Verfügbar, Kennzahlen und die nächsten wiederkehrenden Zahlungen */
function MonthEndPreview() {
  const share = Math.round((REMAINING / BALANCE) * 100)
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="absolute -inset-6 rounded-[2.5rem] bg-accent/20 blur-3xl" />

      <div className="relative space-y-3 rounded-[2rem] border border-hairline bg-canvas p-3 shadow-raised">
        <section className="hero-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="eyebrow">Verfügbar</p>
              <p className="amount-hero mt-2 text-[2.5rem] text-primary">{formatCurrency(REMAINING)}</p>
            </div>
            <span className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-pill bg-surface-muted/80 px-3 text-xs font-medium text-secondary">
              So berechnet
              <ChevronDownIcon className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip">
              Kontostand <span className="amount text-primary">{formatCurrency(BALANCE)}</span>
            </span>
            <span className="chip">
              Ausstehend <span className="amount text-expense">{formatCurrency(-STILL_DUE)}</span>
            </span>
          </div>

          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-accent" style={{ width: `${share}%` }} />
            </div>
            <p className="mt-2 text-xs text-secondary">{share} % des Kontostands frei verfügbar</p>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Einnahmen" subtitle={PERIOD_LABEL} amount={MONTH_INCOME} stripe="income" />
          <KpiCard label="Ausgaben" subtitle={PERIOD_LABEL} amount={MONTH_EXPENSES} stripe="expense" />
        </div>

        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-primary">Wiederkehrend</p>
              <p className="text-sm text-secondary">Nächste 30 Tage</p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-accent">
              Alle
              <ArrowRightIcon className="h-4 w-4" />
            </span>
          </div>
          <ul className="-mx-2">
            {UPCOMING.slice(0, 4).map((payment) => (
              <li key={payment.name} className="flex items-center gap-3 rounded-control px-2 py-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent">
                  <CalendarIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-primary">{payment.name}</p>
                  <p className="truncate text-sm text-secondary">
                    {payment.date} · {payment.category}
                  </p>
                </div>
                <p className="amount shrink-0 text-primary">{formatCurrency(payment.amount)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

/** Die Rechnung hinter „Verfügbar“ – wie in der Übersicht der App */
function AvailableExplained() {
  const parts = [
    { label: 'Kontostand', value: formatCurrency(BALANCE), className: 'text-primary' },
    { label: 'offene Ausgaben', value: formatCurrency(PENDING), className: 'text-expense' },
    { label: 'noch nicht eingetragen', value: formatCurrency(NOT_ENTERED), className: 'text-expense' },
  ]
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="hero-card grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-pill bg-accent-subtle px-3 py-1 text-sm font-medium text-accent">
              <SparklesIcon className="h-4 w-4" aria-hidden="true" />
              Verfügbar
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-primary sm:text-4xl">
              Eine Zahl, die dir die Frage beantwortet
            </h2>
            <p className="mt-3 text-base leading-relaxed text-secondary sm:text-lg">
              Vom Kontostand zieht KontoPlaner alles ab, was bis zum nächsten Gehalt noch kommt –
              bereits eingetragene Ausgaben und wiederkehrende Zahlungen, die erst noch fällig
              werden. Gerechnet wird im Gehaltsmonat, nicht im Kalendermonat.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              Das heißt: Dein Monat beginnt, wenn dein Gehalt kommt. Bekommst du es am 25., läuft
              dein Gehaltsmonat vom 25. bis zum 24. des Folgemonats – und genau bis dahin muss das
              Geld reichen. Den Gehaltstag stellst du einmal ein; KontoPlaner erkennt ihn auch aus
              deinem Kontoauszug.
            </p>
          </div>

          <div className="rounded-card bg-surface-muted/70 p-4 sm:p-6">
            <ul className="space-y-3">
              {parts.map((part, index) => (
                <li key={part.label} className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-secondary">
                    <span className="mr-2 inline-block w-3 text-primary" aria-hidden="true">
                      {index === 0 ? '' : '−'}
                    </span>
                    {part.label}
                  </span>
                  <span className={`amount text-base sm:text-lg ${part.className}`}>{part.value}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-hairline pt-4">
              <span className="text-sm font-semibold text-primary">
                <span className="mr-2 inline-block w-3" aria-hidden="true">=</span>
                verfügbar bis zum Gehalt
              </span>
              <span className="amount-lg text-accent">{formatCurrency(REMAINING)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function LandingPage() {
  return (
    <div className="landing-page min-h-screen bg-canvas">
      <LandingHeader />

      <section className="relative overflow-hidden">
        <div className="landing-hero-glow pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-14 pt-12 pb-20 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pt-20 lg:pb-28">
            <div className="text-center lg:text-left">
              <p className="landing-fade-in inline-flex items-center gap-2 rounded-pill bg-accent-subtle px-3 py-1 text-sm font-medium text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                Für alle, die am Monatsende nicht raten wollen
              </p>

              <h1 className="landing-fade-in landing-fade-in-delay-1 mt-5 text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.04em] text-primary sm:text-6xl lg:text-[3.75rem]">
                Was bleibt dir bis zum <span className="text-accent">nächsten Gehalt?</span>
              </h1>

              <p className="landing-fade-in landing-fade-in-delay-2 mx-auto mt-6 max-w-xl text-base leading-relaxed text-secondary sm:text-lg lg:mx-0">
                KontoPlaner zeigt dir, was bis zum nächsten Gehalt noch abgebucht wird – Miete,
                Abos, Versicherungen – und was danach übrig bleibt. Einmal eingerichtet, immer
                eingeplant.
              </p>

              <div className="landing-fade-in landing-fade-in-delay-3 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  href="/auth/register"
                  className={getButtonClassName({
                    variant: 'primary',
                    size: 'lg',
                    className: 'w-full rounded-pill px-7 sm:w-auto',
                  })}
                >
                  Kostenlos starten
                  <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
                </Link>
                <Link
                  href="/auth/login"
                  className={getButtonClassName({
                    variant: 'secondary',
                    size: 'lg',
                    className: 'w-full rounded-pill px-7 sm:w-auto',
                  })}
                >
                  Anmelden
                </Link>
              </div>

              <ul className="landing-fade-in landing-fade-in-delay-4 mt-8 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                {trustPoints.map((point) => (
                  <li key={point} className="chip">
                    <CheckIcon className="h-4 w-4 shrink-0 text-income" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>

              <InstallAppHint className="mt-4" />
            </div>

            <div className="landing-fade-in landing-fade-in-delay-2 px-2 sm:px-8 lg:px-0">
              <MonthEndPreview />
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionIntro
            eyebrow="Kennst du das?"
            title="Der Kontostand sagt dir nicht, was übrig bleibt"
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {problems.map(({ icon: Icon, title, text }) => (
              <article key={title} className="card p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pending-bg text-pending">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="so-gehts" className="scroll-mt-16 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionIntro
            eyebrow="So geht’s"
            title="In drei Schritten zur Antwort"
            text="Einmal einrichten – danach weißt du jeden Tag, woran du bist."
          />
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="card p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                    {index + 1}
                  </span>
                  <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <AvailableExplained />

      <section id="funktionen" className="scroll-mt-16 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionIntro
            eyebrow="Außerdem drin"
            title="Alles, was du für dein Geld brauchst"
            text="Vom einzelnen Girokonto bis zum gemeinsamen Haushalt."
          />
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features
              .filter((feature) => !EXPLAINED.has(feature.title))
              .map(({ icon: Icon, title, description, full }) => (
                <article key={title} className="card flex gap-4 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-primary">{title}</h3>
                    {PLANS_ENABLED_PUBLIC && full && (
                      <p className="mt-0.5 text-xs font-medium text-accent">Im Level „{PLAN_LABELS.FULL}“</p>
                    )}
                    <p className="mt-1 text-sm leading-relaxed text-secondary">{description}</p>
                  </div>
                </article>
              ))}
          </div>
        </div>
      </section>

      {PLANS_ENABLED_PUBLIC && <LandingPricing />}

      <section id="fragen" className="scroll-mt-16 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionIntro eyebrow="Fragen" title="Gut zu wissen" />
          <div className="mt-10 space-y-3">
            {faqs.map(({ question, answer }) => (
              <details key={question} className="group card px-5 py-1">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-2 text-base font-medium text-primary [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-3">
                    <QuestionMarkCircleIcon className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                    {question}
                  </span>
                  <ChevronDownIcon
                    className="h-5 w-5 shrink-0 text-secondary transition-transform duration-expand group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="pb-4 pl-8 text-sm leading-relaxed text-secondary">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-accent to-accent-hover px-6 py-14 text-center shadow-raised sm:px-12 sm:py-20">
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-black/10 blur-3xl"
              aria-hidden="true"
            />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-[-0.03em] text-accent-foreground sm:text-4xl">
                Schluss mit Raten am Monatsende
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-accent-foreground/85 sm:text-lg">
                Konto anlegen, Kontoauszug hochladen, Zahlungen übernehmen – und ab heute wissen,
                was bis zum nächsten Gehalt bleibt.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/auth/register"
                  className="landing-cta-solid inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-pill px-7 text-base font-semibold transition-colors duration-feedback sm:w-auto"
                >
                  Kostenlos starten
                  <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
                </Link>
                <Link
                  href="/auth/login"
                  className="landing-cta-outline inline-flex min-h-12 w-full items-center justify-center rounded-pill px-7 text-base font-medium transition-colors duration-feedback sm:w-auto"
                >
                  Bereits Konto? Anmelden
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
