import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { DarkTheme as NavDarkTheme, DefaultTheme as NavLightTheme } from '@react-navigation/native';
import type { Theme as NavTheme } from '@react-navigation/native';
import type { MD3Theme } from 'react-native-paper';
import { lightTheme, darkTheme } from './theme';

interface ThemeContextValue {
  theme: MD3Theme;
  navTheme: NavTheme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Adapts a Paper MD3 theme's colors into the React Navigation theme format
// so the navigator background, cards, and text also respond to the theme.
const buildNavTheme = (paperTheme: MD3Theme, base: NavTheme): NavTheme => ({
  ...base,
  colors: {
    ...base.colors,
    primary: paperTheme.colors.primary,
    background: paperTheme.colors.background,
    card: paperTheme.colors.surface,
    text: paperTheme.colors.onSurface,
    border: paperTheme.colors.outline,
  },
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Automatically follows the device's system light/dark setting.
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const paperTheme = isDark ? darkTheme : lightTheme;
  const navTheme = buildNavTheme(paperTheme, isDark ? NavDarkTheme : NavLightTheme);

  return (
    <ThemeContext.Provider value={{ theme: paperTheme, navTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Call this hook anywhere in the app to read the current theme or isDark flag.
export const useAppTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used inside ThemeProvider');
  return ctx;
};
