import type { Note } from '../types/note'
import type { InboxItem } from '../types/inbox'
import type { NoteTaskLink } from '../types/link'
import type { Plan } from '../types/plan'
import type { Task } from '../types/task'
import type { OpsQueueStatus } from '../types/ops'
import { db, getMetaValue, setMetaValue } from '../store/db'
import { useAppStore } from '../store/useAppStore'

type SyncOp = {
  opId: string
  entityType: string
  entityId: string
  opType: 'create' | 'update' | 'delete'
  payload: Record<string, unknown>
  status: OpsQueueStatus
}

type PullResponse = {
  tasks: Array<Record<string, unknown>>
  notes: Array<Record<string, unknown>>
  links: Array<Record<string, unknown>>
  plans?: Array<Record<string, unknown>>
  inbox_items?: Array<Record<string, unknown>>
  inboxItems?: Array<Record<string, unknown>>
  meta?: Array<Record<string, unknown>>
  settings?: Array<Record<string, unknown>>
  newCursor: string
}

const API_BASE = import.meta.env.VITE_SYNC_API_URL ?? ''
const syncableEntityTypes = new Set(['task', 'note', 'link', 'inbox', 'meta', 'plan'])
const syncableMetaKeys = new Set([
  'selectedDayKey',
  'wakeTime',
  'sleepTime',
  'applyRoutineAllDays',
  'warnOverbooked',
  'blockOverbooked',
])

const readResponseError = async (response: Response) => {
  const text = await response.text().catch(() => '')
  if (text) {
    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string }
      if (parsed?.error) {
        return parsed.error
      }
      if (parsed?.message) {
        return parsed.message
      }
    } catch {
      // Keep text fallback when not JSON.
    }
    return text
  }
  return response.statusText || `HTTP ${response.status}`
}


const buildTimeLabel = (start: string, end: string) => {
  if (start && end) {
    return `${start} - ${end}`
  }
  if (start) {
    return start
  }
  return 'Sem horário'
}

const parseJsonArray = <T>(value: unknown, fallback: T[]) => {
  if (Array.isArray(value)) {
    return value as T[]
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as T[]) : fallback
    } catch {
      return fallback
    }
  }
  return fallback
}

const buildHeaders = async () => {
  const userId =
    (await getMetaValue('userId')) ?? (import.meta.env.VITE_USER_ID ? String(import.meta.env.VITE_USER_ID) : 'shared-user')
  return {
    'content-type': 'application/json',
    'x-user-id': userId,
  }
}

const normalizeTask = (row: Record<string, unknown>): Task => {
  const timeStart = String(row.time_start ?? row.timeStart ?? '')
  const timeEnd = String(row.time_end ?? row.timeEnd ?? '')

  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    timeLabel: buildTimeLabel(timeStart, timeEnd),
    timeStart,
    timeEnd,
    status: (row.status as Task['status']) ?? 'planned',
    dayKey: String(row.day_key ?? row.dayKey ?? ''),
    recurrence: (row.recurrence as Task['recurrence']) ?? 'none',
    recurrenceParentId: row.recurrence_parent_id
      ? String(row.recurrence_parent_id)
      : row.recurrenceParentId
        ? String(row.recurrenceParentId)
        : null,
    subtasks: parseJsonArray<Task['subtasks'][number]>(row.subtasks, []),
    linkedNoteIds: parseJsonArray<string>(row.linked_note_ids ?? row.linkedNoteIds, []),
    timeSpent: Number(row.time_spent ?? row.timeSpent ?? 0),
    isTimerRunning: Boolean(row.is_timer_running ?? row.isTimerRunning ?? false),
    lastTimerStart:
      typeof row.last_timer_start === 'number'
        ? row.last_timer_start
        : typeof row.lastTimerStart === 'number'
          ? row.lastTimerStart
          : null,
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  }
}

