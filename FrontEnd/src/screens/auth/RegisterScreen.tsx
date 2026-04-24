import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, TextInput, HelperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../context/AuthContext';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const [name, setName]                 = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const { login } = useAuth();

  const passwordMismatch = confirm.length > 0 && password !== confirm;
  const passwordTooShort = password.length > 0 && password.length < 6;

  const handleRegister = () => {
    setSubmitted(true);
    if (password !== confirm) return;
    if (password.length < 6) return;
    // All checks passed — proceed (mock login simulates server response)
    login('mock-token', { name: name.trim() || 'User', email });
  };

  return (
    <ScreenWrapper style={styles.container}>
      {/* Logo / icon */}
      <View style={[styles.iconWrap, { backgroundColor: colors.primaryContainer }]}>
        <MaterialCommunityIcons name="account-plus-outline" size={40} color={colors.primary} />
      </View>

      <Text variant="headlineMedium" style={[styles.title, { color: colors.onSurface }]}>Create Account</Text>
      <Text variant="bodySmall" style={{ color: colors.outline, marginBottom: 24 }}>Fill in the details below to get started.</Text>

      <TextInput
        label="Name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        left={<TextInput.Icon icon="account-outline" />}
        mode="outlined"
        style={styles.input}
      />
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
        error={submitted && passwordTooShort}
      />
      <HelperText type="error" visible={submitted && passwordTooShort} style={styles.helper}>
        Password must be at least 6 characters.
      </HelperText>

      <TextInput
        label="Confirm Password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry={!showConfirm}
        left={<TextInput.Icon icon="lock-check-outline" />}
        right={<TextInput.Icon icon={showConfirm ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowConfirm((v) => !v)} />}
        mode="outlined"
        style={styles.input}
        error={submitted && passwordMismatch}
      />
      <HelperText type="error" visible={submitted && passwordMismatch} style={styles.helper}>
        Passwords do not match.
      </HelperText>

      <Button mode="contained" onPress={handleRegister} style={styles.button} contentStyle={styles.buttonContent}>
        Create Account
      </Button>
      <Button mode="text" onPress={() => navigation.navigate('Login')} style={{ marginTop: 4 }}>
        Already have an account? Sign in
      </Button>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container:     { alignItems: 'center', justifyContent: 'center', padding: 24 },
  iconWrap:      { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title:         { fontWeight: '700', marginBottom: 4 },
  input:         { width: '100%', marginBottom: 2 },
  helper:        { width: '100%', marginBottom: 6 },
  button:        { width: '100%', marginTop: 8, marginBottom: 8 },
  buttonContent: { paddingVertical: 4 },
});

export default RegisterScreen;
