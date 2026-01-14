import type { InboxItem as InboxItemType } from '../types/inbox'
import './InboxItem.css'

type InboxItemProps = {
  item: InboxItemType
  onConvertToTask: (id: string) => void
  onConvertToNote: (id: string) => void
}

function InboxItem({ item, onConvertToTask, onConvertToNote }: InboxItemProps) {
  return (
    <div className="inbox-item">
      <div className="inbox-item__text">{item.text}</div>
      <div className="inbox-item__actions">
        <button type="button" className="inbox-item__action" onClick={() => onConvertToTask(item.id)}>
          Virar tarefa
        </button>
        <button type="button" className="inbox-item__action" onClick={() => onConvertToNote(item.id)}>
          Virar nota
        </button>
      </div>
    </div>
  )
}

export default InboxItem
