import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkRateLimit, getClientIp, rateLimitBucketCount } from '@/lib/rate-limit'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('getClientIp', () => {
  it('ignoriert Proxy-Header ohne TRUST_PROXY', () => {
    vi.stubEnv('TRUST_PROXY', 'false')
    const headers = new Headers({ 'x-forwarded-for': '1.1.1.1', 'x-real-ip': '2.2.2.2' })
    expect(getClientIp(headers)).toBe('direct')
  })

  it('bevorzugt X-Real-IP vom Proxy', () => {
    vi.stubEnv('TRUST_PROXY', 'true')
    const headers = new Headers({ 'x-forwarded-for': '6.6.6.6, 9.9.9.9', 'x-real-ip': '9.9.9.9' })
    expect(getClientIp(headers)).toBe('9.9.9.9')
  })

  it('nimmt bei X-Forwarded-For den vom Proxy angehängten letzten Eintrag', () => {
    vi.stubEnv('TRUST_PROXY', 'true')
    // „6.6.6.6“ hat der Client selbst mitgeschickt, „9.9.9.9“ hat nginx angehängt
    const headers = new Headers({ 'x-forwarded-for': '6.6.6.6, 9.9.9.9' })
    expect(getClientIp(headers)).toBe('9.9.9.9')
  })

  it('liefert direct, wenn kein Header gesetzt ist', () => {
    vi.stubEnv('TRUST_PROXY', 'true')
    expect(getClientIp(new Headers())).toBe('direct')
  })
})

describe('checkRateLimit', () => {
  it('blockiert nach Erreichen des Limits und gibt nach Ablauf wieder frei', () => {
    vi.useFakeTimers()
    const config = { limit: 2, windowMs: 1000 }
    expect(checkRateLimit('test:limit', config).allowed).toBe(true)
    expect(checkRateLimit('test:limit', config).allowed).toBe(true)
    expect(checkRateLimit('test:limit', config).allowed).toBe(false)
    vi.advanceTimersByTime(1001)
    expect(checkRateLimit('test:limit', config).allowed).toBe(true)
  })

  it('räumt abgelaufene Zähler auf, statt unbegrenzt zu wachsen', () => {
    vi.useFakeTimers()
    const config = { limit: 1, windowMs: 1000 }
    for (let i = 0; i < 6_000; i++) checkRateLimit(`test:flood:${i}`, config)
    expect(rateLimitBucketCount()).toBeGreaterThanOrEqual(5_000)
    vi.advanceTimersByTime(1001)
    checkRateLimit('test:after', config)
    expect(rateLimitBucketCount()).toBeLessThan(10)
  })
})
