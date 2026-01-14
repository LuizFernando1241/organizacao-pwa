import './SettingsModal.css'

type SettingsModalProps = {
  isOpen: boolean
  wakeTime: string
  sleepTime: string
  onClose: () => void
  onChange: (updates: { wakeTime?: string; sleepTime?: string }) => void
}

function SettingsModal({ isOpen, wakeTime, sleepTime, onClose, onChange }: SettingsModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="settings-modal__backdrop">
      <section className="settings-modal">
        <header className="settings-modal__header">
          <div className="settings-modal__title">Configuracoes</div>
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
        </div>
      </section>
    </div>
  )
}

export default SettingsModal
