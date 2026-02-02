import type { Plan } from '../types/plan'
import type { Task } from '../types/task'
import { getPlanOverallProgress } from '../utils/planMetrics'
import { formatRelativeTime } from '../utils/time'
import './PlanCard.css'

type PlanCardProps = {
  plan: Plan
  tasks: Task[]
  isActive?: boolean
  onSelect?: (plan: Plan) => void
}

const statusLabels: Record<Plan['status'], string> = {
  active: 'Ativo',
  done: 'Concluído',
  archived: 'Arquivado',
}

function PlanCard({ plan, tasks, isActive, onSelect }: PlanCardProps) {
  const progress = getPlanOverallProgress(plan, tasks)
  const progressLabel = `${Math.round(progress * 100)}%`

  return (
    <button
      type="button"
      className={`plan-card${isActive ? ' plan-card--active' : ''}`}
      onClick={() => onSelect?.(plan)}
      aria-pressed={isActive}
    >
      <div className="plan-card__header">
        <div>
          <div className="plan-card__title">{plan.title || 'Planejamento sem título'}</div>
          {plan.subtitle && <div className="plan-card__subtitle">{plan.subtitle}</div>}
        </div>
        <span className={`plan-card__status plan-card__status--${plan.status}`}>{statusLabels[plan.status]}</span>
      </div>
      <div className="plan-card__meta">
        <span>Atualizado {formatRelativeTime(plan.updatedAt)}</span>
        <span>{plan.goals.length} metas</span>
        <span>{plan.linkedTaskIds.length} tarefas</span>
      </div>
      <div className="plan-card__progress">
        <div className="plan-card__progress-bar">
          <span style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="plan-card__progress-label">{progressLabel}</span>
      </div>
    </button>
  )
}

export default PlanCard
