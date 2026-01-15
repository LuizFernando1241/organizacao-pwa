import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import './TopBar.css'

type TopBarProps = {
  title?: string
  children?: ReactNode
  onCalendarClick?: () => void
  onNotesClick?: () => void
  onInboxClick?: () => void
  onSettingsClick?: () => void
}

function TopBar({ title, children, onCalendarClick, onNotesClick, onInboxClick, onSettingsClick }: TopBarProps) {
  return (
    <header className="top-bar">
      {children ? (
        <div className="top-bar__custom">{children}</div>
      ) : (
        <>
          <div className="top-bar__left">
            {onInboxClick && (
              <button className="icon-button" aria-label="Inbox" onClick={onInboxClick}>
                <Inbox size={18} aria-hidden="true" />
              </button>
            )}
            <div className="top-bar__title">{title}</div>
          </div>
          <div className="top-bar__actions">
            <button className="icon-button" aria-label="Calendario" onClick={onCalendarClick}>
              <span className="icon-placeholder">C</span>
            </button>
            <button className="icon-button" aria-label="Notas" onClick={onNotesClick}>
              <span className="icon-placeholder">N</span>
            </button>
            <button className="icon-button icon-button--small" aria-label="Configuracoes" onClick={onSettingsClick}>
              <span className="icon-placeholder">S</span>
            </button>
          </div>
        </>
      )}
    </header>
  )
}

export default TopBar
