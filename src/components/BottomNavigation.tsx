import { BarChart3, Home, StickyNote } from 'lucide-react'
import './BottomNavigation.css'

type BottomNavigationProps = {
  activeTab: 'today' | 'notes' | 'feedback'
  onSelect: (tab: 'today' | 'notes' | 'feedback') => void
}

function BottomNavigation({ activeTab, onSelect }: BottomNavigationProps) {
  return (
    <nav className="bottom-nav" aria-label="Navegacao">
      <button
        type="button"
        className={`bottom-nav__item${activeTab === 'today' ? ' bottom-nav__item--active' : ''}`}
        onClick={() => onSelect('today')}
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
      >
        <span className="bottom-nav__icon" aria-hidden="true">
          <StickyNote size={22} />
        </span>
        <span className="bottom-nav__label">Notas</span>
      </button>
      <button
        type="button"
        className={`bottom-nav__item${activeTab === 'feedback' ? ' bottom-nav__item--active' : ''}`}
        onClick={() => onSelect('feedback')}
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
