import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

/** Die Startseite liest beim Laden, ob Level aktiv sind – deshalb je Test frisch importieren */
async function renderLanding(plansEnabled: boolean) {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_PLANS_ENABLED', plansEnabled ? 'true' : '')
  const { default: LandingPage } = await import('./LandingPage')
  return renderToStaticMarkup(createElement(LandingPage))
}

afterEach(() => vi.unstubAllEnvs())

describe('Startseite', () => {
  it('zeigt mit aktiven Leveln beide Level, Preise und die Testphase', async () => {
    const html = await renderLanding(true)
    expect(html).toContain('id="pricing"')
    expect(html).toContain('Start')
    expect(html).toContain('Komplett')
    expect(html).toContain('24,00')
    expect(html).toContain('3,00')
    expect(html).toContain('14 Tage kostenlos testen')
    expect(html).toContain('href="#pricing"')
    expect(html).toContain('Im Level „Komplett“')
    // Inhalte stammen aus derselben Merkmalstabelle wie in der App
    expect(html).toContain('Statistiken')
    expect(html).toContain('Backup exportieren und einspielen')
  })

  it('bleibt ohne Level unverändert: kein Preis-Abschnitt, keine Kennzeichnung', async () => {
    const html = await renderLanding(false)
    expect(html).not.toContain('id="pricing"')
    expect(html).not.toContain('Im Level')
    expect(html).not.toContain('24,00')
    expect(html).toContain('Mehrere Konten')
  })
})
