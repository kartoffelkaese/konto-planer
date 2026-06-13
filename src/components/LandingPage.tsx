'use client'

import Link from 'next/link'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  ChartBarIcon,
  ChartPieIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  SwatchIcon,
  TagIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import CategoryExpenseBars from '@/components/CategoryExpenseBars'
import { getButtonClassName } from '@/components/Button'
import { APP_VERSION } from '@/lib/version'

const features = [
  {
    icon: ChartBarIcon,
    title: 'Dashboard auf einen Blick',
    description:
      'Verfügbar, Einnahmen, Ausgaben und letzte Buchungen – KPIs statt Tabellen-Chaos.',
  },
  {
    icon: BanknotesIcon,
    title: 'Transaktionen & Gehaltsmonat',
    description:
      'Buchen, filtern, bestätigen. Der Gehaltsmonat folgt Ihrem Einkommen – nicht dem Kalender.',
  },
  {
    icon: ArrowDownTrayIcon,
    title: 'CSV-Import von der Bank',
    description:
      'Umsätze von DKB und ING importieren – mit Vorschau, Duplikatprüfung und Zuordnung zu Händlern.',
  },
  {
    icon: ArrowPathIcon,
    title: 'Wiederkehrende Zahlungen',
    description:
      'Miete, Abos und Gehalt einmal anlegen – fällige Buchungen werden automatisch vorbereitet.',
  },
  {
    icon: ChartPieIcon,
    title: 'Statistiken',
    description:
      'Trends nach Kategorie, Händler und Zeitraum – vom Monat bis zum Jahresüberblick.',
  },
  {
    icon: TagIcon,
    title: 'Kategorien & Händler',
    description:
      'Eigene Farben und Namen, Händler mit mehreren Kategorien – weniger Tipparbeit beim Buchen.',
  },
  {
    icon: ArrowsRightLeftIcon,
    title: 'Mehrere Konten & Umbuchungen',
    description:
      'Giro, Sparkonto oder Haushalt parallel führen und Geld zwischen Konten umbuchen.',
  },
  {
    icon: UserGroupIcon,
    title: 'Gemeinsam nutzen',
    description:
      'Konten per Einladung teilen – mit vollem Zugriff oder Nur-Lesen für Partner und Familie.',
  },
  {
    icon: SwatchIcon,
    title: 'Bank-Logo & Farbschemen',
    description:
      'Deutsche Banken im Seitenmenü erkennen, zwischen sechs Farbschemen wählen – auch im Dunkelmodus.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Backup & Datenschutz',
    description:
      'JSON-Backup exportieren und wiederherstellen. Ihre Daten, Ihr Server – keine Werbung, kein Datenverkauf.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Registrieren',
    description:
      'In wenigen Sekunden starten – optional Bank zuordnen und Farbschema wählen.',
  },
  {
    number: '02',
    title: 'Finanzen strukturieren',
    description:
      'Transaktionen erfassen oder per CSV importieren, Kategorien anlegen, wiederkehrende Zahlungen definieren.',
  },
  {
    number: '03',
    title: 'Planen & teilen',
    description:
      'Dashboard und Statistiken nutzen, Konten verknüpfen oder mit anderen gemeinsam führen.',
  },
]

const trustPoints = [
  'Kostenlos nutzbar',
  'Deutsche Oberfläche',
  'Mehrere Konten',
  'CSV-Import (DKB & ING)',
]

const highlights = [
  {
    title: 'Gehaltsmonat statt Kalender',
    description: 'Auswertungen passen sich Ihrem Gehaltseingang an – nicht dem 1. des Monats.',
  },
  {
    title: 'Verfügbar auf einen Blick',
    description: 'Kontostand minus ausstehende Ausgaben – so sehen Sie, was wirklich frei ist.',
  },
  {
    title: 'Schnell startklar',
    description: 'Registrieren, Bank wählen, erste Buchung oder CSV-Import – in unter einer Minute.',
  },
]

const previewFormatCurrency = (amount: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)

