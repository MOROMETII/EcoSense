import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// ─── Spacing ─────────────────────────────────────────────────────────────────
// Use these values throughout the app for consistent layout.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
// Font sizes and weights; extend as needed.
export const typography = {
  fontSizeSmall: 12,
  fontSizeBody: 14,
  fontSizeTitle: 18,
  fontSizeHeading: 24,
  fontWeightRegular: '400' as const,
  fontWeightMedium: '500' as const,
  fontWeightBold: '700' as const,
};

// ─── Color palette ────────────────────────────────────────────────────────────
const palette = {
  primary: '#6366F1',
  primaryContainer: '#EEF2FF',
  secondary: '#06B6D4',
  secondaryContainer: '#CFFAFE',
  background: '#F5F7FF',
  surface: '#FFFFFF',
  error: '#EF4444',
  onPrimary: '#FFFFFF',
  onBackground: '#0F172A',
  onSurface: '#0F172A',
  outline: '#94A3B8',
};

// ─── Light theme (default) ────────────────────────────────────────────────────
export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: palette.primary,
    primaryContainer: palette.primaryContainer,
    secondary: palette.secondary,
    secondaryContainer: palette.secondaryContainer,
    background: palette.background,
    surface: palette.surface,
    error: palette.error,
    onPrimary: palette.onPrimary,
    onBackground: palette.onBackground,
    onSurface: palette.onSurface,
    outline: palette.outline,
  },
};

// ─── Dark theme (optional, stub for easy activation) ──────────────────────────
export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#818CF8',
    primaryContainer: '#312E81',
    secondary: '#22D3EE',
    background: '#0d0d14',
    surface: '#14141F',
  },
};

// Active theme – swap to darkTheme if needed.
export const theme = lightTheme;
