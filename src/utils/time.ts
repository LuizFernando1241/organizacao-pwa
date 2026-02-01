const relativeTimeFormatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

export const formatRelativeTime = (value: string) => {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) {
    return 'agora'
  }
  const now = new Date().getTime()
  const diffSeconds = Math.round((timestamp - now) / 1000)
  const absSeconds = Math.abs(diffSeconds)
  if (absSeconds < 60) {
    return relativeTimeFormatter.format(diffSeconds, 'second')
  }
  const diffMinutes = Math.round(diffSeconds / 60)
  if (Math.abs(diffMinutes) < 60) {
    return relativeTimeFormatter.format(diffMinutes, 'minute')
  }
  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return relativeTimeFormatter.format(diffHours, 'hour')
  }
  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 7) {
    return relativeTimeFormatter.format(diffDays, 'day')
  }
  const diffWeeks = Math.round(diffDays / 7)
  if (Math.abs(diffWeeks) < 5) {
    return relativeTimeFormatter.format(diffWeeks, 'week')
  }
  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) {
    return relativeTimeFormatter.format(diffMonths, 'month')
  }
  const diffYears = Math.round(diffDays / 365)
  return relativeTimeFormatter.format(diffYears, 'year')
}
