export const TIMELINE_THEME = {
  main: {
    resizeHandleLineColor: '#000',
    mainBgMix: 'color-mix(in srgb, var(--color-surface) 93%, var(--color-surface-2) 7%)',
    viewportBgMix: 'color-mix(in srgb, var(--color-surface) 96%, var(--color-surface-2) 4%)',
    viewportShadow:
      'inset 0 4px 12px -5px rgb(0 0 0 / 52%), inset 0 -4px 12px -5px rgb(0 0 0 / 48%), inset 18px 0 18px -11px rgb(0 0 0 / 54%), inset -18px 0 18px -11px rgb(0 0 0 / 50%)',
    columnCardBgMix: 'color-mix(in srgb, var(--color-surface) 95%, var(--color-surface-2) 5%)',
    stringNamesBgMix: 'color-mix(in srgb, var(--color-surface-2) 76%, var(--color-surface) 24%)',
    auxDividerColor: 'rgba(70, 70, 70, 0.75)',
    markerColor: 'color-mix(in srgb, var(--color-primary) 65%, var(--color-text) 35%)',
    loopBarColor: 'color-mix(in srgb, var(--color-primary) 70%, var(--color-surface) 30%)',
    loopHandleBg: 'color-mix(in srgb, var(--color-surface-2) 80%, var(--color-surface) 20%)',
    lengthHandleColor: '#000',
    marqueeBg: 'color-mix(in srgb, var(--color-primary) 16%, transparent)',
  },
  track: {
    baseBg: 'color-mix(in srgb, #d8ecff 38%, var(--color-surface) 62%)',
    centerLine: 'rgba(70, 70, 70, 0.35)',
    barLine: 'rgba(70, 70, 70, 0.45)',
    barLineStart: 'rgba(70, 70, 70, 0.6)',
    barLineLabel: 'rgba(80, 80, 80, 0.82)',
    barLineLabelShadow: '0 1px 0 rgba(255, 255, 255, 0.65)',
    playheadColor: 'rgba(211, 47, 47, 0.3)',
    gridSubLine: 'rgba(208, 208, 208, var(--sub-opacity, 0.35))',
    gridBeatLine: 'rgba(208, 208, 208, var(--beat-opacity, 1))',
    defaultNoteColors: ['#D5763D', '#2E7D6E', '#4A78B0', '#B85C4C', '#7F8F4E', '#6E66A9'],
  },
}
