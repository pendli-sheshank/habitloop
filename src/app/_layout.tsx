import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';
import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useColorScheme } from 'react-native';

import { auth } from '@/services/firebase';
import { loadUserProfile, initializeUserProfile } from '@/services/auth/profileService';
import { useUserStore } from '@/stores/user/useUserStore';
import { getRouteRedirect } from '@/utils/routeGuard';
import { useWaterSync } from '@/hooks/useWaterSync';
import { AppColors } from '@/constants/theme';
import type { AuthUser } from '@/types/auth';

const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary:          AppColors.primary,
    onPrimary:        '#FFFFFF',
    primaryContainer: AppColors.primaryLight,
    onPrimaryContainer: AppColors.dark,
  },
};

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={AppColors.primary} size="large" />
    </View>
  );
}

function RouteGuard({ children }: { children: React.ReactNode }) {
  const authStatus = useUserStore(s => s.authStatus);
  const router     = useRouter();
  const segments   = useSegments() as string[];

  useEffect(() => {
    const redirect = getRouteRedirect(authStatus, segments);
    if (redirect) router.replace(redirect);
  }, [authStatus, segments]);

  if (authStatus === 'unknown') return <LoadingScreen />;

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { setAuthStatus, setUser, setProfile, clearAuth } = useUserStore();

  // Sync water store with Firestore on auth + handle day resets
  useWaterSync();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        clearAuth();
        return;
      }

      const user: AuthUser = {
        uid:         firebaseUser.uid,
        email:       firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL:    firebaseUser.photoURL,
        provider:    firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
        createdAt:   Date.now(),
      };
      setUser(user);

      const profile = await loadUserProfile(firebaseUser.uid);
      if (!profile || !profile.onboardingComplete) {
        if (!profile) {
          try {
            const provider = firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email';
            await initializeUserProfile(firebaseUser.uid, firebaseUser.email ?? '', provider);
          } catch (e) {
            console.error('[RootLayout] initializeUserProfile fallback failed:', e);
          }
        }
        setAuthStatus('needs-onboarding');
      } else {
        setProfile(profile);
        setAuthStatus('authenticated');
        // TODO: call useFastingStore._hydrate() once fasting-store module is complete
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RouteGuard>
          <Stack screenOptions={{ headerShown: false }} />
        </RouteGuard>
      </ThemeProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
  },
});
