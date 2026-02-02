import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Task } from '../types/task'
import LinkedNotesIndicator from './LinkedNotesIndicator'
import './TaskCard.css'

type TaskCardProps = {
  task: Task
  onSelect?: (task: Task) => void
  onToggleDone?: (id: string) => void
  onStartTimer?: (id: string) => void
  onStopTimer?: (id: string) => void
}

const stateClassMap: Record<Task['status'], string> = {
  planned: 'task-card--planned',
  active: 'task-card--active',
  overdue: 'task-card--overdue',
  done: 'task-card--done',
}

function TaskCard({ task, onSelect, onToggleDone, onStartTimer, onStopTimer }: TaskCardProps) {
  const prevStatusRef = useRef<Task['status'] | null>(null)
  const [isGlow, setIsGlow] = useState(false)
  const [tick, setTick] = useState(Date.now())
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

  useEffect(() => {
    if (!task.isTimerRunning) {
      return
    }
    const handle = window.setInterval(() => setTick(Date.now()), 1000)
    return () => window.clearInterval(handle)
  }, [task.isTimerRunning])

  const now = task.isTimerRunning ? tick : Date.now()
  const runningDelta =
    task.isTimerRunning && typeof task.lastTimerStart === 'number'
      ? Math.max(0, now - task.lastTimerStart)
      : 0
  const timeSpentMs = (task.timeSpent ?? 0) + runningDelta
  const hasTime = timeSpentMs > 0
  const totalSeconds = Math.floor(timeSpentMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const timeSpentLabel = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return (
    <div
      className={`task-card ${stateClassMap[task.status]}${isGlow ? ' task-card--glow' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={task.title ? `Abrir tarefa ${task.title}` : 'Abrir tarefa'}
      onClick={() => onSelect?.(task)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect?.(task)
        }
      }}
    >
      <span className="task-card__state-bar" aria-hidden="true" />
      <button
        type="button"
        className={`task-card__check${isDone ? ' task-card__check--done' : ''}`}
        aria-pressed={isDone}
        aria-label={isDone ? 'Reabrir tarefa' : 'Concluir tarefa'}
        onClick={(event) => {
          event.stopPropagation()
          onToggleDone?.(task.id)
        }}
      />
      <div className="task-card__content">
        <div className="task-card__title">{task.title}</div>
        <div className="task-card__meta">{timeLabel}</div>
        {hasTime && (
          <div className={`task-card__timer${task.isTimerRunning ? ' task-card__timer--running' : ''}`}>
            {timeSpentLabel}
          </div>
        )}
      </div>
      <button
        type="button"
        className={`task-card__timer-btn${task.isTimerRunning ? ' task-card__timer-btn--active' : ''}`}
        aria-label={task.isTimerRunning ? 'Pausar cronometro' : 'Iniciar cronometro'}
        onClick={(event) => {
          event.stopPropagation()
          if (isDone) {
            return
          }
          if (task.isTimerRunning) {
            onStopTimer?.(task.id)
          } else {
            onStartTimer?.(task.id)
          }
        }}
        disabled={isDone}
      >
        {task.isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
      </button>
      {task.linkedNoteIds.length > 0 && (
        <div className="task-card__indicator">
          <LinkedNotesIndicator />
        </div>
      )}
    </div>
  )
}

export default TaskCard
