/**
 * Test-Gerüst für API-Routen: ersetzt Prisma und die Sitzung, damit sich Routen-Handler
 * ohne Datenbank aufrufen lassen.
 *
 * Verwendung in einer Testdatei:
 *   vi.mock('@/lib/prisma', async () => (await import('@/test/routeHarness')).prismaModule)
 *   vi.mock('@/lib/auth', async () => (await import('@/test/routeHarness')).authModule)
 *   import { prismaMock, loginAs, resetRouteMocks } from '@/test/routeHarness'
 */
import { vi, type Mock } from 'vitest'

type ModelMock = Record<string, Mock>

const models = new Map<string, ModelMock>()

function modelMock(name: string): ModelMock {
  let model = models.get(name)
  if (!model) {
    // Jede Methode (findUnique, update, …) entsteht beim ersten Zugriff als vi.fn()
    model = new Proxy({} as ModelMock, {
      get(target, method: string) {
        if (!(method in target)) target[method] = vi.fn()
        return target[method]
      },
    })
    models.set(name, model)
  }
  return model
}

const transactionMock: Mock = vi.fn()

/** `prismaMock.transaction.findFirst` usw. – jede Abfrage ist ein vi.fn() */
export const prismaMock = new Proxy({} as Record<string, ModelMock> & { $transaction: Mock }, {
  get(_target, prop: string) {
    if (prop === '$transaction') return transactionMock
    return modelMock(prop)
  },
})

export const authMock: Mock = vi.fn()

export const prismaModule = { prisma: prismaMock }
export const authModule = { auth: authMock }

/** Vor jedem Test: alle Abfragen zurücksetzen; $transaction führt den Callback mit dem Mock aus */
export function resetRouteMocks() {
  models.clear()
  transactionMock.mockReset()
  transactionMock.mockImplementation(async (arg: unknown) =>
    typeof arg === 'function'
      ? (arg as (tx: typeof prismaMock) => unknown)(prismaMock)
      : Promise.all(arg as unknown[])
  )
  authMock.mockReset()
  authMock.mockResolvedValue(null)
}

export const TEST_USER = {
  id: 'user-1',
  email: 'nutzer@beispiel.de',
  passwordHash: '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva',
  emailVerified: new Date('2026-01-01'),
  pendingEmail: null,
  splitDisplayName: null,
  sessionVersion: 0,
  createdAt: new Date('2026-01-01'),
}

export const TEST_ACCOUNT = {
  id: 'account-1',
  name: 'Mein Konto',
  salaryDay: 1,
  bankId: null,
  isSimpleAccount: false,
  transferSenderName: null,
  createdAt: new Date('2026-01-01'),
}

type LoginOptions = {
  role?: 'OWNER' | 'MEMBER' | 'READ_ONLY'
  sessionVersion?: number
  user?: Partial<typeof TEST_USER>
}

/** Meldet TEST_USER mit TEST_ACCOUNT als aktivem Konto an */
export function loginAs({ role = 'OWNER', sessionVersion = 0, user = {} }: LoginOptions = {}) {
  const dbUser = { ...TEST_USER, ...user }
  authMock.mockResolvedValue({
    user: { id: TEST_USER.id, email: TEST_USER.email },
    activeAccountId: TEST_ACCOUNT.id,
    sessionVersion,
  })
  prismaMock.user.findUnique.mockResolvedValue(dbUser)
  const membership = {
    id: 'member-1',
    accountId: TEST_ACCOUNT.id,
    userId: TEST_USER.id,
    role,
    createdAt: new Date('2026-01-01'),
  }
  prismaMock.accountMember.findUnique.mockResolvedValue({ ...membership, account: TEST_ACCOUNT })
  prismaMock.account.findUnique.mockResolvedValue(TEST_ACCOUNT)
  return { user: dbUser, membership }
}

export function jsonRequest(method: string, body?: unknown, url = 'http://localhost/api/test') {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

/** Zweites Argument eines Route-Handlers mit dynamischem Segment */
export function routeParams<T extends Record<string, string>>(values: T) {
  return { params: Promise.resolve(values) }
}