const normalizeNote = (row: Record<string, unknown>): Note & { deletedAt?: string | null } => {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    body: String(row.body ?? ''),
    createdAt: String(row.created_at ?? row.updated_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  }
}

const normalizeLink = (row: Record<string, unknown>): NoteTaskLink & { deletedAt?: string | null; updatedAt?: string } => {
  return {
    noteId: String(row.note_id ?? row.noteId ?? ''),
    taskId: String(row.task_id ?? row.taskId ?? ''),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  }
}

const normalizeInboxItem = (row: Record<string, unknown>): InboxItem & { deletedAt?: string | null } => {
  return {
    id: String(row.id),
    text: String(row.text ?? ''),
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  }
}

const normalizePlan = (row: Record<string, unknown>): Plan & { deletedAt?: string | null } => {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    subtitle: String(row.subtitle ?? ''),
    status: (row.status as Plan['status']) ?? 'active',
    startDate: String(row.start_date ?? row.startDate ?? ''),
    endDate: String(row.end_date ?? row.endDate ?? ''),
    goals: parseJsonArray<Plan['goals'][number]>(row.goals, []),
    blocks: parseJsonArray<Plan['blocks'][number]>(row.blocks, []),
    phases: parseJsonArray<Plan['phases'][number]>(row.phases, []),
    decisions: parseJsonArray<Plan['decisions'][number]>(row.decisions, []),
    linkedTaskIds: parseJsonArray<string>(row.linked_task_ids ?? row.linkedTaskIds, []),
    createdAt: String(row.created_at ?? row.createdAt ?? row.updated_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  }
}

const normalizeMetaItem = (row: Record<string, unknown>) => {
  return {
    key: String(row.meta_key ?? row.key ?? ''),
    value: String(row.value ?? ''),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  }
}

