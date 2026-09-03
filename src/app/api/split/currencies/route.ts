import { NextResponse } from 'next/server'
import {
  ensureSplitCurrenciesFresh,
  getAllSplitCurrencies,
} from '@/lib/splitCurrencies'

export async function GET() {
  await ensureSplitCurrenciesFresh()
  return NextResponse.json(getAllSplitCurrencies())
}
