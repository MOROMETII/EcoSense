import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Modal,
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
} from 'react-native';
import { Text, Surface, Chip } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { Device, SocketPrediction } from '../models/types';
import { fetchSocketHistory, fetchSocketRealtime } from '../services/socketPredictionService';
import SparkLine from './SparkLine';

interface SocketDetailsModalProps {
    visible: boolean;
    socket: Device | null;
    roomId: string;
    onClose: () => void;
}

const LABEL_COLORS: Record<string, string> = {
    Low: '#10B981',
    Normal: '#3B82F6',
    High: '#F59E0B',
    Wasteful: '#EF4444',
};

// How often to poll /predict/realtime while the modal is open (ms)
const POLL_INTERVAL_MS = 5_000;

function fmt(value: unknown, decimals: number): string {
    const n = Number(value);
    return isFinite(n) ? n.toFixed(decimals) : '—';
}

const SocketDetailsModal: React.FC<SocketDetailsModalProps> = ({
    visible,
    socket,
    roomId,
    onClose,
}) => {
    const { colors } = useTheme();

    // Snapshot loaded once on open — provides the full history list + initial label
    const [snapshot, setSnapshot] = useState<SocketPrediction | null>(null);
    const [loadingSnap, setLoadingSnap] = useState(false);
    const [snapError, setSnapError] = useState<string | null>(null);

    // Live values updated by the polling ticker
    const [liveKwh, setLiveKwh] = useState<number | null>(null);
    const [liveLabel, setLiveLabel] = useState<string | null>(null);
    const [liveConfidence, setLiveConfidence] = useState<number | null>(null);
    const [liveInsight, setLiveInsight] = useState<string | null>(null);

    // Rolling kWh history built up from realtime ticks — starts from snapshot
    // history and grows one point per poll tick, capped at 48 points (≈ 4 min
    // at 5-second poll, or two full days of hourly data if batch=1).
    const [kwhHistory, setKwhHistory] = useState<number[]>([]);

    // Pulse animation on the live kWh display
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Helpers ───────────────────────────────────────────────────────────────

    const pulse = useCallback(() => {
        Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.08, duration: 150, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
    }, [pulseAnim]);

    // ── Load snapshot (full history for chart baseline + recent readings) ────

    const loadSnapshot = useCallback(async () => {
        if (!socket) return;
        setLoadingSnap(true);
        setSnapError(null);
        try {
            const data = await fetchSocketHistory(socket.id, roomId);
            setSnapshot(data);
            // Seed rolling history from snapshot so the chart isn't empty
            const seed = (data.history ?? []).map((h: any) => Number(h.kwh) || 0);
            setKwhHistory(seed.slice(-48));
            // Set live values to snapshot's latest so nothing is blank
            setLiveKwh(data.current_kwh ?? null);
            setLiveLabel(data.predicted_label ?? null);
            setLiveConfidence(data.confidence ?? null);
            setLiveInsight(data.insight ?? null);
        } catch (err) {
            setSnapError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoadingSnap(false);
        }
    }, [socket, roomId]);

    // ── Poll /predict/realtime for live advancing values ─────────────────────

    const pollRealtime = useCallback(async () => {
        if (!socket) return;
        try {
            const tick = await fetchSocketRealtime(socket.id, roomId);
            if (!tick) return;

            setLiveKwh(tick.current_kwh);
            setLiveLabel(tick.predicted_label_name);
            setLiveConfidence(tick.confidence);
            setLiveInsight(tick.insight);

            // Append the new kWh value to the rolling history, cap at 48
            setKwhHistory((prev) => {
                const next = [...prev, Number(tick.current_kwh) || 0];
                return next.length > 48 ? next.slice(-48) : next;
            });

            pulse();
        } catch {
            // Silent — don't surface transient poll errors
        }
    }, [socket, roomId, pulse]);

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    useEffect(() => {
        if (visible && socket?.type === 'smart_socket') {
            // Reset state for a fresh open
            setSnapshot(null);
            setLiveKwh(null);
            setLiveLabel(null);
            setLiveConfidence(null);
            setLiveInsight(null);
            setKwhHistory([]);

            loadSnapshot();

            // Start polling
            pollTimerRef.current = setInterval(pollRealtime, POLL_INTERVAL_MS);
        }

        return () => {
            if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
            }
        };
    }, [visible, socket]);

    // ── Manual refresh — reload snapshot AND reset poll cursor ───────────────

    const handleRefresh = useCallback(async () => {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        await loadSnapshot();
        pollTimerRef.current = setInterval(pollRealtime, POLL_INTERVAL_MS);
    }, [loadSnapshot, pollRealtime]);

    // ── Guard ─────────────────────────────────────────────────────────────────

    if (!socket || socket.type !== 'smart_socket') return null;

    // Resolved display values: prefer live > snapshot
    const displayKwh = liveKwh ?? snapshot?.current_kwh ?? null;
    const displayLabel = liveLabel ?? snapshot?.predicted_label ?? null;
    const displayConfidence = liveConfidence ?? snapshot?.confidence ?? null;
    const displayInsight = liveInsight ?? snapshot?.insight ?? null;
    const labelColor = LABEL_COLORS[displayLabel ?? ''] ?? colors.primary;

    const recentReadings = snapshot?.history ?? [];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle='fullScreen'
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>

                {/* ── Header ── */}
                <View style={[styles.header, { backgroundColor: colors.surface }]}>
                    <View>
                        <Text variant="labelSmall" style={{ color: colors.outline }}>
                            SOCKET DETAILS
                        </Text>
                        <Text variant="headlineSmall" style={{ fontWeight: '700', color: colors.onSurface }}>
                            {socket.id}
                        </Text>
                    </View>
                    {/* Live indicator dot */}
                    <View style={styles.liveIndicator}>
                        <View style={[styles.liveDot, { backgroundColor: loadingSnap ? colors.outline : '#10B981' }]} />
                        <Text variant="labelSmall" style={{ color: colors.outline, marginLeft: 4 }}>
                            {loadingSnap ? 'Loading' : 'Live'}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <MaterialCommunityIcons name="close" size={24} color={colors.onSurface} />
                    </TouchableOpacity>
                </View>

                {loadingSnap && !snapshot ? (
                    <View style={styles.centerContent}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text variant="bodyMedium" style={{ marginTop: 12, color: colors.outline }}>
                            Loading data…
                        </Text>
                    </View>
                ) : snapError && !snapshot ? (
                    <View style={styles.centerContent}>
                        <MaterialCommunityIcons name="alert-circle" size={48} color="#EF4444" />
                        <Text variant="bodyMedium" style={{ marginTop: 12, color: '#EF4444', textAlign: 'center' }}>
                            {snapError}
                        </Text>
                        <TouchableOpacity
                            onPress={handleRefresh}
                            style={[styles.retryButton, { backgroundColor: colors.primary }]}
                        >
                            <Text variant="labelMedium" style={{ color: colors.onPrimary }}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >

                        {/* ── Live kWh ── */}
                        <Surface style={[styles.card, { backgroundColor: colors.surfaceVariant }]} elevation={2}>
                            <View style={styles.cardHeader}>
                                <Text variant="labelSmall" style={{ color: colors.outline, letterSpacing: 0.6 }}>
                                    CURRENT CONSUMPTION
                                </Text>
                            </View>
                            <View style={styles.kwhDisplay}>
                                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                                    <Text variant="displaySmall" style={{ fontWeight: 'bold', color: labelColor }}>
                                        {fmt(displayKwh, 3)}
                                    </Text>
                                </Animated.View>
                                <Text variant="labelSmall" style={{ color: colors.outline, marginTop: 4 }}>kWh</Text>
                            </View>
                        </Surface>

                        {/* ── Prediction label + confidence ── */}
                        <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
                            <View style={styles.cardHeader}>
                                <Text variant="labelSmall" style={{ color: colors.outline, letterSpacing: 0.6 }}>
                                    PREDICTION
                                </Text>
                            </View>
                            <View style={styles.predictionRow}>
                                <View style={[styles.labelBadge, { backgroundColor: labelColor + '18', borderColor: labelColor }]}>
                                    <Text style={{ color: labelColor, fontWeight: '700', fontSize: 14 }}>
                                        {displayLabel ?? '—'}
                                    </Text>
                                </View>
                                <View style={styles.confidenceBox}>
                                    <Text variant="labelSmall" style={{ color: colors.outline }}>Confidence</Text>
                                    <Text variant="titleMedium" style={{ fontWeight: '700', color: labelColor, marginTop: 2 }}>
                                        {displayConfidence != null ? fmt(displayConfidence * 100, 0) + '%' : '—'}
                                    </Text>
                                </View>
                            </View>
                        </Surface>

                        {/* ── Insight ── */}
                        {displayInsight ? (
                            <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
                                <View style={styles.cardHeader}>
                                    <MaterialCommunityIcons name="lightbulb-on" size={18} color={colors.primary} />
                                    <Text variant="labelSmall" style={{ color: colors.outline, marginLeft: 8, letterSpacing: 0.6 }}>
                                        INSIGHT
                                    </Text>
                                </View>
                                <Text variant="bodySmall" style={{ color: colors.onSurface, lineHeight: 20 }}>
                                    {displayInsight}
                                </Text>
                            </Surface>
                        ) : null}

                        {/* ── Rolling kWh chart (grows with each poll tick) ── */}
                        {kwhHistory.length > 1 && (
                            <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
                                <View style={styles.cardHeader}>
                                    <Text variant="labelSmall" style={{ color: colors.outline, letterSpacing: 0.6 }}>
                                        USAGE HISTORY
                                    </Text>
                                    <Text variant="labelSmall" style={{ color: colors.outline, marginLeft: 'auto' }}>
                                        {kwhHistory.length} readings
                                    </Text>
                                </View>
                                <SparkLine data={kwhHistory} color={labelColor} height={80} />
                                <Text variant="labelSmall" style={{ color: colors.outline, textAlign: 'center', marginTop: 6 }}>
                                    min {fmt(Math.min(...kwhHistory), 3)} · max {fmt(Math.max(...kwhHistory), 3)} kWh
                                </Text>
                            </Surface>
                        )}

                        {/* ── Recent readings from snapshot ── */}
                        {recentReadings.length > 0 && (
                            <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
                                <View style={styles.cardHeader}>
                                    <Text variant="labelSmall" style={{ color: colors.outline, letterSpacing: 0.6 }}>
                                        RECENT READINGS
                                    </Text>
                                </View>
                                {recentReadings.slice(-6).reverse().map((record: any, idx: number) => {
                                    const recLabel = record.predicted_label_name ?? '—';
                                    const recColor = LABEL_COLORS[recLabel] ?? colors.outline;
                                    return (
                                        <View
                                            key={idx}
                                            style={[styles.historyItem, { borderBottomColor: colors.outline + '22' }]}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text variant="labelSmall" style={{ color: colors.outline }}>
                                                    {record.timestamp
                                                        ? new Date(record.timestamp).toLocaleTimeString()
                                                        : '—'}
                                                </Text>
                                                <Text variant="bodySmall" style={{ color: colors.onSurface, fontWeight: '500', marginTop: 2 }}>
                                                    {fmt(record.kwh, 3)} kWh
                                                </Text>
                                            </View>
                                            <Chip
                                                style={{ backgroundColor: recColor + '22' }}
                                                textStyle={{ color: recColor, fontSize: 12 }}
                                            >
                                                {recLabel}
                                            </Chip>
                                        </View>
                                    );
                                })}
                            </Surface>
                        )}

                        {/* ── Refresh button ── */}
                        <TouchableOpacity
                            onPress={handleRefresh}
                            style={[styles.refreshButton, { backgroundColor: colors.primary }]}
                        >
                            <MaterialCommunityIcons name="refresh" size={20} color={colors.onPrimary} />
                            <Text variant="labelMedium" style={{ color: colors.onPrimary, marginLeft: 8, fontWeight: '600' }}>
                                Refresh
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    liveIndicator: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 12 },
    liveDot: { width: 8, height: 8, borderRadius: 4 },
    closeButton: { padding: 8 },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    scrollContent: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 24 },
    card: { borderRadius: 12, padding: 16, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    kwhDisplay: { alignItems: 'center', paddingVertical: 16 },
    predictionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    labelBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 2, flex: 1, alignItems: 'center' },
    confidenceBox: { paddingHorizontal: 12, paddingVertical: 8 },
    historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    retryButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
    refreshButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 8, marginVertical: 16 },
});

export default SocketDetailsModal;