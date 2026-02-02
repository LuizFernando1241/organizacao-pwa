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

type SectionId = 'overview' | 'goals' | 'blocks' | 'phases' | 'decisions' | 'tasks' | 'settings'

const buildId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`

const statusLabels: Record<Plan['status'], string> = {
  active: 'Ativo',
  done: 'Concluído',
  archived: 'Arquivado',
}

function PlanEditor({ plan, tasks, onUpdate, onDelete }: PlanEditorProps) {
  const [draft, setDraft] = useState<Plan>(plan)
  const [taskQuery, setTaskQuery] = useState('')
  const [activeSection, setActiveSection] = useState<SectionId>('overview')
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

  const recentDecisions = useMemo(
    () =>
      [...draft.decisions].sort((a, b) => new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime()).slice(0, 2),
    [draft.decisions],
  )

  const sections: Array<{ id: SectionId; label: string; count?: number }> = [
    { id: 'overview', label: 'Visão geral' },
    { id: 'goals', label: 'Metas', count: draft.goals.length },
    { id: 'phases', label: 'Roadmap', count: draft.phases.length },
    { id: 'blocks', label: 'Blocos', count: draft.blocks.length },
    { id: 'decisions', label: 'Decisões', count: draft.decisions.length },
    { id: 'tasks', label: 'Tarefas', count: draft.linkedTaskIds.length },
    { id: 'settings', label: 'Gerenciar' },
  ]

  return (
    <div className="plan-editor">
      <header className="plan-editor__hero">
        <div className="plan-editor__identity">
          <input
            className="plan-editor__title"
            value={draft.title}
            onChange={(event) => scheduleUpdate({ title: event.target.value })}
            placeholder="Título do planejamento"
          />
          <input
            className="plan-editor__subtitle"
            value={draft.subtitle}
            onChange={(event) => scheduleUpdate({ subtitle: event.target.value })}
            placeholder="Resumo curto do objetivo"
          />
        </div>
        <div className="plan-editor__meta">
          <label className="plan-editor__field">
            <span>Status</span>
            <select
              value={draft.status}
              onChange={(event) => scheduleUpdate({ status: event.target.value as Plan['status'] })}
            >
              <option value="active">Ativo</option>
              <option value="done">Concluído</option>
              <option value="archived">Arquivado</option>
            </select>
          </label>
          <label className="plan-editor__field">
            <span>Início</span>
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
      </header>

      <nav className="plan-editor__nav" aria-label="Seções do planejamento">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`plan-editor__nav-item${activeSection === section.id ? ' is-active' : ''}`}
            onClick={() => setActiveSection(section.id)}
            aria-pressed={activeSection === section.id}
          >
            <span>{section.label}</span>
            {typeof section.count === 'number' && <span className="plan-editor__nav-count">{section.count}</span>}
          </button>
        ))}
      </nav>

      <div className="plan-editor__body">
        {activeSection === 'overview' && (
          <section className="plan-overview">
            <div className="plan-overview__grid">
              <div className="plan-overview__card plan-overview__card--progress">
                <div className="plan-overview__card-header">
                  <h3>Progresso geral</h3>
                  <span className={`plan-overview__status plan-overview__status--${draft.status}`}>
                    {statusLabels[draft.status]}
                  </span>
                </div>
                <div className="plan-overview__progress">
                  <div className="plan-overview__progress-bar">
                    <span style={{ width: `${overallProgress * 100}%` }} />
                  </div>
                  <span>{Math.round(overallProgress * 100)}%</span>
                </div>
                <div className="plan-overview__meta">
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
              <div className="plan-overview__card">
                <h3>Visão rápida</h3>
                <div className="plan-overview__stats">
                  <div>
                    <span>Metas</span>
                    <strong>{draft.goals.length}</strong>
                  </div>
                  <div>
                    <span>Fases</span>
                    <strong>{draft.phases.length}</strong>
                  </div>
                  <div>
                    <span>Blocos</span>
                    <strong>{draft.blocks.length}</strong>
                  </div>
                  <div>
                    <span>Decisões</span>
                    <strong>{draft.decisions.length}</strong>
                  </div>
                  <div>
                    <span>Tarefas</span>
                    <strong>{draft.linkedTaskIds.length}</strong>
                  </div>
                </div>
                <div className="plan-overview__dates">
                  <span>Janela</span>
                  <strong>
                    {draft.startDate || draft.endDate
                      ? `${draft.startDate || 'Sem início'} → ${draft.endDate || 'Sem fim'}`
                      : 'Sem datas definidas'}
                  </strong>
                </div>
              </div>
              <div className="plan-overview__card">
                <div className="plan-overview__card-header">
                  <h3>Tarefas vinculadas</h3>
                  <button type="button" className="plan-overview__link" onClick={() => setActiveSection('tasks')}>
                    Gerenciar
                  </button>
                </div>
                {linkedTasks.length === 0 ? (
                  <div className="plan-overview__empty">Nenhuma tarefa vinculada ainda.</div>
                ) : (
                  <ul className="plan-overview__list">
                    {linkedTasks.slice(0, 3).map((task) => (
                      <li key={task.id} className={task.status === 'done' ? 'is-done' : ''}>
                        {task.title || 'Tarefa sem título'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="plan-overview__card">
                <div className="plan-overview__card-header">
                  <h3>Decisões recentes</h3>
                  <button type="button" className="plan-overview__link" onClick={() => setActiveSection('decisions')}>
                    Ver todas
                  </button>
                </div>
                {recentDecisions.length === 0 ? (
                  <div className="plan-overview__empty">Registre decisões para manter histórico.</div>
                ) : (
                  <ul className="plan-overview__list">
                    {recentDecisions.map((decision) => (
                      <li key={decision.id}>
                        <span>{decision.summary || 'Sem descrição'}</span>
                        <small>{decision.decidedAt}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}

        {activeSection === 'goals' && (
          <section className="plan-section">
            <div className="plan-section__header">
              <div>
                <h2>Metas numéricas</h2>
                <p className="plan-section__subtitle">Mantenha números claros para medir progresso.</p>
              </div>
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
        )}

        {activeSection === 'blocks' && (
          <section className="plan-section">
            <div className="plan-section__header">
              <div>
                <h2>Blocos livres</h2>
                <p className="plan-section__subtitle">Contexto, estratégia, riscos e aprendizados.</p>
              </div>
              <button type="button" className="plan-section__add" onClick={addBlock}>
                <Plus size={16} aria-hidden="true" /> Novo bloco
              </button>
            </div>
            {draft.blocks.length === 0 ? (
              <div className="plan-section__empty">Adicione contexto, estratégia ou riscos.</div>
            ) : (
              <div className="plan-blocks">
                {draft.blocks.map((block) => (
                  <div key={block.id} className="plan-block">
                    <div className="plan-block__header">
                      <input
                        value={block.title}
                        onChange={(event) => updateBlock(block.id, { title: event.target.value })}
                        placeholder="Título do bloco"
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
        )}

        {activeSection === 'phases' && (
          <section className="plan-section">
            <div className="plan-section__header">
              <div>
                <h2>Roadmap e fases</h2>
                <p className="plan-section__subtitle">Defina etapas claras para executar o plano.</p>
              </div>
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
                        onChange={(event) =>
                          updatePhase(phase.id, { status: event.target.value as PlanPhase['status'] })
                        }
                      >
                        <option value="planned">Planejado</option>
                        <option value="active">Em andamento</option>
                        <option value="done">Concluído</option>
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
        )}

        {activeSection === 'decisions' && (
          <section className="plan-section">
            <div className="plan-section__header">
              <div>
                <h2>Decisões</h2>
                <p className="plan-section__subtitle">Guarde decisões importantes para referência.</p>
              </div>
              <button type="button" className="plan-section__add" onClick={addDecision}>
                <Plus size={16} aria-hidden="true" /> Nova decisão
              </button>
            </div>
            {draft.decisions.length === 0 ? (
              <div className="plan-section__empty">Registre decisões importantes para o histórico.</div>
            ) : (
              <div className="plan-decisions">
                {draft.decisions.map((decision) => (
                  <div key={decision.id} className="plan-decision">
                    <textarea
                      value={decision.summary}
                      onChange={(event) => updateDecision(decision.id, { summary: event.target.value })}
                      placeholder="Descreva a decisão..."
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
        )}

        {activeSection === 'tasks' && (
          <section className="plan-section">
            <div className="plan-section__header">
              <div>
                <h2>Tarefas vinculadas</h2>
                <p className="plan-section__subtitle">Selecione tarefas que representam a execução do plano.</p>
              </div>
            </div>
            <div className="plan-task-manager">
              <div className="plan-task-manager__linked">
                <div className="plan-task-manager__title">
                  <h3>Vinculadas</h3>
                  <span>{linkedTasks.length}</span>
                </div>
                {linkedTasks.length === 0 ? (
                  <div className="plan-task-manager__empty">Nenhuma tarefa vinculada ainda.</div>
                ) : (
                  <ul className="plan-task-manager__list">
                    {linkedTasks.map((task) => (
                      <li key={task.id} className={task.status === 'done' ? 'is-done' : ''}>
                        <span>{task.title || 'Tarefa sem título'}</span>
                        <button type="button" onClick={() => toggleTaskLink(task.id)}>
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="plan-task-manager__all">
                <div className="plan-task-manager__search">
                  <input
                    value={taskQuery}
                    onChange={(event) => setTaskQuery(event.target.value)}
                    placeholder="Buscar tarefas..."
                  />
                </div>
                <div className="plan-task-manager__options">
                  {filteredTasks.map((task) => {
                    const checked = draft.linkedTaskIds.includes(task.id)
                    return (
                      <label key={task.id} className={`plan-task-option${checked ? ' is-checked' : ''}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleTaskLink(task.id)} />
                        <span>{task.title || 'Tarefa sem título'}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeSection === 'settings' && (
          <section className="plan-section">
            <div className="plan-section__header">
              <div>
                <h2>Gerenciar</h2>
                <p className="plan-section__subtitle">Ações avançadas para este planejamento.</p>
              </div>
            </div>
            <div className="plan-danger">
              <div>
                <strong>Zona de risco</strong>
                <p>Excluir remove o planejamento permanentemente deste dispositivo.</p>
              </div>
              <button type="button" className="plan-danger__delete" onClick={() => onDelete(plan)}>
                Excluir planejamento
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default PlanEditor
