import './SettingsModal.css'

type SettingsModalProps = {
  isOpen: boolean
  wakeTime: string
  sleepTime: string
  applyRoutineAllDays: boolean
  warnOverbooked: boolean
  blockOverbooked: boolean
  onClose: () => void
  onForceSync: () => void
  isSyncing?: boolean
  onChange: (updates: {
    wakeTime?: string
    sleepTime?: string
    applyRoutineAllDays?: boolean
    warnOverbooked?: boolean
    blockOverbooked?: boolean
  }) => void
}

function SettingsModal({
  isOpen,
  wakeTime,
  sleepTime,
  applyRoutineAllDays,
  warnOverbooked,
  blockOverbooked,
  onClose,
  onForceSync,
  isSyncing,
  onChange,
}: SettingsModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="settings-modal__backdrop">
      <section className="settings-modal" role="dialog" aria-modal="true" aria-label="Configurações">
        <header className="settings-modal__header">
          <div className="settings-modal__title">Configurações</div>
          <button type="button" className="settings-modal__close" onClick={onClose}>
            Fechar
          </button>
        </header>
        <div className="settings-modal__section">
          <div className="settings-modal__section-title">Rotina</div>
          <label className="settings-modal__field">
            <span className="settings-modal__label">Hora que acordo</span>
            <input
              type="time"
              className="settings-modal__input"
              value={wakeTime}
              onChange={(event) => onChange({ wakeTime: event.target.value })}
            />
          </label>
          <label className="settings-modal__field">
            <span className="settings-modal__label">Hora que durmo</span>
            <input
              type="time"
              className="settings-modal__input"
              value={sleepTime}
              onChange={(event) => onChange({ sleepTime: event.target.value })}
            />
          </label>
          <label className="settings-modal__toggle">
            <input
              type="checkbox"
              checked={applyRoutineAllDays}
              onChange={(event) => onChange({ applyRoutineAllDays: event.target.checked })}
            />
            <span>Aplicar para todos os dias</span>
          </label>
        </div>
        <div className="settings-modal__section">
          <div className="settings-modal__section-title">Comportamento</div>
          <label className="settings-modal__toggle">
            <input
              type="checkbox"
              checked={warnOverbooked}
              onChange={(event) => onChange({ warnOverbooked: event.target.checked })}
            />
            <span>Alertar quando exceder o tempo do dia</span>
          </label>
          <label className="settings-modal__toggle">
            <input
              type="checkbox"
              checked={blockOverbooked}
              onChange={(event) => onChange({ blockOverbooked: event.target.checked })}
            />
            <span>Bloquear (modo avançado)</span>
          </label>
        </div>
        <div className="settings-modal__section">
          <div className="settings-modal__section-title">Sincronização</div>
          <button
            type="button"
            className="settings-modal__sync"
            onClick={onForceSync}
            disabled={isSyncing}
            aria-busy={isSyncing}
          >
            {isSyncing ? 'Sincronizando...' : 'Forçar sincronização'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default SettingsModal
