import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Text, Surface, Chip } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { Device, SocketPrediction } from '../models/types';
import { fetchSocketHistory } from '../services/socketPredictionService';
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

const SocketDetailsModal: React.FC<SocketDetailsModalProps> = ({
    visible,
    socket,
    roomId,
    onClose,
}) => {
    const { colors } = useTheme();
    const [prediction, setPrediction] = useState<SocketPrediction | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible && socket && socket.type === 'smart_socket') {
            loadPrediction();
        }
    }, [visible, socket]);

    const loadPrediction = async () => {
        if (!socket) return;

        setLoading(true);
        setError(null);

        try {
            const data = await fetchSocketHistory(socket.id, roomId);
            setPrediction(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load prediction');
            console.error('Socket prediction error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!socket || socket.type !== 'smart_socket') {
        return null;
    }

    const labelColor = prediction
        ? LABEL_COLORS[prediction.predicted_label] || colors.primary
        : colors.outline;

    const kwhValues = prediction
        ? (prediction.history || []).map((h) => h.kwh || 0)
        : [];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: colors.surface }]}>
                    <View>
                        <Text variant="labelSmall" style={{ color: colors.outline }}>
                            SOCKET DETAILS
                        </Text>
                        <Text variant="headlineSmall" style={{ fontWeight: '700', color: colors.onSurface }}>
                            {socket.id}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <MaterialCommunityIcons name="close" size={24} color={colors.onSurface} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.centerContent}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text variant="bodyMedium" style={{ marginTop: 12, color: colors.outline }}>
                            Loading prediction...
                        </Text>
                    </View>
                ) : error ? (
                    <View style={styles.centerContent}>
                        <MaterialCommunityIcons name="alert-circle" size={48} color="#EF4444" />
                        <Text variant="bodyMedium" style={{ marginTop: 12, color: '#EF4444' }}>
                            {error}
                        </Text>
                        <TouchableOpacity
                            onPress={loadPrediction}
                            style={[styles.retryButton, { backgroundColor: colors.primary }]}
                        >
                            <Text variant="labelMedium" style={{ color: colors.onPrimary }}>
                                Retry
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : prediction ? (
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Current kWh Card */}
                        <Surface style={[styles.card, { backgroundColor: colors.surfaceVariant }]} elevation={2}>
                            <View style={styles.cardHeader}>
                                <Text variant="labelSmall" style={{ color: colors.outline, letterSpacing: 0.6 }}>
                                    CURRENT CONSUMPTION
                                </Text>
                            </View>
                            <View style={styles.kwhDisplay}>
                                <Text variant="displaySmall" style={{ fontWeight: 'bold' }}>
                                    {/* Use optional chaining and a fallback to prevent crashes */}
                                    {(prediction?.current_kwh ?? 0).toFixed(3)}
                                </Text>

                            </View>
                        </Surface>

                        {/* Prediction Status Card */}
                        <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
                            <View style={styles.cardHeader}>
                                <Text variant="labelSmall" style={{ color: colors.outline, letterSpacing: 0.6 }}>
                                    PREDICTION
                                </Text>
                            </View>

                            <View style={styles.predictionRow}>
                                <View
                                    style={[
                                        styles.labelBadge,
                                        { backgroundColor: labelColor + '18', borderColor: labelColor },
                                    ]}
                                >
                                    <Text style={{ color: labelColor, fontWeight: '700', fontSize: 14 }}>
                                        {prediction.predicted_label}
                                    </Text>
                                </View>

                                <View style={styles.confidenceBox}>
                                    <Text variant="labelSmall" style={{ color: colors.outline }}>
                                        Confidence
                                    </Text>
                                    <Text
                                        variant="titleMedium"
                                        style={{ fontWeight: '700', color: labelColor, marginTop: 2 }}
                                    >
                                        {(prediction.confidence * 100).toFixed(0)}%
                                    </Text>
                                </View>
                            </View>
                        </Surface>

                        {/* Insight Card */}
                        {prediction.insight && (
                            <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
                                <View style={styles.cardHeader}>
                                    <MaterialCommunityIcons name="lightbulb-on" size={18} color={colors.primary} />
                                    <Text
                                        variant="labelSmall"
                                        style={{ color: colors.outline, marginLeft: 8, letterSpacing: 0.6 }}
                                    >
                                        INSIGHT
                                    </Text>
                                </View>
                                <Text variant="bodySmall" style={{ color: colors.onSurface, lineHeight: 20 }}>
                                    {prediction.insight}
                                </Text>
                            </Surface>
                        )}

                        {/* Usage History Chart */}
                        {kwhValues.length > 0 && (
                            <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
                                <View style={styles.cardHeader}>
                                    <Text variant="labelSmall" style={{ color: colors.outline, letterSpacing: 0.6 }}>
                                        USAGE HISTORY
                                    </Text>
                                </View>
                                <View style={{ marginBottom: 8 }}>
                                    <SparkLine
                                        data={kwhValues}
                                        color={labelColor}
                                        height={80}
                                    />
                                </View>
                                <Text variant="labelSmall" style={{ color: colors.outline, textAlign: 'center' }}>
                                    Last {prediction.history_count} hours
                                </Text>
                            </Surface>
                        )}

                        {/* History Records */}
                        {prediction.history && prediction.history.length > 0 && (
                            <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={2}>
                                <View style={styles.cardHeader}>
                                    <Text variant="labelSmall" style={{ color: colors.outline, letterSpacing: 0.6 }}>
                                        RECENT READINGS
                                    </Text>
                                </View>

                                {prediction.history.slice(-6).reverse().map((record, idx) => {
                                    const recordColor =
                                        LABEL_COLORS[record.predicted_label_name] || colors.outline;
                                    return (
                                        <View
                                            key={idx}
                                            style={[
                                                styles.historyItem,
                                                { borderBottomColor: colors.outline + '22' },
                                            ]}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text variant="labelSmall" style={{ color: colors.outline }}>
                                                    {new Date(record.timestamp).toLocaleTimeString()}
                                                </Text>
                                                <Text
                                                    variant="bodySmall"
                                                    style={{ color: colors.onSurface, fontWeight: '500', marginTop: 2 }}
                                                >
                                                    {record.kwh.toFixed(3) ?? 0} kWh
                                                </Text>
                                            </View>
                                            <Chip
                                                label={record.predicted_label_name}
                                                style={{
                                                    backgroundColor: recordColor + '22',
                                                }}
                                                textStyle={{ color: recordColor, fontSize: 12 }}
                                            />
                                        </View>
                                    );
                                })}
                            </Surface>
                        )}

                        {/* Refresh Button */}
                        <TouchableOpacity
                            onPress={loadPrediction}
                            style={[styles.refreshButton, { backgroundColor: colors.primary }]}
                        >
                            <MaterialCommunityIcons name="refresh" size={20} color={colors.onPrimary} />
                            <Text
                                variant="labelMedium"
                                style={{ color: colors.onPrimary, marginLeft: 8, fontWeight: '600' }}
                            >
                                Refresh
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                ) : null}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    closeButton: {
        padding: 8,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: 24,
    },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    kwhDisplay: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    predictionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    labelBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 2,
        flex: 1,
        alignItems: 'center',
    },
    confidenceBox: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    refreshButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        marginVertical: 16,
    },
});

export default SocketDetailsModal;
