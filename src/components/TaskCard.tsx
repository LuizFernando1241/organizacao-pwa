import { useEffect, useRef, useState } from 'react'
import type { Task } from '../types/task'
import LinkedNotesIndicator from './LinkedNotesIndicator'
import './TaskCard.css'

type TaskCardProps = {
  task: Task
  onSelect?: (task: Task) => void
  onToggleDone?: (id: string) => void
}

const stateClassMap: Record<Task['status'], string> = {
  planned: 'task-card--planned',
  active: 'task-card--active',
  overdue: 'task-card--overdue',
  done: 'task-card--done',
}

function TaskCard({ task, onSelect, onToggleDone }: TaskCardProps) {
  const prevStatusRef = useRef<Task['status'] | null>(null)
  const [isGlow, setIsGlow] = useState(false)
  const isDone = task.status === 'done'
  const timeLabel =
    task.timeStart && task.timeEnd
      ? `${task.timeStart} - ${task.timeEnd}`
      : task.timeStart
        ? task.timeStart
        : task.timeLabel

  useEffect(() => {
    const prevStatus = prevStatusRef.current
    if (task.status === 'active' && prevStatus && prevStatus !== 'active') {
      setIsGlow(true)
      const handle = window.setTimeout(() => setIsGlow(false), 600)
      prevStatusRef.current = task.status
      return () => window.clearTimeout(handle)
    }
    prevStatusRef.current = task.status
  }, [task.status])

  return (
    <div
      className={`task-card ${stateClassMap[task.status]}${isGlow ? ' task-card--glow' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(task)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect?.(task)
        }
      }}
    >
      <span className="task-card__state-bar" />
      <button
        type="button"
        className={`task-card__check${isDone ? ' task-card__check--done' : ''}`}
        aria-pressed={isDone}
        aria-label="Concluir tarefa"
        onClick={(event) => {
          event.stopPropagation()
          onToggleDone?.(task.id)
        }}
      />
      <div className="task-card__content">
        <div className="task-card__title">{task.title}</div>
        <div className="task-card__meta">{timeLabel}</div>
      </div>
      {task.linkedNoteIds.length > 0 && (
        <div className="task-card__indicator">
          <LinkedNotesIndicator />
        </div>
      )}
    </div>
  )
}

export default TaskCard
