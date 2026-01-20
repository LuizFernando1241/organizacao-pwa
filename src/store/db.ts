import Dexie, { type Table } from 'dexie'
import type { InboxItem } from '../types/inbox'
import type { Note } from '../types/note'
import type { NoteTaskLink } from '../types/link'
import type { Task } from '../types/task'
import type { OpsQueueStatus } from '../types/ops'

export type OpsQueueItem = {
  opId: string
  entityType: string
  entityId: string
  opType: 'create' | 'update' | 'delete'
  payload: Record<string, unknown>
  status: OpsQueueStatus
  createdAt: string
}

export type MetaItem = {
  key: string
  value: string
}

class AppDB extends Dexie {
  tasks!: Table<Task, string>
  notes!: Table<Note, string>
  links!: Table<NoteTaskLink & { id?: number }, number>
  inbox_items!: Table<InboxItem, string>
  ops_queue!: Table<OpsQueueItem, string>
  meta!: Table<MetaItem, string>

  constructor() {
    super('organizacao-db')
    this.version(1).stores({
      tasks: 'id, dayKey, status',
      notes: 'id, updatedAt',
      links: '++id, taskId, noteId',
      inbox_items: 'id',
      ops_queue: 'opId, entityType, entityId, opType, status',
      meta: 'key',
    })
  }
}

export const db = new AppDB()

const getDefaultUserId = () => {
  const envUserId = import.meta.env.VITE_USER_ID
  if (typeof envUserId === 'string' && envUserId.trim()) {
    return envUserId.trim()
  }
  return 'shared-user'
}

const getTodayKey = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const seedTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Revisar agenda da semana',
    timeLabel: '09:00 - 09:30',
    timeStart: '09:00',
    timeEnd: '09:30',
    status: 'planned',
    dayKey: getTodayKey(),
    recurrence: 'none',
    subtasks: [
      { id: 'subtask-1', title: 'Checar prioridades', status: 'PENDING' },
      { id: 'subtask-2', title: 'Rever compromissos', status: 'DONE' },
    ],
    linkedNoteIds: [],
    timeSpent: 0,
    isTimerRunning: false,
    lastTimerStart: null,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task-2',
    title: 'Planejar tarefas urgentes',
    timeLabel: '10:00 - 10:30',
    timeStart: '10:00',
    timeEnd: '10:30',
    status: 'active',
    dayKey: getTodayKey(),
    recurrence: 'none',
    subtasks: [],
    linkedNoteIds: [],
    timeSpent: 0,
    isTimerRunning: false,
    lastTimerStart: null,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task-3',
    title: 'Responder mensagens pendentes',
    timeLabel: 'Sem horario',
    timeStart: '',
    timeEnd: '',
    status: 'overdue',
    dayKey: getTodayKey(),
    recurrence: 'none',
    subtasks: [],
    linkedNoteIds: [],
    timeSpent: 0,
    isTimerRunning: false,
    lastTimerStart: null,
    updatedAt: new Date().toISOString(),
  },
]

const seedInbox: InboxItem[] = [
  { id: 'inbox-1', text: 'Ideia para nota rapida', createdAt: new Date().toISOString() },
]

const seedNotes: Note[] = [
  {
    id: 'note-1',
    title: 'Resumo da semana',
    body: 'Listar pontos importantes para manter o foco no que realmente importa.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-2',
    title: '',
    body: 'Checklist para a reuniao: revisar dados, alinhar objetivos, definir proximos passos.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const buildId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`

export const initDb = async () => {
  const [taskCount, noteCount, inboxCount] = await Promise.all([
    db.tasks.count(),
    db.notes.count(),
    db.inbox_items.count(),
  ])

  if (taskCount === 0) {
    await db.tasks.bulkAdd(seedTasks)
  }
  if (noteCount === 0) {
    await db.notes.bulkAdd(seedNotes)
  }
  if (inboxCount === 0) {
    await db.inbox_items.bulkAdd(seedInbox)
  }

  const deviceId = await db.meta.get('deviceId')
  if (!deviceId) {
    await db.meta.put({ key: 'deviceId', value: buildId('device') })
  }
  const userId = await db.meta.get('userId')
  if (!userId) {
    await db.meta.put({ key: 'userId', value: getDefaultUserId() })
  }
  const selectedDayKey = await db.meta.get('selectedDayKey')
  if (!selectedDayKey) {
    await db.meta.put({ key: 'selectedDayKey', value: getTodayKey() })
  }
  const wakeTime = await db.meta.get('wakeTime')
  if (!wakeTime) {
    await db.meta.put({ key: 'wakeTime', value: '07:00' })
  }
  const sleepTime = await db.meta.get('sleepTime')
  if (!sleepTime) {
    await db.meta.put({ key: 'sleepTime', value: '23:00' })
  }
  const applyRoutineAllDays = await db.meta.get('applyRoutineAllDays')
  if (!applyRoutineAllDays) {
    await db.meta.put({ key: 'applyRoutineAllDays', value: 'false' })
  }
  const warnOverbooked = await db.meta.get('warnOverbooked')
  if (!warnOverbooked) {
    await db.meta.put({ key: 'warnOverbooked', value: 'true' })
  }
  const blockOverbooked = await db.meta.get('blockOverbooked')
  if (!blockOverbooked) {
    await db.meta.put({ key: 'blockOverbooked', value: 'false' })
  }
  const lastSyncCursor = await db.meta.get('lastSyncCursor')
  if (!lastSyncCursor) {
    await db.meta.put({ key: 'lastSyncCursor', value: '1970-01-01T00:00:00.000Z' })
  }
}

export const getMetaValue = async (key: string) => {
  const entry = await db.meta.get(key)
  return entry?.value
}

export const setMetaValue = async (key: string, value: string) => {
  await db.meta.put({ key, value })
}

const buildOpId = () => (crypto?.randomUUID ? crypto.randomUUID() : buildId('op'))
const syncableEntityTypes = new Set(['task', 'note', 'link'])

const emitSyncQueueUpdated = () => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return
  }
  const event = typeof CustomEvent === 'function' ? new CustomEvent('sync-queue-updated') : new Event('sync-queue-updated')
  window.dispatchEvent(event)
}

export const enqueueOp = async (payload: Omit<OpsQueueItem, 'opId' | 'status' | 'createdAt'>) => {
  if (!syncableEntityTypes.has(payload.entityType)) {
    return
  }
  await db.ops_queue.add({
    ...payload,
    opId: buildOpId(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  })
  emitSyncQueueUpdated()
}
