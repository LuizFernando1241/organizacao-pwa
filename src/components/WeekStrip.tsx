import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
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
  onPrevWeek?: () => void
  onNextWeek?: () => void
}

function WeekStrip({ days, selectedKey, todayKey, overbookedKeys, onSelect, onPrevWeek, onNextWeek }: WeekStripProps) {
  const [slideDir, setSlideDir] = useState<'prev' | 'next' | null>(null)

  useEffect(() => {
    if (!slideDir) {
      return
    }
    const handle = window.setTimeout(() => setSlideDir(null), 220)
    return () => window.clearTimeout(handle)
  }, [slideDir])

  const handlePrev = () => {
    setSlideDir('prev')
    onPrevWeek?.()
  }

  const handleNext = () => {
    setSlideDir('next')
    onNextWeek?.()
  }

  return (
    <section className="week-strip" aria-label="Semana">
      <button type="button" className="week-strip__nav" onClick={handlePrev} aria-label="Semana anterior">
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <div
        className={`week-strip__days${slideDir === 'prev' ? ' week-strip__days--slide-prev' : ''}${
          slideDir === 'next' ? ' week-strip__days--slide-next' : ''
        }`}
      >
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
      </div>
      <button type="button" className="week-strip__nav" onClick={handleNext} aria-label="Proxima semana">
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </section>
  )
}

export default WeekStrip
