'use client'

import Link from 'next/link'
import {
  ArrowDownLeftIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowsRightLeftIcon,
  ArrowUpRightIcon,
  BanknotesIcon,
  ChartBarIcon,
  ChartPieIcon,
  CheckIcon,
  DevicePhoneMobileIcon,
  ShieldCheckIcon,
  TagIcon,
  UserGroupIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { getButtonClassName } from '@/components/Button'
import { APP_VERSION } from '@/lib/version'

type Feature = {
  icon: typeof ChartBarIcon
  title: string
  description: string
  /** Breite Kachel im Bento-Raster (ab lg) */
  wide?: boolean
}

const features: Feature[] = [
  {
    icon: ChartBarIcon,
    title: 'Alles auf einen Blick',
    description:
      'Verfügbar, Einnahmen, Ausgaben und letzte Buchungen – die wichtigsten Zahlen sofort, ohne Tabellen-Chaos.',
  },
  {
    icon: BanknotesIcon,
    title: 'Transaktionen & Gehaltsmonat',
    description:
      'Buchen, filtern, bestätigen. Der Gehaltsmonat folgt deinem Einkommen – nicht dem Kalender.',
  },
  {
    icon: ArrowDownTrayIcon,
    title: 'CSV-Import von der Bank',
    description:
      'Umsätze von DKB und ING importieren – mit Vorschau, Duplikatprüfung und Händler-Zuordnung.',
  },
  {
    icon: UsersIcon,
    title: 'Split-Budget für Reisen & WG',
    description:
      'Gemeinsame Ausgaben erfassen, fair aufteilen und mit wenigen Zahlungen ausgleichen – auch in Fremdwährung und per Lese-Link für Gäste.',
    wide: true,
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
    icon: DevicePhoneMobileIcon,
    title: 'Mobil, hell & dunkel',
    description:
      'Für das Smartphone gebaut, mit Tab-Leiste und großen Tippflächen. Hell, Dunkel oder automatisch wie das System.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Backup & Datenschutz',
    description:
      'JSON-Backup exportieren und wiederherstellen. Deine Daten, dein Server – keine Werbung, kein Datenverkauf.',
  },
]

const steps = [
  {
    title: 'Registrieren',
    description: 'In wenigen Sekunden starten und optional deine Bank zuordnen.',
  },
  {
    title: 'Finanzen strukturieren',
    description:
      'Transaktionen erfassen oder per CSV importieren, Kategorien anlegen, wiederkehrende Zahlungen definieren.',
  },
  {
    title: 'Planen & teilen',
    description:
      'Übersicht und Statistiken nutzen, Konten gemeinsam führen oder Ausgaben per Split aufteilen.',
  },
]

const trustPoints = ['Kostenlos', 'Ohne Werbung', 'DKB & ING Import', 'Mehrere Konten']

const highlights = [
  {
    title: 'Gehaltsmonat statt Kalender',
    description: 'Auswertungen passen sich deinem Gehaltseingang an – nicht dem 1. des Monats.',
  },
  {
    title: 'Verfügbar auf einen Blick',
    description: 'Kontostand minus ausstehende Ausgaben – so siehst du, was wirklich frei ist.',
  },
  {
    title: 'Schnell startklar',
    description: 'Registrieren, Bank wählen, erste Buchung oder CSV-Import – in unter einer Minute.',
  },
]

const previewTransactions = [
  { merchant: 'REWE', meta: 'Heute · Lebensmittel', amount: '−42,30 €', initial: 'R', color: '#f59e0b' },
  { merchant: 'Gehalt', meta: '01.05. · Einkommen', amount: '+3.240,00 €', income: true },
  { merchant: 'Spotify', meta: '15.05. · Abos', amount: '−9,99 €', initial: 'S', color: '#10b981' },
]

function LogoMark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-[0.65rem] bg-accent text-sm font-bold text-accent-foreground ${className}`}
      aria-hidden="true"
    >
      K
    </span>
  )
}

/** Stilisierte App-Vorschau im Design der echten Übersicht */
function LandingPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="absolute -inset-6 rounded-[2.5rem] bg-accent/20 blur-3xl" />

      <div className="relative rounded-[2rem] border border-hairline bg-canvas p-3 shadow-raised">
        <div className="space-y-3">
          <div className="hero-card p-5">
            <p className="eyebrow">Verfügbar</p>
            <p className="amount-hero mt-1 text-[2.5rem] text-primary">2.840,00 €</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip">
                Kontostand <span className="amount text-primary">3.120 €</span>
              </span>
              <span className="chip">
                Ausstehend <span className="amount text-expense">−280 €</span>
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full w-[91%] rounded-full bg-accent" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-income-bg text-income">
                <ArrowDownLeftIcon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-xs text-secondary">Einnahmen</p>
              <p className="amount text-lg text-income">3.240 €</p>
            </div>
            <div className="card p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-expense-bg text-expense">
                <ArrowUpRightIcon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-xs text-secondary">Ausgaben</p>
              <p className="amount text-lg text-expense">2.180 €</p>
            </div>
          </div>

          <div className="card p-4">
            <p className="mb-1 text-sm font-semibold text-primary">Letzte Buchungen</p>
            <ul>
              {previewTransactions.map((tx) => (
                <li key={tx.merchant} className="flex items-center gap-3 py-2">
                  {tx.income ? (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-income-bg text-income">
                      <ArrowDownLeftIcon className="h-4 w-4" />
                    </span>
                  ) : (
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: tx.color }}
                    >
                      {tx.initial}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-primary">
                      {tx.merchant}
                    </span>
                    <span className="block truncate text-xs text-secondary">{tx.meta}</span>
                  </span>
                  <span
                    className={`amount shrink-0 text-sm ${tx.income ? 'text-income' : 'text-primary'}`}
                  >
                    {tx.amount}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Schwebende Split-Karte für Tiefe */}
      <div className="absolute -bottom-24 -left-4 hidden w-56 rounded-card border border-hairline bg-surface-raised p-4 shadow-raised sm:block lg:-left-10">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-subtle text-accent">
            <UsersIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-primary">Urlaub Lissabon</p>
            <p className="text-xs text-secondary">3 Personen · Split</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-control bg-surface-muted/70 px-3 py-2">
          <span className="text-xs text-secondary">Lena → Tom</span>
          <span className="amount text-sm text-primary">48,50 €</span>
        </div>
      </div>
    </div>
  )
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-h-11 shrink-0 items-center gap-2 text-lg font-semibold tracking-tight text-primary"
        >
          <LogoMark />
          KontoPlaner
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Seitenabschnitte">
          {[
            ['#highlights', 'Vorteile'],
            ['#features', 'Funktionen'],
            ['#steps', 'So starten'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-pill px-3 py-2 text-sm font-medium text-secondary transition-colors duration-feedback hover:bg-surface-muted hover:text-primary"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/auth/login"
            className="inline-flex min-h-11 items-center rounded-pill px-3 text-sm font-medium text-secondary transition-colors duration-feedback hover:bg-surface-muted hover:text-primary max-sm:hidden"
          >
            Anmelden
          </Link>
          <Link
            href="/auth/register"
            className={getButtonClassName({ variant: 'primary', size: 'sm', className: 'rounded-pill px-4' })}
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
    <footer className="border-t border-hairline py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <LogoMark className="max-sm:hidden" />
          <div>
            <p className="font-semibold text-primary">KontoPlaner</p>
            <p className="text-sm text-secondary">
              Persönliche Finanzverwaltung – klar, lokal, ohne Werbung.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm">
          <Link
            href="/auth/login"
            className="inline-flex min-h-11 items-center rounded-pill px-3 text-secondary hover:text-primary"
          >
            Anmelden
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex min-h-11 items-center rounded-pill px-3 text-secondary hover:text-primary"
          >
            Registrieren
          </Link>
          <span className="px-3 text-secondary/80">Version {APP_VERSION}</span>
        </div>
      </div>
    </footer>
  )
}

function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="inline-flex rounded-pill bg-accent-subtle px-3 py-1 text-sm font-medium text-accent">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-primary sm:text-4xl">
        {title}
      </h2>
      {text && <p className="mt-3 text-base leading-relaxed text-secondary sm:text-lg">{text}</p>}
    </div>
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
                Persönliche Finanzverwaltung
              </p>

              <h1 className="landing-fade-in landing-fade-in-delay-1 mt-5 text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.04em] text-primary sm:text-6xl lg:text-[4rem]">
                Finanzen planen,
                <br />
                <span className="text-accent">nicht raten.</span>
              </h1>

              <p className="landing-fade-in landing-fade-in-delay-2 mx-auto mt-6 max-w-xl text-base leading-relaxed text-secondary sm:text-lg lg:mx-0">
                KontoPlaner bündelt Einnahmen, Ausgaben und wiederkehrende Zahlungen – für ein
                Konto oder mehrere, allein oder gemeinsam. Mit Gehaltsmonat, CSV-Import und
                Split-Budget für geteilte Kosten.
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
            </div>

            <div className="landing-fade-in landing-fade-in-delay-2 px-2 sm:px-8 lg:px-0">
              <LandingPreview />
            </div>
          </div>
        </div>
      </section>

      <section id="highlights" className="scroll-mt-16 pb-16 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="card grid divide-y divide-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {highlights.map(({ title, description }, index) => (
              <article key={title} className="p-6 sm:p-8">
                <span className="amount text-sm text-accent">0{index + 1}</span>
                <h2 className="mt-2 text-lg font-semibold text-primary">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-16 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionIntro
            eyebrow="Funktionen"
            title="Alles für deinen Finanzüberblick"
            text="Von der ersten Buchung bis zum gemeinsamen Haushalt – ohne unnötige Komplexität."
          />

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description, wide }) => (
              <article
                key={title}
                className={`group card p-6 transition-[box-shadow,transform] duration-feedback hover:-translate-y-0.5 hover:shadow-raised ${
                  wide ? 'lg:col-span-2 hero-card' : ''
                }`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-subtle text-accent transition-colors duration-feedback group-hover:bg-accent group-hover:text-accent-foreground">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className={`mt-4 font-semibold text-primary ${wide ? 'text-xl' : 'text-lg'}`}>
                  {title}
                </h3>
                <p
                  className={`mt-2 leading-relaxed text-secondary ${wide ? 'max-w-lg text-base' : 'text-sm'}`}
                >
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="steps" className="scroll-mt-16 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionIntro eyebrow="In drei Schritten" title="So startest du mit KontoPlaner" />

          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="card p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-primary">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{step.description}</p>
              </li>
            ))}
          </ol>
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
                Bereit für mehr Klarheit?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-accent-foreground/85 sm:text-lg">
                Konto anlegen, erste Buchung erfassen oder CSV importieren – in unter einer Minute
                eingerichtet.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/auth/register"
                  className="landing-cta-solid inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-pill px-7 text-base font-semibold transition-colors duration-feedback sm:w-auto"
                >
                  Jetzt registrieren
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
