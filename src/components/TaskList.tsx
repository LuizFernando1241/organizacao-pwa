import type { Task } from '../types/task'
import TaskCard from './TaskCard'
import './TaskList.css'

type TaskListProps = {
  tasks: Task[]
  onSelectTask?: (task: Task) => void
}

function TaskList({ tasks, onSelectTask }: TaskListProps) {
  return (
    <section className="task-list" aria-label="Tarefas do dia">
      {tasks.length === 0 ? (
        <div className="task-list__empty">Sem tarefas para este dia.</div>
      ) : (
        tasks.map((task) => <TaskCard key={task.id} task={task} onSelect={onSelectTask} />)
      )}
    </section>
  )
}

export default TaskList
