import TopBar from '../components/TopBar'
import { useAppStore } from '../store/useAppStore'
import './FeedbackView.css'

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`
  }
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

function FeedbackView() {
  const { selectedDayKey, getCompletionStats, getTotalFocusTimeMs, getStatusCountsForDay } = useAppStore()
  const completion = getCompletionStats()
  const focusMs = getTotalFocusTimeMs()
  const status = getStatusCountsForDay(selectedDayKey)
  const progress = Math.round(completion.rate * 100)

  return (
    <div className="feedback-screen">
      <TopBar title="Feedback" />
      <main className="app-content">
        <div className="feedback-grid">
          <section className="feedback-card">
            <div className="feedback-card__title">Taxa de conclusão</div>
            <div className="feedback-card__progress">
              <div className="feedback-card__ring">
                <svg viewBox="0 0 36 36" className="ring">
                  <path
                    className="ring__bg"
                    d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"
                  />
                  <path
                    className="ring__value"
                    d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"
                    strokeDasharray={`${progress}, 100`}
                  />
                </svg>
                <div className="feedback-card__progress-value">{progress}%</div>
              </div>
              <div className="feedback-card__progress-meta">
                {completion.completed} concluída(s) de {completion.total}
              </div>
            </div>
          </section>

          <section className="feedback-card">
            <div className="feedback-card__title">Foco total</div>
            <div className="feedback-card__value">{formatDuration(focusMs)}</div>
            <div className="feedback-card__meta">Tempo rastreado</div>
          </section>

          <section className="feedback-card">
            <div className="feedback-card__title">Status do dia</div>
            <div className="feedback-card__status">
              <div className="feedback-card__status-item">
                <span className="feedback-card__status-count">{status.overdue}</span>
                <span className="feedback-card__status-label">Atrasadas</span>
              </div>
              <div className="feedback-card__status-item">
                <span className="feedback-card__status-count">{status.done}</span>
                <span className="feedback-card__status-label">Concluídas</span>
              </div>
              <div className="feedback-card__status-item">
                <span className="feedback-card__status-count">{status.planned}</span>
                <span className="feedback-card__status-label">Planejadas</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default FeedbackView
