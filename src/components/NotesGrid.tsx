import type { Note } from '../types/note'
import StickyNoteCard from './StickyNoteCard'
import './NotesGrid.css'

type NotesGridProps = {
  notes: Note[]
  onSelectNote?: (note: Note) => void
  onLinkNote?: (note: Note) => void
  onDeleteNote?: (note: Note) => void
}

function NotesGrid({ notes, onSelectNote, onLinkNote, onDeleteNote }: NotesGridProps) {
  return (
    <section className="notes-grid" aria-label="Notas">
      {notes.length === 0 ? (
        <div className="notes-grid__empty">Suas notas aparecerao aqui.</div>
      ) : (
        notes.map((note) => (
          <StickyNoteCard
            key={note.id}
            note={note}
            onSelect={onSelectNote}
            onLink={onLinkNote}
            onDelete={onDeleteNote}
          />
        ))
      )}
    </section>
  )
}

export default NotesGrid
