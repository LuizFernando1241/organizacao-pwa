export type PlanStatus = 'active' | 'done' | 'archived'
export type PlanPhaseStatus = 'planned' | 'active' | 'done'

export type PlanGoal = {
  id: string
  label: string
  currentValue: number
  targetValue: number
  unit: string
}

export type PlanBlock = {
  id: string
  title: string
  body: string
}

export type PlanPhase = {
  id: string
  title: string
  startDate: string
  endDate: string
  status: PlanPhaseStatus
}

export type PlanDecision = {
  id: string
  summary: string
  decidedAt: string
}

export type Plan = {
  id: string
  title: string
  subtitle: string
  status: PlanStatus
  startDate: string
  endDate: string
  goals: PlanGoal[]
  blocks: PlanBlock[]
  phases: PlanPhase[]
  decisions: PlanDecision[]
  linkedTaskIds: string[]
  createdAt: string
  updatedAt: string
}
