import DayChip from './DayChip'
import './WeekStrip.css'

export type WeekDay = {
  key: string
  label: string
  number: number
}

type WeekStripProps = {
  days: WeekDay[]
  selectedKey: string
  todayKey: string
  overbookedKeys?: Set<string>
  onSelect: (key: string) => void
}

function WeekStrip({ days, selectedKey, todayKey, overbookedKeys, onSelect }: WeekStripProps) {
  return (
    <section className="week-strip" aria-label="Semana">
      {days.map((day) => (
        <DayChip
          key={day.key}
          label={day.label}
          number={day.number}
          selected={day.key === selectedKey}
          today={day.key === todayKey}
          overbooked={overbookedKeys?.has(day.key)}
          onSelect={() => onSelect(day.key)}
        />
      ))}
    </section>
  )
}

export default WeekStrip
