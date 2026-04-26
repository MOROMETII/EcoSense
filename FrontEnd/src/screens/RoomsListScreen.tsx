import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, FAB, Surface, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import ScreenWrapper from '../components/ScreenWrapper';
import DeleteModal from '../components/DeleteModal';
import BlueprintBackground from '../components/BlueprintBackground';
import { useRoomStore } from '../store/useRoomStore';
import { useAuth } from '../context/AuthContext';
import type { Room } from '../models/types';

const GRID_SIZE = 12;

type RoomsStackParamList = {
  RoomsList: undefined;
  RoomEditor: { roomId: string | undefined };
};

type Props = NativeStackScreenProps<RoomsStackParamList, 'RoomsList'>;

// ─── Room row card ────────────────────────────────────────────────────────────

interface RowProps {
  room: Room;
  onEdit: () => void;
  onDelete: () => void;
}

const RoomRow: React.FC<RowProps> = ({ room, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const { colors } = useTheme();
  const hasAnomalies  = room.analytics.anomalies.length > 0;
  const accentColor   = hasAnomalies ? '#EF4444' : colors.primary;
  const socketCount   = room.devices.filter((d) => d.type === 'smart_socket').length;
  const sensorCount   = room.devices.filter((d) => d.type === 'temperature_sensor').length;
  const latestTemp    = room.analytics.temperature.at(-1)?.value;
  const latestEnergy  = room.analytics.energyUsage.at(-1)?.value;
  const doorCount     = room.blueprint?.features.filter((f) => f.type === 'door').length ?? 0;
  const windowCount   = room.blueprint?.features.filter((f) => f.type === 'window').length ?? 0;

  return (
    <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
      {/* Accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <TouchableOpacity activeOpacity={0.8} onPress={() => setExpanded((e) => !e)}>
      <View style={styles.cardBody}>
        {/* Top row */}
        <View style={styles.cardHeader}>
          <View style={[styles.roomIcon, { backgroundColor: accentColor + '18' }]}>
            <MaterialCommunityIcons name="floor-plan" size={22} color={accentColor} />
          </View>
          <View style={styles.cardTitleGroup}>
            <Text variant="titleMedium" style={{ fontWeight: '700', color: colors.onSurface }}>
              {room.name}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.outline }}>
              {room.devices.length} device{room.devices.length !== 1 ? 's' : ''}
              {hasAnomalies ? '  ·  ⚠ anomaly' : ''}
            </Text>
          </View>
          {/* Action buttons */}
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.primaryContainer }]} onPress={onEdit}>
            <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#FEF2F2' }]} onPress={onDelete}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Stat chips */}
        <View style={styles.chipRow}>
          {latestTemp != null && (
            <View style={[styles.chip, { backgroundColor: colors.secondaryContainer }]}>
              <MaterialCommunityIcons name="thermometer" size={12} color={colors.secondary} />
              <Text variant="labelSmall" style={{ color: colors.secondary, marginLeft: 3 }}>{latestTemp}°C</Text>
            </View>
          )}
          {latestEnergy != null && (
            <View style={[styles.chip, { backgroundColor: '#FEF3C718' }]}>
              <MaterialCommunityIcons name="flash" size={12} color="#F59E0B" />
              <Text variant="labelSmall" style={{ color: '#F59E0B', marginLeft: 3 }}>{latestEnergy} W</Text>
            </View>
          )}
          {socketCount > 0 && (
            <View style={[styles.chip, { backgroundColor: colors.primaryContainer }]}>
              <MaterialCommunityIcons name="power-socket" size={12} color={colors.primary} />
              <Text variant="labelSmall" style={{ color: colors.primary, marginLeft: 3 }}>{socketCount}</Text>
            </View>
          )}
          {sensorCount > 0 && (
            <View style={[styles.chip, { backgroundColor: colors.secondaryContainer }]}>
              <MaterialCommunityIcons name="thermometer" size={12} color={colors.secondary} />
              <Text variant="labelSmall" style={{ color: colors.secondary, marginLeft: 3 }}>{sensorCount}</Text>
            </View>
          )}
          {doorCount > 0 && (
            <View style={[styles.chip, { backgroundColor: '#10B98118' }]}>
              <MaterialCommunityIcons name="door" size={12} color="#10B981" />
              <Text variant="labelSmall" style={{ color: '#10B981', marginLeft: 3 }}>{doorCount}</Text>
            </View>
          )}
          {windowCount > 0 && (
            <View style={[styles.chip, { backgroundColor: '#60A5FA18' }]}>
              <MaterialCommunityIcons name="window-open-variant" size={12} color="#60A5FA" />
              <Text variant="labelSmall" style={{ color: '#60A5FA', marginLeft: 3 }}>{windowCount}</Text>
            </View>
          )}
        </View>

        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.outline}
          style={{ alignSelf: 'center', marginTop: 4 }}
        />
      </View>
      </TouchableOpacity>

      {/* Expanded map */}
      {expanded && room.blueprint && (
        <View style={[styles.mapWrapper, { marginHorizontal: 14, marginBottom: 14 }]}>
          <BlueprintBackground blueprint={room.blueprint} />
          {room.devices.map((device) => (
            <View
              key={device.id}
              style={[
                styles.deviceDot,
                {
                  left: `${((device.position.x + 0.5) / GRID_SIZE) * 100}%` as any,
                  top:  `${((device.position.y + 0.5) / GRID_SIZE) * 100}%` as any,
                  backgroundColor:
                    device.type === 'temperature_sensor'
                      ? colors.secondaryContainer
                      : colors.primaryContainer,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={device.type === 'temperature_sensor' ? 'thermometer' : 'power-socket'}
                size={10}
                color={device.type === 'temperature_sensor' ? colors.secondary : colors.primary}
              />
            </View>
          ))}
        </View>
      )}
    </Surface>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const RoomsListScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const rooms        = useRoomStore((s) => s.rooms);
  const loading      = useRoomStore((s) => s.loading);
  const deleteRoom   = useRoomStore((s) => s.deleteRoom);
  const fetchRooms   = useRoomStore((s) => s.fetchRooms);
  const { user }     = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(() => {
    if (user?.token) fetchRooms(user.token);
  }, [user?.token, fetchRooms]);

  useEffect(() => { load(); }, [load]);

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="headlineMedium" style={styles.heading}>Rooms</Text>
          <Text variant="bodySmall" style={{ color: colors.outline }}>
            {rooms.length} room{rooms.length !== 1 ? 's' : ''} configured
          </Text>
        </View>
        {loading
          ? <ActivityIndicator size="small" color={colors.primary} />
          : (
            <TouchableOpacity onPress={load}>
              <MaterialCommunityIcons name="refresh" size={22} color={colors.outline} />
            </TouchableOpacity>
          )
        }
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="home-plus-outline" size={64} color={colors.outline + '55'} />
            <Text variant="titleMedium" style={{ color: colors.outline, marginTop: 16 }}>No rooms yet</Text>
            <Text variant="bodySmall" style={{ color: colors.outline, textAlign: 'center', marginTop: 4 }}>
              Tap the + button to design your first room.
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <RoomRow
            room={item}
            onEdit={() => navigation.navigate('RoomEditor', { roomId: item.id })}
            onDelete={() => setDeleteTarget({ id: item.id, name: item.name })}
          />
        )}
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: colors.primary }]}
        color={colors.onPrimary}
        onPress={() => navigation.navigate('RoomEditor', { roomId: undefined })}
      />

      <DeleteModal
        visible={deleteTarget !== null}
        roomName={deleteTarget?.name ?? ''}
        onConfirm={() => {
          if (deleteTarget) deleteRoom(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onDismiss={() => setDeleteTarget(null)}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header:  { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontWeight: '700' },
  list:    { paddingHorizontal: 16, paddingBottom: 100 },
  emptyState: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  // Card
  card:        { borderRadius: 20, marginBottom: 14, overflow: 'hidden' },
  accentBar:   { height: 4 },
  cardBody:    { padding: 14 },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  roomIcon:    { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitleGroup: { flex: 1, gap: 2 },
  iconBtn:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  // Map preview
  mapWrapper: {
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 0,
  },
  deviceDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -9 }, { translateY: -9 }],
  },
  // FAB
  fab: { position: 'absolute', right: 16, bottom: 104 },
});

export default RoomsListScreen;
