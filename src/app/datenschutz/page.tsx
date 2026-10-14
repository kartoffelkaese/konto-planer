import type { Metadata } from 'next'
import LegalPage from '@/components/LegalPage'

export const metadata: Metadata = { title: 'Datenschutz – KontoPlaner' }

export default function Page() {
  return <LegalPage slug="datenschutz" />
}
