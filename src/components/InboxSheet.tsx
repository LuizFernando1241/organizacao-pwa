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
  onDeleteItem: (id: string) => void
  onUpdateItem: (id: string, text: string) => void
}

function InboxSheet({
  isOpen,
  items,
  onClose,
  onAddItem,
  onConvertToTask,
  onDeleteItem,
  onUpdateItem,
}: InboxSheetProps) {
  return (
    <>
      <div className={`sheet-backdrop${isOpen ? ' sheet-backdrop--open' : ''}`} onClick={onClose} />
      <section className={`inbox-sheet${isOpen ? ' inbox-sheet--open' : ''}`}>
        <QuickCaptureInput onSubmit={onAddItem} placeholder="Digite algo..." />
        <div className="inbox-sheet__list">
          {items.length === 0 ? (
            <div className="inbox-sheet__empty">Caixa de entrada limpa!</div>
          ) : (
            items.map((item) => (
              <InboxItem
                key={item.id}
                item={item}
                onConvertToTask={onConvertToTask}
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
