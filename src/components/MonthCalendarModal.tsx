import CalendarDayCell from './CalendarDayCell'
import './MonthCalendarModal.css'

type MonthCalendarModalProps = {
  isOpen: boolean
  monthDate: Date
  selectedDayKey: string
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onSelectDay: (date: Date) => void
}

const monthNames = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const weekDayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']

const formatDayKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const buildCalendarDays = (monthDate: Date) => {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startIndex = (firstOfMonth.getDay() + 6) % 7
  const totalCells = Math.ceil((startIndex + daysInMonth) / 7) * 7
  const days: Array<{ date: Date } | null> = []

  for (let i = 0; i < totalCells; i += 1) {
    const dayNumber = i - startIndex + 1
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      days.push(null)
    } else {
      days.push({ date: new Date(year, month, dayNumber) })
    }
  }
  return days
}

function MonthCalendarModal({
  isOpen,
  monthDate,
  selectedDayKey,
  onClose,
  onPrev,
  onNext,
  onSelectDay,
}: MonthCalendarModalProps) {
  if (!isOpen) {
    return null
  }

  const todayKey = formatDayKey(new Date())
  const days = buildCalendarDays(monthDate)
  const monthLabel = `${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`

  return (
    <div className="month-calendar__backdrop" onClick={onClose}>
      <section className="month-calendar" onClick={(event) => event.stopPropagation()}>
        <header className="month-calendar__header">
          <button type="button" className="month-calendar__nav" onClick={onPrev} aria-label="Mes anterior">
            {'<'}
          </button>
          <div className="month-calendar__title">{monthLabel}</div>
          <button type="button" className="month-calendar__nav" onClick={onNext} aria-label="Proximo mes">
            {'>'}
          </button>
        </header>
        <div className="month-calendar__weekdays">
          {weekDayLabels.map((label) => (
            <div key={label} className="month-calendar__weekday">
              {label}
            </div>
          ))}
        </div>
        <div className="month-calendar__grid">
          {days.map((entry, index) => {
            if (!entry) {
              return <div key={`empty-${index}`} className="month-calendar__empty" />
            }
            const dayKey = formatDayKey(entry.date)
            return (
              <CalendarDayCell
                key={dayKey}
                day={entry.date.getDate()}
                isToday={dayKey === todayKey}
                isSelected={dayKey === selectedDayKey}
                onSelect={() => onSelectDay(entry.date)}
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default MonthCalendarModal
