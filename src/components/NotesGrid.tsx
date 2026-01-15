import type { Note } from '../types/note'
import StickyNoteCard from './StickyNoteCard'
import './NotesGrid.css'

type NotesGridProps = {
  notes: Note[]
  onSelectNote?: (note: Note) => void
  onEditNote?: (note: Note) => void
  onLinkNote?: (note: Note) => void
}

function NotesGrid({ notes, onSelectNote, onEditNote, onLinkNote }: NotesGridProps) {
  return (
    <section className="notes-grid" aria-label="Notas">
      {notes.length === 0 ? (
        <div className="notes-grid__empty">Suas notas aparecerão aqui.</div>
      ) : (
        notes.map((note) => (
          <StickyNoteCard
            key={note.id}
            note={note}
            onSelect={onSelectNote}
            onEdit={onEditNote}
            onLink={onLinkNote}
          />
        ))
      )}
    </section>
  )
}

export default NotesGrid
