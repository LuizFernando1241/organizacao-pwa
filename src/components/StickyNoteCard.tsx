import { Link2, Trash2 } from 'lucide-react'
import type { Note } from '../types/note'
import './StickyNoteCard.css'

type StickyNoteCardProps = {
  note: Note
  onSelect?: (note: Note) => void
  onLink?: (note: Note) => void
  onDelete?: (note: Note) => void
}

function StickyNoteCard({ note, onSelect, onLink, onDelete }: StickyNoteCardProps) {
  return (
    <div className="sticky-note">
      <button type="button" className="sticky-note__content" onClick={() => onSelect?.(note)}>
        {note.title && <div className="sticky-note__title">{note.title}</div>}
        <div className="sticky-note__body">{note.body}</div>
      </button>
      {(onLink || onDelete) && (
        <div className="sticky-note__actions">
          {onLink && (
            <button type="button" className="sticky-note__action" onClick={() => onLink(note)} aria-label="Vincular">
              <Link2 size={16} aria-hidden="true" />
            </button>
          )}
          {onDelete && (
            <button type="button" className="sticky-note__action" onClick={() => onDelete(note)} aria-label="Excluir">
              <Trash2 size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default StickyNoteCard
