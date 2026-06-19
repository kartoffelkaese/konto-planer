import type { ReactNode } from 'react'

type SplitPageShellProps = {
  children: ReactNode
  narrow?: boolean
  /** Extra Bottom-Padding auf Mobile für FAB (Split-Detail) */
  fabPadding?: boolean
}

export default function SplitPageShell({
  children,
  narrow = false,
  fabPadding = false,
}: SplitPageShellProps) {
  return (
    <div
      className={`min-h-screen bg-canvas md:pb-8 ${fabPadding ? 'pb-24 max-md:pb-[calc(6rem+env(safe-area-inset-bottom,0px))]' : 'pb-8'}`}
    >
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
