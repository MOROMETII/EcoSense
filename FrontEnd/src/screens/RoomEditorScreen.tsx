import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import ScreenWrapper from '../components/ScreenWrapper';
import BlueprintBackground from '../components/BlueprintBackground';
import { useRoomStore } from '../store/useRoomStore';
import type { Device, BlueprintData, BlueprintFeature } from '../models/types';
import type { RoomsStackParamList } from '../navigation/RoomsNavigator';

type Props = NativeStackScreenProps<RoomsStackParamList, 'RoomEditor'>;
type Step = 'layout' | 'devices' | 'save';
type FeatureType = 'door' | 'window';
type WallId = 'top' | 'bottom' | 'left' | 'right';
type DeviceType = 'smart_socket' | 'temperature_sensor';

const SCREEN_W   = Dimensions.get('window').width;
const GRID_SIZE  = 12;
const WALL_SLOTS = 7;
const SLOT_OFFSETS: number[] = [1 / 8, 2 / 8, 3 / 8, 4 / 8, 5 / 8, 6 / 8, 7 / 8];
// Slot size: fill available width (padding 32) across WALL_SLOTS + 2 corners
const SLOT_SIZE  = Math.floor((SCREEN_W - 32) / (WALL_SLOTS + 2));

const DOOR_COLOR   = '#10B981';
const WINDOW_COLOR = '#60A5FA';

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEP_LABELS: Step[] = ['layout', 'devices', 'save'];
const STEP_DISPLAY = ['Layout', 'Devices', 'Save'];

const StepIndicator: React.FC<{ current: Step }> = ({ current }) => {
  const { colors } = useTheme();
  const idx = STEP_LABELS.indexOf(current);
  return (
    <View style={siStyles.row}>
      {STEP_DISPLAY.map((label, i) => {
        const done   = i < idx;
        const active = i === idx;
        const dotBg  = done || active ? colors.primary : colors.surfaceVariant;
        const textColor = done || active ? colors.onPrimary : colors.outline;
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <View
                style={[
                  siStyles.line,
                  { backgroundColor: i <= idx ? colors.primary : colors.outline + '33' },
                ]}
              />
            )}
            <View style={siStyles.item}>
              <View style={[siStyles.dot, { backgroundColor: dotBg }]}>
                {done ? (
                  <MaterialCommunityIcons name="check" size={12} color={textColor} />
                ) : (
                  <Text style={[siStyles.dotLabel, { color: textColor }]}>{i + 1}</Text>
                )}
              </View>
              <Text
                style={[
                  siStyles.label,
                  {
                    color: active ? colors.primary : colors.outline,
                    fontWeight: active ? '700' : '400',
                  },
                ]}
              >
                {label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
};

const siStyles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 24 },
  item:     { alignItems: 'center', width: 60 },
  dot:      { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dotLabel: { fontSize: 12, fontWeight: '700' },
  line:     { flex: 1, height: 2, marginTop: 12, maxWidth: 40 },
  label:    { fontSize: 11, marginTop: 5 },
});

// ─── Prop / device selector card ──────────────────────────────────────────────

interface SelectorCardProps {
  icon: string;
  label: string;
  sublabel?: string;
  active: boolean;
  accentColor: string;
  onPress: () => void;
}

const SelectorCard: React.FC<SelectorCardProps> = ({
  icon, label, sublabel, active, accentColor, onPress,
}) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        scStyles.card,
        {
          backgroundColor: active ? accentColor + '1A' : colors.surfaceVariant,
          borderColor: active ? accentColor : 'transparent',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[scStyles.iconBadge, { backgroundColor: active ? accentColor : colors.outline + '22' }]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={active ? '#fff' : colors.outline}
        />
      </View>
      <Text style={[scStyles.label, { color: active ? accentColor : colors.onSurface, fontWeight: active ? '700' : '500' }]}>
        {label}
      </Text>
      {sublabel ? (
        <Text style={[scStyles.sublabel, { color: colors.outline }]}>{sublabel}</Text>
      ) : null}
    </TouchableOpacity>
  );
};

const scStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 2,
    gap: 6,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label:    { fontSize: 13, textAlign: 'center' },
  sublabel: { fontSize: 10, textAlign: 'center' },
});

