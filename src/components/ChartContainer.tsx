'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { ResponsiveContainer } from 'recharts'

type ChartContainerProps = {
  height: number
  children: ReactElement
  className?: string
}

/**
 * Stabiler Wrapper für Recharts: erst nach Mount rendern und min-w-0 setzen,
 * damit ResponsiveContainer keine -1 Abmessungen in Grid/Flex erhält.
 */
export default function ChartContainer({
  height,
  children,
  className = '',
}: ChartContainerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div
      className={`w-full min-w-0 ${className}`}
      style={{ height }}
    >
      {mounted ? (
        <ResponsiveContainer width="100%" height={height} minWidth={0}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  )
}
