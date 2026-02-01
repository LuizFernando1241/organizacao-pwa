export const NOTE_COLOR_KEYS = ['amber', 'mint', 'sky', 'berry', 'slate', 'sunset', 'olive'] as const

export type NoteColorKey = (typeof NOTE_COLOR_KEYS)[number]

export type NoteColorOption = {
  id: NoteColorKey
  label: string
  swatch: string
}

export const NOTE_COLOR_OPTIONS: NoteColorOption[] = [
  { id: 'amber', label: 'Amber', swatch: '#caa24d' },
  { id: 'mint', label: 'Mint', swatch: '#6ee7b7' },
  { id: 'sky', label: 'Sky', swatch: '#7dd3fc' },
  { id: 'berry', label: 'Berry', swatch: '#f0abfc' },
  { id: 'slate', label: 'Slate', swatch: '#94a3b8' },
  { id: 'sunset', label: 'Sunset', swatch: '#f59e0b' },
  { id: 'olive', label: 'Olive', swatch: '#a3e635' },
]

const noteColorSet = new Set<NoteColorKey>(NOTE_COLOR_KEYS)

const hashString = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export const getAutoNoteColor = (noteId: string) => NOTE_COLOR_KEYS[hashString(noteId) % NOTE_COLOR_KEYS.length]

export const getNoteColorKey = (noteId: string, color?: string | null) => {
  if (color && noteColorSet.has(color as NoteColorKey)) {
    return color as NoteColorKey
  }
  return getAutoNoteColor(noteId)
}

export const isNoteColorKey = (value?: string | null): value is NoteColorKey =>
  Boolean(value && noteColorSet.has(value as NoteColorKey))
