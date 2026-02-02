import { Check, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Task } from '../types/task'
import './LinkNoteModal.css'

type LinkNoteModalProps = {
  isOpen: boolean
  noteId: string | null
  tasks: Task[]
  onClose: () => void
  onLink: (noteId: string, taskId: string) => void
}

const getTodayKey = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseDayKey = (dayKey: string) => {
  const [year, month, day] = dayKey.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

const getStartOfWeek = (base: Date) => {
  const dayIndex = (base.getDay() + 6) % 7
  const start = new Date(base)
  start.setDate(base.getDate() - dayIndex)
  start.setHours(0, 0, 0, 0)
  return start
}

const getEndOfWeek = (base: Date) => {
  const start = getStartOfWeek(base)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

const isWithinWeek = (dayKey: string, start: Date, end: Date) => {
  const date = parseDayKey(dayKey)
  return date >= start && date <= end
}

function LinkNoteModal({ isOpen, noteId, tasks, onClose, onLink }: LinkNoteModalProps) {
  const [query, setQuery] = useState('')
  const todayKey = getTodayKey()
  const weekStart = useMemo(() => getStartOfWeek(new Date()), [])
  const weekEnd = useMemo(() => getEndOfWeek(new Date()), [])

  const filteredTasks = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) {
      return tasks
    }
    return tasks.filter((task) => task.title.toLowerCase().includes(term))
  }, [query, tasks])

  const todayTasks = filteredTasks.filter((task) => task.dayKey === todayKey)
  const weekTasks = filteredTasks.filter((task) => task.dayKey !== todayKey && isWithinWeek(task.dayKey, weekStart, weekEnd))

  if (!isOpen || !noteId) {
    return null
  }

  return (
    <div className="link-modal__backdrop">
      <section className="link-modal" role="dialog" aria-modal="true" aria-label="Vincular nota">
        <div className="link-modal__header">
          <div className="link-modal__title">Vincular a tarefa</div>
          <button type="button" className="link-modal__close" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="link-modal__search-wrap">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            className="link-modal__search"
            placeholder="Buscar tarefas..."
            aria-label="Buscar tarefas"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="link-modal__group">
          <div className="link-modal__group-title">Hoje</div>
          {todayTasks.length === 0 ? (
            <div className="link-modal__empty">Sem tarefas para hoje.</div>
          ) : (
            todayTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                className="link-modal__item"
                onClick={() => {
                  onLink(noteId, task.id)
                  onClose()
                }}
              >
                <span className="link-modal__item-title">{task.title}</span>
                <span className="link-modal__item-check" aria-hidden="true">
                  <Check size={16} />
                </span>
              </button>
            ))
          )}
        </div>
        <div className="link-modal__group">
          <div className="link-modal__group-title">Esta semana</div>
          {weekTasks.length === 0 ? (
            <div className="link-modal__empty">Sem tarefas para esta semana.</div>
          ) : (
            weekTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                className="link-modal__item"
                onClick={() => {
                  onLink(noteId, task.id)
                  onClose()
                }}
              >
                <span className="link-modal__item-title">{task.title}</span>
                <span className="link-modal__item-check" aria-hidden="true">
                  <Check size={16} />
                </span>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

export default LinkNoteModal
