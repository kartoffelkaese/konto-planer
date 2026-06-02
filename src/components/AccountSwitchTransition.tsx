'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
  ACCOUNT_CHANGED_EVENT,
  ACCOUNT_SWITCHING_EVENT,
  ACCOUNT_SWITCH_ENTER_MS,
} from '@/lib/accountSwitchEvents'

type SwitchPhase = 'idle' | 'exiting' | 'entering'

export default function AccountSwitchTransition({
  children,
}: {
  children: ReactNode
}) {
  const [phase, setPhase] = useState<SwitchPhase>('idle')

  useEffect(() => {
    let enterTimer: ReturnType<typeof setTimeout> | undefined

    const onSwitching = () => {
      if (enterTimer) clearTimeout(enterTimer)
      setPhase('exiting')
    }

    const onChanged = () => {
      setPhase('entering')
      if (enterTimer) clearTimeout(enterTimer)
      enterTimer = setTimeout(() => setPhase('idle'), ACCOUNT_SWITCH_ENTER_MS)
    }

    window.addEventListener(ACCOUNT_SWITCHING_EVENT, onSwitching)
    window.addEventListener(ACCOUNT_CHANGED_EVENT, onChanged)

    return () => {
      window.removeEventListener(ACCOUNT_SWITCHING_EVENT, onSwitching)
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, onChanged)
      if (enterTimer) clearTimeout(enterTimer)
    }
  }, [])

  const phaseClass =
    phase === 'exiting'
      ? 'account-switch-exit'
      : phase === 'entering'
        ? 'account-switch-enter'
        : undefined

  return (
    <div className={phaseClass} data-account-switch-phase={phase}>
      {children}
    </div>
  )
}
