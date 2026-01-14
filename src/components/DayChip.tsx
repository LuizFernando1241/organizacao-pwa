import OverbookingIndicator from './OverbookingIndicator'
import './DayChip.css'

type DayChipProps = {
  label: string
  number: number
  selected?: boolean
  today?: boolean
  overbooked?: boolean
  onSelect?: () => void
}

function DayChip({ label, number, selected = false, today = false, overbooked = false, onSelect }: DayChipProps) {
  return (
    <button
      type="button"
      className={`day-chip${selected ? ' day-chip--selected' : ''}${today ? ' day-chip--today' : ''}`}
      onClick={onSelect}
    >
      <span className="day-chip__label">{label}</span>
      <span className="day-chip__number">{number}</span>
      {overbooked && <OverbookingIndicator />}
    </button>
  )
}

export default DayChip
