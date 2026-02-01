import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { Plan, PlanBlock, PlanDecision, PlanGoal, PlanPhase } from '../types/plan'
import type { Task } from '../types/task'
import { getGoalProgress, getPlanGoalsProgress, getPlanOverallProgress, getPlanTasksProgress } from '../utils/planMetrics'
import { formatRelativeTime } from '../utils/time'
import './PlanEditor.css'

type PlanEditorProps = {
  plan: Plan
  tasks: Task[]
  onUpdate: (id: string, updates: Partial<Plan>) => void
  onDelete: (plan: Plan) => void
}

const buildId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`

function PlanEditor({ plan, tasks, onUpdate, onDelete }: PlanEditorProps) {
  const [draft, setDraft] = useState<Plan>(plan)
  const [taskQuery, setTaskQuery] = useState('')
  const saveTimeoutRef = useRef<number | null>(null)

  const scheduleUpdate = (updates: Partial<Plan>) => {
    setDraft((prev) => {
      const next = { ...prev, ...updates }
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = window.setTimeout(() => {
        onUpdate(plan.id, next)
      }, 400)
      return next
    })
  }

  const updateGoal = (goalId: string, updates: Partial<PlanGoal>) => {
    const goals = draft.goals.map((goal) => (goal.id === goalId ? { ...goal, ...updates } : goal))
    scheduleUpdate({ goals })
  }

  const removeGoal = (goalId: string) => {
    scheduleUpdate({ goals: draft.goals.filter((goal) => goal.id !== goalId) })
  }

  const addGoal = () => {
    const goal: PlanGoal = { id: buildId('goal'), label: '', currentValue: 0, targetValue: 0, unit: '' }
    scheduleUpdate({ goals: [...draft.goals, goal] })
  }

  const updateBlock = (blockId: string, updates: Partial<PlanBlock>) => {
    const blocks = draft.blocks.map((block) => (block.id === blockId ? { ...block, ...updates } : block))
    scheduleUpdate({ blocks })
  }

  const removeBlock = (blockId: string) => {
    scheduleUpdate({ blocks: draft.blocks.filter((block) => block.id !== blockId) })
  }

  const addBlock = () => {
    const block: PlanBlock = { id: buildId('block'), title: 'Novo bloco', body: '' }
    scheduleUpdate({ blocks: [...draft.blocks, block] })
  }

  const updatePhase = (phaseId: string, updates: Partial<PlanPhase>) => {
    const phases = draft.phases.map((phase) => (phase.id === phaseId ? { ...phase, ...updates } : phase))
    scheduleUpdate({ phases })
  }

  const removePhase = (phaseId: string) => {
    scheduleUpdate({ phases: draft.phases.filter((phase) => phase.id !== phaseId) })
  }

  const addPhase = () => {
    const phase: PlanPhase = {
      id: buildId('phase'),
      title: 'Nova fase',
      startDate: '',
      endDate: '',
      status: 'planned',
    }
    scheduleUpdate({ phases: [...draft.phases, phase] })
  }

  const updateDecision = (decisionId: string, updates: Partial<PlanDecision>) => {
    const decisions = draft.decisions.map((decision) => (decision.id === decisionId ? { ...decision, ...updates } : decision))
    scheduleUpdate({ decisions })
  }

  const removeDecision = (decisionId: string) => {
    scheduleUpdate({ decisions: draft.decisions.filter((decision) => decision.id !== decisionId) })
  }

  const addDecision = () => {
    const decision: PlanDecision = {
      id: buildId('decision'),
      summary: '',
      decidedAt: new Date().toISOString().slice(0, 10),
    }
    scheduleUpdate({ decisions: [...draft.decisions, decision] })
  }

  const linkedTasks = useMemo(
    () => tasks.filter((task) => draft.linkedTaskIds.includes(task.id)),
    [tasks, draft.linkedTaskIds],
  )

  const filteredTasks = useMemo(() => {
    const term = taskQuery.trim().toLowerCase()
    if (!term) {
      return tasks
    }
    return tasks.filter((task) => task.title.toLowerCase().includes(term))
  }, [tasks, taskQuery])

  const toggleTaskLink = (taskId: string) => {
    const isLinked = draft.linkedTaskIds.includes(taskId)
    const nextIds = isLinked ? draft.linkedTaskIds.filter((id) => id !== taskId) : [...draft.linkedTaskIds, taskId]
    scheduleUpdate({ linkedTaskIds: nextIds })
  }

  const goalsProgress = getPlanGoalsProgress(draft)
  const tasksProgress = getPlanTasksProgress(draft, tasks)
  const overallProgress = getPlanOverallProgress(draft, tasks)

  return (
    <div className="plan-editor">
      <div className="plan-editor__main">
        <div className="plan-editor__header">
          <input
            className="plan-editor__title"
            value={draft.title}
            onChange={(event) => scheduleUpdate({ title: event.target.value })}
            placeholder="Titulo do planejamento"
          />
          <input
            className="plan-editor__subtitle"
            value={draft.subtitle}
            onChange={(event) => scheduleUpdate({ subtitle: event.target.value })}
            placeholder="Resumo curto do objetivo"
          />
          <div className="plan-editor__meta-row">
            <label className="plan-editor__field">
              <span>Status</span>
              <select
                value={draft.status}
                onChange={(event) => scheduleUpdate({ status: event.target.value as Plan['status'] })}
              >
                <option value="active">Ativo</option>
                <option value="done">Concluido</option>
                <option value="archived">Arquivado</option>
              </select>
            </label>
            <label className="plan-editor__field">
              <span>Inicio</span>
              <input
                type="date"
                value={draft.startDate}
                onChange={(event) => scheduleUpdate({ startDate: event.target.value })}
              />
            </label>
            <label className="plan-editor__field">
              <span>Fim</span>
              <input
                type="date"
                value={draft.endDate}
                onChange={(event) => scheduleUpdate({ endDate: event.target.value })}
              />
            </label>
            <div className="plan-editor__updated">Atualizado {formatRelativeTime(draft.updatedAt)}</div>
          </div>
        </div>

        <section className="plan-section">
          <div className="plan-section__header">
            <h2>Metas numericas</h2>
            <button type="button" className="plan-section__add" onClick={addGoal}>
              <Plus size={16} aria-hidden="true" /> Nova meta
            </button>
          </div>
          {draft.goals.length === 0 ? (
            <div className="plan-section__empty">Adicione metas para medir o progresso.</div>
          ) : (
            <div className="plan-goals">
              {draft.goals.map((goal) => {
                const progress = getGoalProgress(goal)
                return (
                  <div key={goal.id} className="plan-goal">
                    <input
                      className="plan-goal__label"
                      value={goal.label}
                      onChange={(event) => updateGoal(goal.id, { label: event.target.value })}
                      placeholder="Nome da meta"
                    />
                    <div className="plan-goal__values">
                      <input
                        type="number"
                        value={goal.currentValue}
                        onChange={(event) => updateGoal(goal.id, { currentValue: Number(event.target.value) })}
                        placeholder="Atual"
                      />
                      <span className="plan-goal__sep">/</span>
                      <input
                        type="number"
                        value={goal.targetValue}
                        onChange={(event) => updateGoal(goal.id, { targetValue: Number(event.target.value) })}
                        placeholder="Meta"
                      />
                      <input
                        value={goal.unit}
                        onChange={(event) => updateGoal(goal.id, { unit: event.target.value })}
                        placeholder="Unidade"
                      />
                      <button type="button" className="plan-goal__remove" onClick={() => removeGoal(goal.id)}>
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                    <div className="plan-goal__progress">
                      <div className="plan-goal__progress-bar">
                        <span style={{ width: `${progress * 100}%` }} />
                      </div>
                      <span className="plan-goal__progress-label">{Math.round(progress * 100)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="plan-section">
          <div className="plan-section__header">
            <h2>Blocos livres</h2>
            <button type="button" className="plan-section__add" onClick={addBlock}>
              <Plus size={16} aria-hidden="true" /> Novo bloco
            </button>
          </div>
          {draft.blocks.length === 0 ? (
            <div className="plan-section__empty">Adicione contexto, estrategia ou riscos.</div>
          ) : (
            <div className="plan-blocks">
              {draft.blocks.map((block) => (
                <div key={block.id} className="plan-block">
                  <div className="plan-block__header">
                    <input
                      value={block.title}
                      onChange={(event) => updateBlock(block.id, { title: event.target.value })}
                      placeholder="Titulo do bloco"
                    />
                    <button type="button" className="plan-block__remove" onClick={() => removeBlock(block.id)}>
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                  <textarea
                    value={block.body}
                    onChange={(event) => updateBlock(block.id, { body: event.target.value })}
                    placeholder="Escreva livremente..."
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="plan-section">
          <div className="plan-section__header">
            <h2>Roadmap / fases</h2>
            <button type="button" className="plan-section__add" onClick={addPhase}>
              <Plus size={16} aria-hidden="true" /> Nova fase
            </button>
          </div>
          {draft.phases.length === 0 ? (
            <div className="plan-section__empty">Defina etapas para executar o plano.</div>
          ) : (
            <div className="plan-phases">
              {draft.phases.map((phase) => (
                <div key={phase.id} className="plan-phase">
                  <input
                    value={phase.title}
                    onChange={(event) => updatePhase(phase.id, { title: event.target.value })}
                    placeholder="Nome da fase"
                  />
                  <div className="plan-phase__row">
                    <input
                      type="date"
                      value={phase.startDate}
                      onChange={(event) => updatePhase(phase.id, { startDate: event.target.value })}
                    />
                    <input
                      type="date"
                      value={phase.endDate}
                      onChange={(event) => updatePhase(phase.id, { endDate: event.target.value })}
                    />
                    <select
                      value={phase.status}
                      onChange={(event) => updatePhase(phase.id, { status: event.target.value as PlanPhase['status'] })}
                    >
                      <option value="planned">Planejado</option>
                      <option value="active">Em andamento</option>
                      <option value="done">Concluido</option>
                    </select>
                    <button type="button" className="plan-phase__remove" onClick={() => removePhase(phase.id)}>
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="plan-section">
          <div className="plan-section__header">
            <h2>Decisoes</h2>
            <button type="button" className="plan-section__add" onClick={addDecision}>
              <Plus size={16} aria-hidden="true" /> Nova decisao
            </button>
          </div>
          {draft.decisions.length === 0 ? (
            <div className="plan-section__empty">Registre decisoes importantes para o historico.</div>
          ) : (
            <div className="plan-decisions">
              {draft.decisions.map((decision) => (
                <div key={decision.id} className="plan-decision">
                  <textarea
                    value={decision.summary}
                    onChange={(event) => updateDecision(decision.id, { summary: event.target.value })}
                    placeholder="Descreva a decisao..."
                  />
                  <div className="plan-decision__row">
                    <input
                      type="date"
                      value={decision.decidedAt}
                      onChange={(event) => updateDecision(decision.id, { decidedAt: event.target.value })}
                    />
                    <button type="button" className="plan-decision__remove" onClick={() => removeDecision(decision.id)}>
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="plan-editor__side">
        <div className="plan-side-card">
          <h3>Progresso geral</h3>
          <div className="plan-side-card__progress">
            <div className="plan-side-card__bar">
              <span style={{ width: `${overallProgress * 100}%` }} />
            </div>
            <span>{Math.round(overallProgress * 100)}%</span>
          </div>
          <div className="plan-side-card__meta">
            <div>
              <span>Metas</span>
              <strong>{goalsProgress === null ? '--' : `${Math.round(goalsProgress * 100)}%`}</strong>
            </div>
            <div>
              <span>Tarefas</span>
              <strong>{tasksProgress === null ? '--' : `${Math.round(tasksProgress * 100)}%`}</strong>
            </div>
          </div>
        </div>

        <div className="plan-side-card">
          <h3>Tarefas vinculadas</h3>
          {linkedTasks.length === 0 ? (
            <div className="plan-side-card__empty">Nenhuma tarefa vinculada.</div>
          ) : (
            <ul className="plan-side-card__tasks">
              {linkedTasks.map((task) => (
                <li key={task.id} className={task.status === 'done' ? 'is-done' : ''}>
                  {task.title || 'Tarefa sem titulo'}
                </li>
              ))}
            </ul>
          )}
          <input
            className="plan-side-card__search"
            value={taskQuery}
            onChange={(event) => setTaskQuery(event.target.value)}
            placeholder="Buscar tarefas..."
          />
          <div className="plan-side-card__task-list">
            {filteredTasks.map((task) => {
              const checked = draft.linkedTaskIds.includes(task.id)
              return (
                <label key={task.id} className={`plan-task-option${checked ? ' is-checked' : ''}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleTaskLink(task.id)} />
                  <span>{task.title || 'Tarefa sem titulo'}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="plan-side-card plan-side-card--danger">
          <h3>Zona de risco</h3>
          <button type="button" className="plan-side-card__delete" onClick={() => onDelete(plan)}>
            Excluir planejamento
          </button>
        </div>
      </aside>
    </div>
  )
}

export default PlanEditor
