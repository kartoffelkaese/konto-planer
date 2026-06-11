'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import PageLoader from '@/components/PageLoader'

function VerifyEmailRedirect() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      window.location.href = '/auth/login?verifyError=missing'
      return
    }
    window.location.href = `/api/auth/verify-email?token=${encodeURIComponent(token)}`
  }, [searchParams])

  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas">
      <PageLoader message="E-Mail wird bestätigt…" />
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailRedirect />
    </Suspense>
  )
}
