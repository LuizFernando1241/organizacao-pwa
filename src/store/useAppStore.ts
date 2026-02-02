import { create } from 'zustand'
import type { InboxItem } from '../types/inbox'
import type { Note } from '../types/note'
import type { NoteTaskLink } from '../types/link'
import type { Plan } from '../types/plan'
import type { Subtask, Task } from '../types/task'
import { db, enqueueOp, getMetaValue, initDb, setMetaValue } from './db'

type AppState = {
  tasks: Task[]
  inboxItems: InboxItem[]
  notes: Note[]
  plans: Plan[]
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
  convertInboxToNote: (id: string, data: Pick<Note, 'title' | 'body' | 'color'>) => string | null
  createNote: (data: Pick<Note, 'title' | 'body' | 'color'>) => string
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => void
  createPlan: () => string
  updatePlan: (id: string, updates: Partial<Plan>) => void
  deletePlan: (id: string) => void
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
    return 24 * 60 - startMinutes + endMinutes
  }
  return endMinutes - startMinutes
}

const getPlannedMinutesForDay = (tasks: Task[], dayKey: string) =>
  tasks.reduce((total, task) => {
    if (task.dayKey !== dayKey || task.status !== 'planned') {
      return total
    }
    return total + diffMinutes(task.timeStart, task.timeEnd)
  }, 0)

