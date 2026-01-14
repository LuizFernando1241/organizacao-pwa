import type { Task } from '../types/task'
import LinkedNotesIndicator from './LinkedNotesIndicator'
import './TaskCard.css'

type TaskCardProps = {
  task: Task
  onSelect?: (task: Task) => void
}

const stateClassMap: Record<Task['status'], string> = {
  planned: 'task-card--planned',
  active: 'task-card--active',
  overdue: 'task-card--overdue',
  done: 'task-card--done',
}

function TaskCard({ task, onSelect }: TaskCardProps) {
  return (
    <button type="button" className={`task-card ${stateClassMap[task.status]}`} onClick={() => onSelect?.(task)}>
      <span className="task-card__state-bar" />
      <div className="task-card__content">
        <div className="task-card__title">{task.title}</div>
        <div className="task-card__meta">{task.timeLabel}</div>
      </div>
      {task.linkedNoteIds.length > 0 && (
        <div className="task-card__indicator">
          <LinkedNotesIndicator />
        </div>
      )}
    </button>
  )
}

export default TaskCard
