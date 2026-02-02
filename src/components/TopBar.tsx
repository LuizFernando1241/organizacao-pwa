import { Calendar, Inbox, Settings, StickyNote } from 'lucide-react'
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
              <button type="button" className="icon-button" aria-label="Inbox" onClick={onInboxClick}>
                <Inbox size={18} aria-hidden="true" />
              </button>
            )}
            <div className="top-bar__title">{title}</div>
          </div>
          <div className="top-bar__actions">
            <button type="button" className="icon-button" aria-label="Calendário" onClick={onCalendarClick}>
              <Calendar size={20} aria-hidden="true" />
            </button>
            <button type="button" className="icon-button" aria-label="Notas" onClick={onNotesClick}>
              <StickyNote size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button icon-button--small"
              aria-label="Configurações"
              onClick={onSettingsClick}
            >
              <Settings size={18} aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </header>
  )
}

export default TopBar