const buildTimeLabel = (start: string, end: string) => {
  if (start && end) {
    return `${start} - ${end}`
  }
  if (start) {
    return start
  }
  return 'Sem horário'
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
const cloneSubtasks = (subtasks: Subtask[]) => subtasks.map((subtask) => ({ ...subtask }))

export const useAppStore = create<AppState>((set, get) => {
  const getRecurringInstance = (baseId: string, dayKey: string) =>
    get().tasks.find((task) => task.recurrenceParentId === baseId && task.dayKey === dayKey) ?? null

  const buildRecurringInstance = (base: Task, dayKey: string, now: string): Task => ({
    ...base,
    id: buildId('task'),
    dayKey,
    recurrence: 'none',
    recurrenceParentId: base.id,
    status: 'planned',
    timeSpent: 0,
    isTimerRunning: false,
    lastTimerStart: null,
    subtasks: cloneSubtasks(base.subtasks),
    linkedNoteIds: [...base.linkedNoteIds],
    updatedAt: now,
  })

  const upsertRecurringInstance = (nextTask: Task, isNew: boolean) => {
    if (isNew) {
      set((state) => ({ tasks: [nextTask, ...state.tasks] }))
      void db.tasks.add(nextTask)
      void enqueueOp({
        entityType: 'task',
        entityId: nextTask.id,
        opType: 'create',
        payload: nextTask,
      })
      return
    }
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === nextTask.id ? nextTask : task)),
    }))
    void db.tasks.put(nextTask)
    void enqueueOp({
      entityType: 'task',
      entityId: nextTask.id,
      opType: 'update',
      payload: nextTask,
    })
  }

  return {
  tasks: [],
  inboxItems: [],
  notes: [],
  plans: [],
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
    const [tasks, notes, inboxItems, links, plans] = await Promise.all([
      db.tasks.toArray(),
      db.notes.toArray(),
      db.inbox_items.toArray(),
      db.links.toArray(),
      db.plans.toArray(),
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
      plans,
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
    const now = new Date().toISOString()
    const item: InboxItem = { id: buildId('inbox'), text, createdAt: now, updatedAt: now }
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
    const updatedItem = { ...existing, text, updatedAt: new Date().toISOString() }
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
    const updatedAt = new Date().toISOString()
    void setMetaValue('selectedDayKey', dayKey, updatedAt)
    void enqueueOp({
      entityType: 'meta',
      entityId: 'selectedDayKey',
      opType: 'update',
      payload: { key: 'selectedDayKey', value: dayKey, updatedAt },
    })
  },
  updateRoutine: (updates) => {
    set((state) => ({
      wakeTime: updates.wakeTime ?? state.wakeTime,
      sleepTime: updates.sleepTime ?? state.sleepTime,
      applyRoutineAllDays: updates.applyRoutineAllDays ?? state.applyRoutineAllDays,
      warnOverbooked: updates.warnOverbooked ?? state.warnOverbooked,
      blockOverbooked: updates.blockOverbooked ?? state.blockOverbooked,
    }))
    const updatedAt = new Date().toISOString()
    const queueMetaUpdate = (key: string, value: string) => {
      void setMetaValue(key, value, updatedAt)
      void enqueueOp({
        entityType: 'meta',
        entityId: key,
        opType: 'update',
        payload: { key, value, updatedAt },
      })
    }
    if (updates.wakeTime !== undefined) {
      queueMetaUpdate('wakeTime', updates.wakeTime)
    }
    if (updates.sleepTime !== undefined) {
      queueMetaUpdate('sleepTime', updates.sleepTime)
    }
    if (updates.applyRoutineAllDays !== undefined) {
      const value = String(updates.applyRoutineAllDays)
      queueMetaUpdate('applyRoutineAllDays', value)
    }
    if (updates.warnOverbooked !== undefined) {
      const value = String(updates.warnOverbooked)
      queueMetaUpdate('warnOverbooked', value)
    }
    if (updates.blockOverbooked !== undefined) {
      const value = String(updates.blockOverbooked)
      queueMetaUpdate('blockOverbooked', value)
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
        if (task.recurrence !== 'none' && !task.recurrenceParentId) {
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
    const state = get()
    const currentTask = state.tasks.find((task) => task.id === id)
    if (!currentTask) {
      return
    }
    let nextTask: Task = { ...currentTask, ...updates, updatedAt: now }
    if (updates.timeStart !== undefined || updates.timeEnd !== undefined || updates.dayKey !== undefined) {
      const nextStart = updates.timeStart ?? currentTask.timeStart
      const nextEnd = updates.timeEnd ?? currentTask.timeEnd
      const nextDayKey = updates.dayKey ?? currentTask.dayKey
      nextTask.timeStart = nextStart
      nextTask.timeEnd = nextEnd
      nextTask.timeLabel = buildTimeLabel(nextStart, nextEnd)
      nextTask.dayKey = nextDayKey
      if (currentTask.status === 'active' || currentTask.status === 'overdue') {
        if (!nextStart || !nextEnd) {
          if (nextDayKey >= getTodayKey()) {
            nextTask.status = 'planned' as Task['status']
          }
        } else if (isFutureTime(nextDayKey, nextStart)) {
          nextTask.status = 'planned' as Task['status']
        }
      }
    }
    const shouldCheckOverbooked =
      state.blockOverbooked &&
      (updates.timeStart !== undefined || updates.timeEnd !== undefined || updates.dayKey !== undefined)
    if (shouldCheckOverbooked) {
      const prevPlanned = getPlannedMinutesForDay(state.tasks, nextTask.dayKey)
      const nextTasks = state.tasks.map((task) => (task.id === id ? nextTask : task))
      const nextPlanned = getPlannedMinutesForDay(nextTasks, nextTask.dayKey)
      const capacity = diffMinutes(state.wakeTime, state.sleepTime)
      if (capacity > 0 && nextPlanned > capacity && nextPlanned > prevPlanned) {
        return
      }
    }
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? nextTask : task)),
    }))
    void db.tasks.put(nextTask)
    void enqueueOp({
      entityType: 'task',
      entityId: nextTask.id,
      opType: 'update',
      payload: nextTask,
    })
  },
  toggleTaskDone: (id) => {
    const now = new Date().toISOString()
    const state = get()
    const task = state.tasks.find((item) => item.id === id)
    if (!task) {
      return
    }
    const isTemplate = task.recurrence !== 'none' && !task.recurrenceParentId
    const targetDayKey = state.selectedDayKey
    const existingInstance = isTemplate ? getRecurringInstance(task.id, targetDayKey) : null
    const baseTask = isTemplate
      ? existingInstance ?? buildRecurringInstance(task, targetDayKey, now)
      : task
    const isDone = baseTask.status === 'done'
    const nextStatus: Task['status'] = isDone ? 'planned' : 'done'
    const shouldStopTimer = !isDone && baseTask.isTimerRunning && typeof baseTask.lastTimerStart === 'number'
    const extraTime = shouldStopTimer ? Date.now() - (baseTask.lastTimerStart as number) : 0
    const nextTimeSpent = (baseTask.timeSpent ?? 0) + Math.max(0, extraTime)
    const nextTask: Task = {
      ...baseTask,
      status: nextStatus,
      timeSpent: nextTimeSpent,
      isTimerRunning: isDone ? baseTask.isTimerRunning : false,
      lastTimerStart: isDone ? baseTask.lastTimerStart : null,
      subtasks: isDone
        ? baseTask.subtasks
        : baseTask.subtasks.map((subtask) =>
            subtask.status === 'DONE' ? subtask : { ...subtask, status: 'DONE' as Subtask['status'] },
          ),
      updatedAt: now,
    }
    if (isTemplate) {
      const isNew = !existingInstance
      upsertRecurringInstance(nextTask, isNew)
      return
    }
    set((state) => ({
      tasks: state.tasks.map((item) => (item.id === id ? nextTask : item)),
    }))
    void db.tasks.put(nextTask)
    void enqueueOp({
      entityType: 'task',
      entityId: nextTask.id,
      opType: 'update',
      payload: nextTask,
    })
  },
  startTimer: (id) => {
    const nowMs = Date.now()
    const nowIso = new Date().toISOString()
    const state = get()
    const task = state.tasks.find((item) => item.id === id)
    if (!task) {
      return
    }
    const isTemplate = task.recurrence !== 'none' && !task.recurrenceParentId
    const targetDayKey = state.selectedDayKey
    const existingInstance = isTemplate ? getRecurringInstance(task.id, targetDayKey) : null
    const baseTask = isTemplate
      ? existingInstance ?? buildRecurringInstance(task, targetDayKey, nowIso)
      : task
    if (baseTask.isTimerRunning) {
      return
    }
    const nextTask: Task = {
      ...baseTask,
      isTimerRunning: true,
      lastTimerStart: nowMs,
      updatedAt: nowIso,
    }
    if (isTemplate) {
      const isNew = !existingInstance
      upsertRecurringInstance(nextTask, isNew)
      return
    }
    set((state) => ({
      tasks: state.tasks.map((item) => (item.id === id ? nextTask : item)),
    }))
    void db.tasks.put(nextTask)
    void enqueueOp({
      entityType: 'task',
      entityId: nextTask.id,
      opType: 'update',
      payload: nextTask,
    })
  },
  stopTimer: (id) => {
    const nowMs = Date.now()
    const nowIso = new Date().toISOString()
    const state = get()
    const task = state.tasks.find((item) => item.id === id)
    if (!task) {
      return
    }
    const isTemplate = task.recurrence !== 'none' && !task.recurrenceParentId
    const targetDayKey = state.selectedDayKey
    const existingInstance = isTemplate ? getRecurringInstance(task.id, targetDayKey) : null
    const baseTask = isTemplate ? existingInstance : task
    if (!baseTask || !baseTask.isTimerRunning || typeof baseTask.lastTimerStart !== 'number') {
      return
    }
    const delta = nowMs - baseTask.lastTimerStart
    const nextTask: Task = {
      ...baseTask,
      timeSpent: (baseTask.timeSpent ?? 0) + Math.max(0, delta),
      isTimerRunning: false,
      lastTimerStart: null,
      updatedAt: nowIso,
    }
    if (isTemplate) {
      upsertRecurringInstance(nextTask, false)
      return
    }
    set((state) => ({
      tasks: state.tasks.map((item) => (item.id === id ? nextTask : item)),
    }))
    void db.tasks.put(nextTask)
    void enqueueOp({
      entityType: 'task',
      entityId: nextTask.id,
      opType: 'update',
      payload: nextTask,
    })
  },
  deleteTask: (id) => {
    const now = new Date().toISOString()
    const linksToRemove = get().links.filter((link) => link.taskId === id)
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
    linksToRemove.forEach((link) => {
      void enqueueOp({
        entityType: 'link',
        entityId: `${link.taskId}:${link.noteId}`,
        opType: 'delete',
        payload: { updatedAt: now },
      })
    })
  },
  createTask: (dayKey) => {
    const now = new Date().toISOString()
    const taskId = buildId('task')
    const task: Task = {
      id: taskId,
      title: '',
      timeLabel: 'Sem horário',
      timeStart: '',
      timeEnd: '',
      status: 'planned',
      dayKey,
      recurrence: 'none',
      recurrenceParentId: null,
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
      timeLabel: 'Sem horário',
      timeStart: '',
      timeEnd: '',
      status: 'planned',
      dayKey,
      recurrence: 'none',
      recurrenceParentId: null,
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
      payload: { updatedAt: now },
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
    const note: Note = {
      id: noteId,
      title: data.title,
      body: data.body,
      color: data.color ?? undefined,
      createdAt: now,
      updatedAt: now,
    }
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
    const note: Note = {
      id,
      title: data.title,
      body: data.body,
      color: data.color ?? undefined,
      createdAt: now,
      updatedAt: now,
    }
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
    const linksToRemove = get().links.filter((link) => link.noteId === id)
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
    linksToRemove.forEach((link) => {
      void enqueueOp({
        entityType: 'link',
        entityId: `${link.taskId}:${link.noteId}`,
        opType: 'delete',
        payload: { updatedAt: now },
      })
    })
  },
  createPlan: () => {
    const id = buildId('plan')
    const now = new Date().toISOString()
    const plan: Plan = {
      id,
      title: 'Novo planejamento',
      subtitle: '',
      status: 'active',
      startDate: '',
      endDate: '',
      goals: [],
      blocks: [],
      phases: [],
      decisions: [],
      linkedTaskIds: [],
      createdAt: now,
      updatedAt: now,
    }
    set((state) => ({ plans: [plan, ...state.plans] }))
    void db.plans.add(plan)
    return id
  },
  updatePlan: (id, updates) => {
    set((state) => ({
      plans: state.plans.map((plan) => {
        if (plan.id !== id) {
          return plan
        }
        const updated = { ...plan, ...updates, updatedAt: new Date().toISOString() }
        void db.plans.put(updated)
        return updated
      }),
    }))
  },
  deletePlan: (id) => {
    set((state) => ({
      plans: state.plans.filter((plan) => plan.id !== id),
    }))
    void db.plans.delete(id)
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
      entityId: `${taskId}:${noteId}`,
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
    if (!get().applyRoutineAllDays && dayKey !== get().selectedDayKey) {
      return false
    }
    const capacity = get().getDailyCapacityMinutes()
    const planned = get().getPlannedDurationMinutesForDay(dayKey)
    return planned > capacity
  },
}
})
