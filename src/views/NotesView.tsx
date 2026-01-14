import { useMemo, useState } from 'react'
import TopBar from '../components/TopBar'
import SearchBar from '../components/SearchBar'
import NotesGrid from '../components/NotesGrid'
import NoteModal from '../components/NoteModal'
import LinkNoteModal from '../components/LinkNoteModal'
import { useAppStore } from '../store/useAppStore'
import type { Note } from '../types/note'
import './NotesView.css'

function NotesView() {
  const { notes, tasks, createNote, updateNote, linkNoteToTask } = useAppStore()
  const [query, setQuery] = useState('')
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkNoteId, setLinkNoteId] = useState<string | null>(null)

  const filteredNotes = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) {
      return notes
    }
    return notes.filter((note) => {
      const titleMatch = note.title.toLowerCase().includes(term)
      const bodyMatch = note.body.toLowerCase().includes(term)
      return titleMatch || bodyMatch
    })
  }, [notes, query])

  const handleCreateNote = () => {
    setActiveNote(null)
    setIsNoteModalOpen(true)
  }

  const handleSelectNote = (note: Note) => {
    setActiveNote(note)
    setIsNoteModalOpen(true)
  }

  const handleSaveNote = (data: { title: string; body: string }) => {
    if (activeNote) {
      updateNote(activeNote.id, data)
      setIsNoteModalOpen(false)
      return
    }
    createNote(data)
    setIsNoteModalOpen(false)
  }

  const handleOpenLinkModal = (data: { title: string; body: string }) => {
    if (activeNote) {
      setLinkNoteId(activeNote.id)
      setIsLinkModalOpen(true)
      return
    }
    const newId = createNote(data)
    setLinkNoteId(newId)
    setIsLinkModalOpen(true)
    setIsNoteModalOpen(false)
  }

  const handleCloseLinkModal = () => {
    setIsLinkModalOpen(false)
  }

  return (
    <div className="notes-screen">
      <TopBar>
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar notas..." />
      </TopBar>
      <main className="app-content">
        <div className="notes-header">
          <h1 className="page-title">Notas</h1>
          <button type="button" className="notes-header__button" onClick={handleCreateNote}>
            Criar nota
          </button>
        </div>
        <NotesGrid notes={filteredNotes} onSelectNote={handleSelectNote} />
      </main>
      <NoteModal
        isOpen={isNoteModalOpen}
        note={activeNote}
        onSave={handleSaveNote}
        onClose={() => setIsNoteModalOpen(false)}
        onLink={handleOpenLinkModal}
      />
      <LinkNoteModal
        isOpen={isLinkModalOpen}
        noteId={linkNoteId}
        tasks={tasks}
        onClose={handleCloseLinkModal}
        onLink={linkNoteToTask}
      />
    </div>
  )
}

export default NotesView
