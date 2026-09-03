import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import { getExchangeRateToEur } from '@/lib/exchangeRates'
import { requireSplitListAccess } from '@/lib/splitAccess'
import { prisma } from '@/lib/prisma'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const { searchParams } = new URL(request.url)
  const currency = searchParams.get('currency')?.toUpperCase()
  const dateStr = searchParams.get('date')
  const amountStr = searchParams.get('amount')

  if (!currency) {
    return NextResponse.json(
      { error: 'currency ist erforderlich' },
      { status: 400 }
    )
  }

  if (!dateStr) {
    return NextResponse.json({ error: 'date ist erforderlich' }, { status: 400 })
  }

  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Ungültiges Datum' }, { status: 400 })
  }

  if (currency !== 'EUR') {
    const listCurrency = await prisma.splitListCurrency.findFirst({
      where: { splitListId: id, currencyCode: currency },
    })
    if (!listCurrency) {
      return NextResponse.json(
        { error: `Währung ${currency} ist für diese Liste nicht konfiguriert` },
        { status: 400 }
      )
    }
  }

  const amount =
    amountStr != null && amountStr !== ''
      ? Number.parseFloat(amountStr.replace(',', '.'))
      : undefined

  if (amount != null && (Number.isNaN(amount) || amount === 0)) {
    return NextResponse.json({ error: 'Ungültiger Betrag' }, { status: 400 })
  }

  try {
    const result = await getExchangeRateToEur(currency, date, amount)
    return NextResponse.json(result)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Wechselkurs nicht verfügbar'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
