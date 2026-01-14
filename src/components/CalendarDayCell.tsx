import './CalendarDayCell.css'

type CalendarDayCellProps = {
  day: number
  isToday?: boolean
  onSelect?: () => void
}

function CalendarDayCell({ day, isToday = false, onSelect }: CalendarDayCellProps) {
  return (
    <button
      type="button"
      className={`calendar-day${isToday ? ' calendar-day--today' : ''}`}
      onClick={onSelect}
    >
      {day}
    </button>
  )
}

export default CalendarDayCell
