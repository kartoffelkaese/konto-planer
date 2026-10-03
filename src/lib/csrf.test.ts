import { describe, expect, it } from 'vitest'

import { isCrossSiteRequest } from '@/lib/csrf'

const headers = (values: Record<string, string>) => new Headers(values)

describe('isCrossSiteRequest', () => {
  it('lässt lesende Anfragen immer durch', () => {
    expect(isCrossSiteRequest('GET', headers({ origin: 'https://boese.example', host: 'konto-planer.de' }))).toBe(false)
  })

  it('erlaubt schreibende Anfragen vom eigenen Host', () => {
    expect(isCrossSiteRequest('POST', headers({ origin: 'https://konto-planer.de', host: 'konto-planer.de' }))).toBe(false)
    expect(isCrossSiteRequest('PATCH', headers({ origin: 'http://localhost:3000', host: 'localhost:3000' }))).toBe(false)
  })

  it('berücksichtigt X-Forwarded-Host hinter dem Proxy', () => {
    expect(
      isCrossSiteRequest('DELETE', headers({ origin: 'https://konto-planer.de', host: '127.0.0.1:3001', 'x-forwarded-host': 'konto-planer.de' }))
    ).toBe(false)
  })

  it('blockiert schreibende Anfragen fremder Seiten', () => {
    expect(isCrossSiteRequest('POST', headers({ origin: 'https://boese.example', host: 'konto-planer.de' }))).toBe(true)
    expect(isCrossSiteRequest('POST', headers({ origin: 'null', host: 'konto-planer.de' }))).toBe(true)
  })

  it('erlaubt Anfragen ohne Origin (keine Browser-Anfrage einer fremden Seite)', () => {
    expect(isCrossSiteRequest('POST', headers({ host: 'konto-planer.de' }))).toBe(false)
  })
})
