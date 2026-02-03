import { useState } from 'react'
import type { InboxItem as InboxItemType } from '../types/inbox'
import InboxItem from './InboxItem'
import QuickCaptureInput from './QuickCaptureInput'
import './InboxSheet.css'

type InboxSheetProps = {
  isOpen: boolean
  items: InboxItemType[]
  onClose: () => void
  onCapture: (text: string) => void
  onConvertToTask: (id: string) => void
  onConvertToNote: (id: string) => void
  onDeleteItem: (id: string) => void
  onUpdateItem: (id: string, text: string) => void
}

function InboxSheet({
  isOpen,
  items,
  onClose,
  onCapture,
  onConvertToTask,
  onConvertToNote,
  onDeleteItem,
  onUpdateItem,
}: InboxSheetProps) {
  const [draftText, setDraftText] = useState('')

  const handleAdd = () => {
    const value = draftText.trim()
    if (!value) {
      return
    }
    onCapture(value)
    setDraftText('')
  }
  return (
    <>
      <div className={`sheet-backdrop${isOpen ? ' sheet-backdrop--open' : ''}`} onClick={onClose} />
      <section
        className={`inbox-sheet${isOpen ? ' inbox-sheet--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Inbox"
        aria-hidden={!isOpen}
      >
        <div className="inbox-sheet__capture">
          <QuickCaptureInput
            onSubmit={(value) => {
              onCapture(value)
              setDraftText('')
            }}
            placeholder="Digite algo... tarefa, nota, lembrete"
            value={draftText}
            onChange={setDraftText}
          />
          <button type="button" className="inbox-sheet__add" onClick={handleAdd} aria-label="Adicionar">
            +
          </button>
        </div>
        <div className="inbox-sheet__list">
          {items.length === 0 ? (
            <div className="inbox-sheet__empty" role="status">
              <div className="inbox-sheet__empty-title">Caixa de entrada limpa!</div>
              <div className="inbox-sheet__empty-text">Capture ideias rápidas para organizar depois.</div>
              <div className="inbox-sheet__empty-suggestions">
                {['Reunião com time amanhã', 'Ideia: app de hábitos', 'Ligar para cliente'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="inbox-sheet__suggestion"
                    onClick={() => setDraftText(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            items.map((item) => (
              <InboxItem
                key={item.id}
                item={item}
                onConvertToTask={onConvertToTask}
                onConvertToNote={onConvertToNote}
                onDelete={onDeleteItem}
                onUpdate={onUpdateItem}
              />
            ))
          )}
        </div>
      </section>
    </>
  )
}

export default InboxSheet
