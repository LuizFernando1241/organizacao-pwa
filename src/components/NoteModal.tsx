import { useEffect, useState } from 'react'
import type { Note } from '../types/note'
import { NOTE_COLOR_OPTIONS, isNoteColorKey } from '../constants/noteColors'
import './NoteModal.css'

type NoteModalProps = {
  isOpen: boolean
  note: Note | null
  onSave: (data: { title: string; body: string; color?: string }) => void
  onClose: () => void
  onLink: (data: { title: string; body: string; color?: string }) => void
}

function NoteModal({ isOpen, note, onSave, onClose, onLink }: NoteModalProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [color, setColor] = useState<string | null>(null)

  useEffect(() => {
    if (!note) {
      setTitle('')
      setBody('')
      setColor(null)
      return
    }
    setTitle(note.title)
    setBody(note.body)
    setColor(isNoteColorKey(note.color) ? note.color : null)
  }, [note, isOpen])

  if (!isOpen) {
    return null
  }

  const payload = { title, body, color: color ?? undefined }

  return (
    <div className="note-modal__backdrop">
      <section className="note-modal" role="dialog" aria-modal="true" aria-label="Editar nota">
        <div className="note-modal__header">
          <button type="button" className="note-modal__close" onClick={onClose}>
            Fechar
          </button>
          <div className="note-modal__actions">
            <button type="button" className="note-modal__link" onClick={() => onLink(payload)}>
              Vincular
            </button>
            <button type="button" className="note-modal__save" onClick={() => onSave(payload)}>
              Salvar
            </button>
          </div>
        </div>
        <div className="note-modal__body">
          <div className="note-modal__colors">
            <span className="note-modal__colors-label">Cor</span>
            <div className="note-modal__colors-options">
              <button
                type="button"
                className={`note-modal__color${color === null ? ' note-modal__color--active' : ''}`}
                onClick={() => setColor(null)}
                aria-label="Cor automatica"
              >
                Auto
              </button>
              {NOTE_COLOR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`note-modal__color${color === option.id ? ' note-modal__color--active' : ''}`}
                  onClick={() => setColor(option.id)}
                  aria-label={`Cor ${option.label}`}
                >
                  <span className="note-modal__color-swatch" style={{ background: option.swatch }} />
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            className="note-modal__input"
            placeholder="Título"
            aria-label="Título"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <textarea
            className="note-modal__textarea"
            placeholder="Escreva sua nota..."
            aria-label="Conteudo da nota"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>
      </section>
    </div>
  )
}

export default NoteModal