const PREVIEW_ACCOUNT_NAME = 'Haushalt'
const PREVIEW_BANK_NAME = 'Waldbank'

const previewRecentTransactions = [
  { merchant: 'REWE', amount: -42.3, date: '28.05.' },
  { merchant: 'Gehalt', amount: 3240, date: '01.05.' },
  { merchant: 'Spotify', amount: -9.99, date: '15.05.' },
]

function PreviewBankLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-full w-full text-secondary"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 3 4 9v1h16V9l-8-6zm-1 10v6h2v-6h-2zm-4 0v6h2v-6H7zm8 0v6h2v-6h-2zM4 19h16v2H4v-2z" />
    </svg>
  )
}

function LandingPreview() {
  const categories = [
    { name: 'Wohnen', value: 720, color: 'var(--color-accent)' },
    { name: 'Lebensmittel', value: 480, color: 'var(--color-expense)' },
    { name: 'Mobilität', value: 350, color: 'var(--color-pending)' },
    { name: 'Freizeit', value: 280, color: 'var(--color-income)' },
  ]

  return (
    <div
      className="relative mx-auto w-full max-w-lg lg:max-w-none"
      aria-hidden="true"
    >
      <div className="absolute -inset-4 rounded-[1.25rem] bg-accent/15 blur-2xl" />
      <div className="relative rounded-card border border-accent-border bg-surface p-5 shadow-[0_20px_50px_var(--shadow-color)]">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-muted p-1.5">
              <PreviewBankLogo />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-secondary">
                Vorschau
              </p>
              <p className="truncate text-sm font-semibold text-primary">
                {PREVIEW_ACCOUNT_NAME} · {PREVIEW_BANK_NAME}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-income-bg px-2.5 py-1 text-xs font-medium text-income">
            Gehaltsmonat
          </span>
        </div>

        <div className="rounded-control border border-accent bg-accent-subtle border-l-4 border-l-accent px-3 py-2.5 mb-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-secondary">
            Verfügbar
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-accent">2.840 €</p>
          <p className="mt-0.5 text-[10px] text-secondary">
            Kontostand 3.120 € · Ausstehend 280 €
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2">
          <div className="kpi-card--accent rounded-control px-2.5 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-secondary">
              Einnahmen
            </p>
            <p className="mt-0.5 text-xs font-semibold text-income sm:text-sm">3.240 €</p>
          </div>
          <div className="rounded-control border border-border bg-surface-muted px-2.5 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-secondary">
              Ausgaben
            </p>
            <p className="mt-0.5 text-xs font-semibold text-expense sm:text-sm">2.180 €</p>
          </div>
          <div className="rounded-control border border-border bg-surface px-2.5 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-secondary">
              Kontostand
            </p>
            <p className="mt-0.5 text-xs font-semibold text-accent sm:text-sm">3.120 €</p>
          </div>
          <div className="rounded-control border border-pending/30 bg-pending-bg px-2.5 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-secondary">
              Ausstehend
            </p>
            <p className="mt-0.5 text-xs font-semibold text-pending sm:text-sm">280 €</p>
          </div>
        </div>

        <div className="mt-3 rounded-control border border-border bg-canvas p-3">
          <p className="mb-2 text-xs font-medium text-primary">Letzte Buchungen</p>
          <ul className="space-y-1.5">
            {previewRecentTransactions.map((tx) => (
              <li
                key={tx.merchant + tx.date}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="truncate text-primary">{tx.merchant}</span>
                <span className="shrink-0 tabular-nums text-secondary">{tx.date}</span>
                <span
                  className={`shrink-0 font-medium tabular-nums ${
                    tx.amount >= 0 ? 'text-income' : 'text-expense'
                  }`}
                >
                  {previewFormatCurrency(tx.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3 rounded-control border border-border bg-canvas p-3">
          <p className="mb-3 text-xs font-medium text-primary">Ausgaben nach Kategorie</p>
          <CategoryExpenseBars categories={categories} formatCurrency={previewFormatCurrency} />
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 rounded-control border border-pending/30 bg-pending-bg px-3 py-2">
            <ArrowPathIcon className="h-4 w-4 shrink-0 text-pending" />
            <p className="text-xs text-primary">
              <span className="font-medium">3 wiederkehrende</span>
              <span className="text-secondary"> · nächste in 4 Tagen</span>
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-control border border-accent-border bg-accent-subtle px-3 py-2">
            <ArrowDownTrayIcon className="h-4 w-4 shrink-0 text-accent" />
            <p className="text-xs text-primary">
              <span className="font-medium">CSV-Import</span>
              <span className="text-secondary"> · 12 neue Umsätze</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 text-lg font-semibold tracking-tight text-accent"
        >
          KontoPlaner
        </Link>

        <nav
          className="hidden items-center gap-6 md:flex"
          aria-label="Seitenabschnitte"
        >
          <a
            href="#highlights"
            className="text-sm font-medium text-secondary transition-colors duration-feedback hover:text-accent"
          >
            Vorteile
          </a>
          <a
            href="#features"
            className="text-sm font-medium text-secondary transition-colors duration-feedback hover:text-accent"
          >
            Funktionen
          </a>
          <a
            href="#steps"
            className="text-sm font-medium text-secondary transition-colors duration-feedback hover:text-accent"
          >
            So starten
          </a>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/auth/login"
            className={getButtonClassName({
              variant: 'ghost',
              size: 'sm',
              className: 'hidden sm:inline-flex',
            })}
          >
            Anmelden
          </Link>
          <Link
            href="/auth/login"
            className="rounded-control px-3 py-2 text-sm font-medium text-secondary transition-colors duration-feedback hover:text-accent sm:hidden"
          >
            Anmelden
          </Link>
          <Link
            href="/auth/register"
            className={getButtonClassName({ variant: 'primary', size: 'sm' })}
          >
            Registrieren
          </Link>
        </div>
      </div>
    </header>
  )
}

function LandingFooter() {
  return (
    <footer className="border-t border-border bg-surface py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="text-center sm:text-left">
          <p className="font-semibold text-primary">KontoPlaner</p>
          <p className="mt-1 text-sm text-secondary">
            Persönliche Finanzverwaltung – klar, lokal, ohne Werbung.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <Link href="/auth/login" className="text-secondary hover:text-accent">
            Anmelden
          </Link>
          <Link href="/auth/register" className="text-secondary hover:text-accent">
            Registrieren
          </Link>
          <span className="text-secondary/70">Version {APP_VERSION}</span>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <div className="landing-page min-h-screen bg-canvas">
      <LandingHeader />

      <section className="landing-hero relative overflow-hidden border-b border-border">
        <div className="landing-hero-glow pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 py-14 lg:grid-cols-2 lg:gap-16 lg:py-20">
            <div className="text-center lg:text-left">
              <p className="landing-fade-in mb-4 inline-flex items-center gap-2 rounded-full border border-accent-border bg-accent-subtle px-3 py-1 text-xs font-medium text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                Persönliche Finanzverwaltung
              </p>

              <h1 className="landing-fade-in landing-fade-in-delay-1 text-4xl font-semibold tracking-tight text-primary sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                Finanzen planen,{' '}
                <span className="text-accent">nicht raten</span>
              </h1>

              <p className="landing-fade-in landing-fade-in-delay-2 mx-auto mt-5 max-w-xl text-base leading-relaxed text-secondary sm:text-lg lg:mx-0">
                KontoPlaner bündelt Einnahmen, Ausgaben und wiederkehrende Zahlungen – für ein
                Konto oder mehrere, allein oder gemeinsam. Mit Gehaltsmonat, CSV-Import und klarem
                Überblick statt Tabellen-Chaos.
              </p>

              <div className="landing-fade-in landing-fade-in-delay-3 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  href="/auth/register"
                  className={getButtonClassName({
                    variant: 'primary',
                    size: 'lg',
                    className:
                      'w-full shadow-sm transition-transform duration-feedback hover:scale-[1.02] active:scale-[0.98] sm:w-auto',
                  })}
                >
                  Kostenlos starten
                </Link>
                <Link
                  href="/auth/login"
                  className={getButtonClassName({
                    variant: 'secondary',
                    size: 'lg',
                    className:
                      'w-full shadow-sm transition-transform duration-feedback hover:scale-[1.02] active:scale-[0.98] sm:w-auto',
                  })}
                >
                  Anmelden
                </Link>
              </div>

              <ul className="landing-fade-in landing-fade-in-delay-4 mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 lg:justify-start">
                {trustPoints.map((point) => (
                  <li key={point} className="flex items-center gap-1.5 text-sm text-secondary">
                    <CheckCircleIcon className="h-4 w-4 shrink-0 text-income" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="landing-fade-in landing-fade-in-delay-2 lg:pl-4">
              <LandingPreview />
            </div>
          </div>
        </div>
      </section>

      <section
        id="highlights"
        className="border-b border-border bg-surface-muted/40 py-12 sm:py-14 scroll-mt-14"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
            {highlights.map(({ title, description }) => (
              <article
                key={title}
                className="rounded-card border border-border bg-surface p-5 transition-[border-color,box-shadow] duration-feedback hover:border-accent-border hover:shadow-[0_8px_24px_var(--shadow-color)]"
              >
                <h2 className="text-base font-semibold text-primary">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-16 sm:py-20 scroll-mt-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-accent">Funktionen</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
              Alles für Ihren Finanzüberblick
            </h2>
            <p className="mt-3 text-secondary">
              Von der ersten Buchung bis zum gemeinsamen Haushaltskonto – ohne unnötige Komplexität.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="landing-feature-card group rounded-card border border-border bg-surface p-6 transition-[border-color,box-shadow,transform] duration-feedback hover:-translate-y-0.5 hover:border-accent-border hover:shadow-[0_12px_32px_var(--shadow-color)]"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-control bg-accent-subtle text-accent transition-colors duration-feedback group-hover:bg-accent group-hover:text-accent-foreground">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="steps"
        className="border-y border-border bg-surface-muted/50 py-16 sm:py-20 scroll-mt-14"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-accent">
              In drei Schritten
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
              So starten Sie mit KontoPlaner
            </h2>
          </div>

          <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
            {steps.map((step, index) => (
              <li key={step.number} className="relative text-center md:text-left">
                {index < steps.length - 1 && (
                  <span
                    className="absolute top-8 left-[calc(50%+2.5rem)] hidden h-px w-[calc(100%-5rem)] bg-accent-border md:block"
                    aria-hidden="true"
                  />
                )}
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-card border-2 border-accent bg-accent-subtle text-lg font-semibold text-accent">
                  {step.number}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-primary">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{step.description}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12 flex justify-center">
            <Link
              href="/auth/register"
              className={getButtonClassName({ variant: 'primary', size: 'md' })}
            >
              Jetzt kostenlos registrieren
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-16 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent via-accent-hover to-accent opacity-[0.97]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent-subtle/20 blur-2xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-accent-foreground sm:text-3xl">
            Bereit für mehr Klarheit?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-accent-foreground/90">
            Legen Sie jetzt los – Konto anlegen, erste Buchung erfassen oder CSV importieren,
            optional Bank zuordnen und Farbschema wählen. In unter einer Minute eingerichtet.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/register"
              className="landing-cta-solid inline-flex w-full items-center justify-center rounded-control px-7 py-3.5 text-base font-semibold shadow-sm transition-colors duration-feedback sm:w-auto"
            >
              Jetzt registrieren
            </Link>
            <Link
              href="/auth/login"
              className="landing-cta-outline inline-flex w-full items-center justify-center rounded-control px-7 py-3.5 text-base font-medium transition-colors duration-feedback sm:w-auto"
            >
              Bereits Konto? Anmelden
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
