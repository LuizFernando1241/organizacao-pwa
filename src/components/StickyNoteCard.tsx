import type { Note } from '../types/note'
import './StickyNoteCard.css'

type StickyNoteCardProps = {
  note: Note
  onSelect?: (note: Note) => void
}

function StickyNoteCard({ note, onSelect }: StickyNoteCardProps) {
  return (
    <button type="button" className="sticky-note" onClick={() => onSelect?.(note)}>
      {note.title && <div className="sticky-note__title">{note.title}</div>}
      <div className="sticky-note__body">{note.body}</div>
    </button>
  )
}

export default StickyNoteCard
