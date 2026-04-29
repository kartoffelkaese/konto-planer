import { useState, useCallback } from 'react'
import Toast from '@/components/Toast'

export type ToastType = 'success' | 'error' | 'warning'

interface ToastState {
  message: string
  type: ToastType
  isVisible: boolean
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'success',
    isVisible: false
  })

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type, isVisible: true })
  }, [])

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, isVisible: false }))
  }, [])

  const ToastComponent = () => (
    <Toast
      message={toast.message}
      type={toast.type}
      onClose={hideToast}
      isVisible={toast.isVisible}
    />
  )

  return {
    showToast,
    hideToast,
    toast
  }
} 