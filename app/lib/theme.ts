// Werte 1:1 aus DESIGN.md übernommen. Neue UI verwendet ausschließlich
// diese Tokens, keine fest eingetragenen Farben/Größen mehr.

export const colors = {
  primary: '#1F4D3A',
  accent: '#F2B33D',
  background: '#FFF8EC',
  surface: '#FFFFFF',
  surfaceMuted: '#EFE5D2',
  chipMuted: '#F3ECDF',
  border: '#D9CDB6',
  borderSoft: '#E9DFCC',
  divider: '#F1EADC',
  dashed: '#C9BB9F',
  text: '#1F4D3A',
  textMuted: '#4A5E54',
  textSubtle: '#5A6B62',
  quantity: '#2C6A4F',
  success: '#D5E4C8',
  danger: '#B4432A',
  onPrimary: '#FFF8EC',
} as const;

// Platzhalterfarben für Rezeptkacheln ohne Foto (reihum verwendet).
export const placeholderColors = [
  '#F6E2B3',
  '#F1D2BE',
  '#EFC9A6',
  '#D5E4C8',
  '#F3DAB8',
  '#EBCDB9',
] as const;

// Fraunces bietet keine 650er-Stufe als eigene Static-Font-Datei – 600
// (SemiBold) ist die nächstgelegene verfügbare Stufe unterhalb von 800.
export const fonts = {
  heading: 'Fraunces_800ExtraBold',
  headingSemiBold: 'Fraunces_600SemiBold',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemiBold: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
} as const;

export const fontSizes = {
  logo: 30,
  screenTitle: 28,
  body: 16,
  bodySmall: 15,
  meta: 13,
  button: 16,
  buttonSmall: 15,
  sectionTitle: 13,
} as const;

// Abstände zwischen Elementen, laut DESIGN.md: 4 / 8 / 12 / 14 / 18 / 22 px.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  xxl: 22,
  screenPadding: 20,
} as const;

export const radii = {
  card: 18,
  button: 16,
  segmentedOuter: 14,
  segmentedInner: 11,
  chip: 999,
} as const;

export const minTouchTarget = 44;

// Kartenschatten laut DESIGN.md: 1px-Linie `borderSoft` unten + weicher
// Schatten (rgba(31,77,58,0.06), Blur 16, y 6). react-native-web übersetzt
// `shadow*` zu CSS box-shadow, auf Android greift zusätzlich `elevation`.
export const cardShadow = {
  shadowColor: 'rgba(31,77,58,0.06)',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 1,
  shadowRadius: 16,
  elevation: 3,
  borderBottomWidth: 1,
  borderBottomColor: colors.borderSoft,
} as const;

export const theme = {
  colors,
  placeholderColors,
  fonts,
  fontSizes,
  spacing,
  radii,
  minTouchTarget,
  cardShadow,
} as const;
