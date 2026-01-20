import { useEffect, useRef, useState } from 'react'
import type { Note } from '../types/note'
import type { Recurrence, Subtask, Task } from '../types/task'
import './TaskSheet.css'

type TaskSheetProps = {
  isOpen: boolean
  task: Task | null
  notes: Note[]
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Task>) => void
  onToggleDone: (id: string) => void
  onDelete: (id: string) => void
  onOpenLinkedNotes: () => void
  onSelectNote?: (note: Note) => void
}

const buildSubtaskId = () => `subtask-${Date.now()}-${Math.random().toString(16).slice(2)}`

function TaskSheet({
  isOpen,
  task,
  notes,
  onClose,
  onUpdate,
  onToggleDone,
  onDelete,
  onOpenLinkedNotes,
  onSelectNote,
}: TaskSheetProps) {
  const [title, setTitle] = useState('')
  const [dayKey, setDayKey] = useState('')
  const [timeStart, setTimeStart] = useState('')
  const [timeEnd, setTimeEnd] = useState('')
  const [recurrence, setRecurrence] = useState<Recurrence>('none')
  const [subtasksOpen, setSubtasksOpen] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [focusSubtaskId, setFocusSubtaskId] = useState<string | null>(null)
  const prevTaskIdRef = useRef<string | null>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    const wasOpen = wasOpenRef.current
    wasOpenRef.current = isOpen
    if (!task) {
      return
    }
    const isOpening = isOpen && !wasOpen
    const isNewTask = prevTaskIdRef.current !== task.id
    if (!isOpening && !isNewTask) {
      return
    }
    setTitle(task.title)
    setDayKey(task.dayKey)
    setTimeStart(task.timeStart)
    setTimeEnd(task.timeEnd)
    setRecurrence(task.recurrence)
    setIsConfirmingDelete(false)
    if (isNewTask) {
      setSubtasksOpen(false)
      setFocusSubtaskId(null)
      prevTaskIdRef.current = task.id
    }
  }, [task, isOpen])

  useEffect(() => {
    if (!task || title === task.title) {
      return
    }
    const handle = window.setTimeout(() => onUpdate(task.id, { title }), 300)
    return () => window.clearTimeout(handle)
  }, [task, title, onUpdate])

  useEffect(() => {
    if (!task) {
      return
    }
    const updates: Partial<Task> = {}
    if (dayKey !== task.dayKey) {
      updates.dayKey = dayKey
    }
    if (timeStart !== task.timeStart) {
      updates.timeStart = timeStart
    }
    if (timeEnd !== task.timeEnd) {
      updates.timeEnd = timeEnd
    }
    if (Object.keys(updates).length === 0) {
      return
    }
    const handle = window.setTimeout(() => onUpdate(task.id, updates), 300)
    return () => window.clearTimeout(handle)
  }, [task, dayKey, timeStart, timeEnd, onUpdate])

  const handleRecurrenceChange = (value: Recurrence) => {
    setRecurrence(value)
    if (task) {
      onUpdate(task.id, { recurrence: value })
    }
  }

  const handleReschedule = () => {
    if (!task) {
      return
    }
    onUpdate(task.id, { dayKey, timeStart, timeEnd })
  }

  const handleToggleSubtask = (subtask: Subtask) => {
    if (!task) {
      return
    }
    const updatedSubtasks = task.subtasks.map((item) =>
      item.id === subtask.id
        ? ({ ...item, status: item.status === 'DONE' ? 'PENDING' : 'DONE' } as Subtask)
        : item,
    )
    onUpdate(task.id, { subtasks: updatedSubtasks })
  }

  const handleUpdateSubtaskTitle = (subtask: Subtask, title: string) => {
    if (!task) {
      return
    }
    const updatedSubtasks = task.subtasks.map((item) =>
      item.id === subtask.id ? ({ ...item, title } as Subtask) : item,
    )
    onUpdate(task.id, { subtasks: updatedSubtasks })
  }

  const handleAddSubtask = () => {
    if (!task) {
      return
    }
    const newSubtask: Subtask = {
      id: buildSubtaskId(),
      title: '',
      status: 'PENDING',
    }
    onUpdate(task.id, { subtasks: [...task.subtasks, newSubtask] })
    setSubtasksOpen(true)
    setFocusSubtaskId(newSubtask.id)
  }

  const handleToggleDone = () => {
    if (!task) {
      return
    }
    onToggleDone(task.id)
    onClose()
  }

  const handleConfirmDelete = () => {
    if (!task) {
      return
    }
    onDelete(task.id)
    onClose()
  }

  const isDone = task?.status === 'done'
  const linkedNotes = task ? notes.filter((note) => task.linkedNoteIds.includes(note.id)) : []

  return (
    <>
      <div className={`task-sheet-backdrop${isOpen ? ' task-sheet-backdrop--open' : ''}`} onClick={onClose} />
      <section className={`task-sheet${isOpen ? ' task-sheet--open' : ''}`} aria-hidden={!isOpen}>
        <header className="task-sheet__header">
          <input
            type="text"
            className="task-sheet__title-input"
            placeholder="Titulo da tarefa"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="task-sheet__header-actions">
            <button type="button" className="task-sheet__text-button" onClick={onClose}>
              Fechar
            </button>
            <button type="button" className="task-sheet__primary-button" onClick={handleToggleDone}>
              {isDone ? 'Reabrir' : 'Concluir'}
            </button>
          </div>
        </header>
        <div className="task-sheet__body">
          <div className="time-section">
            <div className="time-section__row">
              <label className="field field--inline">
                <span className="field__label">Dia</span>
                <input
                  type="date"
                  className="field__input"
                  value={dayKey}
                  onChange={(event) => setDayKey(event.target.value)}
                />
              </label>
              <button type="button" className="time-section__action" onClick={handleReschedule}>
                Reprogramar
              </button>
            </div>
            <div className="time-range">
              <label className="field">
                <span className="field__label">Hora inicio</span>
                <input
                  type="time"
                  className="field__input"
                  value={timeStart}
                  onChange={(event) => setTimeStart(event.target.value)}
                />
              </label>
              <label className="field">
                <span className="field__label">Hora fim</span>
                <input
                  type="time"
                  className="field__input"
                  value={timeEnd}
                  onChange={(event) => setTimeEnd(event.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="linked-notes">
            <div className="linked-notes__header">
              <div className="linked-notes__title">Notas vinculadas</div>
              <button type="button" className="linked-notes__button" onClick={onOpenLinkedNotes} disabled={!task}>
                Ver todas as notas
              </button>
            </div>
            {linkedNotes.length === 0 ? (
              <div className="linked-notes__empty">Sem notas vinculadas.</div>
            ) : (
              <div className="linked-notes__grid">
                {linkedNotes.slice(0, 3).map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    className="mini-sticky-note"
                    onClick={() => onSelectNote?.(note)}
                  >
                    {note.title && <div className="mini-sticky-note__title">{note.title}</div>}
                    <div className="mini-sticky-note__body">{note.body}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={`subtasks${subtasksOpen ? ' subtasks--open' : ''}`}>
            <button type="button" className="subtasks__toggle" onClick={() => setSubtasksOpen(!subtasksOpen)}>
              Subtarefas
              <span className="subtasks__chevron">{subtasksOpen ? '-' : '+'}</span>
            </button>
            {subtasksOpen && (
              <div className="subtasks__content">
                {task && task.subtasks.length === 0 ? (
                  <div className="subtasks__empty">Sem subtarefas.</div>
                ) : (
                  <div className="subtasks__list">
                    {task?.subtasks.map((subtask) => (
                      <label key={subtask.id} className="subtasks__item">
                        <input
                          type="checkbox"
                          checked={subtask.status === 'DONE'}
                          onChange={() => handleToggleSubtask(subtask)}
                        />
                        <input
                          className={
                            subtask.status === 'DONE'
                              ? 'subtasks__input subtasks__input--done'
                              : 'subtasks__input'
                          }
                          value={subtask.title}
                          placeholder="Nova subtarefa"
                          onChange={(event) => handleUpdateSubtaskTitle(subtask, event.target.value)}
                          onBlur={(event) => handleUpdateSubtaskTitle(subtask, event.target.value.trim())}
                          autoFocus={focusSubtaskId === subtask.id}
                        />
                      </label>
                    ))}
                  </div>
                )}
                <button type="button" className="subtasks__add" onClick={handleAddSubtask}>
                  + Adicionar subtarefa
                </button>
              </div>
            )}
          </div>

          <label className="field">
            <span className="field__label">Recorrencia</span>
            <select
              className="field__select"
              value={recurrence}
              onChange={(event) => handleRecurrenceChange(event.target.value as Recurrence)}
            >
              <option value="none">Nenhuma</option>
              <option value="daily">Diaria</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
          </label>

          <div className="danger-zone">
            <button type="button" className="danger-zone__button" onClick={() => setIsConfirmingDelete(true)}>
              Excluir tarefa
            </button>
          </div>
        </div>
        {isConfirmingDelete && (
          <div className="confirm-dialog__backdrop" onClick={() => setIsConfirmingDelete(false)}>
            <div className="confirm-dialog" onClick={(event) => event.stopPropagation()}>
              <div className="confirm-dialog__title">Excluir tarefa?</div>
              <div className="confirm-dialog__actions">
                <button type="button" className="confirm-dialog__button" onClick={() => setIsConfirmingDelete(false)}>
                  Cancelar
                </button>
                <button type="button" className="confirm-dialog__button confirm-dialog__button--danger" onClick={handleConfirmDelete}>
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  )
}

export default TaskSheet
