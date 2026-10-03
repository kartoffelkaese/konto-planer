import { NextResponse } from 'next/server'
import {
  ensureSplitCurrenciesFresh,
  getAllSplitCurrencies,
} from '@/lib/splitCurrencies'
import { withErrorHandling } from '@/lib/route-handler'

export const GET = withErrorHandling('/api/split/currencies', async function GET() {
  await ensureSplitCurrenciesFresh()
  return NextResponse.json(getAllSplitCurrencies())
})
