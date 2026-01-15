import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { InboxItem as InboxItemType } from '../types/inbox'
import './InboxItem.css'

type InboxItemProps = {
  item: InboxItemType
  onConvertToTask: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, text: string) => void
}

function InboxItem({ item, onConvertToTask, onDelete, onUpdate }: InboxItemProps) {
  const [value, setValue] = useState(item.text)

  useEffect(() => {
    setValue(item.text)
  }, [item.text])

  const commitEdit = () => {
    const trimmed = value.trim()
    if (!trimmed || trimmed === item.text) {
      setValue(item.text)
      return
    }
    onUpdate(item.id, trimmed)
  }

  return (
    <div className="inbox-item">
      <input
        className="inbox-item__input"
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        onBlur={commitEdit}
        aria-label="Editar captura"
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur()
          }
        }}
      />
      <div className="inbox-item__actions">
        <button
          type="button"
          className="inbox-item__add"
          onClick={() => onConvertToTask(item.id)}
          aria-label="Criar tarefa"
        >
          +
        </button>
        <button
          type="button"
          className="inbox-item__delete"
          onClick={() => onDelete(item.id)}
          aria-label="Excluir captura"
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export default InboxItem
