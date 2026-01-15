import { create } from 'zustand'
import type { InboxItem } from '../types/inbox'
import type { Note } from '../types/note'
import type { NoteTaskLink } from '../types/link'
import type { Subtask, Task } from '../types/task'
import { db, enqueueOp, getMetaValue, initDb, setMetaValue } from './db'

type AppState = {
  tasks: Task[]
  inboxItems: InboxItem[]
  notes: Note[]
  links: NoteTaskLink[]
  selectedDayKey: string
  wakeTime: string
  sleepTime: string
  applyRoutineAllDays: boolean
  warnOverbooked: boolean
  blockOverbooked: boolean
  isReady: boolean
  init: () => Promise<void>
  refreshFromDb: () => Promise<void>
  addInboxItem: (text: string) => void
  deleteInboxItem: (id: string) => void
  updateInboxItem: (id: string, text: string) => void
  setSelectedDayKey: (dayKey: string) => void
  updateRoutine: (updates: {
    wakeTime?: string
    sleepTime?: string
    applyRoutineAllDays?: boolean
    warnOverbooked?: boolean
    blockOverbooked?: boolean
  }) => void
  runTimeTick: () => void
  updateTask: (id: string, updates: Partial<Task>) => void
  toggleTaskDone: (id: string) => void
  startTimer: (id: string) => void
  stopTimer: (id: string) => void
  deleteTask: (id: string) => void
  createTask: (dayKey: string) => string
  convertInboxToTask: (id: string, dayKey: string) => string | null
  convertInboxToNote: (id: string, data: Pick<Note, 'title' | 'body'>) => string | null
  createNote: (data: Pick<Note, 'title' | 'body'>) => string
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => void
  linkNoteToTask: (noteId: string, taskId: string) => void
  getCompletionStats: () => { completed: number; total: number; rate: number }
  getTotalFocusTimeMs: () => number
  getStatusCountsForDay: (dayKey: string) => { planned: number; overdue: number; done: number }
  getDailyCapacityMinutes: () => number
  getPlannedDurationMinutesForDay: (dayKey: string) => number
  isOverbookedForDay: (dayKey: string) => boolean
}

const getTodayKey = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseTimeToMinutes = (value: string) => {
  if (!value) {
    return null
  }
  const [hours, minutes] = value.split(':').map((part) => Number(part))
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null
  }
  return hours * 60 + minutes
}

const parseBool = (value: string | null | undefined, fallback: boolean) => {
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  return fallback
}

const normalizeTimerFields = (task: Task) => ({
  timeSpent: Number.isFinite(task.timeSpent) ? task.timeSpent : 0,
  isTimerRunning: Boolean(task.isTimerRunning),
  lastTimerStart: typeof task.lastTimerStart === 'number' ? task.lastTimerStart : null,
})

const getAccumulatedTime = (task: Task) => {
  const base = Number.isFinite(task.timeSpent) ? task.timeSpent : 0
  if (!task.isTimerRunning || !task.lastTimerStart) {
    return base
  }
  const delta = Date.now() - task.lastTimerStart
  return base + Math.max(0, delta)
}

const diffMinutes = (start: string, end: string) => {
  const startMinutes = parseTimeToMinutes(start)
  const endMinutes = parseTimeToMinutes(end)
  if (startMinutes === null || endMinutes === null) {
    return 0
  }
  if (endMinutes <= startMinutes) {
    return 0
  }
  return endMinutes - startMinutes
}

const buildTimeLabel = (start: string, end: string) => {
  if (start && end) {
    return `${start} - ${end}`
  }
  if (start) {
    return start
  }
  return 'Sem horario'
}

const isFutureTime = (dayKey: string, start: string) => {
  const todayKey = getTodayKey()
  if (dayKey > todayKey) {
    return true
  }
  if (dayKey < todayKey) {
    return false
  }
  const startMinutes = parseTimeToMinutes(start)
  if (startMinutes === null) {
    return false
  }
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  return startMinutes > nowMinutes
}

