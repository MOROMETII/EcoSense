import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useAppTheme } from './src/theme/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

// Inner component so it can consume the theme from context.
const ThemedApp: React.FC = () => {
  const { theme, navTheme, isDark } = useAppTheme();

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer theme={navTheme}>
        <AppNavigator />
      </NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </PaperProvider>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}
