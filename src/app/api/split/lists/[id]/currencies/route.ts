import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserBySession, isErrorResponse } from '@/lib/api-auth'
import {
  requireSplitListAccess,
  requireSplitListWrite,
} from '@/lib/splitAccess'
import {
  ensureSplitCurrenciesFresh,
  getSplitCurrencyLabel,
  isSupportedSplitCurrency,
  SPLIT_MAX_CURRENCIES_PER_LIST,
} from '@/lib/splitCurrencies'
import { serializeListCurrency } from '@/lib/splitSerialize'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const currencies = await prisma.splitListCurrency.findMany({
    where: { splitListId: id },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(currencies.map(serializeListCurrency))
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const writeError = requireSplitListWrite(access)
  if (writeError) return writeError

  let body: { currencyCode?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const currencyCode = body.currencyCode?.trim().toUpperCase()
  if (!currencyCode) {
    return NextResponse.json(
      { error: 'currencyCode ist erforderlich' },
      { status: 400 }
    )
  }

  await ensureSplitCurrenciesFresh()

  if (!isSupportedSplitCurrency(currencyCode)) {
    return NextResponse.json(
      { error: `Währung ${currencyCode} wird nicht unterstützt` },
      { status: 400 }
    )
  }

  const count = await prisma.splitListCurrency.count({ where: { splitListId: id } })
  if (count >= SPLIT_MAX_CURRENCIES_PER_LIST) {
    return NextResponse.json(
      {
        error: `Maximal ${SPLIT_MAX_CURRENCIES_PER_LIST} Fremdwährungen pro Liste`,
      },
      { status: 400 }
    )
  }

  const existing = await prisma.splitListCurrency.findFirst({
    where: { splitListId: id, currencyCode },
  })
  if (existing) {
    return NextResponse.json(
      { error: `${getSplitCurrencyLabel(currencyCode)} ist bereits konfiguriert` },
      { status: 409 }
    )
  }

  const currency = await prisma.splitListCurrency.create({
    data: {
      splitListId: id,
      currencyCode,
      sortOrder: count,
    },
  })

  return NextResponse.json(serializeListCurrency(currency), { status: 201 })
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const authResult = await getUserBySession()
  if (isErrorResponse(authResult)) return authResult

  const access = await requireSplitListAccess(authResult.user.id, id)
  if (access instanceof NextResponse) return access

  const writeError = requireSplitListWrite(access)
  if (writeError) return writeError

  let body: { currencyCode?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const currencyCode = body.currencyCode?.trim().toUpperCase()
  if (!currencyCode) {
    return NextResponse.json(
      { error: 'currencyCode ist erforderlich' },
      { status: 400 }
    )
  }

  const existing = await prisma.splitListCurrency.findFirst({
    where: { splitListId: id, currencyCode },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Währung nicht gefunden' }, { status: 404 })
  }

  await prisma.splitListCurrency.delete({ where: { id: existing.id } })

  return NextResponse.json({ message: 'Währung entfernt' })
}
