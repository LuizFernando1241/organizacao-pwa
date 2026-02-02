import { useMemo, useState } from 'react'
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
  const [filter, setFilter] = useState<'all' | 'active' | 'done' | 'archived'>('active')
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  const filteredPlans = useMemo(() => {
    const term = query.trim().toLowerCase()
    return plans
      .filter((plan) => {
        if (filter === 'all') {
          return true
        }
        return plan.status === filter
      })
      .filter((plan) => {
        if (!term) {
          return true
        }
        const haystack = `${plan.title} ${plan.subtitle} ${plan.blocks.map((block) => block.body).join(' ')}`.toLowerCase()
        return haystack.includes(term)
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [plans, query, filter])

  const fallbackPlanId = plans[0]?.id ?? null
  const effectiveSelectedId = selectedPlanId ?? fallbackPlanId
  const selectedPlan =
    filteredPlans.find((plan) => plan.id === effectiveSelectedId) ??
    plans.find((plan) => plan.id === effectiveSelectedId) ??
    null

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
        setSelectedPlanId(plans.find((item) => item.id !== plan.id)?.id ?? null)
      }
    }
  }

  return (
    <div className="planning-screen">
      <TopBar>
        <SearchBar value={query} onChange={setQuery} placeholder="Buscar planejamentos..." />
      </TopBar>
      <main className="app-content planning-content">
        <section className="planning-list">
          <div className="planning-list__header">
            <div>
              <h1 className="page-title">Planejamentos</h1>
              <p className="planning-list__subtitle">Organize a estratégia e acompanhe metas numéricas.</p>
            </div>
            <button type="button" className="planning-list__create" onClick={handleCreatePlan}>
              <Plus size={18} aria-hidden="true" /> Novo plano
            </button>
          </div>
          <div className="planning-filters" role="tablist" aria-label="Filtros de planejamento">
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'active'}
              tabIndex={filter === 'active' ? 0 : -1}
              className={`planning-filter${filter === 'active' ? ' planning-filter--active' : ''}`}
              onClick={() => setFilter('active')}
            >
              Ativos
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'done'}
              tabIndex={filter === 'done' ? 0 : -1}
              className={`planning-filter${filter === 'done' ? ' planning-filter--active' : ''}`}
              onClick={() => setFilter('done')}
            >
              Concluídos
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'archived'}
              tabIndex={filter === 'archived' ? 0 : -1}
              className={`planning-filter${filter === 'archived' ? ' planning-filter--active' : ''}`}
              onClick={() => setFilter('archived')}
            >
              Arquivados
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              tabIndex={filter === 'all' ? 0 : -1}
              className={`planning-filter${filter === 'all' ? ' planning-filter--active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Todos
            </button>
          </div>
          <div className="planning-list__items">
            {filteredPlans.length === 0 ? (
              <div className="planning-empty" role="status">
                <div className="planning-empty__title">Nenhum planejamento encontrado.</div>
                <div className="planning-empty__text">Crie um plano para organizar seus próximos passos.</div>
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
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default PlanningView
