import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

import SparkLine from './SparkLine';
import SocketDetailsModal from './SocketDetailsModal';
import { fetchRoomBulkData, fetchRoomRealtime, fetchSocketRealtime } from '../services/socketPredictionService';
import { sendLocalAlert } from '../services/notifications';
import { patchThermostat } from '../services/roomsApi';
import { useAuth } from '../context/AuthContext';
import type { Room, Device, DataPoint } from '../models/types';
import { useRoomStore } from '../store/useRoomStore';

interface Props {
  room: Room;
  refreshKey?: number;
}

const ANOMALY_COLOR = '#EF4444';
const ENERGY_COLOR = '#F59E0B';

const LABEL_COLORS: Record<string, string> = {
  Low: '#10B981',
  Normal: '#3B82F6',
  High: '#F59E0B',
  Wasteful: '#EF4444',
};

const RoomCard: React.FC<Props> = ({ room, refreshKey = 0 }) => {
  const toggleSocketDeactivated = useRoomStore((s) => s.toggleSocketDeactivated);
  const updateRoom = useRoomStore((s) => s.updateRoom);
  const { user } = useAuth();

  const [expanded, setExpanded] = useState(false);
  const [selectedSocket, setSelectedSocket] = useState<Device | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [socketKwhMap, setSocketKwhMap] = useState<Record<string, number>>({});
  const [socketLabelMap, setSocketLabelMap] = useState<Record<string, string>>({});
  const [loadingKwh, setLoadingKwh] = useState(false);
  const [tempData, setTempData] = useState<DataPoint[]>([]);
  const [energyData, setEnergyData] = useState<DataPoint[]>([]);
  const [thermostatToggling, setThermostatToggling] = useState(false);
  const { colors } = useTheme();

  const hasAnomalies = room.analytics.anomalies.length > 0;
  const accentColor = hasAnomalies ? ANOMALY_COLOR : colors.primary;

  const tempValues = tempData.length > 0
    ? tempData.map((d) => d.value)
    : room.analytics.temperature.map((d) => d.value);

  const energyValues = energyData.length > 0
    ? energyData.map((d) => d.value)
    : room.analytics.energyUsage.map((d) => d.value);


  const latestTempRaw = tempData.length > 0
    ? tempData.at(-1)?.value
    : room.analytics.temperature.at(-1)?.value;
  const latestTemp = latestTempRaw != null ? Number(latestTempRaw).toFixed(2) : '—';

  const sockets = room.devices.filter((d) => d.type === 'smart_socket');
  const totalKwh = sockets
    .filter((s) => !s.deactivated)
    .reduce((sum, s) => sum + (socketKwhMap[s.id] ?? 0), 0);


  const isSelectedSocketDeactivated = selectedSocket
    ? (room.devices.find((d) => d.id === selectedSocket.id)?.deactivated ?? false)
    : false;
  const latestEnergy = loadingKwh ? '…' : (totalKwh * 1000).toFixed(0);

  const pollTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const prevLabelMapRef = React.useRef<Record<string, string>>({});
  const lastAnomaliesKeyRef = React.useRef<string>('');
  const alertExpiryRef = React.useRef<Record<string, number>>({});
  // Tracks sockets for which we have already sent a notification for a given label
  // key: `${socketId}:${label}` — cleared when the socket is deactivated
  const notifiedRef = React.useRef<Set<string>>(new Set());
  const ALERT_TTL_MS = 60_000; // 60 seconds

  const loadData = useCallback(async () => {
    if (room.id !== "3") return;
    setLoadingKwh(true);
    try {
      const data = await fetchRoomBulkData(room.id);

      const kwhMap: Record<string, number> = {};
      (data.sockets as any[]).forEach((s) => { kwhMap[s.socket_id] = s.kwh; });
      setSocketKwhMap(kwhMap);

      setTempData((data.temp_history as any[]).map((h) => ({
        timestamp: new Date(h.timestamp).getTime(),
        value: h.temp_ambient,
      })));

      setEnergyData((data.energy_history as any[]).map((h) => ({
        timestamp: new Date(h.timestamp).getTime(),
        value: h.kwh * 1000,
      })));
    } catch (err) {
      console.error('Failed to fetch room bulk data:', err);
    } finally {
      setLoadingKwh(false);
    }
  }, [room.id]);

  const pollRealtime = useCallback(async () => {
    if (room.id !== '3') return;
    try {
      const socketList = room.devices.filter((d) => d.type === 'smart_socket');
      const [tick, ...labelResults] = await Promise.all([
        fetchRoomRealtime(room.id),
        ...socketList.map((s) => fetchSocketRealtime(s.id, room.id).catch(() => null)),
      ]);

      const kwhMap: Record<string, number> = {};
      tick.sockets.forEach((s: any) => { kwhMap[s.socket_id] = s.kwh; });
      setSocketKwhMap(kwhMap);

      const labelMap: Record<string, string> = {};
      socketList.forEach((s, i) => {
        const result = labelResults[i];
        if (result?.predicted_label_name) labelMap[s.id] = result.predicted_label_name;
      });
      if (Object.keys(labelMap).length > 0) {
        const alertLabels = new Set(['High', 'Wasteful']);
        socketList.forEach((s) => {
          const newLabel = labelMap[s.id];
          if (!newLabel || !alertLabels.has(newLabel) || s.deactivated) return;
          alertExpiryRef.current[s.id] = Date.now() + ALERT_TTL_MS;
          // Only notify once per socket+label combination
          const notifyKey = `${s.id}:${newLabel}`;
          if (notifiedRef.current.has(notifyKey)) return;
          notifiedRef.current.add(notifyKey);
          const kwh = kwhMap[s.id] ?? 0;
          sendLocalAlert(
            `⚠ ${newLabel} Usage – ${room.name}`,
            `Socket ${s.id} is drawing ${(kwh * 1000).toFixed(1)} W (${newLabel.toLowerCase()})`,
          ).catch(() => {});
        });

        Object.assign(prevLabelMapRef.current, labelMap);
        setSocketLabelMap((prev) => ({ ...prev, ...labelMap }));
      }

      const now = Date.now();
      // A deactivated socket immediately clears its alert and expiry
      socketList.forEach((s) => {
        if (s.deactivated) {
          delete alertExpiryRef.current[s.id];
          delete prevLabelMapRef.current[s.id];
          // Clear notified keys for this socket so it notifies again if reactivated and high
          notifiedRef.current.forEach((key) => {
            if (key.startsWith(`${s.id}:`)) notifiedRef.current.delete(key);
          });
        }
      });

      const alertSockets = socketList.filter((s) => {
        if (s.deactivated) return false;
        const label = prevLabelMapRef.current[s.id];
        const isActiveAlert = label === 'High' || label === 'Wasteful';
        const isSticky = (alertExpiryRef.current[s.id] ?? 0) > now;
        return isActiveAlert || isSticky;
      });
      const newAnomalies = alertSockets.map((s) => {
        const label = prevLabelMapRef.current[s.id];
        const kwh = kwhMap[s.id] ?? 0;
        
        const alertLabel = (label === 'High' || label === 'Wasteful') ? label : 'Resolved';
        return `${s.id}: ${alertLabel} usage (${(kwh * 1000).toFixed(1)} W)`;
      });
      const anomalyKey = newAnomalies.join('|');
      if (anomalyKey !== lastAnomaliesKeyRef.current) {
        lastAnomaliesKeyRef.current = anomalyKey;
        updateRoom({ ...room, analytics: { ...room.analytics, anomalies: newAnomalies } });
      }

      const tickTime = new Date(tick.timestamp).getTime();

      setTempData((prev) => {
        const next = [...prev, { timestamp: tickTime, value: tick.avg_temp }];
        return next.length > 24 ? next.slice(-24) : next;
      });

      setEnergyData((prev) => {
        const next = [...prev, { timestamp: tickTime, value: tick.total_kwh * 1000 }];
        return next.length > 24 ? next.slice(-24) : next;
      });

    } catch (err) {
    }
  }, [room.id, room.devices, room.name, room.analytics, updateRoom]);

  useEffect(() => {
    loadData().then(() => {
      pollTimerRef.current = setInterval(pollRealtime, 5000);
    });

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [loadData, pollRealtime, refreshKey]);
  const handleSocketPress = (socket: Device) => {
    setSelectedSocket(socket);
    setModalVisible(true);
  };

  const thermostat = room.devices.find((d) => d.type === 'temperature_sensor');
  const thermostatOnline = thermostat ? !thermostat.deactivated : null;

  const handleThermostatToggle = () => {
    if (!thermostat?.serverId || !user?.token || thermostatToggling) return;
    const nextOnline = !thermostatOnline;
    // Optimistic update — UI responds immediately
    updateRoom({
      ...room,
      devices: room.devices.map((d) =>
        d.id === thermostat.id ? { ...d, deactivated: !nextOnline } : d,
      ),
    });
    setThermostatToggling(true);
    patchThermostat(thermostat.serverId, nextOnline, user.token)
      .catch((e) => {
        console.error('Thermostat toggle failed:', e);
        // Revert on failure
        updateRoom({
          ...room,
          devices: room.devices.map((d) =>
            d.id === thermostat.id ? { ...d, deactivated: thermostatOnline === false } : d,
          ),
        });
      })
      .finally(() => setThermostatToggling(false));
  };

  const getSocketKwh = (socketId: string) => socketKwhMap[socketId] ?? 0;

  return (
    <>
      <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>

        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

        <View style={styles.body}>
          <TouchableOpacity onPress={() => setExpanded((e) => !e)} activeOpacity={0.8}>
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

          {/* Expanded content */}
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

              {/* Sockets */}
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
                          {
                            backgroundColor: !socket.deactivated && socketLabelMap[socket.id]
                              ? LABEL_COLORS[socketLabelMap[socket.id]] + '22'
                              : colors.surfaceVariant,
                            borderWidth: !socket.deactivated && socketLabelMap[socket.id] ? 1 : 0,
                            borderColor: !socket.deactivated && socketLabelMap[socket.id]
                              ? LABEL_COLORS[socketLabelMap[socket.id]] + '66'
                              : 'transparent',
                          },
                          socket.deactivated && { opacity: 0.45 },
                        ]}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name={socket.deactivated ? 'power-off' : 'power-socket-eu'}
                          size={20}
                          color={
                            socket.deactivated
                              ? colors.outline
                              : (socketLabelMap[socket.id]
                                  ? LABEL_COLORS[socketLabelMap[socket.id]]
                                  : colors.primary)
                          }
                        />
                        <Text variant="bodySmall" style={{ fontWeight: '600', color: colors.onSurface, marginTop: 6, textAlign: 'center' }}>
                          {socket.id}
                        </Text>
                        <Text variant="labelSmall" style={{ color: colors.outline, marginTop: 2 }}>
                          {socket.deactivated ? 'Deactivated' : `${(getSocketKwh(socket.id) * 1000).toFixed(1)} W`}
                        </Text>
                        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.outline} style={styles.socketArrow} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Thermostat */}
              {thermostat && (
                <View style={styles.section}>
                  <Text variant="labelSmall" style={{ color: colors.secondary, marginBottom: 8, letterSpacing: 0.6 }}>
                    THERMOSTAT
                  </Text>
                  <View style={[
                    styles.chip,
                    {
                      backgroundColor: thermostatOnline ? colors.secondaryContainer : colors.surfaceVariant,
                      borderColor: thermostatOnline ? colors.secondary + '55' : colors.outline + '33',
                      justifyContent: 'space-between',
                    },
                  ]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <MaterialCommunityIcons
                        name="thermometer"
                        size={18}
                        color={thermostatOnline ? colors.secondary : colors.outline}
                      />
                      <View>
                        <Text variant="bodySmall" style={{ fontWeight: '600', color: colors.onSurface }}>
                          {thermostat.id}
                        </Text>
                        <Text variant="labelSmall" style={{ color: thermostatOnline ? colors.secondary : colors.outline }}>
                          {thermostatOnline ? 'Online' : 'Offline'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={handleThermostatToggle}
                      disabled={thermostatToggling || !thermostat.serverId}
                      style={[
                        styles.thermostatToggle,
                        {
                          backgroundColor: thermostatOnline
                            ? colors.secondary
                            : colors.outline + '33',
                          opacity: thermostatToggling ? 0.5 : 1,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={thermostatOnline ? 'power' : 'power-off'}
                        size={18}
                        color={thermostatOnline ? colors.onSecondary : colors.outline}
                      />
                    </TouchableOpacity>
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
                      <Text variant="bodySmall" style={{ color: ANOMALY_COLOR, marginLeft: 6, flex: 1 }}>{a}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </Surface>

      <SocketDetailsModal
        visible={modalVisible}
        socket={selectedSocket}
        roomId={room.id}
        isDeactivated={isSelectedSocketDeactivated}
        onToggleDeactivated={() =>
          selectedSocket && toggleSocketDeactivated(room.id, selectedSocket.id)
        }
        onClose={() => { setModalVisible(false); setSelectedSocket(null); }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 20, marginBottom: 14, overflow: 'hidden' },
  accentBar: { height: 4 },
  body: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titleGroup: { flex: 1, gap: 2 },
  statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  expanded: { marginTop: 4 },
  divider: { height: 1, marginVertical: 12 },
  chartRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  chartBlock: { flex: 1, gap: 4 },
  section: { marginTop: 12 },
  socketsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  socketCard: { flex: 1, minWidth: '25%', paddingHorizontal: 6, paddingVertical: 6, borderRadius: 12, alignItems: 'center', position: 'relative' },
  socketArrow: { position: 'absolute', top: 8, right: 8 },
  chip: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 6 },
  thermostatToggle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

export default RoomCard;