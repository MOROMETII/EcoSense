import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Text, Button, SegmentedButtons, TextInput, Surface, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import ScreenWrapper from '../components/ScreenWrapper';
import BlueprintBackground from '../components/BlueprintBackground';
import { useRoomStore } from '../store/useRoomStore';
import type { Device, BlueprintData, BlueprintFeature } from '../models/types';
import type { RoomsStackParamList } from '../navigation/RoomsNavigator';

type Props = NativeStackScreenProps<RoomsStackParamList, 'RoomEditor'>;
type Step = 'scan' | 'processing' | 'blueprint' | 'save';
type DeviceType = 'smart_socket' | 'temperature_sensor';

const GRID_SIZE = 8;
const SCAN_DURATION_MS = 5000; // 5 seconds of "scanning"

/** Deterministically generate a plausible blueprint from a scan seed. */
function generateBlueprint(seed: number): BlueprintData {
  const rand = (n: number) => ((seed * 9301 + n * 49297) % 233280) / 233280;
  const walls: Array<'top' | 'bottom' | 'left' | 'right'> = ['top', 'bottom', 'left', 'right'];
  const features: BlueprintFeature[] = [];
  walls.forEach((wall, wi) => {
    // Each wall gets 0–2 features
    const count = Math.floor(rand(wi * 7) * 3);
    for (let i = 0; i < count; i++) {
      features.push({
        type: rand(wi * 13 + i) > 0.5 ? 'door' : 'window',
        wall,
        offset: 0.2 + rand(wi * 17 + i) * 0.6,
      });
    }
  });
  return { features };
}

const RoomEditorScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { roomId } = route.params;
  const rooms = useRoomStore((s) => s.rooms);
  const addRoom = useRoomStore((s) => s.addRoom);
  const updateRoom = useRoomStore((s) => s.updateRoom);

  const existingRoom = roomId ? rooms.find((r) => r.id === roomId) : undefined;

  const [step, setStep] = useState<Step>(existingRoom ? 'blueprint' : 'scan');
  const [devices, setDevices] = useState<Device[]>(existingRoom?.devices ?? []);
  const [selectedType, setSelectedType] = useState<DeviceType>('smart_socket');
  const [roomName, setRoomName] = useState(existingRoom?.name ?? '');
  const [blueprint, setBlueprint] = useState<BlueprintData>(
    existingRoom?.blueprint ?? { features: [] },
  );
  const [scanProgress, setScanProgress] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanStartRef = useRef<number>(0);

  // Clean up interval on unmount
  useEffect(() => () => { if (scanTimerRef.current) clearInterval(scanTimerRef.current); }, []);

  const startScan = useCallback(() => {
    setScanProgress(0);
    scanStartRef.current = Date.now();
    scanTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - scanStartRef.current;
      const p = Math.min(elapsed / SCAN_DURATION_MS, 1);
      setScanProgress(p);
      if (p >= 1) {
        clearInterval(scanTimerRef.current!);
        scanTimerRef.current = null;
      }
    }, 80);
  }, []);

  const endScan = useCallback(() => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    setStep('processing');
    // Simulate brief server-side processing
    setTimeout(() => {
      setBlueprint(generateBlueprint(Date.now()));
      setScanProgress(0);
      setStep('blueprint');
    }, 1200);
  }, []);

  const getDeviceAt = (x: number, y: number): Device | undefined =>
    devices.find((d) => d.position.x === x && d.position.y === y);

  const handleCellPress = (x: number, y: number) => {
    const hit = getDeviceAt(x, y);
    if (hit) {
      setDevices((prev) => prev.filter((d) => !(d.position.x === x && d.position.y === y)));
      return;
    }
    if (selectedType === 'temperature_sensor') {
      if (devices.some((d) => d.type === 'temperature_sensor')) {
        Alert.alert('Limit Reached', 'Only 1 temperature sensor is allowed per room.');
        return;
      }
    }
    const newDevice: Device = {
      id: `d_${Date.now()}`,
      type: selectedType,
      position: { x, y },
      ...(selectedType === 'smart_socket' ? { energyUsage: 0 } : { temperature: 0 }),
    };
    setDevices((prev) => [...prev, newDevice]);
  };

  const handleSave = () => {
    const name = roomName.trim();
    if (!name) {
      Alert.alert('Name Required', 'Please enter a room name.');
      return;
    }
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

  // ── Step 1: Scan ──────────────────────────────────────────────────────────────
  if (step === 'scan') {
    if (!permission) {
      return (
        <ScreenWrapper>
          <View style={styles.centeredContent}>
            <ActivityIndicator />
          </View>
        </ScreenWrapper>
      );
    }

    if (!permission.granted) {
      return (
        <ScreenWrapper>
          <View style={styles.centeredContent}>
            <MaterialCommunityIcons name="camera-off" size={64} color={colors.outline} />
            <Text
              variant="bodyMedium"
              style={{ color: colors.outline, textAlign: 'center', marginTop: 16, marginBottom: 24 }}
            >
              Camera access is required to scan the room.
            </Text>
            <Button mode="contained" onPress={requestPermission}>
              Grant Camera Access
            </Button>
            <Button mode="text" onPress={() => navigation.goBack()} style={{ marginTop: 8 }}>
              Cancel
            </Button>
          </View>
        </ScreenWrapper>
      );
    }

    const isScanning = scanProgress > 0 && scanProgress < 1;

    return (
      <View style={StyleSheet.absoluteFill}>
        <CameraView style={StyleSheet.absoluteFill} facing="back" />

        {/* Scan overlay UI */}
        <View style={[StyleSheet.absoluteFill, styles.scanOverlay]}>
          {/* Corner guides */}
          {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
            <View
              key={c}
              style={[
                styles.corner,
                c.includes('t') ? styles.cornerTop : styles.cornerBottom,
                c.includes('l') ? styles.cornerLeft : styles.cornerRight,
                { borderColor: isScanning ? '#10B981' : colors.primary },
              ]}
            />
          ))}

          {/* Scanning label */}
          <View style={styles.scanLabelContainer}>
            <Text variant="titleMedium" style={{ color: '#fff', textAlign: 'center' }}>
              {isScanning
                ? 'Scanning… slowly pan the room'
                : 'Point camera at the room walls'}
            </Text>
            <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 4 }}>
              Cover all four walls, windows and doors
            </Text>
          </View>

          {/* Progress bar */}
          {isScanning && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${scanProgress * 100}%` }]} />
            </View>
          )}

          {/* Buttons */}
          <View style={styles.scanButtonRow}>
            <Button
              mode="outlined"
              textColor="#fff"
              style={styles.scanBtnCancel}
              onPress={() => navigation.goBack()}
            >
              Cancel
            </Button>
            {!isScanning ? (
              <Button mode="contained" style={styles.scanBtnMain} onPress={startScan}>
                Start Scan
              </Button>
            ) : (
              <Button mode="contained" style={styles.scanBtnMain} onPress={endScan}>
                End Scan
              </Button>
            )}
          </View>
        </View>
      </View>
    );
  }

  // ── Processing ────────────────────────────────────────────────────────────────
  if (step === 'processing') {
    return (
      <ScreenWrapper>
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyMedium" style={{ color: colors.outline, marginTop: 24 }}>
            Generating floor plan…
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  // ── Step 2: Blueprint ─────────────────────────────────────────────────────────
  if (step === 'blueprint') {
    const socketCount = devices.filter((d) => d.type === 'smart_socket').length;
    const sensorCount = devices.filter((d) => d.type === 'temperature_sensor').length;

    return (
      <ScreenWrapper>
        <ScrollView contentContainerStyle={styles.blueprintContent}>
          <Text variant="headlineSmall" style={styles.stepTitle}>
            Place Devices
          </Text>
          <Text variant="bodySmall" style={{ color: colors.outline, marginBottom: 12 }}>
            Tap a cell to place a device. Tap again to remove it.
          </Text>

          <SegmentedButtons
            value={selectedType}
            onValueChange={(v) => setSelectedType(v as DeviceType)}
            buttons={[
              { value: 'smart_socket', label: 'Socket', icon: 'power-socket' },
              { value: 'temperature_sensor', label: 'Sensor', icon: 'thermometer' },
            ]}
            style={styles.segmented}
          />

          {/* Blueprint grid with generated background */}
          <View style={styles.gridWrapper}>
            {/* Generated 2-D blueprint background */}
            <BlueprintBackground blueprint={blueprint} />

            {/* Device placement grid on top */}
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
                          { borderColor: colors.outline + '44' },
                          device != null && { backgroundColor: colors.primaryContainer + 'CC' },
                        ]}
                        onPress={() => handleCellPress(col, row)}
                        activeOpacity={0.6}
                      >
                        {device != null && (
                          <MaterialCommunityIcons
                            name={device.type === 'temperature_sensor' ? 'thermometer' : 'power-socket'}
                            size={14}
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
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text variant="bodySmall" style={{ color: colors.outline }}>Door</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#60A5FA' }]} />
              <Text variant="bodySmall" style={{ color: colors.outline }}>Window</Text>
            </View>
            <View style={styles.legendItem}>
              <MaterialCommunityIcons name="power-socket" size={15} color={colors.primary} />
              <Text variant="bodySmall" style={{ marginLeft: 4, color: colors.onSurface }}>
                Sockets: {socketCount}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <MaterialCommunityIcons name="thermometer" size={15} color={colors.secondary} />
              <Text variant="bodySmall" style={{ marginLeft: 4, color: colors.onSurface }}>
                Sensors: {sensorCount}/1
              </Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <Button mode="outlined" style={styles.btnHalf} onPress={() => navigation.goBack()}>
              Cancel
            </Button>
            <Button mode="contained" style={styles.btnHalf} onPress={() => setStep('save')}>
              Next
            </Button>
          </View>
        </ScrollView>
      </ScreenWrapper>
    );
  }

  // ── Step 3: Save ──────────────────────────────────────────────────────────────
  return (
    <ScreenWrapper>
      <View style={styles.centeredContent}>
        <Text variant="headlineSmall" style={[styles.stepTitle, { textAlign: 'center' }]}>
          {existingRoom ? 'Rename Room' : 'Name Your Room'}
        </Text>
        <TextInput
          label="Room Name"
          value={roomName}
          onChangeText={setRoomName}
          style={styles.nameInput}
          autoFocus
        />
        <View style={styles.buttonRow}>
          <Button mode="outlined" style={styles.btnHalf} onPress={() => setStep('blueprint')}>
            Back
          </Button>
          <Button mode="contained" style={styles.btnHalf} onPress={handleSave}>
            Save Room
          </Button>
        </View>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  // ── Scan step ────────────────────────────────────────────────────────────────
  scanOverlay: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 60,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderWidth: 3,
  },
  cornerTop: { top: 80 },
  cornerBottom: { bottom: 160 },
  cornerLeft: { left: 32, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerRight: { right: 32, borderLeftWidth: 0, borderBottomWidth: 0 },
  scanLabelContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  scanButtonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 32,
  },
  scanBtnCancel: {
    flex: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  scanBtnMain: { flex: 1 },
  // ── Blueprint step ───────────────────────────────────────────────────────────
  buttonRow: { flexDirection: 'row', gap: 12, width: '100%' },
  btnHalf: { flex: 1 },
  blueprintContent: { padding: 16, paddingBottom: 32 },
  stepTitle: { fontWeight: '700', marginBottom: 8 },
  segmented: { marginBottom: 12 },
  gridWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  gridInner: {
    ...StyleSheet.absoluteFillObject,
    padding: 4,
  },
  gridRow: { flex: 1, flexDirection: 'row' },
  cell: {
    flex: 1,
    margin: 1,
    borderWidth: 0.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  // ── Save step ────────────────────────────────────────────────────────────────
  nameInput: { width: '100%', marginBottom: 24 },
});

export default RoomEditorScreen;
