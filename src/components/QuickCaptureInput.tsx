import type { KeyboardEvent } from 'react'
import './QuickCaptureInput.css'

type QuickCaptureInputProps = {
  onSubmit: (value: string) => void
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}

function QuickCaptureInput({ onSubmit, placeholder = 'Digite algo...', value, onChange }: QuickCaptureInputProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return
    }
    const value = event.currentTarget.value.trim()
    if (!value) {
      return
    }
    onSubmit(value)
    if (!onChange) {
      event.currentTarget.value = ''
    }
  }

  return (
    <input
      type="text"
      className="quick-capture"
      placeholder={placeholder}
      onKeyDown={handleKeyDown}
      value={value}
      onChange={(event) => onChange?.(event.currentTarget.value)}
    />
  )
}

export default QuickCaptureInput