const enqueuePlanBootstrap = async () => {
  const alreadyBootstrapped = await getMetaValue('plansSyncBootstrapped')
  if (alreadyBootstrapped === 'true') {
    return
  }
  const plans = await db.plans.toArray()
  if (plans.length === 0) {
    await setMetaValue('plansSyncBootstrapped', 'true')
    return
  }
  const pending = (await db.ops_queue.where('status').equals('pending').toArray()) as SyncOp[]
  const pendingPlanIds = new Set(pending.filter((op) => op.entityType === 'plan').map((op) => op.entityId))
  await Promise.all(
    plans.map((plan) => {
      if (pendingPlanIds.has(plan.id)) {
        return Promise.resolve()
      }
      return db.ops_queue.add({
        opId: crypto?.randomUUID ? crypto.randomUUID() : `${plan.id}-${Date.now()}`,
        entityType: 'plan',
        entityId: plan.id,
        opType: 'create',
        payload: plan as unknown as Record<string, unknown>,
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
    }),
  )
  await setMetaValue('plansSyncBootstrapped', 'true')
}

export const pushChanges = async () => {
  if (!API_BASE) {
    throw new Error('Sync API nao configurada.')
  }
  const pending = (await db.ops_queue.where('status').equals('pending').toArray()) as SyncOp[]
  if (pending.length === 0) {
    return
  }
  const syncable = pending.filter((op) => syncableEntityTypes.has(op.entityType))
  const unsupported = pending.filter((op) => !syncableEntityTypes.has(op.entityType))
  if (unsupported.length > 0) {
    const unsupportedIds = unsupported.map((op) => op.opId)
    await db.ops_queue.where('opId').anyOf(unsupportedIds).delete()
  }
  if (syncable.length === 0) {
    return
  }
  const response = await fetch(`${API_BASE}/sync/push`, {
    method: 'POST',
    headers: await buildHeaders(),
    body: JSON.stringify(
      syncable.map((op) => ({
        opId: op.opId,
        entityType: op.entityType,
        entityId: op.entityId,
        opType: op.opType,
        payload: op.payload,
      })),
    ),
  })
  if (!response.ok) {
    const message = await readResponseError(response)
    throw new Error(`Push falhou (${response.status}): ${message}`)
  }
  const data = (await response.json()) as { acked?: string[] }
  const acked = data.acked ?? []
  if (acked.length > 0) {
    await db.ops_queue.where('opId').anyOf(acked).delete()
  }
}

export const pullChanges = async () => {
  if (!API_BASE) {
    throw new Error('Sync API nao configurada.')
  }
  await enqueuePlanBootstrap()
  const cursor = (await getMetaValue('lastSyncCursor')) ?? '1970-01-01T00:00:00.000Z'
  const response = await fetch(`${API_BASE}/sync/pull?cursor=${encodeURIComponent(cursor)}`, {
    headers: await buildHeaders(),
  })
  if (!response.ok) {
    const message = await readResponseError(response)
    throw new Error(`Pull falhou (${response.status}): ${message}`)
  }
  const data = (await response.json()) as PullResponse
  const taskRows = data.tasks ?? []
  const noteRows = data.notes ?? []
  const linkRows = data.links ?? []
  const planRows = data.plans ?? []
  const inboxRows = data.inbox_items ?? data.inboxItems ?? []
  const metaRows = data.meta ?? data.settings ?? []

  const tasks = taskRows.map((row) => normalizeTask(row))
  const notes = noteRows.map((row) => normalizeNote(row))
  const links = linkRows.map((row) => normalizeLink(row))
  const plans = planRows.map((row) => normalizePlan(row))
  const inboxItems = inboxRows.map((row) => normalizeInboxItem(row))
  const metaItems = metaRows.map((row) => normalizeMetaItem(row))

  await db.transaction('rw', db.tasks, db.notes, db.links, db.plans, async () => {
    for (const task of tasks) {
      if (task.deletedAt) {
        await db.tasks.delete(task.id)
      } else {
        await db.tasks.put(task)
      }
    }
    for (const note of notes) {
      if (note.deletedAt) {
        await db.notes.delete(note.id)
      } else {
        await db.notes.put(note)
      }
    }
    for (const link of links) {
      if (link.deletedAt) {
        await db.links.where('taskId').equals(link.taskId).and((row) => row.noteId === link.noteId).delete()
      } else {
        await db.links.where('taskId').equals(link.taskId).and((row) => row.noteId === link.noteId).delete()
        await db.links.add({ noteId: link.noteId, taskId: link.taskId })
      }
    }
    for (const plan of plans) {
      if (plan.deletedAt) {
        await db.plans.delete(plan.id)
      } else {
        await db.plans.put(plan)
      }
    }
  })

  await db.transaction('rw', db.inbox_items, db.meta, async () => {
    for (const item of inboxItems) {
      if (item.deletedAt) {
        await db.inbox_items.delete(item.id)
      } else {
        await db.inbox_items.put(item)
      }
    }
    for (const meta of metaItems) {
      if (!meta.key || !syncableMetaKeys.has(meta.key)) {
        continue
      }
      if (meta.deletedAt) {
        await db.meta.delete(meta.key)
      } else {
        await setMetaValue(meta.key, meta.value, meta.updatedAt)
      }
    }
  })

  await setMetaValue('lastSyncCursor', data.newCursor ?? new Date().toISOString())
  const refresh = useAppStore.getState().refreshFromDb
  await refresh()
}

export const startSync = () => {
  if (!API_BASE) {
    return () => undefined
  }
  let intervalId: number | null = null

  const run = async () => {
    if (!navigator.onLine) {
      return
    }
    try {
      await pushChanges()
      await pullChanges()
    } catch {
      return
    }
  }

  const onOnline = () => void run()

  const start = () => {
    if (intervalId !== null) {
      return
    }
    intervalId = window.setInterval(() => {
      void run()
    }, 60_000)
    void run()
  }

  const stop = () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId)
      intervalId = null
    }
  }

  window.addEventListener('online', onOnline)
  start()

  return () => {
    stop()
    window.removeEventListener('online', onOnline)
  }
}
