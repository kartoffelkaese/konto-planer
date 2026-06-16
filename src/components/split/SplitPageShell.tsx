import type { ReactNode } from 'react'

type SplitPageShellProps = {
  children: ReactNode
  narrow?: boolean
}

export default function SplitPageShell({ children, narrow = false }: SplitPageShellProps) {
  return (
    <div className="min-h-screen bg-canvas pb-24 md:pb-8">
      <div
        className={`mx-auto px-3 py-4 sm:px-6 sm:py-8 lg:px-8 ${
          narrow ? 'max-w-2xl' : 'max-w-7xl'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
