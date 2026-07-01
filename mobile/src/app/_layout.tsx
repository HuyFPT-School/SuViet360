import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, ImageBackground } from 'react-native';
import { ThemeProvider, DefaultTheme } from 'expo-router';
import AppProviders from '@/components/AppProviders';
import { useAppSelector } from '@/store';
import { Colors } from '@/constants/theme';

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
  },
};

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
        <ImageBackground
          source={require('@/assets/images/paper_bg.jpg')}
          style={{ flex: 1 }}
          resizeMode="cover"
        >
          <ThemeProvider value={MyTheme}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />
              <Stack.Screen name="forgot-password" />
              <Stack.Screen name="reset-password" />
              <Stack.Screen name="verify-email" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="lesson/[id]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="podcast/[id]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="admin/index" />
              <Stack.Screen name="staff/index" />
            </Stack>
          </ThemeProvider>
        </ImageBackground>
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
