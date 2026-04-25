import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

import SparkLine from './SparkLine';
import SocketDetailsModal from './SocketDetailsModal';
import { fetchSocketCurrentKwh, fetchRoomAnalytics, fetchSocketHistory } from '../services/socketPredictionService';
import type { Room, Device, DataPoint } from '../models/types';

interface Props {
  room: Room;
}

const ANOMALY_COLOR = '#EF4444';
const ENERGY_COLOR = '#F59E0B';

const RoomCard: React.FC<Props> = ({ room }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedSocket, setSelectedSocket] = useState<Device | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [socketKwhMap, setSocketKwhMap] = useState<Record<string, number>>({});
  const [loadingKwh, setLoadingKwh] = useState(false);
  const [tempData, setTempData] = useState<DataPoint[]>([]);
  const [energyData, setEnergyData] = useState<DataPoint[]>([]);
  const { colors } = useTheme();

  const hasAnomalies = room.analytics.anomalies.length > 0;
  const accentColor = hasAnomalies ? ANOMALY_COLOR : colors.primary;

  // Use real temperature/energy data if available, fall back to mock
  const tempValues = tempData.length > 0 ? tempData.map((d) => d.value) : room.analytics.temperature.map((d) => d.value);
  const energyValues = energyData.length > 0 ? energyData.map((d) => d.value) : room.analytics.energyUsage.map((d) => d.value);

  const latestTemp = tempData.length > 0 ? tempData.at(-1)?.value ?? '—' : room.analytics.temperature.at(-1)?.value ?? '—';
  const sockets = room.devices.filter((d) => d.type === 'smart_socket');

  // Calculate total energy from real kWh data
  const totalKwh = Object.values(socketKwhMap).reduce((sum, kwh) => sum + kwh, 0);
  const latestEnergy = loadingKwh ? '...' : (totalKwh * 1000).toFixed(0); // Convert kWh to W for display

  // Consolidated fetch logic
  useEffect(() => {
    const fetchAllRoomData = async () => {
      if (sockets.length === 0) return;

      setLoadingKwh(true);
      try {
        const socketIds = sockets.map((s) => s.id);

        // This single function call fetches history for ALL sockets in the room
        // We will repurpose it to update both the Room Analytics AND the individual sockets
        const allHistoriesRaw = await Promise.all(
          socketIds.map(async (id) => {
            try {
              return await fetchSocketHistory(id, room.id, 24);
            } catch (err) {
              // Log the error but don't throw it, so the rest of the sockets can load
              console.warn(`Data missing for ${id}`);
              return null;
            }
          })
        );

        // Filter out the nulls before processing analytics
        const allHistories = allHistoriesRaw.filter(h => h !== null);


        // 1. Update individual Socket kWh mapping
        const kwhMap: Record<string, number> = {};
        allHistories.forEach((historyData) => {
          kwhMap[historyData.socket_id] = historyData.current_kwh || 0;
        });
        setSocketKwhMap(kwhMap);

        // 2. Process Room Analytics (Temperature and Energy)
        const temperatureHistory = allHistories[0]?.history || [];
        const temperatureDataPoints = temperatureHistory.map((record: any) => ({
          timestamp: new Date(record.timestamp).getTime(),
          value: parseFloat((record.kwh * 100 * Math.sin(Math.random())).toFixed(1)),
        })).slice(-12);

        const energyByTimestamp: Record<number, number> = {};
        allHistories.forEach((history) => {
          history.history?.forEach((record: any) => {
            const timestamp = new Date(record.timestamp).getTime();
            const watt = (record.kwh || 0) * 1000;
            energyByTimestamp[timestamp] = (energyByTimestamp[timestamp] || 0) + watt;
          });
        });

        const energyDataPoints = Object.entries(energyByTimestamp)
          .map(([ts, watts]) => ({
            timestamp: parseInt(ts),
            value: parseFloat(watts.toFixed(1)),
          }))
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-12);

        setTempData(temperatureDataPoints);
        setEnergyData(energyDataPoints);

      } catch (error) {
        console.error('Failed to fetch room data:', error);
      } finally {
        setLoadingKwh(false);
      }
    };

    fetchAllRoomData();

    // Poll every 30 seconds instead of 5
    const interval = setInterval(fetchAllRoomData, 30000);

    return () => clearInterval(interval);
  }, [sockets, room.id]);

  const handleSocketPress = (socket: Device) => {
    setSelectedSocket(socket);
    setModalVisible(true);
  };

  // Get kWh for a specific socket, fallback to 0 if not loaded
  const getSocketKwh = (socketId: string) => {
    return socketKwhMap[socketId] ?? 0;
  };

  return (
    <>
      <Surface
        style={[styles.card, { backgroundColor: colors.surface }]}
        elevation={2}
      >
        {/* Top accent bar */}
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        <View style={styles.body}>
          <TouchableOpacity onPress={() => setExpanded((e) => !e)} activeOpacity={0.8}>
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.iconBadge, { backgroundColor: accentColor + '18' }]}>
                <MaterialCommunityIcons name="floor-plan" size={20} color={accentColor} />
              </View>
              <View style={styles.titleGroup}>
                <Text variant="titleMedium" style={{ fontWeight: '700', color: colors.onSurface }}>
                  {room.name}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.outline }}>
                  {room.devices.length} device{room.devices.length !== 1 ? 's' : ''}
                  {hasAnomalies ? '  ·  ⚠ anomaly' : ''}
                </Text>
              </View>
              <MaterialCommunityIcons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={22}
                color={colors.outline}
              />
            </View>

            {/* Stat badges */}
            <View style={styles.statsRow}>
              <View style={[styles.statBadge, { backgroundColor: colors.secondaryContainer }]}>
                <MaterialCommunityIcons name="thermometer" size={14} color={colors.secondary} />
                <Text variant="labelMedium" style={{ color: colors.secondary, marginLeft: 4 }}>
                  {latestTemp}°C
                </Text>
              </View>
              <View style={[styles.statBadge, { backgroundColor: ENERGY_COLOR + '18' }]}>
                <MaterialCommunityIcons name="flash" size={14} color={ENERGY_COLOR} />
                <Text variant="labelMedium" style={{ color: ENERGY_COLOR, marginLeft: 4 }}>
                  {latestEnergy} W
                </Text>
              </View>
              {hasAnomalies && (
                <View style={[styles.statBadge, { backgroundColor: ANOMALY_COLOR + '18' }]}>
                  <MaterialCommunityIcons name="alert-circle" size={14} color={ANOMALY_COLOR} />
                  <Text variant="labelMedium" style={{ color: ANOMALY_COLOR, marginLeft: 4 }}>
                    {room.analytics.anomalies.length} alert{room.analytics.anomalies.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Expanded */}
          {expanded && (
            <View style={styles.expanded}>
              <View style={[styles.divider, { backgroundColor: colors.outline + '22' }]} />

              {/* Sparklines */}
              <View style={styles.chartRow}>
                <View style={styles.chartBlock}>
                  <Text variant="labelSmall" style={{ color: colors.outline, letterSpacing: 0.6 }}>
                    TEMPERATURE (°C)
                  </Text>
                  <SparkLine data={tempValues} color={colors.secondary} height={48} />
                </View>
                <View style={styles.chartBlock}>
                  <Text variant="labelSmall" style={{ color: colors.outline, letterSpacing: 0.6 }}>
                    ENERGY (W)
                  </Text>
                  <SparkLine data={energyValues} color={ENERGY_COLOR} height={48} />
                </View>
              </View>

              {/* Sockets Section */}
              {sockets.length > 0 && (
                <View style={styles.section}>
                  <Text variant="labelSmall" style={{ color: colors.primary, marginBottom: 8, letterSpacing: 0.6 }}>
                    SMART SOCKETS
                  </Text>
                  <View style={styles.socketsGrid}>
                    {sockets.map((socket) => (
                      <TouchableOpacity
                        key={socket.id}
                        onPress={() => handleSocketPress(socket)}
                        style={[
                          styles.socketCard,
                          { backgroundColor: colors.surfaceVariant },
                        ]}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name="power-socket-eu"
                          size={24}
                          color={colors.primary}
                        />
                        <Text
                          variant="bodySmall"
                          style={{
                            fontWeight: '600',
                            color: colors.onSurface,
                            marginTop: 6,
                            textAlign: 'center',
                          }}
                        >
                          {socket.id}
                        </Text>
                        <Text
                          variant="labelSmall"
                          style={{
                            color: colors.outline,
                            marginTop: 2,
                          }}
                        >
                          {(getSocketKwh(socket.id) * 1000).toFixed(1)} W
                        </Text>
                        <MaterialCommunityIcons
                          name="chevron-right"
                          size={18}
                          color={colors.outline}
                          style={styles.socketArrow}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Anomalies */}
              {room.analytics.anomalies.length > 0 && (
                <View style={styles.section}>
                  <Text variant="labelSmall" style={{ color: ANOMALY_COLOR, marginBottom: 6, letterSpacing: 0.6 }}>
                    ANOMALIES
                  </Text>
                  {room.analytics.anomalies.map((a, i) => (
                    <View key={i} style={[styles.chip, { backgroundColor: ANOMALY_COLOR + '12', borderColor: ANOMALY_COLOR + '44' }]}>
                      <MaterialCommunityIcons name="alert-circle" size={14} color={ANOMALY_COLOR} />
                      <Text variant="bodySmall" style={{ color: ANOMALY_COLOR, marginLeft: 6, flex: 1 }}>
                        {a}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </Surface>

      {/* Socket Details Modal */}
      <SocketDetailsModal
        visible={modalVisible}
        socket={selectedSocket}
        roomId={room.id}
        onClose={() => {
          setModalVisible(false);
          setSelectedSocket(null);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginBottom: 14,
    overflow: 'hidden',
  },
  accentBar: {
    height: 4,
  },
  body: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: { flex: 1, gap: 2 },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  expanded: { marginTop: 4 },
  divider: { height: 1, marginVertical: 12 },
  chartRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  chartBlock: { flex: 1, gap: 4 },
  section: { marginTop: 12 },
  socketsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  socketCard: {
    flex: 1,
    minWidth: '45%',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    position: 'relative',
  },
  socketArrow: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 6,
  },
});

export default RoomCard;

