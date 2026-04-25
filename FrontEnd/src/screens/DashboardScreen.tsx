import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import ScreenWrapper from '../components/ScreenWrapper';
import RoomCard from '../components/RoomCard';
import { useRoomStore } from '../store/useRoomStore';
import { analyzeRoom } from '../services/aiService';

const DashboardScreen: React.FC = () => {
  const { colors } = useTheme();
  const rooms = useRoomStore((s) => s.rooms);
  const updateRoom = useRoomStore((s) => s.updateRoom);
  const [refreshing, setRefreshing] = useState(false);
  // Incrementing this tells every RoomCard to reload its CSV / temperature data
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Bump immediately so RoomCards start their fetches in parallel
    setRefreshKey((k) => k + 1);
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

  const totalDevices = rooms.reduce((s, r) => s + r.devices.length, 0);
  const totalAnomalies = rooms.reduce((s, r) => s + r.analytics.anomalies.length, 0);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

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
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text variant="bodyMedium" style={{ color: colors.outline }}>{greeting}</Text>
            <Text variant="headlineMedium" style={styles.heading}>Dashboard</Text>
          </View>
          <View style={[styles.refreshHint, { backgroundColor: colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="refresh" size={16} color={colors.outline} />
            <Text variant="bodySmall" style={{ color: colors.outline, marginLeft: 4 }}>Pull to refresh</Text>
          </View>
        </View>

        {/* Summary bar */}
        {rooms.length > 0 && (
          <View style={[styles.summaryBar, { backgroundColor: colors.surfaceVariant }]}>
            {[
              { icon: 'floor-plan', color: colors.primary, value: rooms.length, label: 'Rooms' },
              { icon: 'devices', color: colors.secondary, value: totalDevices, label: 'Devices' },
              {
                icon: 'alert-circle', color: totalAnomalies > 0 ? '#EF4444' : colors.outline,
                value: totalAnomalies, label: 'Alerts'
              },
            ].map((item) => (
              <View key={item.label} style={styles.summaryItem}>
                <MaterialCommunityIcons name={item.icon as any} size={18} color={item.color} />
                <Text variant="titleMedium" style={{ fontWeight: '700', color: colors.onSurface }}>
                  {item.value}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.outline }}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}

        {rooms.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="home-plus-outline" size={64} color={colors.outline + '66'} />
            <Text variant="titleMedium" style={{ color: colors.outline, marginTop: 16 }}>No rooms yet</Text>
            <Text variant="bodySmall" style={{ color: colors.outline, textAlign: 'center', marginTop: 4 }}>
              Go to the Rooms tab to add your first room.
            </Text>
          </View>
        ) : (
          rooms.map((room) => (
            <RoomCard key={room.id} room={room} refreshKey={refreshKey} />
          ))
        )}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  heading: { fontWeight: '700' },
  refreshHint: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-around', borderRadius: 16, padding: 16, marginBottom: 20 },
  summaryItem: { alignItems: 'center', gap: 2 },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
});

export default DashboardScreen;