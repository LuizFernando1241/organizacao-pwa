import { useEffect, useState } from 'react'
import type { Note } from '../types/note'
import './NoteModal.css'

type NoteModalProps = {
  isOpen: boolean
  note: Note | null
  onSave: (data: { title: string; body: string }) => void
  onClose: () => void
  onLink: (data: { title: string; body: string }) => void
}

function NoteModal({ isOpen, note, onSave, onClose, onLink }: NoteModalProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  useEffect(() => {
    if (!note) {
      setTitle('')
      setBody('')
      return
    }
    setTitle(note.title)
    setBody(note.body)
  }, [note, isOpen])

  if (!isOpen) {
    return null
  }

  return (
    <div className="note-modal__backdrop">
      <section className="note-modal">
        <div className="note-modal__header">
          <div className="note-modal__title">Nota</div>
          <button type="button" className="note-modal__link" onClick={() => onLink({ title, body })}>
            Vincular
          </button>
        </div>
        <div className="note-modal__body">
          <input
            type="text"
            className="note-modal__input"
            placeholder="Titulo (opcional)"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <textarea
            className="note-modal__textarea"
            placeholder="Escreva sua nota..."
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>
        <div className="note-modal__actions">
          <button type="button" className="note-modal__button note-modal__button--ghost" onClick={onClose}>
            Fechar
          </button>
          <button type="button" className="note-modal__button" onClick={() => onSave({ title, body })}>
            Salvar
          </button>
        </div>
      </section>
    </div>
  )
}

export default NoteModal
