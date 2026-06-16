'use client'

import { Fragment, useEffect, useRef } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl'
  /** Wenn true, schließt Klick außerhalb / Escape das Modal nicht */
  preventClose?: boolean
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
}

function focusFirstField(container: HTMLElement) {
  const fields = container.querySelectorAll<HTMLElement>(
    'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
  )

  for (const field of fields) {
    if (field.classList.contains('sr-only')) continue
    const style = window.getComputedStyle(field)
    if (style.display === 'none' || style.visibility === 'hidden') continue
    field.focus()
    return
  }
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'lg',
  preventClose = false,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  const handleClose = () => {
    if (!preventClose) onClose()
  }

  useEffect(() => {
    if (!isOpen) return

    const timer = window.setTimeout(() => {
      if (contentRef.current) {
        focusFirstField(contentRef.current)
      }
    }, 50)

    return () => window.clearTimeout(timer)
  }, [isOpen, children])

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-primary/50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-0 text-center sm:items-center sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel
                className={`relative flex max-h-[92dvh] w-full transform flex-col overflow-hidden rounded-t-card border border-border bg-surface text-left shadow-xl transition-all sm:max-h-[min(90dvh,calc(100dvh-4rem))] sm:rounded-card sm:my-8 ${maxWidthClasses[maxWidth]} sm:p-6`}
              >
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4 sm:border-0 sm:px-0 sm:pt-0 sm:pb-0">
                  <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-primary pr-8 sm:pr-0">
                    {title}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="absolute right-3 top-3 rounded-control p-1 text-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-40 sm:right-0 sm:top-0 sm:p-0"
                    onClick={handleClose}
                    disabled={preventClose}
                  >
                    <span className="sr-only">Schließen</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div
                  ref={contentRef}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-4 text-secondary sm:px-0 sm:pb-0 sm:pt-0"
                >
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
