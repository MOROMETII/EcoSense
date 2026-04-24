import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

import SparkLine from './SparkLine';
import type { Room } from '../models/types';

interface Props {
  room: Room;
}

const ANOMALY_COLOR = '#EF4444';
const ENERGY_COLOR = '#F59E0B';

const RoomCard: React.FC<Props> = ({ room }) => {
  const [expanded, setExpanded] = useState(false);
  const { colors } = useTheme();

  const latestTemp = room.analytics.temperature.at(-1)?.value ?? '—';
  const latestEnergy = room.analytics.energyUsage.at(-1)?.value ?? '—';
  const hasAnomalies = room.analytics.anomalies.length > 0;

  const tempValues = room.analytics.temperature.map((d) => d.value);
  const energyValues = room.analytics.energyUsage.map((d) => d.value);

  return (
    <Surface
      style={[
        styles.card,
        { backgroundColor: colors.surface },
        hasAnomalies && styles.anomalyBorder,
      ]}
      elevation={2}
    >
      <TouchableOpacity onPress={() => setExpanded((e) => !e)} activeOpacity={0.8}>
        {/* Header row */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons name="floor-plan" size={20} color={colors.primary} />
            <Text variant="titleMedium" style={styles.roomName}>
              {room.name}
            </Text>
            {hasAnomalies && (
              <MaterialCommunityIcons name="alert" size={16} color={ANOMALY_COLOR} />
            )}
          </View>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={colors.outline}
          />
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <MaterialCommunityIcons name="thermometer" size={16} color={colors.secondary} />
            <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
              {' '}{latestTemp}°C
            </Text>
          </View>
          <View style={styles.stat}>
            <MaterialCommunityIcons name="flash" size={16} color={ENERGY_COLOR} />
            <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
              {' '}{latestEnergy} W
            </Text>
          </View>
          <View style={styles.stat}>
            <MaterialCommunityIcons name="devices" size={14} color={colors.outline} />
            <Text variant="bodySmall" style={{ color: colors.outline }}>
              {' '}{room.devices.length} device{room.devices.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded details */}
      {expanded && (
        <View style={styles.expandedContent}>
          {/* Sparkline charts */}
          <View style={styles.chartRow}>
            <View style={styles.chartBlock}>
              <Text variant="labelSmall" style={{ color: colors.outline }}>
                TEMPERATURE (°C)
              </Text>
              <SparkLine data={tempValues} color={colors.secondary} height={48} />
            </View>
            <View style={styles.chartBlock}>
              <Text variant="labelSmall" style={{ color: colors.outline }}>
                ENERGY (W)
              </Text>
              <SparkLine data={energyValues} color={ENERGY_COLOR} height={48} />
            </View>
          </View>

          {/* Anomalies */}
          {room.analytics.anomalies.length > 0 && (
            <View style={styles.section}>
              <Text variant="labelSmall" style={{ color: ANOMALY_COLOR, marginBottom: 6 }}>
                ANOMALIES
              </Text>
              {room.analytics.anomalies.map((anomaly, i) => (
                <View key={i} style={[styles.chip, { backgroundColor: '#FEF2F2' }]}>
                  <MaterialCommunityIcons name="alert-circle" size={14} color={ANOMALY_COLOR} />
                  <Text
                    variant="bodySmall"
                    style={{ color: ANOMALY_COLOR, marginLeft: 6, flex: 1 }}
                  >
                    {anomaly}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* AI Suggestions */}
          {room.analytics.aiSuggestions.length > 0 && (
            <View style={styles.section}>
              <Text variant="labelSmall" style={{ color: colors.primary, marginBottom: 6 }}>
                AI SUGGESTIONS
              </Text>
              {room.analytics.aiSuggestions.map((suggestion, i) => (
                <View
                  key={i}
                  style={[styles.chip, { backgroundColor: colors.primaryContainer }]}
                >
                  <MaterialCommunityIcons name="robot" size={14} color={colors.primary} />
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.onSurface, marginLeft: 6, flex: 1 }}
                  >
                    {suggestion}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  anomalyBorder: {
    borderLeftWidth: 4,
    borderLeftColor: '#F97316',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomName: { fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: { flexDirection: 'row', alignItems: 'center' },
  expandedContent: { marginTop: 16 },
  chartRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  chartBlock: { flex: 1, gap: 4 },
  section: { marginTop: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
});

export default RoomCard;
