import { NextResponse } from 'next/server'
import { PLAN_MESSAGES } from '@/lib/planMessages'

export { PLAN_MESSAGES }

/** Kennung in Fehlerantworten, wenn eine Funktion am Level scheitert */
export const PLAN_REQUIRED_CODE = 'PLAN_REQUIRED'

export function planRequiredResponse(message: string): NextResponse {
  return NextResponse.json({ error: message, code: PLAN_REQUIRED_CODE }, { status: 403 })
}
