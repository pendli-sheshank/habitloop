import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { sendPasswordReset } from '@/services/auth/authService';
import { getAuthErrorMessage } from '@/services/auth/authErrors';
import { AppColors, AppSpacing, AppFontSize, AppRadius } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const router  = useRouter();
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [sent, setSent]     = useState(false);

  async function handleSend() {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true); // always show success — never reveal whether email exists
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? '';
      // Only surface network errors — treat unknown-email as success
      if (code === 'auth/network-request-failed') {
        setError(getAuthErrorMessage(code));
      } else {
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✉️</Text>
            <Text style={styles.title}>Check your inbox</Text>
            <Text style={styles.bodyText}>
              If an account exists for {email.trim()}, you'll receive a password reset link shortly.
            </Text>
          </View>

          <TouchableOpacity onPress={() => router.back()} style={styles.bottomLink}>
            <Text style={styles.link}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <Text style={styles.link}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.bodyText}>
              Enter your email and we'll send you a reset link.
            </Text>
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

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              mode="contained"
              onPress={handleSend}
              loading={loading}
              disabled={loading}
              buttonColor={AppColors.primary}
              style={styles.button}
              labelStyle={styles.buttonLabel}
            >
              Send Reset Link
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: AppColors.surface },
  flex:        { flex: 1 },
  container:   { flex: 1, paddingHorizontal: AppSpacing.lg, justifyContent: 'center', gap: AppSpacing.xl },
  backRow:     { position: 'absolute', top: AppSpacing.lg, left: AppSpacing.lg },
  header:      { alignItems: 'center', gap: AppSpacing.sm },
  title:       { fontSize: AppFontSize.xxl, fontWeight: '700', color: AppColors.dark, textAlign: 'center' },
  bodyText:    { fontSize: AppFontSize.md, color: AppColors.textMuted, textAlign: 'center', lineHeight: 22 },
  form:        { gap: AppSpacing.md },
  input:       { backgroundColor: AppColors.surface },
  error:       { color: AppColors.danger, fontSize: AppFontSize.sm, textAlign: 'center' },
  button:      { borderRadius: AppRadius.md, paddingVertical: AppSpacing.xs },
  buttonLabel: { fontSize: AppFontSize.md },
  link:        { color: AppColors.primary, fontWeight: '600', fontSize: AppFontSize.md },
  bottomLink:  { alignItems: 'center', paddingBottom: AppSpacing.lg },
  successBox:  { alignItems: 'center', gap: AppSpacing.md, paddingHorizontal: AppSpacing.md },
  successIcon: { fontSize: 48 },
});
