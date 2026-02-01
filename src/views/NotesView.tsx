import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import TopBar from '../components/TopBar'
import SearchBar from '../components/SearchBar'
import NotesGrid from '../components/NotesGrid'
import NoteModal from '../components/NoteModal'
import LinkNoteModal from '../components/LinkNoteModal'
import { useAppStore } from '../store/useAppStore'
import type { Note } from '../types/note'
import './NotesView.css'

const getDisplayTitle = (note: Note) => {
  const trimmedTitle = note.title.trim()
  if (trimmedTitle) {
    return trimmedTitle
  }
  const firstLine = note.body.split(/\r?\n/).find((line) => line.trim())
  return firstLine?.trim() ?? ''
}

function NotesView() {
  const { notes, tasks, links, createNote, updateNote, deleteNote, linkNoteToTask } = useAppStore()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [filter, setFilter] = useState<'all' | 'linked' | 'recent'>('all')
  const [sort, setSort] = useState<'recent' | 'alpha' | 'long' | 'linked'>('recent')
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [activeNote, setActiveNote] = useState<Note | null>(null)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkNoteId, setLinkNoteId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const linkedNoteIds = useMemo(() => new Set(links.map((link) => link.noteId)), [links])
  const recentCutoff = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    return cutoff
  }, [])
  const searchTerm = deferredQuery.trim().toLowerCase()

  const notesMatchingQuery = useMemo(() => {
    if (!searchTerm) {
      return notes
    }
    return notes.filter((note) => {
      const haystack = `${note.title}\n${note.body}`.toLowerCase()
      return haystack.includes(searchTerm)
    })
  }, [notes, searchTerm])

  const noteCounts = useMemo(() => {
    const linkedCount = notesMatchingQuery.filter((note) => linkedNoteIds.has(note.id)).length
    const recentCount = notesMatchingQuery.filter((note) => new Date(note.updatedAt) >= recentCutoff).length
    return {
      all: notesMatchingQuery.length,
      linked: linkedCount,
      recent: recentCount,
    }
  }, [notesMatchingQuery, linkedNoteIds, recentCutoff])

  const filteredNotes = useMemo(() => {
    let result = notesMatchingQuery
    if (filter === 'linked') {
      result = result.filter((note) => linkedNoteIds.has(note.id))
    }
    if (filter === 'recent') {
      result = result.filter((note) => new Date(note.updatedAt) >= recentCutoff)
    }
    return result
  }, [notesMatchingQuery, filter, linkedNoteIds, recentCutoff])

  const sortedNotes = useMemo(() => {
    const result = [...filteredNotes]
    result.sort((a, b) => {
      if (sort === 'alpha') {
        return getDisplayTitle(a).localeCompare(getDisplayTitle(b), 'pt-BR', { sensitivity: 'base' })
      }
      if (sort === 'long') {
        const aSize = a.title.length + a.body.length
        const bSize = b.title.length + b.body.length
        if (aSize !== bSize) {
          return bSize - aSize
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
      if (sort === 'linked') {
        const aLinked = linkedNoteIds.has(a.id) ? 1 : 0
        const bLinked = linkedNoteIds.has(b.id) ? 1 : 0
        if (aLinked !== bLinked) {
          return bLinked - aLinked
        }
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
    return result
  }, [filteredNotes, sort, linkedNoteIds])

  const handleCreateNote = useCallback(() => {
    setActiveNote(null)
    setIsNoteModalOpen(true)
  }, [])

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

  const handleUpdateTitle = (note: Note, title: string) => {
    if (note.title === title) {
      return
    }
    updateNote(note.id, { title })
  }

  const handleUpdateColor = (note: Note, color?: string) => {
    if (note.color === color) {
      return
    }
    updateNote(note.id, { color })
  }

  const handleSaveNote = (data: { title: string; body: string; color?: string }) => {
    if (activeNote) {
      updateNote(activeNote.id, data)
      setIsNoteModalOpen(false)
      return
    }
    createNote(data)
    setIsNoteModalOpen(false)
  }

  const handleOpenLinkModal = (data: { title: string; body: string; color?: string }) => {
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isLinkModalOpen) {
          setIsLinkModalOpen(false)
        } else if (isNoteModalOpen) {
          setIsNoteModalOpen(false)
        }
        return
      }
      const target = event.target as HTMLElement | null
      const isEditable =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target as HTMLElement).isContentEditable)
      if (isEditable) {
        return
      }
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        searchInputRef.current?.focus()
        return
      }
      if ((event.key === 'n' || event.key === 'N') && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        handleCreateNote()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleCreateNote, isLinkModalOpen, isNoteModalOpen])

  return (
    <div className="notes-screen">
      <TopBar>
        <SearchBar ref={searchInputRef} value={query} onChange={setQuery} placeholder="Buscar notas..." />
      </TopBar>
      <main className="app-content">
        <div className="notes-header">
          <h1 className="page-title">Notas</h1>
          <button type="button" className="notes-header__button" onClick={handleCreateNote}>
            Criar nota
          </button>
        </div>
        <div className="notes-toolbar">
          <div className="notes-filters" role="tablist" aria-label="Filtros de notas">
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              tabIndex={filter === 'all' ? 0 : -1}
              className={`notes-filter${filter === 'all' ? ' notes-filter--active' : ''}`}
              onClick={() => setFilter('all')}
              aria-controls="notes-grid"
            >
              Todas
              <span className="notes-filter__count">{noteCounts.all}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'linked'}
              tabIndex={filter === 'linked' ? 0 : -1}
              className={`notes-filter${filter === 'linked' ? ' notes-filter--active' : ''}`}
              onClick={() => setFilter('linked')}
              aria-controls="notes-grid"
            >
              Vinculadas
              <span className="notes-filter__count">{noteCounts.linked}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'recent'}
              tabIndex={filter === 'recent' ? 0 : -1}
              className={`notes-filter${filter === 'recent' ? ' notes-filter--active' : ''}`}
              onClick={() => setFilter('recent')}
              aria-controls="notes-grid"
            >
              Recentes
              <span className="notes-filter__count">{noteCounts.recent}</span>
            </button>
          </div>
          <label className="notes-sort">
            <span className="notes-sort__label">Ordenar</span>
            <select className="notes-sort__select" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
              <option value="recent">Mais recentes</option>
              <option value="alpha">A-Z</option>
              <option value="long">Mais longas</option>
              <option value="linked">Com link</option>
            </select>
          </label>
        </div>
        <NotesGrid
          notes={sortedNotes}
          highlightTerm={searchTerm}
          linkedNoteIds={linkedNoteIds}
          onCreateNote={handleCreateNote}
          onSelectNote={handleSelectNote}
          onLinkNote={handleLinkNote}
          onDeleteNote={handleDeleteNote}
          onUpdateTitle={handleUpdateTitle}
          onUpdateColor={handleUpdateColor}
          isVirtualized={sortedNotes.length > 300}
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
