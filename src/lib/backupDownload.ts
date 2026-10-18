import { exportBackup } from '@/lib/api'

/** Dateiname: Datum und – falls angegeben – der Kontoname in einer dateisicheren Form */
function backupFileName(accountName?: string) {
  const date = new Date().toISOString().split('T')[0]
  const slug = accountName
    ?.normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return slug ? `konto-planer-backup-${slug}-${date}.json` : `konto-planer-backup-${date}.json`
}

/** Lädt das Backup des aktiven Kontos (oder von `accountId`) und bietet es als Datei an */
export async function downloadBackup(accountId?: string, accountName?: string) {
  const backup = await exportBackup(accountId)
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = backupFileName(accountName)
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}