const buildId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`

export const useAppStore = create<AppState>((set, get) => ({
  tasks: [],
  inboxItems: [],
  notes: [],
  links: [],
  selectedDayKey: getTodayKey(),
  wakeTime: '07:00',
  sleepTime: '23:00',
  applyRoutineAllDays: false,
  warnOverbooked: true,
  blockOverbooked: false,
  isReady: false,
  init: async () => {
    await initDb()
    await get().refreshFromDb()
    set({ isReady: true })
  },
  refreshFromDb: async () => {
    const [tasks, notes, inboxItems, links] = await Promise.all([
      db.tasks.toArray(),
      db.notes.toArray(),
      db.inbox_items.toArray(),
      db.links.toArray(),
    ])
    const normalizedTasks = tasks.map((task) => {
      const base = task.updatedAt ? task : { ...task, updatedAt: new Date().toISOString() }
      const timer = normalizeTimerFields(base as Task)
      return { ...base, ...timer } as Task
    })
    const selectedDayKey = (await getMetaValue('selectedDayKey')) ?? getTodayKey()
    const wakeTime = (await getMetaValue('wakeTime')) ?? '07:00'
    const sleepTime = (await getMetaValue('sleepTime')) ?? '23:00'
    const applyRoutineAllDays = parseBool(await getMetaValue('applyRoutineAllDays'), false)
    const warnOverbooked = parseBool(await getMetaValue('warnOverbooked'), true)
    const blockOverbooked = parseBool(await getMetaValue('blockOverbooked'), false)
    set({
      tasks: normalizedTasks,
      notes,
      inboxItems,
      links,
      selectedDayKey,
      wakeTime,
      sleepTime,
      applyRoutineAllDays,
      warnOverbooked,
      blockOverbooked,
    })
  },
  addInboxItem: (text) => {
    const item: InboxItem = { id: buildId('inbox'), text, createdAt: new Date().toISOString() }
    set((state) => ({ inboxItems: [item, ...state.inboxItems] }))
    void db.inbox_items.add(item)
    void enqueueOp({
      entityType: 'inbox',
      entityId: item.id,
      opType: 'create',
      payload: item,
    })
  },
  deleteInboxItem: (id) => {
    set((state) => ({
      inboxItems: state.inboxItems.filter((item) => item.id !== id),
    }))
    void db.inbox_items.delete(id)
    void enqueueOp({
      entityType: 'inbox',
      entityId: id,
      opType: 'delete',
      payload: { updatedAt: new Date().toISOString() },
    })
  },
  updateInboxItem: (id, text) => {
    const existing = get().inboxItems.find((item) => item.id === id)
    if (!existing) {
      return
    }
    const updatedItem = { ...existing, text }
    set((state) => ({
      inboxItems: state.inboxItems.map((item) => (item.id === id ? updatedItem : item)),
    }))
    void db.inbox_items.put(updatedItem)
    void enqueueOp({
      entityType: 'inbox',
      entityId: id,
      opType: 'update',
      payload: { ...updatedItem },
    })
  },
  setSelectedDayKey: (dayKey) => {
    set({ selectedDayKey: dayKey })
    void setMetaValue('selectedDayKey', dayKey)
  },
  updateRoutine: (updates) => {
    set((state) => ({
      wakeTime: updates.wakeTime ?? state.wakeTime,
      sleepTime: updates.sleepTime ?? state.sleepTime,
      applyRoutineAllDays: updates.applyRoutineAllDays ?? state.applyRoutineAllDays,
      warnOverbooked: updates.warnOverbooked ?? state.warnOverbooked,
      blockOverbooked: updates.blockOverbooked ?? state.blockOverbooked,
    }))
    if (updates.wakeTime !== undefined) {
      void setMetaValue('wakeTime', updates.wakeTime)
      void enqueueOp({
        entityType: 'meta',
        entityId: 'wakeTime',
        opType: 'update',
        payload: { wakeTime: updates.wakeTime },
      })
    }
    if (updates.sleepTime !== undefined) {
      void setMetaValue('sleepTime', updates.sleepTime)
      void enqueueOp({
        entityType: 'meta',
        entityId: 'sleepTime',
        opType: 'update',
        payload: { sleepTime: updates.sleepTime },
      })
    }
    if (updates.applyRoutineAllDays !== undefined) {
      const value = String(updates.applyRoutineAllDays)
      void setMetaValue('applyRoutineAllDays', value)
      void enqueueOp({
        entityType: 'meta',
        entityId: 'applyRoutineAllDays',
        opType: 'update',
        payload: { applyRoutineAllDays: value },
      })
    }
    if (updates.warnOverbooked !== undefined) {
      const value = String(updates.warnOverbooked)
      void setMetaValue('warnOverbooked', value)
      void enqueueOp({
        entityType: 'meta',
        entityId: 'warnOverbooked',
        opType: 'update',
        payload: { warnOverbooked: value },
      })
    }
    if (updates.blockOverbooked !== undefined) {
      const value = String(updates.blockOverbooked)
      void setMetaValue('blockOverbooked', value)
      void enqueueOp({
        entityType: 'meta',
        entityId: 'blockOverbooked',
        opType: 'update',
        payload: { blockOverbooked: value },
      })
    }
  },
  runTimeTick: () => {
    const now = new Date()
    const todayKey = getTodayKey()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    set((state) => ({
      tasks: state.tasks.map((task) => {
        if (task.dayKey !== todayKey || task.status === 'done') {
          return task
        }
        if (!task.timeStart || !task.timeEnd) {
          return task
        }
        const startMinutes = parseTimeToMinutes(task.timeStart)
        const endMinutes = parseTimeToMinutes(task.timeEnd)
        if (startMinutes === null || endMinutes === null) {
          return task
        }
        let nextStatus = task.status
        if (nowMinutes > endMinutes) {
          nextStatus = 'overdue'
        } else if (nowMinutes >= startMinutes && nowMinutes <= endMinutes) {
          nextStatus = 'active'
        } else if (nowMinutes < startMinutes) {
          nextStatus = 'planned'
        }
        if (nextStatus === task.status) {
          return task
        }
        const updatedAt = new Date().toISOString()
        const nextTask: Task = { ...task, status: nextStatus as Task['status'], updatedAt }
        void db.tasks.put(nextTask)
        void enqueueOp({
          entityType: 'task',
          entityId: nextTask.id,
          opType: 'update',
          payload: nextTask,
        })
        return nextTask
      }),
    }))
  },
  updateTask: (id, updates) => {
    const now = new Date().toISOString()
    set((state) => ({
      tasks: state.tasks.map((task) => {
        if (task.id !== id) {
          return task
        }
        const nextTask: Task = { ...task, ...updates, updatedAt: now }
        if (updates.timeStart !== undefined || updates.timeEnd !== undefined || updates.dayKey !== undefined) {
          const nextStart = updates.timeStart ?? task.timeStart
          const nextEnd = updates.timeEnd ?? task.timeEnd
          nextTask.timeStart = nextStart
          nextTask.timeEnd = nextEnd
          nextTask.timeLabel = buildTimeLabel(nextStart, nextEnd)
          const nextDayKey = updates.dayKey ?? task.dayKey
          if ((task.status === 'active' || task.status === 'overdue') && isFutureTime(nextDayKey, nextStart)) {
            nextTask.status = 'planned' as Task['status']
          }
        }
        void db.tasks.put(nextTask)
        void enqueueOp({
          entityType: 'task',
          entityId: nextTask.id,
          opType: 'update',
          payload: nextTask,
        })
        return nextTask
      }),
    }))
  },
  toggleTaskDone: (id) => {
    const now = new Date().toISOString()
    set((state) => ({
      tasks: state.tasks.map((task) => {
        if (task.id !== id) {
          return task
        }
        const isDone = task.status === 'done'
        const nextStatus: Task['status'] = isDone ? 'planned' : 'done'
        const shouldStopTimer = !isDone && task.isTimerRunning && typeof task.lastTimerStart === 'number'
        const extraTime = shouldStopTimer ? Date.now() - (task.lastTimerStart as number) : 0
        const nextTimeSpent = (task.timeSpent ?? 0) + Math.max(0, extraTime)
        const nextTask: Task = {
          ...task,
          status: nextStatus,
          timeSpent: nextTimeSpent,
          isTimerRunning: isDone ? task.isTimerRunning : false,
          lastTimerStart: isDone ? task.lastTimerStart : null,
          subtasks: isDone
            ? task.subtasks
            : task.subtasks.map((subtask) =>
                subtask.status === 'DONE' ? subtask : { ...subtask, status: 'DONE' as Subtask['status'] },
              ),
          updatedAt: now,
        }
        void db.tasks.put(nextTask)
        void enqueueOp({
          entityType: 'task',
          entityId: nextTask.id,
          opType: 'update',
          payload: nextTask,
        })
        return nextTask
      }),
    }))
  },
  startTimer: (id) => {
    const nowMs = Date.now()
    const nowIso = new Date().toISOString()
    set((state) => ({
      tasks: state.tasks.map((task) => {
        if (task.id !== id || task.isTimerRunning) {
          return task
        }
        const nextTask: Task = {
          ...task,
          isTimerRunning: true,
          lastTimerStart: nowMs,
          updatedAt: nowIso,
        }
        void db.tasks.put(nextTask)
        void enqueueOp({
          entityType: 'task',
          entityId: nextTask.id,
          opType: 'update',
          payload: nextTask,
        })
        return nextTask
      }),
    }))
  },
  stopTimer: (id) => {
    const nowMs = Date.now()
    const nowIso = new Date().toISOString()
    set((state) => ({
      tasks: state.tasks.map((task) => {
        if (task.id !== id || !task.isTimerRunning || typeof task.lastTimerStart !== 'number') {
          return task
        }
        const delta = nowMs - task.lastTimerStart
        const nextTask: Task = {
          ...task,
          timeSpent: (task.timeSpent ?? 0) + Math.max(0, delta),
          isTimerRunning: false,
          lastTimerStart: null,
          updatedAt: nowIso,
        }
        void db.tasks.put(nextTask)
        void enqueueOp({
          entityType: 'task',
          entityId: nextTask.id,
          opType: 'update',
          payload: nextTask,
        })
        return nextTask
      }),
    }))
  },
  deleteTask: (id) => {
    const now = new Date().toISOString()
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
      links: state.links.filter((link) => link.taskId !== id),
    }))
    void db.tasks.delete(id)
    void db.links.where('taskId').equals(id).delete()
    void enqueueOp({
      entityType: 'task',
      entityId: id,
      opType: 'delete',
      payload: { updatedAt: now },
    })
  },
  createTask: (dayKey) => {
    const now = new Date().toISOString()
    const taskId = buildId('task')
    const task: Task = {
      id: taskId,
      title: '',
      timeLabel: 'Sem horario',
      timeStart: '',
      timeEnd: '',
      status: 'planned',
      dayKey,
      recurrence: 'none',
      subtasks: [],
      linkedNoteIds: [],
      timeSpent: 0,
      isTimerRunning: false,
      lastTimerStart: null,
      updatedAt: now,
    }
    set((state) => ({
      tasks: [task, ...state.tasks],
    }))
    void db.tasks.add(task)
    void enqueueOp({
      entityType: 'task',
      entityId: task.id,
      opType: 'create',
      payload: task,
    })
    return taskId
  },
  convertInboxToTask: (id, dayKey) => {
    const item = get().inboxItems.find((inbox) => inbox.id === id)
    if (!item) {
      return null
    }
    const now = new Date().toISOString()
    const taskId = buildId('task')
    const task: Task = {
      id: taskId,
      title: item.text,
      timeLabel: 'Sem horario',
      timeStart: '',
      timeEnd: '',
      status: 'planned',
      dayKey,
      recurrence: 'none',
      subtasks: [],
      linkedNoteIds: [],
      timeSpent: 0,
      isTimerRunning: false,
      lastTimerStart: null,
      updatedAt: now,
    }
    set((state) => ({
      inboxItems: state.inboxItems.filter((inbox) => inbox.id !== id),
      tasks: [task, ...state.tasks],
    }))
    void db.transaction('rw', db.inbox_items, db.tasks, async () => {
      await db.inbox_items.delete(id)
      await db.tasks.add(task)
    })
    void enqueueOp({
      entityType: 'inbox',
      entityId: id,
      opType: 'delete',
      payload: {},
    })
    void enqueueOp({
      entityType: 'task',
      entityId: task.id,
      opType: 'create',
      payload: task,
    })
    return taskId
  },
  convertInboxToNote: (id, data) => {
    const item = get().inboxItems.find((inbox) => inbox.id === id)
    if (!item) {
      return null
    }
    const now = new Date().toISOString()
    const noteId = buildId('note')
    const note: Note = { id: noteId, title: data.title, body: data.body, createdAt: now, updatedAt: now }
    set((state) => ({
      inboxItems: state.inboxItems.filter((inbox) => inbox.id !== id),
      notes: [note, ...state.notes],
    }))
    void db.transaction('rw', db.inbox_items, db.notes, async () => {
      await db.inbox_items.delete(id)
      await db.notes.add(note)
    })
    void enqueueOp({
      entityType: 'inbox',
      entityId: id,
      opType: 'delete',
      payload: { updatedAt: now },
    })
    void enqueueOp({
      entityType: 'note',
      entityId: note.id,
      opType: 'create',
      payload: note,
    })
    return noteId
  },
  createNote: (data) => {
    const id = buildId('note')
    const now = new Date().toISOString()
    const note: Note = { id, title: data.title, body: data.body, createdAt: now, updatedAt: now }
    set((state) => ({ notes: [note, ...state.notes] }))
    void db.notes.add(note)
    void enqueueOp({
      entityType: 'note',
      entityId: note.id,
      opType: 'create',
      payload: note,
    })
    return id
  },
  updateNote: (id, updates) => {
    set((state) => ({
      notes: state.notes.map((note) => {
        if (note.id !== id) {
          return note
        }
        const updated = { ...note, ...updates, updatedAt: new Date().toISOString() }
        void db.notes.put(updated)
        void enqueueOp({
          entityType: 'note',
          entityId: id,
          opType: 'update',
          payload: updated,
        })
        return updated
      }),
    }))
  },
  deleteNote: (id) => {
    const now = new Date().toISOString()
    const affectedTasks = get().tasks.filter((task) => task.linkedNoteIds.includes(id))
    const updatedTasks = affectedTasks.map((task) => ({
      ...task,
      linkedNoteIds: task.linkedNoteIds.filter((noteId) => noteId !== id),
    }))
    set((state) => ({
      notes: state.notes.filter((note) => note.id !== id),
      links: state.links.filter((link) => link.noteId !== id),
      tasks: state.tasks.map((task) =>
        task.linkedNoteIds.includes(id)
          ? { ...task, linkedNoteIds: task.linkedNoteIds.filter((noteId) => noteId !== id) }
          : task,
      ),
    }))
    void db.transaction('rw', db.notes, db.links, db.tasks, async () => {
      await db.notes.delete(id)
      await db.links.where('noteId').equals(id).delete()
      await db.tasks.bulkPut(updatedTasks)
    })
    void enqueueOp({
      entityType: 'note',
      entityId: id,
      opType: 'delete',
      payload: { updatedAt: now },
    })
    updatedTasks.forEach((task) => {
      void enqueueOp({
        entityType: 'task',
        entityId: task.id,
        opType: 'update',
        payload: { ...task, updatedAt: now },
      })
    })
  },
  linkNoteToTask: (noteId, taskId) => {
    const task = get().tasks.find((item) => item.id === taskId)
    if (!task) {
      return
    }
    const hasLink = get().links.some((link) => link.noteId === noteId && link.taskId === taskId)
    const updatedAt = new Date().toISOString()
    const updatedTask = task.linkedNoteIds.includes(noteId)
      ? { ...task, updatedAt }
      : { ...task, linkedNoteIds: [...task.linkedNoteIds, noteId], updatedAt }
    set((state) => ({
      links: hasLink ? state.links : [...state.links, { noteId, taskId }],
      tasks: state.tasks.map((item) => (item.id === taskId ? updatedTask : item)),
    }))
    void db.transaction('rw', db.links, db.tasks, async () => {
      if (!hasLink) {
        await db.links.add({ noteId, taskId })
      }
      await db.tasks.put(updatedTask)
    })
    void enqueueOp({
      entityType: 'link',
      entityId: `${noteId}-${taskId}`,
      opType: 'create',
      payload: { noteId, taskId },
    })
    void enqueueOp({
      entityType: 'task',
      entityId: updatedTask.id,
      opType: 'update',
      payload: updatedTask,
    })
  },
  getCompletionStats: () => {
    const { tasks } = get()
    const total = tasks.length
    const completed = tasks.filter((task) => task.status === 'done').length
    const rate = total === 0 ? 0 : completed / total
    return { completed, total, rate }
  },
  getTotalFocusTimeMs: () => {
    const { tasks } = get()
    return tasks.reduce((total, task) => total + getAccumulatedTime(task), 0)
  },
  getStatusCountsForDay: (dayKey) => {
    const { tasks } = get()
    return tasks.reduce(
      (acc, task) => {
        if (task.dayKey !== dayKey) {
          return acc
        }
        if (task.status === 'overdue') {
          acc.overdue += 1
        } else if (task.status === 'done') {
          acc.done += 1
        } else {
          acc.planned += 1
        }
        return acc
      },
      { planned: 0, overdue: 0, done: 0 },
    )
  },
  getDailyCapacityMinutes: () => {
    const { wakeTime, sleepTime } = get()
    return diffMinutes(wakeTime, sleepTime)
  },
  getPlannedDurationMinutesForDay: (dayKey) => {
    const { tasks } = get()
    return tasks.reduce((total, task) => {
      if (task.dayKey !== dayKey || task.status !== 'planned') {
        return total
      }
      return total + diffMinutes(task.timeStart, task.timeEnd)
    }, 0)
  },
  isOverbookedForDay: (dayKey) => {
    if (!get().warnOverbooked) {
      return false
    }
    const capacity = get().getDailyCapacityMinutes()
    const planned = get().getPlannedDurationMinutesForDay(dayKey)
    return planned > capacity
  },
}))
