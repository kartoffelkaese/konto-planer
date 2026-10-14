import type { Metadata } from 'next'
import LegalPage from '@/components/LegalPage'

export const metadata: Metadata = { title: 'Impressum – KontoPlaner' }

export default function Page() {
  return <LegalPage slug="impressum" />
}
