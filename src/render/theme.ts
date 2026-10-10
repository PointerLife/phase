import { Platform } from 'react-native';

/** Mission-control palette: near-black ground, restrained cyan/blue/amber. */
export const colors = {
  bg: '#04070B',
  panel: '#080D14',
  panelAlt: '#0B121B',
  raised: '#0E1622',
  border: '#141F2B',
  borderBright: '#1E2E3E',
  grid: '#0C151F',
  gridMajor: '#132130',
  axis: '#23394D',
  text: '#C9D8E5',
  textDim: '#6E849B',
  textFaint: '#3F556A',
  cyan: '#2FE6D0',
  blue: '#4C8DFF',
  amber: '#F5A623',
  violet: '#A06BFF',
  green: '#39D98A',
  red: '#F2545B',
  pink: '#FF5FA2',
  white: '#EBF3FB',
  black: '#000000',
} as const;

export const fonts = {
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) ?? 'monospace',
};

export const radius = { sm: 4, md: 6, lg: 10 };

export const space = { xs: 4, sm: 6, md: 10, lg: 14, xl: 20 };

/** Uppercase letter-spaced section label style. */
export const labelStyle = {
  color: colors.textDim,
  fontSize: 10,
  letterSpacing: 1.6,
  textTransform: 'uppercase' as const,
};
