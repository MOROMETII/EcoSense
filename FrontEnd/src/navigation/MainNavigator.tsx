import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

import DashboardScreen from '../screens/DashboardScreen';
import RoomsNavigator from './RoomsNavigator';
import SettingsScreen from '../screens/SettingsScreen';

export type MainTabParamList = {
  Dashboard: undefined;
  Rooms: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.outline,
        tabBarStyle: {
          position: 'absolute',
          height: 80,
          borderRadius: 34,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          elevation: 16,
          shadowColor: '#000000',
          shadowOffset: { width: 10, height: 10 },
          shadowOpacity: 0.2,
          shadowRadius: 20,
        },
        tabBarItemStyle: {
          borderRadius: 50,
          marginVertical: 15,
          marginHorizontal: 0,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconPill, focused && { backgroundColor: colors.primaryContainer }]}>
              <MaterialCommunityIcons
                name={focused ? 'view-dashboard' : 'view-dashboard-outline'}
                color={color}
                size={35}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Rooms"
        component={RoomsNavigator}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconPill, focused && { backgroundColor: colors.primaryContainer }]}>
              <MaterialCommunityIcons
                name="floor-plan"
                color={color}
                size={35}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconPill, focused && { backgroundColor: colors.primaryContainer }]}>
              <MaterialCommunityIcons
                name={focused ? 'cog' : 'cog-outline'}
                color={color}
                size={35}
              />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconPill: {
    width: 80,
    height: 60,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MainNavigator;
