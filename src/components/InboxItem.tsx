import { useRef, useState, type PointerEvent } from 'react'
import type { InboxItem as InboxItemType } from '../types/inbox'
import './InboxItem.css'

type InboxItemProps = {
  item: InboxItemType
  onConvertToTask: (id: string) => void
  onConvertToNote: (id: string) => void
  onDelete: (id: string) => void
}

const SWIPE_THRESHOLD = 60

function InboxItem({ item, onConvertToTask, onConvertToNote, onDelete }: InboxItemProps) {
  const [offsetX, setOffsetX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef<number | null>(null)

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    startXRef.current = event.clientX
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (startXRef.current === null) {
      return
    }
    const deltaX = event.clientX - startXRef.current
    const clamped = Math.max(-120, Math.min(120, deltaX))
    setOffsetX(clamped)
  }

  const handlePointerUp = () => {
    if (startXRef.current === null) {
      return
    }
    if (offsetX > SWIPE_THRESHOLD) {
      onConvertToTask(item.id)
    } else if (offsetX < -SWIPE_THRESHOLD) {
      onDelete(item.id)
    }
    setOffsetX(0)
    setIsDragging(false)
    startXRef.current = null
  }

  return (
    <div className="inbox-item">
      <div className="inbox-item__swipe-bg inbox-item__swipe-bg--left">Virar tarefa</div>
      <div className="inbox-item__swipe-bg inbox-item__swipe-bg--right">Excluir</div>
      <div
        className="inbox-item__content"
        style={{ transform: `translateX(${offsetX}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        data-dragging={isDragging ? 'true' : 'false'}
      >
        <div className="inbox-item__text">{item.text}</div>
        <div className="inbox-item__actions">
          <button type="button" className="inbox-item__action" onClick={() => onConvertToTask(item.id)} aria-label="Virar tarefa">
            T
          </button>
          <button type="button" className="inbox-item__action" onClick={() => onConvertToNote(item.id)} aria-label="Virar nota">
            N
          </button>
          <button type="button" className="inbox-item__action" onClick={() => onDelete(item.id)} aria-label="Excluir">
            X
          </button>
        </div>
      </div>
    </div>
  )
}

export default InboxItem
