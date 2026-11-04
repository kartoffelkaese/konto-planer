import type { MetadataRoute } from 'next'
import { COLOR_SCHEME_TOKENS } from '@/lib/colorSchemeTokens'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/siteMetadata'

/** Web-App-Manifest: macht KontoPlaner im Browser installierbar (Start ohne Adressleiste) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: 'de',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: COLOR_SCHEME_TOKENS.light.canvas,
    theme_color: COLOR_SCHEME_TOKENS.light.canvas,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
