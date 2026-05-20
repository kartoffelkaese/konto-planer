'use client'

import { useCallback, useState } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import { Button, type ButtonVariant } from './Button'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  confirmText?: string
  confirmLoadingText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Bestätigen',
  confirmLoadingText,
  cancelText = 'Abbrechen',
  type = 'warning',
  loading: externalLoading,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false)
  const managesLoading = externalLoading === undefined
  const isBusy = Boolean(externalLoading) || internalLoading

  const handleConfirm = useCallback(async () => {
    if (isBusy) return
    if (managesLoading) setInternalLoading(true)
    try {
      await onConfirm()
      onClose()
    } catch {
      // Fehlerbehandlung erfolgt in onConfirm
    } finally {
      if (managesLoading) setInternalLoading(false)
    }
  }, [isBusy, managesLoading, onConfirm, onClose])

  useKeyboardNavigation({
    onEscape: () => {
      if (!isBusy) onClose()
    },
    onEnter: () => {
      if (isOpen && !isBusy) void handleConfirm()
    },
    disabled: !isOpen || isBusy,
  })

  if (!isOpen) return null

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: 'text-danger',
          confirmVariant: 'danger' as ButtonVariant,
          bg: 'bg-danger-subtle',
        }
      case 'warning':
        return {
          icon: 'text-pending',
          confirmVariant: 'warning' as ButtonVariant,
          bg: 'bg-pending-bg',
        }
      case 'info':
        return {
          icon: 'text-accent',
          confirmVariant: 'primary' as ButtonVariant,
          bg: 'bg-accent-subtle',
        }
    }
  }

  const styles = getTypeStyles()

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 z-10 flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:items-center sm:p-0 pointer-events-none"
      >
        <div
          className="fixed inset-0 z-0 bg-primary/50 transition-opacity pointer-events-auto"
          aria-hidden="true"
          onClick={() => {
            if (!isBusy) onClose()
          }}
        />

        <div className="relative z-10 inline-block w-full max-w-lg transform overflow-hidden rounded-card px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:p-6 sm:align-middle bg-surface border border-border pointer-events-auto">
          <div className="sm:flex sm:items-start">
            <div
              className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${styles.bg} sm:mx-0 sm:h-10 sm:w-10`}
            >
              <ExclamationTriangleIcon className={`h-6 w-6 ${styles.icon}`} aria-hidden="true" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-grow">
              <h3 className="text-lg font-medium leading-6 text-primary" id="modal-title">
                {title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-secondary">{message}</p>
              </div>
              <div className="mt-2 text-xs text-secondary opacity-70">
                <span className="mr-4">Enter = {confirmText}</span>
                <span>Esc = {cancelText}</span>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
            <Button
              variant={styles.confirmVariant}
              size="md"
              className="w-full sm:w-auto"
              onClick={() => void handleConfirm()}
              loading={isBusy}
              loadingText={confirmLoadingText ?? `${confirmText}…`}
              autoFocus
            >
              {confirmText}
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="w-full sm:w-auto mt-3 sm:mt-0"
              onClick={onClose}
              disabled={isBusy}
            >
              {cancelText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
