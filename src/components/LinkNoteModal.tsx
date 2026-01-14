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

const getTodayKey = () => new Date().toISOString().slice(0, 10)

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
  const date = new Date(dayKey)
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
      <section className="link-modal">
        <div className="link-modal__header">
          <div className="link-modal__title">Vincular a tarefa</div>
          <button type="button" className="link-modal__close" onClick={onClose}>
            Fechar
          </button>
        </div>
        <input
          type="search"
          className="link-modal__search"
          placeholder="Buscar tarefas..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
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
                {task.title}
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
                {task.title}
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

export default LinkNoteModal
