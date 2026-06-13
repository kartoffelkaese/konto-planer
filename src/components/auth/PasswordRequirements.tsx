'use client'

import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

type PasswordRequirementsProps = {
  password: string
}

const rules = [
  {
    id: 'length',
    label: 'Mindestens 8 Zeichen',
    test: (password: string) => password.length >= 8,
  },
  {
    id: 'letter',
    label: 'Mindestens ein Buchstabe',
    test: (password: string) => /[a-zA-Z]/.test(password),
  },
  {
    id: 'digit',
    label: 'Mindestens eine Ziffer',
    test: (password: string) => /[0-9]/.test(password),
  },
] as const

export default function PasswordRequirements({ password }: PasswordRequirementsProps) {
  if (!password) return null

  return (
    <ul className="mt-2 space-y-1" aria-label="Passwortanforderungen">
      {rules.map(({ id, label, test }) => {
        const met = test(password)
        return (
          <li key={id} className="flex items-center gap-2 text-xs">
            {met ? (
              <CheckCircleIcon className="h-4 w-4 shrink-0 text-income" aria-hidden="true" />
            ) : (
              <XCircleIcon className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
            )}
            <span className={met ? 'text-income' : 'text-secondary'}>{label}</span>
          </li>
        )
      })}
    </ul>
  )
}
