type Env = {
  DB: D1Database
}

type SyncOp = {
  opId: string
  entityType: string
  entityId: string
  opType: 'create' | 'update' | 'delete'
  payload: Record<string, unknown>
}

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type,x-user-id',
}

const jsonResponse = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...corsHeaders,
      ...(init.headers ?? {}),
    },
  })

const missingDbResponse = () => jsonResponse({ error: 'DB binding missing.' }, { status: 500 })

const ensureUser = async (db: D1Database, userId: string) => {
  await db.prepare('INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)').bind(userId, new Date().toISOString()).run()
}

const getUserId = (request: Request) => request.headers.get('x-user-id') ?? 'default-user'

const getOpTimestamp = (payload: Record<string, unknown>) => {
  const updatedAt = payload.updatedAt ?? payload.updated_at
  return typeof updatedAt === 'string' ? updatedAt : new Date().toISOString()
}

const parseJson = async (request: Request) => {
  try {
    return await request.json()
  } catch {
    return null
  }
}

const shouldApplyUpdate = async (db: D1Database, table: string, id: string, opUpdatedAt: string) => {
  const existing = await db.prepare(`SELECT updated_at FROM ${table} WHERE id = ?`).bind(id).first<{ updated_at: string }>()
  if (!existing?.updated_at) {
    return true
  }
  return existing.updated_at <= opUpdatedAt
}

const upsertTask = async (db: D1Database, userId: string, payload: Record<string, unknown>, opUpdatedAt: string) => {
  const id = String(payload.id ?? '')
  if (!id) {
    return
  }
  const canUpdate = await shouldApplyUpdate(db, 'tasks', id, opUpdatedAt)
  if (!canUpdate) {
    return
  }
  await db
    .prepare(
      `INSERT INTO tasks (id, user_id, title, time_start, time_end, status, day_key, recurrence, subtasks, linked_note_ids, time_spent, is_timer_running, last_timer_start, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         time_start = excluded.time_start,
         time_end = excluded.time_end,
         status = excluded.status,
         day_key = excluded.day_key,
         recurrence = excluded.recurrence,
         subtasks = excluded.subtasks,
         linked_note_ids = excluded.linked_note_ids,
         time_spent = excluded.time_spent,
         is_timer_running = excluded.is_timer_running,
         last_timer_start = excluded.last_timer_start,
         updated_at = excluded.updated_at,
         deleted_at = NULL`,
    )
    .bind(
      id,
      userId,
      payload.title ?? '',
      payload.timeStart ?? payload.time_start ?? '',
      payload.timeEnd ?? payload.time_end ?? '',
      payload.status ?? 'planned',
      payload.dayKey ?? payload.day_key ?? '',
      payload.recurrence ?? 'none',
      JSON.stringify(payload.subtasks ?? []),
      JSON.stringify(payload.linkedNoteIds ?? payload.linked_note_ids ?? []),
      payload.timeSpent ?? payload.time_spent ?? 0,
      payload.isTimerRunning ?? payload.is_timer_running ?? 0,
      payload.lastTimerStart ?? payload.last_timer_start ?? null,
      opUpdatedAt,
    )
    .run()
}

const upsertNote = async (db: D1Database, userId: string, payload: Record<string, unknown>, opUpdatedAt: string) => {
  const id = String(payload.id ?? '')
  if (!id) {
    return
  }
  const canUpdate = await shouldApplyUpdate(db, 'notes', id, opUpdatedAt)
  if (!canUpdate) {
    return
  }
  await db
    .prepare(
      `INSERT INTO notes (id, user_id, title, body, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         body = excluded.body,
         updated_at = excluded.updated_at,
         deleted_at = NULL`,
    )
    .bind(id, userId, payload.title ?? '', payload.body ?? '', opUpdatedAt)
    .run()
}

const upsertLink = async (db: D1Database, userId: string, payload: Record<string, unknown>, opUpdatedAt: string) => {
  const taskId = String(payload.taskId ?? payload.task_id ?? '')
  const noteId = String(payload.noteId ?? payload.note_id ?? '')
  if (!taskId || !noteId) {
    return
  }
  const id = `${taskId}:${noteId}`
  const canUpdate = await shouldApplyUpdate(db, 'links', id, opUpdatedAt)
  if (!canUpdate) {
    return
  }
  await db
    .prepare(
      `INSERT INTO links (id, user_id, task_id, note_id, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         task_id = excluded.task_id,
         note_id = excluded.note_id,
         updated_at = excluded.updated_at,
         deleted_at = NULL`,
    )
    .bind(id, userId, taskId, noteId, opUpdatedAt)
    .run()
}

const upsertInboxItem = async (db: D1Database, userId: string, payload: Record<string, unknown>, opUpdatedAt: string) => {
  const id = String(payload.id ?? '')
  if (!id) {
    return
  }
  const canUpdate = await shouldApplyUpdate(db, 'inbox_items', id, opUpdatedAt)
  if (!canUpdate) {
    return
  }
  const createdAt = String(payload.createdAt ?? payload.created_at ?? opUpdatedAt)
  await db
    .prepare(
      `INSERT INTO inbox_items (id, user_id, text, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         text = excluded.text,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         deleted_at = NULL`,
    )
    .bind(id, userId, payload.text ?? '', createdAt, opUpdatedAt)
    .run()
}