// ─── Room diagram ─────────────────────────────────────────────────────────────

interface DiagramProps {
  features: BlueprintFeature[];
  selectedType: FeatureType;
  onToggle: (wall: WallId, slotIndex: number) => void;
}

const RoomDiagram: React.FC<DiagramProps> = ({ features, selectedType, onToggle }) => {
  const { colors } = useTheme();
  const wallColor   = colors.outline + '55';
  const ghostColor  = selectedType === 'door' ? DOOR_COLOR : WINDOW_COLOR;
  const ghostIcon   = selectedType === 'door' ? 'door' : 'window-open-variant';

  const getFeature = (wall: WallId, idx: number) =>
    features.find((f) => f.wall === wall && f.offset === SLOT_OFFSETS[idx]);

  const renderSlot = (wall: WallId, idx: number) => {
    const f         = getFeature(wall, idx);
    const slotColor = f?.type === 'door' ? DOOR_COLOR : f?.type === 'window' ? WINDOW_COLOR : null;
    const icon      = f?.type === 'door' ? 'door' : f?.type === 'window' ? 'window-open-variant' : null;

    return (
      <TouchableOpacity
        key={`${wall}-${idx}`}
        style={[
          dStyles.slot,
          {
            backgroundColor: slotColor ?? wallColor,
            ...(slotColor
              ? { shadowColor: slotColor, shadowRadius: 8, shadowOpacity: 0.6, elevation: 4 }
              : {}),
          },
        ]}
        onPress={() => onToggle(wall, idx)}
        activeOpacity={0.7}
      >
        {icon ? (
          <MaterialCommunityIcons name={icon as any} size={12} color="#fff" />
        ) : (
          <MaterialCommunityIcons name={ghostIcon as any} size={10} color={ghostColor + '55'} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={dStyles.diagram}>
      {/* Top wall */}
      <View style={dStyles.row}>
        <View style={[dStyles.corner, { backgroundColor: wallColor }]} />
        {Array.from({ length: WALL_SLOTS }, (_, i) => renderSlot('top', i))}
        <View style={[dStyles.corner, { backgroundColor: wallColor }]} />
      </View>

      {/* Middle */}
      <View style={dStyles.middle}>
        <View style={dStyles.sideWall}>
          {Array.from({ length: WALL_SLOTS }, (_, i) => renderSlot('left', i))}
        </View>

        {/* Interior with dot grid */}
        <View style={[dStyles.interior, { backgroundColor: colors.surfaceVariant }]}>
          {Array.from({ length: 5 }, (_, row) => (
            <View key={row} style={dStyles.dotRow}>
              {Array.from({ length: 5 }, (_, col) => (
                <View key={col} style={[dStyles.dotDot, { backgroundColor: colors.outline + '25' }]} />
              ))}
            </View>
          ))}
        </View>

        <View style={dStyles.sideWall}>
          {Array.from({ length: WALL_SLOTS }, (_, i) => renderSlot('right', i))}
        </View>
      </View>

      {/* Bottom wall */}
      <View style={dStyles.row}>
        <View style={[dStyles.corner, { backgroundColor: wallColor }]} />
        {Array.from({ length: WALL_SLOTS }, (_, i) => renderSlot('bottom', i))}
        <View style={[dStyles.corner, { backgroundColor: wallColor }]} />
      </View>
    </View>
  );
};

const dStyles = StyleSheet.create({
  diagram:  { alignSelf: 'center', marginBottom: 20 },
  row:      { flexDirection: 'row', height: SLOT_SIZE },
  corner:   { width: SLOT_SIZE, height: SLOT_SIZE },
  slot:     { width: SLOT_SIZE, height: SLOT_SIZE, alignItems: 'center', justifyContent: 'center', borderRadius: 3 },
  middle:   { flexDirection: 'row', height: SLOT_SIZE * WALL_SLOTS },
  sideWall: { width: SLOT_SIZE, flexDirection: 'column' },
  interior: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  dotRow:   { flexDirection: 'row', gap: 10 },
  dotDot:   { width: 4, height: 4, borderRadius: 2 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

const RoomEditorScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { roomId } = route.params;
  const rooms      = useRoomStore((s) => s.rooms);
  const addRoom    = useRoomStore((s) => s.addRoom);
  const updateRoom = useRoomStore((s) => s.updateRoom);

  const existingRoom = roomId ? rooms.find((r) => r.id === roomId) : undefined;

  const [step, setStep]                               = useState<Step>('layout');
  const [features, setFeatures]                       = useState<BlueprintFeature[]>(existingRoom?.blueprint?.features ?? []);
  const [selectedFeatureType, setSelectedFeatureType] = useState<FeatureType>('door');
  const [devices, setDevices]                         = useState<Device[]>(existingRoom?.devices ?? []);
  const [selectedDeviceType, setSelectedDeviceType]   = useState<DeviceType>('smart_socket');
  const [roomName, setRoomName]                       = useState(existingRoom?.name ?? '');

  const blueprint: BlueprintData = { features };

  // ── Layout handlers ───────────────────────────────────────────────────────

  const handleToggleFeature = (wall: WallId, slotIndex: number) => {
    const offset   = SLOT_OFFSETS[slotIndex];
    const existing = features.find((f) => f.wall === wall && f.offset === offset);
    if (existing) {
      setFeatures((prev) => prev.filter((f) => !(f.wall === wall && f.offset === offset)));
    } else {
      setFeatures((prev) => [...prev, { type: selectedFeatureType, wall, offset }]);
    }
  };

  const handleLayoutNext = () => {
    if (!features.some((f) => f.type === 'door')) {
      Alert.alert('Door Required', 'Every room needs at least one door. Tap a wall slot to add one.');
      return;
    }
    setStep('devices');
  };

  // ── Device handlers ───────────────────────────────────────────────────────

  const getDeviceAt = (x: number, y: number) =>
    devices.find((d) => d.position.x === x && d.position.y === y);

  const handleCellPress = (x: number, y: number) => {
    const hit = getDeviceAt(x, y);
    if (hit) {
      setDevices((prev) => prev.filter((d) => !(d.position.x === x && d.position.y === y)));
      return;
    }
    if (
      selectedDeviceType === 'temperature_sensor' &&
      devices.some((d) => d.type === 'temperature_sensor')
    ) {
      Alert.alert('Limit Reached', 'Only 1 temperature sensor is allowed per room.');
      return;
    }
    const socketIndex = devices.filter((d) => d.type === 'smart_socket').length + 1;
    const newId =
      selectedDeviceType === 'smart_socket'
        ? `SKT_${String(socketIndex).padStart(2, '0')}`
        : `d_${Date.now()}`;
    const newDevice: Device = {
      id: newId,
      type: selectedDeviceType,
      position: { x, y },
      ...(selectedDeviceType === 'smart_socket' ? { energyUsage: 0 } : { temperature: 0 }),
    };
    setDevices((prev) => [...prev, newDevice]);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = () => {
    const name = roomName.trim();
    if (!name) { Alert.alert('Name Required', 'Please enter a room name.'); return; }
    if (existingRoom) {
      updateRoom({ ...existingRoom, name, devices, blueprint });
    } else {
      addRoom({
        id: String(Date.now()),
        name,
        devices,
        blueprint,
        analytics: { temperature: [], energyUsage: [], aiSuggestions: [], anomalies: [] },
      });
    }
    navigation.goBack();
  };

  // ── Render: layout ────────────────────────────────────────────────────────

  if (step === 'layout') {
    const doorCount   = features.filter((f) => f.type === 'door').length;
    const windowCount = features.filter((f) => f.type === 'window').length;

    return (
      <ScreenWrapper>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <StepIndicator current="layout" />

          <Text variant="headlineSmall" style={styles.stepTitle}>Design Room Layout</Text>
          <Text variant="bodySmall" style={{ color: colors.outline, marginBottom: 20 }}>
            Choose a prop type, then tap the wall slots to place or remove it.
          </Text>

          {/* Prop selector */}
          <View style={styles.selectorRow}>
            <SelectorCard
              icon="door"
              label="Door"
              sublabel="required"
              active={selectedFeatureType === 'door'}
              accentColor={DOOR_COLOR}
              onPress={() => setSelectedFeatureType('door')}
            />
            <SelectorCard
              icon="window-open-variant"
              label="Window"
              sublabel="optional"
              active={selectedFeatureType === 'window'}
              accentColor={WINDOW_COLOR}
              onPress={() => setSelectedFeatureType('window')}
            />
          </View>

          <RoomDiagram
            features={features}
            selectedType={selectedFeatureType}
            onToggle={handleToggleFeature}
          />

          {/* Summary chips */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryChip, { backgroundColor: DOOR_COLOR + '18', borderColor: DOOR_COLOR }]}>
              <MaterialCommunityIcons name="door" size={14} color={DOOR_COLOR} />
              <Text style={[styles.summaryChipText, { color: DOOR_COLOR }]}>
                {doorCount} door{doorCount !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={[styles.summaryChip, { backgroundColor: WINDOW_COLOR + '18', borderColor: WINDOW_COLOR }]}>
              <MaterialCommunityIcons name="window-open-variant" size={14} color={WINDOW_COLOR} />
              <Text style={[styles.summaryChipText, { color: WINDOW_COLOR }]}>
                {windowCount} window{windowCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {doorCount === 0 && (
            <Text variant="bodySmall" style={{ color: colors.error, textAlign: 'center', marginBottom: 8 }}>
              At least 1 door is required to continue
            </Text>
          )}

          <View style={styles.btnRow}>
            <Button mode="outlined" style={styles.btnHalf} onPress={() => navigation.goBack()}>Cancel</Button>
            <Button mode="contained" style={styles.btnHalf} onPress={handleLayoutNext}>Next</Button>
          </View>
        </ScrollView>
      </ScreenWrapper>
    );
  }

  // ── Render: devices ───────────────────────────────────────────────────────

  if (step === 'devices') {
    const socketCount = devices.filter((d) => d.type === 'smart_socket').length;
    const sensorCount = devices.filter((d) => d.type === 'temperature_sensor').length;

    return (
      <ScreenWrapper>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <StepIndicator current="devices" />

          <Text variant="headlineSmall" style={styles.stepTitle}>Place Devices</Text>
          <Text variant="bodySmall" style={{ color: colors.outline, marginBottom: 20 }}>
            Tap a cell to place a device. Tap again to remove it.
          </Text>

          {/* Device selector */}
          <View style={styles.selectorRow}>
            <SelectorCard
              icon="power-socket"
              label="Smart Socket"
              sublabel={`${socketCount} placed`}
              active={selectedDeviceType === 'smart_socket'}
              accentColor={colors.primary}
              onPress={() => setSelectedDeviceType('smart_socket')}
            />
            <SelectorCard
              icon="thermometer"
              label="Temp Sensor"
              sublabel={sensorCount === 0 ? 'not placed' : '1 placed'}
              active={selectedDeviceType === 'temperature_sensor'}
              accentColor={colors.secondary}
              onPress={() => setSelectedDeviceType('temperature_sensor')}
            />
          </View>

          {/* Grid */}
          <View style={styles.gridWrapper}>
            <BlueprintBackground blueprint={blueprint} />
            <View style={styles.gridInner}>
              {Array.from({ length: GRID_SIZE }, (_, row) => (
                <View key={row} style={styles.gridRow}>
                  {Array.from({ length: GRID_SIZE }, (_, col) => {
                    const device = getDeviceAt(col, row);
                    return (
                      <TouchableOpacity
                        key={col}
                        style={[
                          styles.cell,
                          { borderColor: colors.outline + '33' },
                          device != null && {
                            backgroundColor:
                              device.type === 'temperature_sensor'
                                ? colors.secondaryContainer + 'CC'
                                : colors.primaryContainer + 'CC',
                          },
                        ]}
                        onPress={() => handleCellPress(col, row)}
                        activeOpacity={0.6}
                      >
                        {device != null && (
                          <MaterialCommunityIcons
                            name={device.type === 'temperature_sensor' ? 'thermometer' : 'power-socket'}
                            size={11}
                            color={
                              device.type === 'temperature_sensor' ? colors.secondary : colors.primary
                            }
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: DOOR_COLOR }]} />
              <Text variant="bodySmall" style={{ color: colors.outline }}>Door</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: WINDOW_COLOR }]} />
              <Text variant="bodySmall" style={{ color: colors.outline }}>Window</Text>
            </View>
            <View style={styles.legendItem}>
              <MaterialCommunityIcons name="power-socket" size={14} color={colors.primary} />
              <Text variant="bodySmall" style={{ marginLeft: 3, color: colors.onSurface }}>
                {socketCount} socket{socketCount !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <MaterialCommunityIcons name="thermometer" size={14} color={colors.secondary} />
              <Text variant="bodySmall" style={{ marginLeft: 3, color: colors.onSurface }}>
                {sensorCount}/1 sensor
              </Text>
            </View>
          </View>

          <View style={styles.btnRow}>
            <Button mode="outlined" style={styles.btnHalf} onPress={() => setStep('layout')}>Back</Button>
            <Button mode="contained" style={styles.btnHalf} onPress={() => setStep('save')}>Next</Button>
          </View>
        </ScrollView>
      </ScreenWrapper>
    );
  }

  // ── Render: save ──────────────────────────────────────────────────────────

  const doorCount   = features.filter((f) => f.type === 'door').length;
  const windowCount = features.filter((f) => f.type === 'window').length;
  const socketCount = devices.filter((d) => d.type === 'smart_socket').length;
  const sensorCount = devices.filter((d) => d.type === 'temperature_sensor').length;

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <StepIndicator current="save" />

        <Text variant="headlineSmall" style={styles.stepTitle}>
          {existingRoom ? 'Rename Room' : 'Name Your Room'}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.outline, marginBottom: 20 }}>
          Give this room a name to identify it on your dashboard.
        </Text>

        <TextInput
          label="Room Name"
          value={roomName}
          onChangeText={setRoomName}
          style={styles.nameInput}
          autoFocus
          mode="outlined"
        />

        {/* Room summary card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surfaceVariant }]}>
          <Text variant="labelMedium" style={{ color: colors.outline, marginBottom: 10, letterSpacing: 0.8 }}>
            ROOM SUMMARY
          </Text>
          <View style={styles.summaryGrid}>
            {[
              { icon: 'door',         color: DOOR_COLOR,   value: `${doorCount}`,   label: 'Doors'   },
              { icon: 'window-open-variant', color: WINDOW_COLOR, value: `${windowCount}`, label: 'Windows' },
              { icon: 'power-socket', color: colors.primary,    value: `${socketCount}`, label: 'Sockets' },
              { icon: 'thermometer',  color: colors.secondary,  value: `${sensorCount}`, label: 'Sensors' },
            ].map((item) => (
              <View key={item.label} style={styles.summaryStat}>
                <View style={[styles.summaryStatIcon, { backgroundColor: item.color + '22' }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={18} color={item.color} />
                </View>
                <Text variant="titleMedium" style={{ fontWeight: '700', color: colors.onSurface }}>
                  {item.value}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.outline }}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.btnRow}>
          <Button mode="outlined" style={styles.btnHalf} onPress={() => setStep('devices')}>Back</Button>
          <Button mode="contained" style={styles.btnHalf} onPress={handleSave}>
            {existingRoom ? 'Update Room' : 'Save Room'}
          </Button>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 40 },
  stepTitle:     { fontWeight: '700', marginBottom: 6 },

  // Selector row
  selectorRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },

  // Summary chips
  summaryRow:       { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryChip:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, gap: 6 },
  summaryChipText:  { fontSize: 12, fontWeight: '600' },

  // Buttons
  btnRow:   { flexDirection: 'row', gap: 12, width: '100%', marginTop: 4 },
  btnHalf:  { flex: 1 },

  // Device grid
  gridWrapper: { width: '100%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  gridInner:   { ...StyleSheet.absoluteFillObject, padding: 3 },
  gridRow:     { flex: 1, flexDirection: 'row' },
  cell: {
    flex: 1,
    margin: 0.5,
    borderWidth: 0.5,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Legend
  legend:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:  { width: 10, height: 10, borderRadius: 2 },

  // Save step
  nameInput: { marginBottom: 20 },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryStat: {
    alignItems: 'center',
    gap: 4,
  },
  summaryStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});

export default RoomEditorScreen;

