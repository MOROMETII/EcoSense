import React, { useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { Text, List, Button, FAB, Divider } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import ScreenWrapper from '../components/ScreenWrapper';
import DeleteModal from '../components/DeleteModal';
import { useRoomStore } from '../store/useRoomStore';
import type { RoomsStackParamList } from '../navigation/RoomsNavigator';

type Props = NativeStackScreenProps<RoomsStackParamList, 'RoomsList'>;

const RoomsListScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const rooms = useRoomStore((s) => s.rooms);
  const deleteRoom = useRoomStore((s) => s.deleteRoom);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  return (
    <ScreenWrapper>
      <Text variant="headlineMedium" style={styles.heading}>
        Rooms
      </Text>
      <FlatList
        data={rooms}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <Divider />}
        ListEmptyComponent={() => (
          <Text
            variant="bodyMedium"
            style={{ color: colors.outline, textAlign: 'center', marginTop: 40 }}
          >
            No rooms yet. Tap + to add one.
          </Text>
        )}
        renderItem={({ item }) => (
          <List.Item
            title={item.name}
            description={`${item.devices.length} device${item.devices.length !== 1 ? 's' : ''}`}
            left={(props) => <List.Icon {...props} icon="floor-plan" />}
            right={() => (
              <View style={styles.actions}>
                <Button
                  mode="text"
                  compact
                  onPress={() => navigation.navigate('RoomEditor', { roomId: item.id })}
                >
                  Edit
                </Button>
                <Button
                  mode="text"
                  compact
                  textColor="#EF4444"
                  onPress={() => setDeleteTarget({ id: item.id, name: item.name })}
                >
                  Delete
                </Button>
              </View>
            )}
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
  heading: { padding: 16, fontWeight: '700' },
  list: { paddingBottom: 80 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 104 },
});

export default RoomsListScreen;
