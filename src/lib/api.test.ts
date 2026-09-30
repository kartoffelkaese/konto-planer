import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  getApiErrorMessage,
  getCategories,
  withApiErrorFallback,
} from './api'

function mockFetch(status: number, body: unknown) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(text, { status, headers: { 'Content-Type': 'application/json' } })
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('apiFetch (über getCategories)', () => {
  it('liefert die JSON-Antwort bei Erfolg', async () => {
    const fetchMock = mockFetch(200, [{ id: '1', name: 'Miete' }])
    await expect(getCategories()).resolves.toEqual([{ id: '1', name: 'Miete' }])
    expect(fetchMock).toHaveBeenCalledWith('/api/categories', expect.any(Object))
  })

  it('wirft ApiError mit Status, Daten und Server-Meldung', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFetch(403, { error: 'Nur Lesezugriff' })
    const err = await getCategories().catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toBeInstanceOf(Error)
    expect((err as ApiError).status).toBe(403)
    expect((err as ApiError).serverMessage).toBe('Nur Lesezugriff')
    expect((err as ApiError).message).toBe('Nur Lesezugriff')
  })

  it('nutzt "HTTP <status>" als Meldung ohne error-Feld (wie bisher)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFetch(502, '<html>Bad Gateway</html>')
    const err = (await getCategories().catch((e: unknown) => e)) as ApiError
    expect(err.message).toBe('HTTP 502')
    expect(err.serverMessage).toBeNull()
  })
})

describe('getApiErrorMessage', () => {
  it('bevorzugt die Server-Meldung', () => {
    expect(getApiErrorMessage(new ApiError(400, {}, 'Name fehlt'), 'Fallback')).toBe('Name fehlt')
  })

  it('nutzt den Ersatztext ohne Server-Meldung oder bei anderen Fehlern', () => {
    expect(getApiErrorMessage(new ApiError(500, null, null), 'Fallback')).toBe('Fallback')
    expect(getApiErrorMessage(new TypeError('Failed to fetch'), 'Fallback')).toBe('Fallback')
  })
})

describe('withApiErrorFallback', () => {
  it('reicht Erfolgswerte durch', async () => {
    await expect(withApiErrorFallback(Promise.resolve(42), 'X')).resolves.toBe(42)
  })

  it('entspricht `data.error || fallback`', async () => {
    await expect(
      withApiErrorFallback(Promise.reject(new ApiError(409, {}, 'Existiert bereits')), 'X')
    ).rejects.toThrow('Existiert bereits')
    await expect(
      withApiErrorFallback(Promise.reject(new ApiError(500, null, null)), 'Speichern fehlgeschlagen')
    ).rejects.toThrow('Speichern fehlgeschlagen')
  })
})
