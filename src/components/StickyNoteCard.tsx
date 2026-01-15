import type { Note } from '../types/note'
import './StickyNoteCard.css'

type StickyNoteCardProps = {
  note: Note
  onSelect?: (note: Note) => void
  onLink?: (note: Note) => void
  onEdit?: (note: Note) => void
}

function StickyNoteCard({ note, onSelect, onLink, onEdit }: StickyNoteCardProps) {
  return (
    <div className="sticky-note">
      <button type="button" className="sticky-note__content" onClick={() => onSelect?.(note)}>
        {note.title && <div className="sticky-note__title">{note.title}</div>}
        <div className="sticky-note__body">{note.body}</div>
      </button>
      {(onLink || onEdit) && (
        <div className="sticky-note__actions">
          {onLink && (
            <button type="button" className="sticky-note__action" onClick={() => onLink(note)} aria-label="Vincular">
              V
            </button>
          )}
          {onEdit && (
            <button type="button" className="sticky-note__action" onClick={() => onEdit(note)} aria-label="Editar">
              E
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default StickyNoteCard
