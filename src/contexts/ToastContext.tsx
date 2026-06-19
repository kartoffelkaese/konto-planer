'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import Toast, { type ToastType } from '@/components/Toast'

const MAX_VISIBLE_TOASTS = 3
const SUCCESS_DURATION_MS = 3000
const ERROR_DURATION_MS = 5500
const WARNING_DURATION_MS = 4000

interface QueuedToast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
  hideToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function toastDuration(type: ToastType): number {
  if (type === 'error') return ERROR_DURATION_MS
  if (type === 'warning') return WARNING_DURATION_MS
  return SUCCESS_DURATION_MS
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueuedToast[]>([])

  const hideToast = useCallback((id: string) => {
    setQueue((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`
    setQueue((prev) => [...prev, { id, message, type }].slice(-MAX_VISIBLE_TOASTS))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <div
        className="fixed z-50 flex flex-col-reverse gap-3 pointer-events-none max-md:left-4 max-md:right-auto max-md:items-start max-md:bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] md:bottom-4 md:right-4 md:items-end"
        aria-live="polite"
        aria-relevant="additions"
      >
        {queue.map((toast, index) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              message={toast.message}
              type={toast.type}
              duration={toastDuration(toast.type)}
              stackIndex={index}
              onClose={() => hideToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast muss innerhalb von ToastProvider verwendet werden')
  }
  return context
}
