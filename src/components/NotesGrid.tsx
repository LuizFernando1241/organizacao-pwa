import type { Note } from '../types/note'
import StickyNoteCard from './StickyNoteCard'
import './NotesGrid.css'

type NotesGridProps = {
  notes: Note[]
  onSelectNote?: (note: Note) => void
}

function NotesGrid({ notes, onSelectNote }: NotesGridProps) {
  return (
    <section className="notes-grid" aria-label="Notas">
      {notes.length === 0 ? (
        <div className="notes-grid__empty">Sem notas ainda.</div>
      ) : (
        notes.map((note) => <StickyNoteCard key={note.id} note={note} onSelect={onSelectNote} />)
      )}
    </section>
  )
}

export default NotesGrid
