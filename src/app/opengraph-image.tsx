import { ImageResponse } from 'next/og'
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_ALT } from '@/lib/siteMetadata'

export const alt = SITE_OG_ALT
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: 'linear-gradient(145deg, #1a1b26 0%, #252736 55%, #1f6b52 100%)',
          color: '#f4f4f5',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            K
          </div>
          <span style={{ fontSize: 28, fontWeight: 600, opacity: 0.92 }}>{SITE_NAME}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 920 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
            }}
          >
            Finanzen planen, nicht raten
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.45,
              opacity: 0.88,
            }}
          >
            {SITE_DESCRIPTION}
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
