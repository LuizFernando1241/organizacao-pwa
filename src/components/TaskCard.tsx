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
  const isDone = task.status === 'done'
  return (
    <div
      className={`task-card ${stateClassMap[task.status]}`}
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
      >
      </button>
      <div className="task-card__content">
        <div className="task-card__title">{task.title}</div>
        <div className="task-card__meta">{task.timeLabel}</div>
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
