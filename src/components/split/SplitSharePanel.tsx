'use client'

import { useCallback, useEffect, useState } from 'react'
import { LinkIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import { useToast } from '@/hooks/useToast'
import {
  getSplitShareStatus,
  regenerateSplitShare,
  updateSplitShare,
} from '@/lib/api'
import { splitSectionCardClass } from '@/components/split/splitUiClasses'

type SplitSharePanelProps = {
  listId: string
  isOwner: boolean
}

export default function SplitSharePanel({ listId, isOwner }: SplitSharePanelProps) {
  const { showToast } = useToast()
  const [shareEnabled, setShareEnabled] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareEnabledAt, setShareEnabledAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const status = await getSplitShareStatus(listId)
      setShareEnabled(status.shareEnabled)
      setShareEnabledAt(status.shareEnabledAt ?? null)
      if (status.shareUrl) {
        setShareUrl(status.shareUrl)
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Freigabe-Status konnte nicht geladen werden',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }, [listId, showToast])

  useEffect(() => {
    if (isOwner) {
      loadStatus()
    }
  }, [isOwner, loadStatus])

  if (!isOwner) return null

  const handleToggle = async () => {
    setBusy(true)
    try {
      const next = !shareEnabled
      const status = await updateSplitShare(listId, next)
      setShareEnabled(status.shareEnabled)
      setShareEnabledAt(status.shareEnabledAt ?? null)
      if (status.shareUrl) {
        setShareUrl(status.shareUrl)
      } else {
        setShareUrl(null)
      }
      showToast(
        next ? 'Share-Link aktiviert' : 'Share-Link deaktiviert',
        'success'
      )
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Freigabe konnte nicht geändert werden',
        'error'
      )
    } finally {
      setBusy(false)
    }
  }

  const handleRegenerate = async () => {
    if (
      !confirm(
        'Link neu generieren? Der bisherige Link funktioniert danach nicht mehr.'
      )
    ) {
      return
    }
    setBusy(true)
    try {
      const status = await regenerateSplitShare(listId)
      setShareEnabled(status.shareEnabled)
      setShareEnabledAt(status.shareEnabledAt ?? null)
      if (status.shareUrl) {
        setShareUrl(status.shareUrl)
      }
      showToast('Neuer Share-Link erstellt', 'success')
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Link konnte nicht neu erstellt werden',
        'error'
      )
    } finally {
      setBusy(false)
    }
  }

  const handleCopy = async () => {
    if (!shareUrl) {
      showToast('Bitte Link zuerst aktivieren oder neu generieren', 'error')
      return
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      showToast('Link kopiert', 'success')
    } catch {
      showToast('Kopieren fehlgeschlagen', 'error')
    }
  }

  return (
    <section className={`${splitSectionCardClass} space-y-4`}>
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-accent-border bg-accent-subtle text-accent">
          <LinkIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-medium text-primary">Link zum Teilen</h3>
          <p className="mt-1 text-sm text-secondary">
            Jeder mit dem Link kann die Liste nur ansehen — ohne Konto und ohne
            Bearbeitungsrechte.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-secondary">Wird geladen…</p>
      ) : (
        <>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={shareEnabled}
              onChange={handleToggle}
              disabled={busy}
              className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent bg-surface"
            />
            <span className="text-sm text-primary">
              Öffentlichen Lese-Link aktivieren
              {shareEnabledAt && (
                <span className="block text-xs text-secondary mt-0.5">
                  Aktiv seit{' '}
                  {new Date(shareEnabledAt).toLocaleDateString('de-DE', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              )}
            </span>
          </label>

          {shareEnabled && (
            <div className="space-y-3 rounded-control border border-border bg-canvas p-4">
              {shareUrl ? (
                <p className="break-all text-sm text-primary font-mono">{shareUrl}</p>
              ) : (
                <p className="text-sm text-secondary">
                  Der aktuelle Link ist aktiv, wurde aber nach dem letzten Laden erzeugt.
                  Generieren Sie den Link neu, um ihn zu kopieren.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleCopy}
                  disabled={busy || !shareUrl}
                >
                  Link kopieren
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleRegenerate}
                  loading={busy}
                  loadingText="Wird erstellt…"
                >
                  <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
                  Link neu generieren
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
