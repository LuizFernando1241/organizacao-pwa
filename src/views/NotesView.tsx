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
  const { notes, tasks, links, createNote, updateNote, deleteNote, linkNoteToTask } = useAppStore()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'linked' | 'recent'>('all')
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkNoteId, setLinkNoteId] = useState<string | null>(null)

  const linkedNoteIds = useMemo(() => new Set(links.map((link) => link.noteId)), [links])
  const recentCutoff = useMemo(() => {
    const now = Date.now()
    return new Date(now - 7 * 24 * 60 * 60 * 1000)
  }, [])

  const filteredNotes = useMemo(() => {
    const term = query.trim().toLowerCase()
    let result = notes
    if (filter === 'linked') {
      result = result.filter((note) => linkedNoteIds.has(note.id))
    }
    if (filter === 'recent') {
      result = result.filter((note) => new Date(note.updatedAt) >= recentCutoff)
    }
    if (!term) {
      return result
    }
    return result.filter((note) => {
      const titleMatch = note.title.toLowerCase().includes(term)
      const bodyMatch = note.body.toLowerCase().includes(term)
      return titleMatch || bodyMatch
    })
  }, [notes, query, filter, linkedNoteIds, recentCutoff])

  const handleCreateNote = () => {
    setActiveNote(null)
    setIsNoteModalOpen(true)
  }

  const handleSelectNote = (note: Note) => {
    setActiveNote(note)
    setIsNoteModalOpen(true)
  }

  const handleLinkNote = (note: Note) => {
    setLinkNoteId(note.id)
    setIsLinkModalOpen(true)
  }

  const handleDeleteNote = (note: Note) => {
    if (window.confirm('Excluir esta nota?')) {
      deleteNote(note.id)
    }
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
      setIsNoteModalOpen(false)
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
        <div className="notes-filters" role="tablist" aria-label="Filtros de notas">
          <button
            type="button"
            className={`notes-filter${filter === 'all' ? ' notes-filter--active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todas
          </button>
          <button
            type="button"
            className={`notes-filter${filter === 'linked' ? ' notes-filter--active' : ''}`}
            onClick={() => setFilter('linked')}
          >
            Vinculadas
          </button>
          <button
            type="button"
            className={`notes-filter${filter === 'recent' ? ' notes-filter--active' : ''}`}
            onClick={() => setFilter('recent')}
          >
            Recentes
          </button>
        </div>
        <NotesGrid
          notes={filteredNotes}
          onSelectNote={handleSelectNote}
          onLinkNote={handleLinkNote}
          onDeleteNote={handleDeleteNote}
        />
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
