import './BottomNavigation.css'

type BottomNavigationProps = {
  activeTab: 'today' | 'notes' | 'inbox'
  onSelect: (tab: 'today' | 'notes' | 'inbox') => void
}

function BottomNavigation({ activeTab, onSelect }: BottomNavigationProps) {
  return (
    <nav className="bottom-nav" aria-label="Navegacao">
      <button
        type="button"
        className={`bottom-nav__item${activeTab === 'today' ? ' bottom-nav__item--active' : ''}`}
        onClick={() => onSelect('today')}
      >
        <span className="bottom-nav__icon">H</span>
        <span className="bottom-nav__label">Hoje</span>
      </button>
      <button
        type="button"
        className={`bottom-nav__item${activeTab === 'notes' ? ' bottom-nav__item--active' : ''}`}
        onClick={() => onSelect('notes')}
      >
        <span className="bottom-nav__icon">N</span>
        <span className="bottom-nav__label">Notas</span>
      </button>
      <button
        type="button"
        className={`bottom-nav__item${activeTab === 'inbox' ? ' bottom-nav__item--active' : ''}`}
        onClick={() => onSelect('inbox')}
      >
        <span className="bottom-nav__icon">I</span>
        <span className="bottom-nav__label">Inbox</span>
      </button>
    </nav>
  )
}

export default BottomNavigation
