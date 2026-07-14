import { forwardRef, useImperativeHandle, useRef, type KeyboardEvent } from 'react'
import { formatAmountInput } from '@/validators/amount'

interface AmountInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
  className?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  autoFocus?: boolean
}

export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  function AmountInput(
    {
      id,
      value,
      onChange,
      onBlur,
      onKeyDown,
      className = '',
      'aria-label': ariaLabel,
      'aria-invalid': ariaInvalid,
      'aria-describedby': ariaDescribedBy,
      autoFocus,
    },
    ref,
  ) {
    const innerRef = useRef<HTMLInputElement>(null)
    useImperativeHandle(ref, () => innerRef.current!)

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(formatAmountInput(event.target.value))
    }

    return (
      <input
        id={id}
        ref={innerRef}
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={className}
        aria-label={ariaLabel ?? 'Importe'}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
      />
    )
  },
)
