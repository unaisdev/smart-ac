export const colors = {
  background: '#0F1419',
  surface: '#1A222C',
  surfaceElevated: '#243040',
  border: '#2E3A4A',
  text: '#F4F7FB',
  textMuted: '#9AA8B8',
  accent: '#3D9CF0',
  accentMuted: '#2A6FA8',
  /** Same mint used by “Todos los servicios en línea”. */
  success: '#3DCF8E',
  /** Matching red (same saturation / lightness family as success). */
  danger: '#CF5A5A',
  warning: '#E8B84A',
  powerOff: '#5A6573',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  s: 12,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  s: 8,
  m: 12,
  l: 16,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  headline: { fontSize: 22, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyBold: { fontSize: 16, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  temperature: { fontSize: 56, fontWeight: '300' as const, letterSpacing: -1 },
};
