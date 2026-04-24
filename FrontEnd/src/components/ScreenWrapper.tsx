import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenWrapperProps extends ViewProps {
  children: React.ReactNode;
}

// Drop-in replacement for the root View in any screen.
// Automatically fills the background with the current Paper theme color.
const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ children, style, ...rest }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: colors.background, paddingTop: insets.top },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flex: 1,
    paddingBottom: 100, // clearance for the floating tab bar (68 height + 24 bottom offset + 8 buffer)
  },
});

export default ScreenWrapper;
