import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import TopBar from '../components/TopBar'
import SearchBar from '../components/SearchBar'
import PlanCard from '../components/PlanCard'
import PlanEditor from '../components/PlanEditor'
import { useAppStore } from '../store/useAppStore'
import type { Plan } from '../types/plan'
import './PlanningView.css'

function PlanningView() {
  const { plans, tasks, createPlan, updatePlan, deletePlan } = useAppStore()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [planPendingDelete, setPlanPendingDelete] = useState<Plan | null>(null)

  const taskTitleById = useMemo(() => {
    return new Map(tasks.map((task) => [task.id, task.title]))
  }, [tasks])

  const filteredPlans = useMemo(() => {
    const term = deferredQuery.trim().toLowerCase()
    return plans
      .filter((plan) => {
        if (!term) {
          return true
        }
        const blocksText = plan.blocks.map((block) => `${block.title} ${block.body}`).join(' ')
        const goalsText = plan.goals.map((goal) => goal.label).join(' ')
        const decisionsText = plan.decisions.map((decision) => decision.summary).join(' ')
        const phasesText = plan.phases.map((phase) => phase.title).join(' ')
        const tasksText = plan.linkedTaskIds.map((id) => taskTitleById.get(id) ?? '').join(' ')
        const haystack = `${plan.title} ${plan.subtitle} ${blocksText} ${goalsText} ${decisionsText} ${phasesText} ${tasksText}`.toLowerCase()
        return haystack.includes(term)
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [plans, deferredQuery, taskTitleById])

  useEffect(() => {
    if (!selectedPlanId) {
      if (filteredPlans[0]?.id) {
        setSelectedPlanId(filteredPlans[0].id)
      }
      return
    }
    if (!filteredPlans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(filteredPlans[0]?.id ?? null)
    }
  }, [filteredPlans, selectedPlanId])

  const effectiveSelectedId = selectedPlanId ?? filteredPlans[0]?.id ?? null
  const selectedPlan = plans.find((plan) => plan.id === effectiveSelectedId) ?? null

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const media = window.matchMedia('(max-width: 1024px)')
    const update = () => setIsMobile(media.matches)
    update()
    if ('addEventListener' in media) {
      media.addEventListener('change', update)
      return () => media.removeEventListener('change', update)
    }
    media.addListener(update)
    return () => media.removeListener(update)
  }, [])

  useEffect(() => {
    if (!isMobile) {
      setIsDetailOpen(false)
      return
    }
    if (effectiveSelectedId) {
      setIsDetailOpen(true)
    }
  }, [effectiveSelectedId, isMobile])

  const handleCreatePlan = () => {
    const id = createPlan()
    setSelectedPlanId(id)
    if (isMobile) {
      setIsDetailOpen(true)
    }
  }

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlanId(plan.id)
    if (isMobile) {
      setIsDetailOpen(true)
    }
  }

  const handleDeletePlan = (plan: Plan) => {
    setPlanPendingDelete(plan)
  }

  const handleConfirmDelete = () => {
    if (!planPendingDelete) {
      return
    }
    deletePlan(planPendingDelete.id)
    if (effectiveSelectedId === planPendingDelete.id) {
      setSelectedPlanId(filteredPlans.find((item) => item.id !== planPendingDelete.id)?.id ?? null)
      if (isMobile) {
        setIsDetailOpen(false)
      }
    }
    setPlanPendingDelete(null)
  }

  const handleCancelDelete = () => {
    setPlanPendingDelete(null)
  }

  return (
    <div className="planning-screen">
      <TopBar>
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar planos, metas, decisões ou tarefas..." />
      </TopBar>
      <main className="app-content planning-content">
        <section className={`planning-list${isMobile && isDetailOpen ? ' planning-list--hidden' : ''}`}>
          <div className="planning-list__header">
            <div>
              <h1 className="page-title">Planejamentos</h1>
              <p className="planning-list__subtitle">Crie um plano simples e edite os detalhes com foco.</p>
            </div>
            <button type="button" className="planning-list__create" onClick={handleCreatePlan}>
              <Plus size={18} aria-hidden="true" /> Novo plano
            </button>
          </div>
          <div className="planning-list__items">
            {filteredPlans.length === 0 ? (
              <div className="planning-empty" role="status">
                <div className="planning-empty__title">Nenhum planejamento encontrado.</div>
                <div className="planning-empty__text">Comece criando um plano simples.</div>
                <button type="button" className="planning-empty__button" onClick={handleCreatePlan}>
                  Criar planejamento
                </button>
              </div>
            ) : (
              filteredPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  tasks={tasks}
                  isActive={plan.id === effectiveSelectedId}
                  onSelect={handleSelectPlan}
                />
              ))
            )}
          </div>
        </section>
        <section className={`planning-detail${isMobile && !isDetailOpen ? ' planning-detail--hidden' : ''}`}>
          <div className="planning-detail__mobile">
            <button
              type="button"
              className="planning-detail__back"
              onClick={() => setIsDetailOpen(false)}
              aria-label="Voltar para a lista de planos"
            >
              Voltar
            </button>
            <span>Detalhes do plano</span>
          </div>
          {selectedPlan ? (
            <PlanEditor
              key={selectedPlan.id}
              plan={selectedPlan}
              tasks={tasks}
              onUpdate={updatePlan}
              onDelete={handleDeletePlan}
            />
          ) : (
            <div className="planning-detail__empty" role="status">
              <div className="planning-detail__title">Selecione um planejamento</div>
              <div className="planning-detail__text">Crie ou escolha um plano para editar.</div>
              <button type="button" className="planning-detail__button" onClick={handleCreatePlan}>
                Criar primeiro plano
              </button>
            </div>
          )}
        </section>
        {planPendingDelete && (
          <div className="planning-confirm-backdrop" onClick={handleCancelDelete}>
            <div
              className="planning-confirm"
              onClick={(event) => event.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              aria-label="Excluir planejamento"
            >
              <div className="planning-confirm__title">Excluir planejamento?</div>
              <div className="planning-confirm__text">
                Esta ação remove o planejamento do dispositivo.
              </div>
              <div className="planning-confirm__actions">
                <button type="button" className="planning-confirm__button" onClick={handleCancelDelete}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="planning-confirm__button planning-confirm__button--danger"
                  onClick={handleConfirmDelete}
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default PlanningView
