import { Paperclip } from 'lucide-react'
import './LinkedNotesIndicator.css'

function LinkedNotesIndicator() {
  return (
    <span className="linked-notes-indicator" aria-hidden="true">
      <Paperclip size={14} />
    </span>
  )
}

export default LinkedNotesIndicator
