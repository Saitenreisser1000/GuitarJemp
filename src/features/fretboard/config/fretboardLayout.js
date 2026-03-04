export const FRETBOARD_DIMENSIONS = {
  width: 1100,
  height: 180,
  nutWidth: 12,
  boardOverhang: 18,
  stringOverhang: 22,
}

export const FRETBOARD_RESIZE = {
  minScale: 0.65,
  maxScale: 1.85,
  coreScaleDivisor: 300,
}

export const FRETBOARD_LAYOUT_PRESETS = {
  desktop: {
    uiScale: 1,
    sidePadLeft: 40,
    sidePadRight: 10,
    width: { minPx: 760, preferredVw: 92, maxPx: 1460 },
  },
  tablet: {
    uiScale: 0.94,
    sidePadLeft: 28,
    sidePadRight: 10,
    width: { minPx: 700, preferredVw: 95, maxPx: 1280 },
  },
  mobile: {
    uiScale: 0.86,
    sidePadLeft: 16,
    sidePadRight: 8,
    width: { minPx: 620, preferredVw: 98, maxPx: 1080 },
    phoneAspectProfiles: [
      {
        label: '16:9',
        ratio: 16 / 9,
        uiScale: 0.84,
        sidePadLeft: 14,
        sidePadRight: 8,
        width: { minPx: 600, preferredVw: 97, maxPx: 1020 },
      },
      {
        label: '18:9',
        ratio: 18 / 9,
        uiScale: 0.86,
        sidePadLeft: 14,
        sidePadRight: 8,
        width: { minPx: 610, preferredVw: 98, maxPx: 1060 },
      },
      {
        label: '19.5:9',
        ratio: 19.5 / 9,
        uiScale: 0.88,
        sidePadLeft: 16,
        sidePadRight: 8,
        width: { minPx: 620, preferredVw: 99, maxPx: 1100 },
      },
      {
        label: '20:9',
        ratio: 20 / 9,
        uiScale: 0.89,
        sidePadLeft: 16,
        sidePadRight: 8,
        width: { minPx: 620, preferredVw: 99, maxPx: 1120 },
      },
      {
        label: '21:9',
        ratio: 21 / 9,
        uiScale: 0.9,
        sidePadLeft: 18,
        sidePadRight: 8,
        width: { minPx: 630, preferredVw: 100, maxPx: 1160 },
      },
    ],
  },
}

export const FRETBOARD_LAYOUT_BREAKPOINTS = {
  tabletMax: 1200,
  mobileMax: 900,
}

export const FRETBOARD_UI_TOKENS = {
  gapPx: 8,
  controlHeightPx: 26,
  fontSmallPx: 12,
  topPadPx: 10,
  bottomPadPx: 10,
  numbersHeightPx: 28,
  numbersPadTopPx: 3,
  numbersMarginTopPx: 4,
  numbersMarginBottomPx: -2,
  actionsMarginTopPx: -2,
  actionsMarginBottomPx: 8,
  railTopPadPx: 30,
}

export const FRETBOARD_PANE_CONSTRAINTS = {
  minHeightPerWidth: 1 / 6,
}
