export type TaskStatus = 'planned' | 'active' | 'overdue' | 'done'
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly'
export type SubtaskStatus = 'PENDING' | 'DONE'

export type Subtask = {
  id: string
  title: string
  status: SubtaskStatus
}

export type Task = {
  id: string
  title: string
  timeLabel: string
  timeStart: string
  timeEnd: string
  status: TaskStatus
  dayKey: string
  recurrence: Recurrence
  subtasks: Subtask[]
  linkedNoteIds: string[]
  updatedAt: string
  deletedAt?: string | null
}
