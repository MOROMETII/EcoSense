import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, TextInput, HelperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../context/AuthContext';
import { registerApi, loginApi } from '../../services/authApi';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const [username, setUsername]         = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [loading, setLoading]           = useState(false);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);
  const { login } = useAuth();

  const passwordMismatch = confirm.length > 0 && password !== confirm;
  const passwordTooShort = password.length > 0 && password.length < 6;

  const handleRegister = async () => {
    setSubmitted(true);
    setErrorMsg(null);
    if (!username.trim()) { setErrorMsg('Username is required.'); return; }
    if (!email.trim())    { setErrorMsg('Email is required.'); return; }
    if (password.length < 6) return;
    if (password !== confirm) return;

    setLoading(true);
    const result = await registerApi(username.trim(), password, email.trim());
    setLoading(false);

    if (result.ok) {
      const loginResult = await loginApi(username.trim(), password);
      if (loginResult.ok && loginResult.token) {
        await login(loginResult.token, loginResult.user_id ?? 0, loginResult.username ?? username.trim());
      } else {
        // Registration succeeded but auto-login failed — go to login screen.
        navigation.navigate('Login');
      }
    } else {
      setErrorMsg(result.message ?? 'Registration failed.');
    }
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
        label="Username"
        value={username}
        onChangeText={(v) => { setUsername(v); setErrorMsg(null); }}
        autoCapitalize="none"
        autoCorrect={false}
        left={<TextInput.Icon icon="account-outline" />}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Email"
        value={email}
        onChangeText={(v) => { setEmail(v); setErrorMsg(null); }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        left={<TextInput.Icon icon="email-outline" />}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Password"
        value={password}
        onChangeText={(v) => { setPassword(v); setErrorMsg(null); }}
        secureTextEntry={!showPass}
        left={<TextInput.Icon icon="lock-outline" />}
        right={<TextInput.Icon icon={showPass ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowPass((p) => !p)} />}
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
        onChangeText={(v) => { setConfirm(v); setErrorMsg(null); }}
        secureTextEntry={!showConfirm}
        left={<TextInput.Icon icon="lock-check-outline" />}
        right={<TextInput.Icon icon={showConfirm ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowConfirm((p) => !p)} />}
        mode="outlined"
        style={styles.input}
        error={submitted && passwordMismatch}
      />
      <HelperText type="error" visible={submitted && passwordMismatch} style={styles.helper}>
        Passwords do not match.
      </HelperText>

      {/* Server / network error */}
      <HelperText type="error" visible={!!errorMsg} style={styles.helper}>
        {errorMsg ?? ''}
      </HelperText>

      <Button
        mode="contained"
        onPress={handleRegister}
        loading={loading}
        disabled={loading}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Create Account
      </Button>
      <Button mode="text" onPress={() => navigation.navigate('Login')} style={{ marginTop: 4 }} disabled={loading}>
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

