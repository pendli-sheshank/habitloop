import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { registerWithEmail } from '@/services/auth/authService';
import { initializeUserProfile } from '@/services/auth/profileService';
import { getAuthErrorMessage } from '@/services/auth/authErrors';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  async function handleRegister() {
    setError('');

    if (!email.trim() || !password || !confirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const credential = await registerWithEmail(email.trim(), password);
      await initializeUserProfile(credential.user.uid, email.trim(), 'email');
      // onAuthStateChanged in root layout fires next → sets 'needs-onboarding'
      // RouteGuard redirects to onboarding
    } catch (e: unknown) {
      console.error('[Register] registration failed:', e);
      const code = (e as { code?: string }).code ?? '';
      setError(getAuthErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Start your habit journey today.</Text>
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
              autoComplete="new-password"
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

            <TextInput
              label="Confirm Password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              mode="outlined"
              outlineColor={AppColors.border}
              activeOutlineColor={AppColors.primary}
              disabled={loading}
              style={styles.input}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              buttonColor={AppColors.primary}
              style={styles.button}
              labelStyle={styles.buttonLabel}
            >
              Create Account
            </Button>
          </View>

          <TouchableOpacity
            onPress={() => router.back()}
            disabled={loading}
            style={styles.bottomLink}
          >
            <Text style={styles.textMuted}>
              Already have an account?{' '}
              <Text style={styles.link}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: AppColors.surface },
  flex:       { flex: 1 },
  scroll:     { flexGrow: 1, paddingHorizontal: AppSpacing.lg, justifyContent: 'center', gap: AppSpacing.xl, paddingVertical: AppSpacing.xxl },
  header:     { alignItems: 'center', gap: AppSpacing.sm },
  title:      { fontSize: AppFontSize.xxl, fontWeight: '700', color: AppColors.dark },
  subtitle:   { fontSize: AppFontSize.md, color: AppColors.textMuted },
  form:       { gap: AppSpacing.md },
  input:      { backgroundColor: AppColors.surface },
  error:      { color: AppColors.danger, fontSize: AppFontSize.sm, textAlign: 'center' },
  button:     { borderRadius: AppRadius.md, paddingVertical: AppSpacing.xs },
  buttonLabel: { fontSize: AppFontSize.md },
  link:       { color: AppColors.primary, fontWeight: '600' },
  textMuted:  { color: AppColors.textMuted, fontSize: AppFontSize.sm },
  bottomLink: { alignItems: 'center', paddingBottom: AppSpacing.md },
});
