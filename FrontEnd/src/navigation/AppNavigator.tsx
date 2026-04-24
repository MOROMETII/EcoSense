import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

import HomeScreen from '../screens/HomeScreen';
import AboutScreen from '../screens/AboutScreen';
import { Colors } from 'react-native/Libraries/NewAppScreen';

// Defines the route names and their param types for type-safe navigation.
export type RootTabParamList = {
  Home: undefined;
  About: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const AppNavigator: React.FC = () => {
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
          borderBottomLeftRadius:0,
          borderBottomRightRadius:0,
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
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconPill, focused && { outlineColor: colors.primaryContainer }]}>
              <MaterialCommunityIcons
                name={focused ? 'home' : 'home-outline'}
                color={color}
                size={35}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="About"
        component={AboutScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconPill, focused && { outlineColor: colors.primaryContainer }]}>
              <MaterialCommunityIcons
                name={focused ? 'information' : 'information-outline'}
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

export default AppNavigator;
