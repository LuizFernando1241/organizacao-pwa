import type { Note } from '../types/note'
import StickyNoteCard from './StickyNoteCard'
import './NotesGrid.css'

type NotesGridProps = {
  notes: Note[]
  highlightTerm?: string
  linkedNoteIds?: Set<string>
  onCreateNote?: () => void
  onSelectNote?: (note: Note) => void
  onLinkNote?: (note: Note) => void
  onDeleteNote?: (note: Note) => void
  onUpdateTitle?: (note: Note, title: string) => void
  isVirtualized?: boolean
}

function NotesGrid({
  notes,
  highlightTerm,
  linkedNoteIds,
  onCreateNote,
  onSelectNote,
  onLinkNote,
  onDeleteNote,
  onUpdateTitle,
  isVirtualized,
}: NotesGridProps) {
  const gridClassName = `notes-grid${isVirtualized ? ' notes-grid--virtualized' : ''}`

  return (
    <section className={gridClassName} aria-label="Notas" id="notes-grid">
      {notes.length === 0 ? (
        <div className="notes-grid__empty" role="status">
          <div className="notes-grid__empty-title">Ainda sem notas.</div>
          <div className="notes-grid__empty-text">
            Ex.: "Ideia para projeto de semana" ou "Checklist da viagem".
          </div>
          {onCreateNote && (
            <button type="button" className="notes-grid__empty-button" onClick={onCreateNote}>
              Criar nota
            </button>
          )}
        </div>
      ) : (
        notes.map((note) => (
          <StickyNoteCard
            key={note.id}
            note={note}
            highlightTerm={highlightTerm}
            isLinked={linkedNoteIds?.has(note.id) ?? false}
            onSelect={onSelectNote}
            onLink={onLinkNote}
            onDelete={onDeleteNote}
            onUpdateTitle={onUpdateTitle}
          />
        ))
      )}
    </section>
  )
}

export default NotesGrid
