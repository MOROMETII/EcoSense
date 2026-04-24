import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import RoomsListScreen from '../screens/RoomsListScreen';
import RoomEditorScreen from '../screens/RoomEditorScreen';

export type RoomsStackParamList = {
  RoomsList: undefined;
  RoomEditor: { roomId: string | undefined };
};

const Stack = createNativeStackNavigator<RoomsStackParamList>();

const RoomsNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="RoomsList" component={RoomsListScreen} />
    <Stack.Screen name="RoomEditor" component={RoomEditorScreen} />
  </Stack.Navigator>
);

export default RoomsNavigator;
