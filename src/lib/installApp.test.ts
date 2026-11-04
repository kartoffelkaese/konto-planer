import { describe, expect, it } from 'vitest'

import { isIosDevice, isRunningInstalled } from '@/lib/installApp'
import { isPublicStaticFile } from '@/lib/publicStaticFiles'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
const ANDROID = 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'

describe('isIosDevice', () => {
  it('erkennt iPhone und iPad', () => {
    expect(isIosDevice(IPHONE)).toBe(true)
    // iPadOS meldet sich als Mac, hat aber Touch
    expect(isIosDevice(MAC, 5)).toBe(true)
  })

  it('hält Mac und Android nicht für iOS', () => {
    expect(isIosDevice(MAC, 0)).toBe(false)
    expect(isIosDevice(ANDROID, 5)).toBe(false)
  })
})

describe('isRunningInstalled', () => {
  it('erkennt den App-Modus über display-mode oder navigator.standalone', () => {
    expect(isRunningInstalled(true)).toBe(true)
    expect(isRunningInstalled(false, true)).toBe(true)
    expect(isRunningInstalled(false, false)).toBe(false)
    expect(isRunningInstalled(false)).toBe(false)
  })
})

describe('isPublicStaticFile', () => {
  it('lässt Manifest und Icons ohne Anmeldung durch', () => {
    expect(isPublicStaticFile('/manifest.webmanifest')).toBe(true)
    expect(isPublicStaticFile('/icons/icon-192.png')).toBe(true)
    expect(isPublicStaticFile('/apple-icon.png')).toBe(true)
  })

  it('schützt Seiten weiterhin', () => {
    expect(isPublicStaticFile('/settings')).toBe(false)
    expect(isPublicStaticFile('/transactions')).toBe(false)
  })
})
