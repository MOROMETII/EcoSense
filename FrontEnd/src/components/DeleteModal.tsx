import React from 'react';
import { Text, Button, Dialog, Portal } from 'react-native-paper';

interface Props {
  visible: boolean;
  roomName: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

const DeleteModal: React.FC<Props> = ({ visible, roomName, onConfirm, onDismiss }) => (
  <Portal>
    <Dialog visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>Delete Room</Dialog.Title>
      <Dialog.Content>
        <Text variant="bodyMedium">
          Are you sure you want to delete "{roomName}"? This action cannot be undone.
        </Text>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>Cancel</Button>
        <Button textColor="#EF4444" onPress={onConfirm}>
          Delete
        </Button>
      </Dialog.Actions>
    </Dialog>
  </Portal>
);

export default DeleteModal;
