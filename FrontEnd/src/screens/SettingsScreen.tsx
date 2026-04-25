import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, List, Switch, Button, Avatar, Surface, Divider, Snackbar } from 'react-native-paper';
import { useTheme } from 'react-native-paper';

import ScreenWrapper from '../components/ScreenWrapper';
import { useAppTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';

const SettingsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { isDark, toggleTheme } = useAppTheme();
  const { logout, user } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [snackMsg, setSnackMsg]     = useState('');

  const handleLogout = async () => {
    setLoggingOut(true);
    const result = await logout();
    setLoggingOut(false);
    if (!result.ok) {
      setSnackMsg(result.message ?? 'Logout failed. Please try again.');
    }
  };

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={{ flex: 1 }}>
      <ScreenWrapper>
      <Text variant="headlineMedium" style={styles.heading}>
        Settings
      </Text>

      {/* Profile card */}
      <Surface style={[styles.profileCard, { backgroundColor: colors.surface }]} elevation={1}>
        <Avatar.Text size={56} label={initials} />
        <View style={styles.profileInfo}>
          <Text variant="titleMedium">{user?.name ?? 'User'}</Text>
          {user?.email ? (
            <Text variant="bodySmall" style={{ color: colors.outline }}>
              {user.email}
            </Text>
          ) : null}
        </View>
      </Surface>

      <Divider style={styles.divider} />

      {/* Preferences */}
      <Text variant="labelSmall" style={[styles.sectionLabel, { color: colors.outline }]}>
        PREFERENCES
      </Text>
      <List.Item
        title="Dark Mode"
        description="Toggle light / dark theme"
        left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
        right={() => <Switch value={isDark} onValueChange={toggleTheme} />}
      />

      <Divider style={styles.divider} />

      {/* Account */}
      <Text variant="labelSmall" style={[styles.sectionLabel, { color: colors.outline }]}>
        ACCOUNT
      </Text>
      <Button
        mode="outlined"
        onPress={handleLogout}
        loading={loggingOut}
        disabled={loggingOut}
        style={styles.logoutButton}
        textColor="#EF4444"
        icon="logout"
      >
        Logout
      </Button>
      </ScreenWrapper>
      <Snackbar
        visible={snackMsg !== ''}
        onDismiss={() => setSnackMsg('')}
        duration={5000}
        style={{ marginBottom: 80 }}
        action={{ label: 'Retry', onPress: handleLogout }}
      >
        {snackMsg}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  heading: { padding: 16, fontWeight: '700' },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    gap: 16,
  },
  profileInfo: { flex: 1 },
  divider: { marginVertical: 12, marginHorizontal: 16 },
  sectionLabel: { paddingHorizontal: 16, marginBottom: 4 },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 8,
    borderColor: '#EF4444',
  },
});

export default SettingsScreen;
