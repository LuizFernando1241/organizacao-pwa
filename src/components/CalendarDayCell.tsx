import './CalendarDayCell.css'

type CalendarDayCellProps = {
  day: number
  isToday?: boolean
  isSelected?: boolean
  onSelect?: () => void
}

function CalendarDayCell({ day, isToday = false, isSelected = false, onSelect }: CalendarDayCellProps) {
  return (
    <button
      type="button"
      className={`calendar-day${isSelected ? ' calendar-day--selected' : ''}${isToday ? ' calendar-day--today' : ''}`}
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-current={isToday ? 'date' : undefined}
      aria-label={`Dia ${day}`}
    >
      {day}
    </button>
  )
}

export default CalendarDayCell
