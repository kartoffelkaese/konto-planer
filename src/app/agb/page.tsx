import type { Metadata } from 'next'
import LegalPage from '@/components/LegalPage'

export const metadata: Metadata = { title: 'AGB – KontoPlaner' }

export default function Page() {
  return <LegalPage slug="agb" />
}
