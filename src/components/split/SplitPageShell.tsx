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
      className={`md:pb-8 ${fabPadding ? 'max-md:pb-24' : 'pb-8'}`}
    >
      <div
        className={`mx-auto px-4 py-6 sm:px-6 md:py-8 ${
          narrow ? 'max-w-2xl' : 'max-w-6xl'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
