import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

import SparkLine from './SparkLine';
import SocketDetailsModal from './SocketDetailsModal';
import type { Room, Device } from '../models/types';

interface Props {
  room: Room;
}

const ANOMALY_COLOR = '#EF4444';
const ENERGY_COLOR  = '#F59E0B';

const RoomCard: React.FC<Props> = ({ room }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedSocket, setSelectedSocket] = useState<Device | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { colors } = useTheme();

  const latestTemp   = room.analytics.temperature.at(-1)?.value ?? '—';
  const latestEnergy = room.analytics.energyUsage.at(-1)?.value ?? '—';
  const hasAnomalies = room.analytics.anomalies.length > 0;
  const accentColor  = hasAnomalies ? ANOMALY_COLOR : colors.primary;

  const tempValues   = room.analytics.temperature.map((d) => d.value);
  const energyValues = room.analytics.energyUsage.map((d) => d.value);
  const sockets      = room.devices.filter((d) => d.type === 'smart_socket');

  const handleSocketPress = (socket: Device) => {
    setSelectedSocket(socket);
    setModalVisible(true);
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
                          {socket.energyUsage} W
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

              {/* AI Suggestions */}
              {room.analytics.aiSuggestions.length > 0 && (
                <View style={styles.section}>
                  <Text variant="labelSmall" style={{ color: colors.primary, marginBottom: 6, letterSpacing: 0.6 }}>
                    AI SUGGESTIONS
                  </Text>
                  {room.analytics.aiSuggestions.map((s, i) => (
                    <View key={i} style={[styles.chip, { backgroundColor: colors.primaryContainer, borderColor: colors.primary + '33' }]}>
                      <MaterialCommunityIcons name="robot-outline" size={14} color={colors.primary} />
                      <Text variant="bodySmall" style={{ color: colors.onSurface, marginLeft: 6, flex: 1 }}>
                        {s}
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

