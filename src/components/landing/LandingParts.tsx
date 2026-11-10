'use client'

import Link from 'next/link'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
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
import LegalLinks from '@/components/LegalLinks'
import LogoMark from '@/components/LogoMark'
import { formatCurrency } from '@/lib/formatters'
import {
  BILLING_ENABLED_PUBLIC,
  PLAN_FEATURES,
  PLAN_LABELS,
  PLAN_PRICE,
  PLANS_ENABLED_PUBLIC,
  TRIAL_DAYS,
} from '@/lib/plans'

/** Bausteine der Startseite: Funktionen, Kopf, Fußzeile, Abschnittsüberschrift und Preise */

export type Feature = {
  icon: typeof ChartBarIcon
  title: string
  description: string
  /** Breite Kachel im Bento-Raster (ab lg) */
  wide?: boolean
  /** Gehört zum Level „Komplett“ (nur gekennzeichnet, wenn Level aktiv sind) */
  full?: boolean
}

export const features: Feature[] = [
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
    full: true,
  },
  {
    icon: UsersIcon,
    title: 'Split-Budget für Reisen & WG',
    description:
      'Gemeinsame Ausgaben erfassen, fair aufteilen und mit wenigen Zahlungen ausgleichen – auch in Fremdwährung und per Lese-Link für Gäste.',
    wide: true,
    full: true,
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
    full: true,
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
    full: true,
  },
  {
    icon: UserGroupIcon,
    title: 'Gemeinsam nutzen',
    description:
      'Konten per Einladung teilen – mit vollem Zugriff oder Nur-Lesen für Partner und Familie.',
    full: true,
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

export const trustPoints = PLANS_ENABLED_PUBLIC
  ? ['Kostenlos starten', `${TRIAL_DAYS} Tage alles testen`, 'Ohne Zahlungsmittel', 'Ohne Werbung']
  : ['Kostenlos', 'Ohne Werbung', 'DKB & ING Import', 'Mehrere Konten']

const DEFAULT_SECTIONS: [string, string][] = [
  ['#so-gehts', 'So geht’s'],
  ['#funktionen', 'Funktionen'],
  ...(PLANS_ENABLED_PUBLIC ? ([['#pricing', 'Preise']] as [string, string][]) : []),
  ['#fragen', 'Fragen'],
]

/** Kopf der Startseite; `sections` = Anker und Beschriftung der Abschnitts-Links */
export function LandingHeader({ sections = DEFAULT_SECTIONS }: { sections?: [string, string][] }) {
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
          {sections.map(([href, label]) => (
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

export function LandingFooter() {
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
      <LegalLinks className="mx-auto mt-4 max-w-6xl justify-center px-4 sm:justify-end sm:px-6" />
    </footer>
  )
}

export function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
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

function PlanFeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-primary">
          <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  )
}

/** Die beiden Level im Vergleich – Inhalte aus `@/lib/plans`, damit sie mit der App übereinstimmen */
export function LandingPricing() {
  return (
    <section id="pricing" className="scroll-mt-16 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionIntro
          eyebrow="Preise"
          title="Kostenlos starten, bei Bedarf erweitern"
          text={`Jede Registrierung beginnt mit ${TRIAL_DAYS} Tagen „${PLAN_LABELS.FULL}“ – ohne Zahlungsmittel. Danach nutzt du „${PLAN_LABELS.BASIC}“ kostenlos weiter, deine Daten bleiben erhalten.`}
        />

        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2 md:gap-6">
          <article className="card flex flex-col p-6 sm:p-8">
            <h3 className="text-xl font-semibold text-primary">{PLAN_LABELS.BASIC}</h3>
            <p className="mt-1 text-sm text-secondary">Für ein Konto – dauerhaft kostenlos.</p>
            <p className="mt-5">
              <span className="amount-lg text-primary">{formatCurrency(0)}</span>
            </p>
            <PlanFeatureList items={PLAN_FEATURES.BASIC} />
            <div className="mt-auto pt-8">
              <Link
                href="/auth/register"
                className={getButtonClassName({
                  variant: 'secondary',
                  size: 'lg',
                  className: 'w-full rounded-pill',
                })}
              >
                Kostenlos starten
              </Link>
            </div>
          </article>

          <article className="hero-card flex flex-col p-6 sm:p-8">
            <h3 className="text-xl font-semibold text-primary">{PLAN_LABELS.FULL}</h3>
            <p className="mt-1 text-sm text-secondary">
              Alles aus „{PLAN_LABELS.BASIC}“ und zusätzlich:
            </p>
            <p className="mt-5">
              <span className="amount-lg text-primary">{formatCurrency(PLAN_PRICE.yearly)}</span>
              <span className="text-sm text-secondary"> im Jahr</span>
            </p>
            <p className="mt-1 text-sm text-secondary">
              oder {formatCurrency(PLAN_PRICE.monthly)} im Monat
            </p>
            <PlanFeatureList items={PLAN_FEATURES.FULL} />
            <div className="mt-auto pt-8">
              <Link
                href="/auth/register"
                className={getButtonClassName({
                  variant: 'primary',
                  size: 'lg',
                  className: 'w-full rounded-pill',
                })}
              >
                {TRIAL_DAYS} Tage kostenlos testen
              </Link>
              <p className="mt-3 text-center text-xs text-secondary">
                {BILLING_ENABLED_PUBLIC
                  ? 'Danach als Abo buchbar, jederzeit kündbar.'
                  : `Die Buchung von „${PLAN_LABELS.FULL}“ ist in Kürze möglich.`}
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
