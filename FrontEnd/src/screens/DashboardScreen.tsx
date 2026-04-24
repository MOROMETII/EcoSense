import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from 'react-native-paper';

import ScreenWrapper from '../components/ScreenWrapper';
import RoomCard from '../components/RoomCard';
import { useRoomStore } from '../store/useRoomStore';
import { analyzeRoom } from '../services/aiService';

const DashboardScreen: React.FC = () => {
  const { colors } = useTheme();
  const rooms = useRoomStore((s) => s.rooms);
  const updateRoom = useRoomStore((s) => s.updateRoom);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all(
        rooms.map(async (room) => {
          const result = await analyzeRoom(room.id, room.analytics);
          updateRoom({
            ...room,
            analytics: {
              ...room.analytics,
              aiSuggestions: result.suggestions,
              anomalies: result.anomalies,
            },
          });
        }),
      );
    } finally {
      setRefreshing(false);
    }
  }, [rooms, updateRoom]);

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        <Text variant="headlineMedium" style={styles.heading}>
          Dashboard
        </Text>
        {rooms.length === 0 ? (
          <Text
            variant="bodyMedium"
            style={{ color: colors.outline, textAlign: 'center', marginTop: 40 }}
          >
            No rooms added yet. Go to the Rooms tab to get started.
          </Text>
        ) : (
          rooms.map((room) => <RoomCard key={room.id} room={room} />)
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontWeight: '700', marginBottom: 16 },
});

export default DashboardScreen;
