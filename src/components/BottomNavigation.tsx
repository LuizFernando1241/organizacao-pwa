import { BarChart3, Home, StickyNote, Target } from 'lucide-react'
import './BottomNavigation.css'

type BottomNavigationProps = {
  activeTab: 'today' | 'notes' | 'planning' | 'feedback'
  onSelect: (tab: 'today' | 'notes' | 'planning' | 'feedback') => void
}

function BottomNavigation({ activeTab, onSelect }: BottomNavigationProps) {
  return (
    <nav className="bottom-nav" aria-label="Navegação">
      <button
        type="button"
        className={`bottom-nav__item${activeTab === 'today' ? ' bottom-nav__item--active' : ''}`}
        onClick={() => onSelect('today')}
        aria-current={activeTab === 'today' ? 'page' : undefined}
      >
        <span className="bottom-nav__icon" aria-hidden="true">
          <Home size={22} />
        </span>
        <span className="bottom-nav__label">Hoje</span>
      </button>
      <button
        type="button"
        className={`bottom-nav__item${activeTab === 'notes' ? ' bottom-nav__item--active' : ''}`}
        onClick={() => onSelect('notes')}
        aria-current={activeTab === 'notes' ? 'page' : undefined}
      >
        <span className="bottom-nav__icon" aria-hidden="true">
          <StickyNote size={22} />
        </span>
        <span className="bottom-nav__label">Notas</span>
      </button>
      <button
        type="button"
        className={`bottom-nav__item${activeTab === 'planning' ? ' bottom-nav__item--active' : ''}`}
        onClick={() => onSelect('planning')}
        aria-current={activeTab === 'planning' ? 'page' : undefined}
      >
        <span className="bottom-nav__icon" aria-hidden="true">
          <Target size={22} />
        </span>
        <span className="bottom-nav__label">Planos</span>
      </button>
      <button
        type="button"
        className={`bottom-nav__item${activeTab === 'feedback' ? ' bottom-nav__item--active' : ''}`}
        onClick={() => onSelect('feedback')}
        aria-current={activeTab === 'feedback' ? 'page' : undefined}
      >
        <span className="bottom-nav__icon" aria-hidden="true">
          <BarChart3 size={22} />
        </span>
        <span className="bottom-nav__label">Feedback</span>
      </button>
    </nav>
  )
}

export default BottomNavigation
