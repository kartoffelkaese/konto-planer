'use client'

import { useState } from 'react'
import Modal from '@/components/Modal'
import { Button } from '@/components/Button'
import SegmentedControl from '@/components/SegmentedControl'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useToast } from '@/hooks/useToast'
import {
  deleteAdminUser,
  getAdminPlanChanges,
  getApiErrorMessage,
  setAdminUserPlan,
} from '@/lib/api'
import { formatDate, formatDateForInput } from '@/lib/dateUtils'
import { PLAN_LABELS, type PlanId } from '@/lib/plans'
import type { AdminUser } from '@/types/admin'

type AdminPlanDialogProps = {
  user: AdminUser | null
  onClose: () => void
  onSaved: () => void
}

const PLAN_OPTIONS: { value: PlanId; label: string }[] = [
  { value: 'BASIC', label: PLAN_LABELS.BASIC },
  { value: 'FULL', label: PLAN_LABELS.FULL },
]

const SOURCE_LABELS = {
  LEGACY: 'Bestand',
  TRIAL: 'Testphase',
  MANUAL: 'von Hand',
  STRIPE: 'Abo',
} as const

type FormProps = { user: AdminUser } & Omit<AdminPlanDialogProps, 'user'>

/** Zweiter Schritt: Löschen erst nach Eingabe der E-Mail-Adresse */
function DeleteUserForm({ user, onBack, onSaved }: { user: AdminUser; onBack: () => void; onSaved: () => void }) {
  const { showToast } = useToast()
  const [confirmEmail, setConfirmEmail] = useState('')
  const [deleting, setDeleting] = useState(false)
  const matches = confirmEmail.trim().toLowerCase() === user.email.toLowerCase()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!matches) return
    setDeleting(true)
    try {
      await deleteAdminUser(user.id, confirmEmail.trim())
      showToast(`${user.email} wurde gelöscht`, 'success')
      onSaved()
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Benutzer konnte nicht gelöscht werden'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-control bg-danger-subtle p-3 text-sm text-primary">
        <p className="font-medium text-danger">Das lässt sich nicht rückgängig machen.</p>
        <p className="mt-1">
          Gelöscht werden die Anmeldung von <span className="font-medium [overflow-wrap:anywhere]">{user.email}</span>,
          alle Konten, die nur dieser Person gehören (mit Buchungen, Kategorien und Händlern), und
          ihre Split-Listen. Konten, die sie mit anderen teilt, bleiben für die anderen erhalten.
        </p>
      </div>

      <div>
        <label htmlFor="admin-delete-confirm" className="block text-sm font-medium text-primary">
          Zur Bestätigung die E-Mail-Adresse eingeben
        </label>
        <input
          id="admin-delete-confirm"
          type="email"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          autoComplete="off"
          className="mt-1 w-full"
        />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onBack}>
          Zurück
        </Button>
        <Button
          type="submit"
          variant="danger"
          loading={deleting}
          loadingText="Wird gelöscht…"
          disabled={!matches}
        >
          Endgültig löschen
        </Button>
      </div>
    </form>
  )
}

function PlanForm({ user, onClose, onSaved, onDelete }: FormProps & { onDelete: () => void }) {
  const { showToast } = useToast()
  const [plan, setPlan] = useState<PlanId>(user.effectivePlan)
  const [expiresAt, setExpiresAt] = useState(
    user.effectivePlan === 'FULL' && user.planExpiresAt ? formatDateForInput(user.planExpiresAt) : ''
  )
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: changes } = useApiQuery(`admin-plan-changes:${user.id}`, () =>
    getAdminPlanChanges(user.id)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await setAdminUserPlan(user.id, {
        plan,
        // Ende des gewählten Tages
        expiresAt: plan === 'FULL' && expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
        note: note.trim() || undefined,
      })
      showToast(`${user.email} hat jetzt „${PLAN_LABELS[plan]}“`, 'success')
      onSaved()
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Level konnte nicht geändert werden'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="break-all text-sm text-secondary">{user.email}</p>

      <SegmentedControl
        ariaLabel="Level"
        className="grid w-full grid-cols-2"
        options={PLAN_OPTIONS}
        value={plan}
        onChange={setPlan}
      />

      {plan === 'FULL' && (
        <div>
          <label htmlFor="admin-plan-expires" className="block text-sm font-medium text-primary">
            Gültig bis (optional)
          </label>
          <input
            id="admin-plan-expires"
            type="date"
            value={expiresAt}
            min={formatDateForInput(new Date())}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="mt-1 w-full"
          />
          <p className="mt-1 text-xs text-secondary">
            Ohne Datum gilt das Level dauerhaft. Danach gilt automatisch „{PLAN_LABELS.BASIC}“.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="admin-plan-note" className="block text-sm font-medium text-primary">
          Notiz (optional)
        </label>
        <input
          id="admin-plan-note"
          type="text"
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          placeholder="z. B. Geschenk, Testzugang"
          className="mt-1 w-full"
        />
      </div>

      {changes && changes.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-primary">Verlauf</h3>
          <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-xs text-secondary">
            {changes.map((change) => (
              <li key={change.id}>
                <span className="text-primary">
                  {formatDate(change.createdAt)} · {PLAN_LABELS[change.fromPlan]} →{' '}
                  {PLAN_LABELS[change.toPlan]}
                </span>{' '}
                · {SOURCE_LABELS[change.source]}
                {change.expiresAt && ` · bis ${formatDate(change.expiresAt)}`}
                {change.changedByEmail && ` · ${change.changedByEmail}`}
                {change.note && ` · ${change.note}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose}>
          Abbrechen
        </Button>
        <Button type="submit" loading={saving} loadingText="Wird gespeichert…">
          Speichern
        </Button>
      </div>

      {!user.isAdmin && (
        <div className="border-t border-hairline pt-4">
          <Button type="button" variant="danger-outline" size="sm" onClick={onDelete}>
            Benutzer löschen
          </Button>
        </div>
      )}
    </form>
  )
}

/** Verwaltung: Level eines Nutzers setzen (optional befristet), Verlauf ansehen, Nutzer löschen */
export default function AdminPlanDialog({ user, onClose, onSaved }: AdminPlanDialogProps) {
  // Löschen ist ein eigener Schritt und gilt nur für den Nutzer, für den es geöffnet wurde
  const [deleteForId, setDeleteForId] = useState<string | null>(null)
  const deleting = user !== null && deleteForId === user.id

  const handleClose = () => {
    setDeleteForId(null)
    onClose()
  }

  return (
    <Modal
      isOpen={user !== null}
      onClose={handleClose}
      title={deleting ? 'Benutzer löschen' : 'Benutzer verwalten'}
      maxWidth="md"
    >
      {user &&
        (deleting ? (
          <DeleteUserForm
            key={`delete-${user.id}`}
            user={user}
            onBack={() => setDeleteForId(null)}
            onSaved={() => {
              setDeleteForId(null)
              onSaved()
            }}
          />
        ) : (
          <PlanForm
            key={user.id}
            user={user}
            onClose={handleClose}
            onSaved={onSaved}
            onDelete={() => setDeleteForId(user.id)}
          />
        ))}
    </Modal>
  )
}
