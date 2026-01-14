import { useMemo, useState } from 'react'
import type { Task } from '../types/task'
import TaskCard from './TaskCard'
import './TaskList.css'

type TaskListProps = {
  tasks: Task[]
  onSelectTask?: (task: Task) => void
}

function TaskList({ tasks, onSelectTask }: TaskListProps) {
  const [showDone, setShowDone] = useState(false)
  const { openTasks, doneTasks } = useMemo(() => {
    const open = tasks.filter((task) => task.status !== 'done')
    const done = tasks.filter((task) => task.status === 'done')
    return { openTasks: open, doneTasks: done }
  }, [tasks])

  return (
    <section className="task-list" aria-label="Tarefas do dia">
      {openTasks.length === 0 ? (
        <div className="task-list__empty">Nenhuma tarefa para hoje. Aproveite o dia!</div>
      ) : (
        openTasks.map((task) => <TaskCard key={task.id} task={task} onSelect={onSelectTask} />)
      )}
      {doneTasks.length > 0 && (
        <div className="task-list__done">
          <button type="button" className="task-list__done-toggle" onClick={() => setShowDone(!showDone)}>
            {showDone ? 'Ocultar concluidas' : `Concluidas (${doneTasks.length})`}
          </button>
          {showDone && (
            <div className="task-list__done-items">
              {doneTasks.map((task) => (
                <TaskCard key={task.id} task={task} onSelect={onSelectTask} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default TaskList
