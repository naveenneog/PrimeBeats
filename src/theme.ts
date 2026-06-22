/**
 * Central design tokens for PrimeBeats. A dark, Prime-Music-inspired palette.
 */

export const colors = {
  background: '#0B0B0F',
  surface: '#15151C',
  surfaceAlt: '#1E1E28',
  surfaceElevated: '#26263340',
  border: '#2A2A36',
  primary: '#1FD1A0',
  primaryDark: '#16A07C',
  accent: '#6C5CE7',
  text: '#FFFFFF',
  textMuted: '#A0A0B0',
  textFaint: '#6C6C7C',
  danger: '#FF5A6E',
  white: '#FFFFFF',
  black: '#000000',
};

/** Deterministic gradient pairs used to render generated album art. */
export const artGradients: [string, string][] = [
  ['#6C5CE7', '#1FD1A0'],
  ['#FF6B6B', '#FFA94D'],
  ['#4DABF7', '#1864AB'],
  ['#F783AC', '#862E9C'],
  ['#1FD1A0', '#0CA678'],
  ['#FFD43B', '#F08C00'],
  ['#748FFC', '#3B5BDB'],
  ['#FF8787', '#E03131'],
  ['#63E6BE', '#0B7285'],
  ['#DA77F2', '#5F3DC4'],
];

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const typography = {
  title: { fontSize: 28, fontWeight: '800' as const, color: colors.text },
  heading: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  subheading: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 15, fontWeight: '500' as const, color: colors.text },
  caption: { fontSize: 13, fontWeight: '500' as const, color: colors.textMuted },
  tiny: { fontSize: 11, fontWeight: '600' as const, color: colors.textFaint },
};
