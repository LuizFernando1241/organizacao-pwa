type CaptureKind = 'task' | 'note' | 'inbox'

export type CaptureResult = {
  kind: CaptureKind
  title: string
  dayKey?: string
  timeStart?: string
  timeEnd?: string
  reason?: string
}

const verbHints = new Set([
  'enviar',
  'mandar',
  'falar',
  'ligar',
  'telefonar',
  'responder',
  'revisar',
  'planejar',
  'agendar',
  'marcar',
  'comprar',
  'pagar',
  'resolver',
  'entregar',
  'buscar',
  'levar',
  'preencher',
  'preparar',
  'finalizar',
  'organizar',
  'escrever',
  'estudar',
  'ler',
  'assistir',
  'conferir',
  'verificar',
  'atualizar',
  'contatar',
  'apresentar',
  'chamar',
  'fazer',
])

const noteHints = new Set([
  'ideia',
  'insight',
  'trecho',
  'citacao',
  'cita',
  'resumo',
  'aprendi',
  'anotacao',
  'nota',
  'livro',
  'video',
  'frase',
  'quote',
])

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const padTime = (value: number) => String(value).padStart(2, '0')

const buildDayKey = (date: Date) => {
  const year = date.getFullYear()
  const month = padTime(date.getMonth() + 1)
  const day = padTime(date.getDate())
  return `${year}-${month}-${day}`
}

const parseExplicitDate = (normalized: string) => {
  const match = normalized.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/)
  if (!match) {
    return null
  }
  const day = Number(match[1])
  const month = Number(match[2])
  const year = match[3] ? Number(match[3].length === 2 ? `20${match[3]}` : match[3]) : new Date().getFullYear()
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null
  }
  return new Date(year, month - 1, day)
}

const parseRelativeDate = (normalized: string) => {
  const now = new Date()
  if (normalized.includes('depois de amanha')) {
    now.setDate(now.getDate() + 2)
    return now
  }
  if (normalized.includes('amanha')) {
    now.setDate(now.getDate() + 1)
    return now
  }
  if (normalized.includes('hoje')) {
    return now
  }
  const dayMap: Record<string, number> = {
    domingo: 0,
    segunda: 1,
    terca: 2,
    quarta: 3,
    quinta: 4,
    sexta: 5,
    sabado: 6,
  }
  const dayKey = Object.keys(dayMap).find((day) => normalized.includes(day))
  if (!dayKey) {
    return null
  }
  const target = dayMap[dayKey]
  const today = now.getDay()
  let delta = (target - today + 7) % 7
  if (delta === 0 && normalized.includes('proxim')) {
    delta = 7
  }
  now.setDate(now.getDate() + delta)
  return now
}

const parseDate = (normalized: string) => {
  const explicit = parseExplicitDate(normalized)
  if (explicit) {
    return explicit
  }
  return parseRelativeDate(normalized)
}

const extractTimes = (normalized: string) => {
  const times: string[] = []
  const timeMatches = Array.from(normalized.matchAll(/\b(\d{1,2})(?::(\d{2}))\b/g))
  timeMatches.forEach((match) => {
    const hours = Number(match[1])
    const minutes = Number(match[2])
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      times.push(`${padTime(hours)}:${padTime(minutes)}`)
    }
  })
  const hourMatches = Array.from(normalized.matchAll(/\b(\d{1,2})h(\d{2})?\b/g))
  hourMatches.forEach((match) => {
    const hours = Number(match[1])
    const minutes = match[2] ? Number(match[2]) : 0
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      const time = `${padTime(hours)}:${padTime(minutes)}`
      if (!times.includes(time)) {
        times.push(time)
      }
    }
  })
  return times
}

const hasVerbHint = (normalized: string) => {
  const firstWord = normalized.split(/\s+/)[0]
  if (verbHints.has(firstWord)) {
    return true
  }
  return Array.from(verbHints).some((verb) => normalized.includes(` ${verb}`))
}

const hasNoteHint = (normalized: string) => {
  if (normalized.includes('"') || normalized.includes('http')) {
    return true
  }
  const firstWord = normalized.split(/\s+/)[0]
  if (noteHints.has(firstWord)) {
    return true
  }
  return Array.from(noteHints).some((hint) => normalized.includes(` ${hint}`))
}

export const parseCaptureInput = (text: string): CaptureResult => {
  const normalized = normalize(text)
  if (!normalized) {
    return { kind: 'inbox', title: text, reason: 'vazio' }
  }
  const date = parseDate(normalized)
  const times = extractTimes(normalized)
  const hasDate = Boolean(date)
  const hasTime = times.length > 0
  const taskSignal = hasDate || hasTime || hasVerbHint(normalized) || normalized.includes('preciso')
  const noteSignal = hasNoteHint(normalized)

  if (taskSignal && !noteSignal) {
    return {
      kind: 'task',
      title: text.trim(),
      dayKey: date ? buildDayKey(date) : undefined,
      timeStart: times[0],
      timeEnd: times[1],
      reason: 'tarefa',
    }
  }
  if (noteSignal && !taskSignal) {
    return { kind: 'note', title: text.trim(), reason: 'nota' }
  }
  if (taskSignal && noteSignal) {
    return {
      kind: 'task',
      title: text.trim(),
      dayKey: date ? buildDayKey(date) : undefined,
      timeStart: times[0],
      timeEnd: times[1],
      reason: 'ambigua',
    }
  }
  return { kind: 'inbox', title: text.trim(), reason: 'neutro' }
}
