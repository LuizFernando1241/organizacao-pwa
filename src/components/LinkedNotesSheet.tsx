import type { Note } from '../types/note'
import type { Task } from '../types/task'
import StickyNoteCard from './StickyNoteCard'
import './LinkedNotesSheet.css'

type LinkedNotesSheetProps = {
  isOpen: boolean
  task: Task | null
  notes: Note[]
  onClose: () => void
  onSelectNote?: (note: Note) => void
}

function LinkedNotesSheet({ isOpen, task, notes, onClose, onSelectNote }: LinkedNotesSheetProps) {
  if (!isOpen || !task) {
    return null
  }

  const linkedNotes = notes.filter((note) => task.linkedNoteIds.includes(note.id))

  return (
    <>
      <div className={`linked-notes-backdrop${isOpen ? ' linked-notes-backdrop--open' : ''}`} onClick={onClose} />
      <section className={`linked-notes-sheet${isOpen ? ' linked-notes-sheet--open' : ''}`}>
        <header className="linked-notes-sheet__header">
          <div className="linked-notes-sheet__title">Notas vinculadas</div>
          <button type="button" className="linked-notes-sheet__close" onClick={onClose}>
            Fechar
          </button>
        </header>
        <div className="linked-notes-sheet__grid">
          {linkedNotes.length === 0 ? (
            <div className="linked-notes-sheet__empty">Sem notas vinculadas.</div>
          ) : (
            linkedNotes.map((note) => <StickyNoteCard key={note.id} note={note} onSelect={onSelectNote} />)
          )}
        </div>
      </section>
    </>
  )
}

export default LinkedNotesSheet
