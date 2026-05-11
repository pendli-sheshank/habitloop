import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { signInWithEmail } from '@/services/auth/authService';
import { getAuthErrorMessage } from '@/services/auth/authErrors';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSignIn() {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      // onAuthStateChanged in root layout handles navigation
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? '';
      setError(getAuthErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignIn() {
    Alert.alert('Coming soon', 'Google sign-in will be available after OAuth setup.');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.logo}>HabitLoop</Text>
            <Text style={styles.tagline}>Built around real-life habits.</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              mode="outlined"
              outlineColor={AppColors.border}
              activeOutlineColor={AppColors.primary}
              disabled={loading}
              style={styles.input}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="current-password"
              mode="outlined"
              outlineColor={AppColors.border}
              activeOutlineColor={AppColors.primary}
              disabled={loading}
              style={styles.input}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(v => !v)}
                />
              }
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotRow}
              disabled={loading}
            >
              <Text style={styles.link}>Forgot password?</Text>
            </TouchableOpacity>

            <Button
              mode="contained"
              onPress={handleSignIn}
              loading={loading}
              disabled={loading}
              buttonColor={AppColors.primary}
              style={styles.button}
              labelStyle={styles.buttonLabel}
            >
              Sign In
            </Button>

            <Button
              mode="outlined"
              onPress={handleGoogleSignIn}
              disabled={loading}
              textColor={AppColors.text}
              style={styles.googleButton}
              icon="google"
              labelStyle={styles.buttonLabel}
            >
              Continue with Google
            </Button>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            disabled={loading}
            style={styles.bottomLink}
          >
            <Text style={styles.textMuted}>
              Don't have an account?{' '}
              <Text style={styles.link}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: AppColors.surface },
  flex:       { flex: 1 },
  container:  { flex: 1, paddingHorizontal: AppSpacing.lg, justifyContent: 'center', gap: AppSpacing.xl },
  header:     { alignItems: 'center', gap: AppSpacing.sm },
  logo:       { fontSize: AppFontSize.display, fontWeight: '700', color: AppColors.primary },
  tagline:    { fontSize: AppFontSize.md, color: AppColors.textMuted },
  form:       { gap: AppSpacing.md },
  input:      { backgroundColor: AppColors.surface },
  forgotRow:  { alignSelf: 'flex-end', marginTop: -AppSpacing.sm },
  error:      { color: AppColors.danger, fontSize: AppFontSize.sm, textAlign: 'center' },
  button:     { borderRadius: AppRadius.md, paddingVertical: AppSpacing.xs },
  googleButton: { borderRadius: AppRadius.md, borderColor: AppColors.border, paddingVertical: AppSpacing.xs },
  buttonLabel: { fontSize: AppFontSize.md },
  link:       { color: AppColors.primary, fontWeight: '600' },
  textMuted:  { color: AppColors.textMuted, fontSize: AppFontSize.sm },
  bottomLink: { alignItems: 'center', paddingBottom: AppSpacing.md },
});