const upsertMeta = async (db: D1Database, userId: string, entityId: string, payload: Record<string, unknown>, opUpdatedAt: string) => {
  const key = String(payload.key ?? entityId ?? '')
  if (!key) {
    return
  }
  const value =
    payload.value !== undefined
      ? String(payload.value)
      : payload[key] !== undefined
        ? String(payload[key])
        : ''
  const id = `${userId}:${key}`
  const canUpdate = await shouldApplyUpdate(db, 'user_meta', id, opUpdatedAt)
  if (!canUpdate) {
    return
  }
  await db
    .prepare(
      `INSERT INTO user_meta (id, user_id, meta_key, value, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         meta_key = excluded.meta_key,
         value = excluded.value,
         updated_at = excluded.updated_at,
         deleted_at = NULL`,
    )
    .bind(id, userId, key, value, opUpdatedAt)
    .run()
}

const markDeleted = async (db: D1Database, table: string, id: string, opUpdatedAt: string) => {
  await db
    .prepare(`UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE id = ?`)
    .bind(opUpdatedAt, opUpdatedAt, id)
    .run()
}

export default {
  fetch: async (request: Request, env: Env, _ctx: ExecutionContext) => {
    try {
      const url = new URL(request.url)

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: { ...corsHeaders } })
      }

      if (url.pathname === '/favicon.ico') {
        return new Response(null, { status: 204 })
      }

      if (url.pathname === '/' || url.pathname === '/message') {
        return jsonResponse({ ok: true })
      }

      if (url.pathname === '/sync/push' && request.method === 'POST') {
        if (!env.DB) {
          return missingDbResponse()
        }
        const body = await parseJson(request)
        if (!Array.isArray(body)) {
          return jsonResponse({ error: 'Payload must be an array.' }, { status: 400 })
        }
        const userId = getUserId(request)
        await ensureUser(env.DB, userId)
        const acked: string[] = []
        for (const op of body as SyncOp[]) {
          if (!op || !op.opId) {
            continue
          }
          const opUpdatedAt = getOpTimestamp(op.payload ?? {})
      if (op.entityType === 'task') {
        if (op.opType === 'delete') {
          await markDeleted(env.DB, 'tasks', op.entityId, opUpdatedAt)
        } else {
              await upsertTask(env.DB, userId, op.payload ?? {}, opUpdatedAt)
            }
            acked.push(op.opId)
      } else if (op.entityType === 'note') {
        if (op.opType === 'delete') {
          await markDeleted(env.DB, 'notes', op.entityId, opUpdatedAt)
        } else {
              await upsertNote(env.DB, userId, op.payload ?? {}, opUpdatedAt)
            }
            acked.push(op.opId)
      } else if (op.entityType === 'link') {
        if (op.opType === 'delete') {
          await markDeleted(env.DB, 'links', op.entityId, opUpdatedAt)
        } else {
              await upsertLink(env.DB, userId, op.payload ?? {}, opUpdatedAt)
        }
        acked.push(op.opId)
      } else if (op.entityType === 'inbox') {
        if (op.opType === 'delete') {
          await markDeleted(env.DB, 'inbox_items', op.entityId, opUpdatedAt)
        } else {
          await upsertInboxItem(env.DB, userId, op.payload ?? {}, opUpdatedAt)
        }
        acked.push(op.opId)
      } else if (op.entityType === 'meta') {
        if (op.opType === 'delete') {
          const metaId = `${userId}:${op.entityId}`
          await markDeleted(env.DB, 'user_meta', metaId, opUpdatedAt)
        } else {
          await upsertMeta(env.DB, userId, op.entityId, op.payload ?? {}, opUpdatedAt)
        }
        acked.push(op.opId)
      }
    }
    return jsonResponse({ acked })
  }

      if (url.pathname === '/sync/pull' && request.method === 'GET') {
        if (!env.DB) {
          return missingDbResponse()
        }
        const cursor = url.searchParams.get('cursor') ?? '1970-01-01T00:00:00.000Z'
        const userId = getUserId(request)
        await ensureUser(env.DB, userId)
        const [tasks, notes, links, inboxItems, meta] = await Promise.all([
          env.DB.prepare(
            `SELECT * FROM tasks WHERE user_id = ? AND (updated_at > ? OR deleted_at > ?)`,
          )
            .bind(userId, cursor, cursor)
            .all(),
          env.DB.prepare(
            `SELECT * FROM notes WHERE user_id = ? AND (updated_at > ? OR deleted_at > ?)`,
          )
            .bind(userId, cursor, cursor)
            .all(),
          env.DB.prepare(
            `SELECT * FROM links WHERE user_id = ? AND (updated_at > ? OR deleted_at > ?)`,
          )
            .bind(userId, cursor, cursor)
            .all(),
          env.DB.prepare(
            `SELECT * FROM inbox_items WHERE user_id = ? AND (updated_at > ? OR deleted_at > ?)`,
          )
            .bind(userId, cursor, cursor)
            .all(),
          env.DB.prepare(
            `SELECT * FROM user_meta WHERE user_id = ? AND (updated_at > ? OR deleted_at > ?)`,
          )
            .bind(userId, cursor, cursor)
            .all(),
        ])
        const newCursor = new Date().toISOString()
        return jsonResponse({
          tasks: tasks.results,
          notes: notes.results,
          links: links.results,
          inbox_items: inboxItems.results,
          meta: meta.results,
          newCursor,
        })
      }

      return jsonResponse({ error: 'Not Found' }, { status: 404 })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown worker error.'
      console.error(error)
      return jsonResponse({ error: message }, { status: 500 })
    }
  },
}
