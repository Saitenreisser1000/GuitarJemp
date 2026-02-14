export const NOTE_VALUE_ITEMS = [
  {
    value: '1/16',
    icon: '',
    title: 'Sixteenth Note',
    label: '1/16',
    dotSymbol: '♬',
    baseBlocks: 0.25,
  },
  {
    value: '1/8',
    icon: '',
    title: 'Eighth Note',
    label: '1/8',
    dotSymbol: '♪',
    baseBlocks: 0.5,
  },
  {
    value: '1/4',
    icon: '',
    title: 'Quarter Note',
    label: '1/4',
    dotSymbol: '♩',
    baseBlocks: 1,
  },
  {
    value: '1/2',
    icon: '',
    title: 'Half Note',
    label: '1/2',
    dotSymbol: '𝅗𝅥',
    baseBlocks: 2,
  },
  {
    value: '1',
    icon: '',
    title: 'Whole Note',
    label: '1',
    dotSymbol: '𝅝',
    baseBlocks: 4,
  },
]

const NOTE_VALUE_SET = new Set(NOTE_VALUE_ITEMS.map((i) => String(i.value)))
const NOTE_VALUE_TO_ITEM = new Map(NOTE_VALUE_ITEMS.map((i) => [String(i.value), i]))

export function normalizeNoteValue(raw) {
  const v = String(raw ?? '').trim()
  return NOTE_VALUE_SET.has(v) ? v : ''
}

export function noteValueItem(value) {
  const v = normalizeNoteValue(value)
  return v ? NOTE_VALUE_TO_ITEM.get(v) ?? null : null
}
