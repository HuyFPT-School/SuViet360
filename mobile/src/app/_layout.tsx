import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AppProviders from '@/components/AppProviders';
import { useAppSelector } from '@/store';
import { Colors } from '@/constants/theme';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.light.gold} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="light" />
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="verify-email" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="lesson/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="podcast/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="blog/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="blog/my-posts" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="blog/friends" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="blog/groups" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="blog/groups/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="subscription/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="subscription/checkout" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="subscription/redeem" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="subscription/history" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="leaderboard" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="teacher/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="admin/index" />
          <Stack.Screen name="staff/index" />
        </Stack>
      </AuthGate>
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundDark,
  },
});
