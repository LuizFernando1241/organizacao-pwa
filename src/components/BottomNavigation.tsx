import { Home, StickyNote } from 'lucide-react'
import './BottomNavigation.css'

type BottomNavigationProps = {
  activeTab: 'today' | 'notes'
  onSelect: (tab: 'today' | 'notes') => void
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
    </nav>
  )
}

export default BottomNavigation
