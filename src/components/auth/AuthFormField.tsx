import type { InputHTMLAttributes, ReactNode } from 'react'
import { authHintClassName, authInputClassName, authLabelClassName } from './authStyles'

type AuthFormFieldProps = {
  id: string
  label: string
  hint?: ReactNode
  hintClassName?: string
  inputClassName?: string
} & InputHTMLAttributes<HTMLInputElement>

export default function AuthFormField({
  id,
  label,
  hint,
  hintClassName,
  inputClassName,
  className,
  ...inputProps
}: AuthFormFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className={authLabelClassName}>
        {label}
      </label>
      <input
        id={id}
        className={inputClassName ?? authInputClassName}
        {...inputProps}
      />
      {hint ? (
        <p className={hintClassName ?? authHintClassName}>{hint}</p>
      ) : null}
    </div>
  )
}
