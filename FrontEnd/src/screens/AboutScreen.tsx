import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../navigation/AppNavigator';
import ScreenWrapper from '../components/ScreenWrapper';

type Props = BottomTabScreenProps<RootTabParamList, 'About'>;

const AboutScreen: React.FC<Props> = () => {
  return (
    <ScreenWrapper style={styles.container}>
      <Text variant="headlineMedium">About</Text>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AboutScreen;
