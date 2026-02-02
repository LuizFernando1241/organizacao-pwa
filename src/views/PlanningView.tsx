import { useEffect, useMemo, useState } from 'react'
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
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  const filteredPlans = useMemo(() => {
    const term = query.trim().toLowerCase()
    return plans
      .filter((plan) => {
        if (!term) {
          return true
        }
        const haystack = `${plan.title} ${plan.subtitle} ${plan.blocks.map((block) => block.body).join(' ')}`.toLowerCase()
        return haystack.includes(term)
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [plans, query])

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

  const handleCreatePlan = () => {
    const id = createPlan()
    setSelectedPlanId(id)
  }

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlanId(plan.id)
  }

  const handleDeletePlan = (plan: Plan) => {
    if (window.confirm('Excluir este planejamento?')) {
      deletePlan(plan.id)
      if (effectiveSelectedId === plan.id) {
        setSelectedPlanId(filteredPlans.find((item) => item.id !== plan.id)?.id ?? null)
      }
    }
  }

  return (
    <div className="planning-screen">
      <TopBar>
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar planejamentos, metas ou decisões..." />
      </TopBar>
      <main className="app-content planning-content">
        <section className="planning-list">
          <div className="planning-list__header">
            <div>
              <h1 className="page-title">Planejamentos</h1>
              <p className="planning-list__subtitle">Crie um plano simples e edite os detalhes ao lado.</p>
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
        <section className="planning-detail">
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
      </main>
    </div>
  )
}

export default PlanningView
