import type { Metadata } from 'next'
import LegalPage from '@/components/LegalPage'

export const metadata: Metadata = { title: 'Widerruf – KontoPlaner' }

export default function Page() {
  return <LegalPage slug="widerruf" />
}
