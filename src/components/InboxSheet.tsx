import type { InboxItem as InboxItemType } from '../types/inbox'
import InboxItem from './InboxItem'
import QuickCaptureInput from './QuickCaptureInput'
import './InboxSheet.css'

type InboxSheetProps = {
  isOpen: boolean
  items: InboxItemType[]
  onClose: () => void
  onAddItem: (text: string) => void
  onConvertToTask: (id: string) => void
  onConvertToNote: (id: string) => void
}

function InboxSheet({ isOpen, items, onClose, onAddItem, onConvertToTask, onConvertToNote }: InboxSheetProps) {
  return (
    <>
      <div className={`sheet-backdrop${isOpen ? ' sheet-backdrop--open' : ''}`} onClick={onClose} />
      <section className={`inbox-sheet${isOpen ? ' inbox-sheet--open' : ''}`}>
        <div className="inbox-sheet__handle" />
        <QuickCaptureInput onSubmit={onAddItem} />
        <div className="inbox-sheet__list">
          {items.length === 0 ? (
            <div className="inbox-sheet__empty">Sem itens capturados.</div>
          ) : (
            items.map((item) => (
              <InboxItem
                key={item.id}
                item={item}
                onConvertToTask={onConvertToTask}
                onConvertToNote={onConvertToNote}
              />
            ))
          )}
        </div>
      </section>
    </>
  )
}

export default InboxSheet
