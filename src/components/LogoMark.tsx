/** Bildzeichen der App – die Icons in `src/app` zeigen dasselbe Zeichen */
export default function LogoMark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-accent text-sm font-bold text-accent-foreground ${className}`}
      aria-hidden="true"
    >
      K
    </span>
  )
}
