import type { Note } from '../types/note'
import type { NoteTaskLink } from '../types/link'
import type { Task } from '../types/task'
import { db, getMetaValue, setMetaValue } from '../store/db'
import { useAppStore } from '../store/useAppStore'

type SyncOp = {
  opId: string
  entityType: string
  entityId: string
  opType: 'create' | 'update' | 'delete'
  payload: Record<string, unknown>
  status: 'pending' | 'acked'
}

type PullResponse = {
  tasks: Array<Record<string, unknown>>
  notes: Array<Record<string, unknown>>
  links: Array<Record<string, unknown>>
  newCursor: string
}

const API_BASE = import.meta.env.VITE_SYNC_API_URL ?? ''

const buildHeaders = async () => {
  const deviceId = (await getMetaValue('deviceId')) ?? 'default-user'
  return {
    'content-type': 'application/json',
    'x-user-id': deviceId,
  }
}

const normalizeTask = (row: Record<string, unknown>): Task => {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    timeLabel: row.time_start && row.time_end ? `${row.time_start}-${row.time_end}` : 'Sem horario',
    timeStart: String(row.time_start ?? ''),
    timeEnd: String(row.time_end ?? ''),
    status: (row.status as Task['status']) ?? 'planned',
    dayKey: String(row.day_key ?? ''),
    recurrence: (row.recurrence as Task['recurrence']) ?? 'none',
    subtasks: Array.isArray(row.subtasks) ? (row.subtasks as Task['subtasks']) : JSON.parse(String(row.subtasks ?? '[]')),
    linkedNoteIds: Array.isArray(row.linked_note_ids)
      ? (row.linked_note_ids as string[])
      : JSON.parse(String(row.linked_note_ids ?? '[]')),
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

export const pushChanges = async () => {
  const pending = (await db.ops_queue.where('status').equals('pending').toArray()) as SyncOp[]
  if (pending.length === 0) {
    return
  }
  const response = await fetch(`${API_BASE}/sync/push`, {
    method: 'POST',
    headers: await buildHeaders(),
    body: JSON.stringify(
      pending.map((op) => ({
        opId: op.opId,
        entityType: op.entityType,
        entityId: op.entityId,
        opType: op.opType,
        payload: op.payload,
      })),
    ),
  })
  if (!response.ok) {
    return
  }
  const data = (await response.json()) as { acked?: string[] }
  const acked = data.acked ?? []
  await db.ops_queue.where('opId').anyOf(acked).modify({ status: 'acked' })
}

export const pullChanges = async () => {
  const cursor = (await getMetaValue('lastSyncCursor')) ?? '1970-01-01T00:00:00.000Z'
  const response = await fetch(`${API_BASE}/sync/pull?cursor=${encodeURIComponent(cursor)}`, {
    headers: await buildHeaders(),
  })
  if (!response.ok) {
    return
  }
  const data = (await response.json()) as PullResponse
  const taskRows = data.tasks ?? []
  const noteRows = data.notes ?? []
  const linkRows = data.links ?? []

  const tasks = taskRows.map((row) => normalizeTask(row))
  const notes = noteRows.map((row) => normalizeNote(row))
  const links = linkRows.map((row) => normalizeLink(row))

  await db.transaction('rw', db.tasks, db.notes, db.links, async () => {
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
        await db.links.put({ noteId: link.noteId, taskId: link.taskId })
      }
    }
  })

  await setMetaValue('lastSyncCursor', data.newCursor ?? new Date().toISOString())
  const refresh = useAppStore.getState().refreshFromDb
  await refresh()
}

export const startSync = () => {
  let intervalId: number | null = null

  const run = async () => {
    if (!navigator.onLine) {
      return
    }
    await pushChanges()
    await pullChanges()
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
