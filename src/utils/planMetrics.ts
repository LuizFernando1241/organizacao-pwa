import type { Plan, PlanGoal } from '../types/plan'
import type { Task } from '../types/task'

const clamp = (value: number) => Math.min(1, Math.max(0, value))

export const getGoalProgress = (goal: PlanGoal) => {
  if (goal.targetValue <= 0) {
    return 0
  }
  return clamp(goal.currentValue / goal.targetValue)
}

export const getPlanGoalsProgress = (plan: Plan) => {
  if (plan.goals.length === 0) {
    return null
  }
  const total = plan.goals.reduce((acc, goal) => acc + getGoalProgress(goal), 0)
  return total / plan.goals.length
}

export const getPlanTasksProgress = (plan: Plan, tasks: Task[]) => {
  if (plan.linkedTaskIds.length === 0) {
    return null
  }
  const linked = tasks.filter((task) => plan.linkedTaskIds.includes(task.id))
  if (linked.length === 0) {
    return null
  }
  const doneCount = linked.filter((task) => task.status === 'done').length
  return doneCount / linked.length
}

export const getPlanOverallProgress = (plan: Plan, tasks: Task[]) => {
  const goalsProgress = getPlanGoalsProgress(plan)
  const tasksProgress = getPlanTasksProgress(plan, tasks)

  if (goalsProgress === null && tasksProgress === null) {
    return 0
  }
  if (goalsProgress === null) {
    return tasksProgress ?? 0
  }
  if (tasksProgress === null) {
    return goalsProgress
  }
  return (goalsProgress + tasksProgress) / 2
}
