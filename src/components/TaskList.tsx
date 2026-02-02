import { useMemo } from 'react'
import type { Task } from '../types/task'
import TaskCard from './TaskCard'
import './TaskList.css'

type TaskListProps = {
  tasks: Task[]
  onSelectTask?: (task: Task) => void
  onAddTask?: () => void
  onToggleDone?: (id: string) => void
  onStartTimer?: (id: string) => void
  onStopTimer?: (id: string) => void
}

function TaskList({ tasks, onSelectTask, onAddTask, onToggleDone, onStartTimer, onStopTimer }: TaskListProps) {
  const orderedTasks = useMemo(() => {
    const parseTime = (value: string) => {
      if (!value) {
        return Number.POSITIVE_INFINITY
      }
      const [hours, minutes] = value.split(':').map((part) => Number(part))
      if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return Number.POSITIVE_INFINITY
      }
      return hours * 60 + minutes
    }
    return [...tasks].sort((a, b) => {
      const aStart = parseTime(a.timeStart)
      const bStart = parseTime(b.timeStart)
      if (aStart !== bStart) {
        return aStart - bStart
      }
      const aEnd = parseTime(a.timeEnd)
      const bEnd = parseTime(b.timeEnd)
      return aEnd - bEnd
    })
  }, [tasks])

  return (
    <section className="task-list" aria-label="Tarefas do dia">
      {orderedTasks.length === 0 ? (
        <div className="task-list__empty" role="status">
          Nenhuma tarefa para hoje. Crie algo que mova o dia.
        </div>
      ) : (
        orderedTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onSelect={onSelectTask}
            onToggleDone={onToggleDone}
            onStartTimer={onStartTimer}
            onStopTimer={onStopTimer}
          />
        ))
      )}
      {onAddTask && (
        <button
          type="button"
          className={`task-list__add${orderedTasks.length === 0 ? ' task-list__add--cta' : ''}`}
          onClick={onAddTask}
        >
          + Nova tarefa
        </button>
      )}
    </section>
  )
}

export default TaskList
