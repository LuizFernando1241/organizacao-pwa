import { Link2, PencilLine, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import type { Note } from '../types/note'
import './StickyNoteCard.css'

type StickyNoteCardProps = {
  note: Note
  highlightTerm?: string
  isLinked?: boolean
  onSelect?: (note: Note) => void
  onLink?: (note: Note) => void
  onDelete?: (note: Note) => void
  onUpdateTitle?: (note: Note, title: string) => void
}

const toneKeys = ['amber', 'mint', 'sky', 'berry', 'slate']

const hashString = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const getToneKey = (noteId: string) => toneKeys[hashString(noteId) % toneKeys.length]

const getNoteSize = (note: Note) => {
  const length = note.title.trim().length + note.body.trim().length
  if (length < 90) {
    return 's'
  }
  if (length < 240) {
    return 'm'
  }
  return 'l'
}

const getFirstLine = (value: string) => {
  const line = value.split(/\r?\n/).find((item) => item.trim())
  return line?.trim() ?? ''
}

const buildBodyPreview = (value: string, skipFirstLine: boolean) => {
  if (!value.trim()) {
    return ''
  }
  if (!skipFirstLine) {
    return value.trim()
  }
  const lines = value.split(/\r?\n/)
  if (lines.length <= 1) {
    return ''
  }
  return lines.slice(1).join('\n').trim()
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

const formatRelativeTime = (value: string) => {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) {
    return 'agora'
  }
  const diffSeconds = Math.round((timestamp - Date.now()) / 1000)
  const absSeconds = Math.abs(diffSeconds)
  if (absSeconds < 60) {
    return relativeTimeFormatter.format(diffSeconds, 'second')
  }
  const diffMinutes = Math.round(diffSeconds / 60)
  if (Math.abs(diffMinutes) < 60) {
    return relativeTimeFormatter.format(diffMinutes, 'minute')
  }
  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return relativeTimeFormatter.format(diffHours, 'hour')
  }
  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 7) {
    return relativeTimeFormatter.format(diffDays, 'day')
  }
  const diffWeeks = Math.round(diffDays / 7)
  if (Math.abs(diffWeeks) < 5) {
    return relativeTimeFormatter.format(diffWeeks, 'week')
  }
  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) {
    return relativeTimeFormatter.format(diffMonths, 'month')
  }
  const diffYears = Math.round(diffDays / 365)
  return relativeTimeFormatter.format(diffYears, 'year')
}

const highlightText = (text: string, term: string) => {
  if (!term) {
    return text
  }
  const lowerText = text.toLowerCase()
  const lowerTerm = term.toLowerCase()
  if (!lowerText.includes(lowerTerm)) {
    return text
  }
  const parts: ReactNode[] = []
  let startIndex = 0
  let matchIndex = lowerText.indexOf(lowerTerm, startIndex)

  while (matchIndex !== -1) {
    if (matchIndex > startIndex) {
      parts.push(text.slice(startIndex, matchIndex))
    }
    parts.push(
      <mark key={`${matchIndex}-${startIndex}`} className="sticky-note__mark">
        {text.slice(matchIndex, matchIndex + lowerTerm.length)}
      </mark>,
    )
    startIndex = matchIndex + lowerTerm.length
    matchIndex = lowerText.indexOf(lowerTerm, startIndex)
  }
  if (startIndex < text.length) {
    parts.push(text.slice(startIndex))
  }
  return parts
}

function StickyNoteCard({ note, highlightTerm = '', isLinked, onSelect, onLink, onDelete, onUpdateTitle }: StickyNoteCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(note.title)
  const title = note.title.trim()
  const fallbackTitle = useMemo(() => getFirstLine(note.body), [note.body])
  const displayTitle = title || fallbackTitle
  const showTitlePlaceholder = !title && fallbackTitle
  const bodyPreview = useMemo(() => buildBodyPreview(note.body, !title && Boolean(fallbackTitle)), [note.body, title, fallbackTitle])
  const size = useMemo(() => getNoteSize(note), [note])
  const tone = useMemo(() => getToneKey(note.id), [note.id])
  const relativeUpdated = useMemo(() => formatRelativeTime(note.updatedAt), [note.updatedAt])

  const handleOpen = () => {
    if (isEditingTitle) {
      return
    }
    onSelect?.(note)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isEditingTitle) {
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect?.(note)
    }
  }

  const handleEditStart = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setDraftTitle(note.title)
    setIsEditingTitle(true)
  }

  const handleTitleSave = () => {
    if (!onUpdateTitle) {
      setIsEditingTitle(false)
      return
    }
    const trimmed = draftTitle.trim()
    if (trimmed !== note.title) {
      onUpdateTitle(note, trimmed)
    }
    setIsEditingTitle(false)
  }

  const handleTitleCancel = () => {
    setDraftTitle(note.title)
    setIsEditingTitle(false)
  }

  return (
    <div className="sticky-note" data-tone={tone} data-size={size}>
      <div
        className="sticky-note__content"
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        aria-label={displayTitle ? `Abrir nota: ${displayTitle}` : 'Abrir nota'}
      >
        {displayTitle && !isEditingTitle && (
          <div className={`sticky-note__title${showTitlePlaceholder ? ' sticky-note__title--ghost' : ''}`}>
            {highlightText(displayTitle, highlightTerm)}
          </div>
        )}
        {isEditingTitle && (
          <input
            type="text"
            className="sticky-note__title-input"
            value={draftTitle}
            placeholder={showTitlePlaceholder ? displayTitle : 'Titulo da nota'}
            onChange={(event) => setDraftTitle(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleTitleSave()
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                handleTitleCancel()
              }
            }}
            onBlur={handleTitleSave}
            autoFocus
          />
        )}
        {bodyPreview ? (
          <div className="sticky-note__body">{highlightText(bodyPreview, highlightTerm)}</div>
        ) : (
          <div className="sticky-note__body sticky-note__body--empty">Sem conteudo.</div>
        )}
      </div>
      <div className="sticky-note__meta">
        <span className="sticky-note__meta-time">Atualizada {relativeUpdated}</span>
        {isLinked && (
          <span className="sticky-note__tag">
            <Link2 size={12} aria-hidden="true" />
            Vinculada
          </span>
        )}
      </div>
      {(onLink || onDelete || onUpdateTitle) && (
        <div className="sticky-note__actions">
          {onUpdateTitle && (
            <button
              type="button"
              className="sticky-note__action"
              onClick={handleEditStart}
              aria-label="Editar titulo"
            >
              <PencilLine size={16} aria-hidden="true" />
            </button>
          )}
          {onLink && (
            <button type="button" className="sticky-note__action" onClick={() => onLink(note)} aria-label="Vincular">
              <Link2 size={16} aria-hidden="true" />
            </button>
          )}
          {onDelete && (
            <button type="button" className="sticky-note__action" onClick={() => onDelete(note)} aria-label="Excluir">
              <Trash2 size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default StickyNoteCard
