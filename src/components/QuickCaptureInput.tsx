import type { KeyboardEvent } from 'react'
import './QuickCaptureInput.css'

type QuickCaptureInputProps = {
  onSubmit: (value: string) => void
  placeholder?: string
}

function QuickCaptureInput({ onSubmit, placeholder = 'Digite algo...' }: QuickCaptureInputProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return
    }
    const value = event.currentTarget.value.trim()
    if (!value) {
      return
    }
    onSubmit(value)
    event.currentTarget.value = ''
  }

  return (
    <input
      type="text"
      className="quick-capture"
      placeholder={placeholder}
      onKeyDown={handleKeyDown}
    />
  )
}

export default QuickCaptureInput
