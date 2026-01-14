import { create } from 'zustand'
import type { InboxItem } from '../types/inbox'
import type { Note } from '../types/note'
import type { NoteTaskLink } from '../types/link'
import type { Task } from '../types/task'
import { db, enqueueOp, getMetaValue, initDb, setMetaValue } from './db'

type AppState = {
  tasks: Task[]
  inboxItems: InboxItem[]
  notes: Note[]
  links: NoteTaskLink[]
  selectedDayKey: string
  wakeTime: string
  sleepTime: string
  isReady: boolean
  init: () => Promise<void>
  refreshFromDb: () => Promise<void>
  addInboxItem: (text: string) => void
  setSelectedDayKey: (dayKey: string) => void
  updateRoutine: (updates: { wakeTime?: string; sleepTime?: string }) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  toggleTaskDone: (id: string) => void
  deleteTask: (id: string) => void
  convertInboxToTask: (id: string, dayKey: string) => void
  createNote: (data: Pick<Note, 'title' | 'body'>) => string
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => void
  linkNoteToTask: (noteId: string, taskId: string) => void
  getDailyCapacityMinutes: () => number
  getPlannedDurationMinutesForDay: (dayKey: string) => number
  isOverbookedForDay: (dayKey: string) => boolean
}

const getTodayKey = () => new Date().toISOString().slice(0, 10)

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
    return `${start}-${end}`
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
    const normalizedTasks = tasks.map((task) =>
      task.updatedAt ? task : { ...task, updatedAt: new Date().toISOString() },
    )
    const selectedDayKey = (await getMetaValue('selectedDayKey')) ?? getTodayKey()
    const wakeTime = (await getMetaValue('wakeTime')) ?? '07:00'
    const sleepTime = (await getMetaValue('sleepTime')) ?? '23:00'
    set({
      tasks: normalizedTasks,
      notes,
      inboxItems,
      links,
      selectedDayKey,
      wakeTime,
      sleepTime,
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
  setSelectedDayKey: (dayKey) => {
    set({ selectedDayKey: dayKey })
    void setMetaValue('selectedDayKey', dayKey)
  },
  updateRoutine: (updates) => {
    set((state) => ({
      wakeTime: updates.wakeTime ?? state.wakeTime,
      sleepTime: updates.sleepTime ?? state.sleepTime,
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
        const nextTask: Task = { ...task, status: 'done' as Task['status'], updatedAt: now }
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
  convertInboxToTask: (id, dayKey) => {
    const item = get().inboxItems.find((inbox) => inbox.id === id)
    if (!item) {
      return
    }
    const now = new Date().toISOString()
    const task: Task = {
      id: buildId('task'),
      title: item.text,
      timeLabel: 'Sem horario',
      timeStart: '',
      timeEnd: '',
      status: 'planned',
      dayKey,
      recurrence: 'none',
      subtasks: [],
      linkedNoteIds: [],
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
    const capacity = get().getDailyCapacityMinutes()
    const planned = get().getPlannedDurationMinutesForDay(dayKey)
    return planned > capacity
  },
}))
