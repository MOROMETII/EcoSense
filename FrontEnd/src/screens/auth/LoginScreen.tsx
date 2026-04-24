import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../context/AuthContext';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();

  const handleLogin = () => {
    login('mock-token', { email, name: email.split('@')[0] || 'User' });
  };

  return (
    <ScreenWrapper style={styles.container}>
      {/* Logo / icon */}
      <View style={[styles.iconWrap, { backgroundColor: colors.primaryContainer }]}>
        <MaterialCommunityIcons name="lightning-bolt" size={40} color={colors.primary} />
      </View>

      <Text variant="headlineMedium" style={[styles.title, { color: colors.onSurface }]}>Welcome Back</Text>
      <Text variant="bodySmall" style={{ color: colors.outline, marginBottom: 28 }}>Sign in to manage your rooms.</Text>

      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        left={<TextInput.Icon icon="email-outline" />}
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPass}
        left={<TextInput.Icon icon="lock-outline" />}
        right={<TextInput.Icon icon={showPass ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowPass((v) => !v)} />}
        mode="outlined"
        style={styles.input}
      />

      <Button mode="contained" onPress={handleLogin} style={styles.button} contentStyle={styles.buttonContent}>
        Sign In
      </Button>
      <Button mode="text" onPress={() => navigation.navigate('Register')} style={{ marginTop: 4 }}>
        Don't have an account? Register
      </Button>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container:     { alignItems: 'center', justifyContent: 'center', padding: 24 },
  iconWrap:      { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title:         { fontWeight: '700', marginBottom: 4 },
  input:         { width: '100%', marginBottom: 12 },
  button:        { width: '100%', marginTop: 8, marginBottom: 8 },
  buttonContent: { paddingVertical: 4 },
});

export default LoginScreen;
