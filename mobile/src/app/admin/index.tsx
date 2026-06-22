import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import HeaderBar from '@/components/ui/HeaderBar';

export default function AdminScreen() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
    return (
      <View style={styles.container}>
        <HeaderBar title="Admin" showBack onBack={() => router.back()} />
        <View style={styles.centered}>
          <Text style={styles.deniedText}>Bạn không có quyền truy cập</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderBar title="Quản Trị" showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.greeting}>Xin chào, {user.name}</Text>

        <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>📊</Text>
            <Text style={styles.menuLabel}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>📚</Text>
            <Text style={styles.menuLabel}>Quản lý Lessons</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>👥</Text>
            <Text style={styles.menuLabel}>Quản lý Users</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>🎧</Text>
            <Text style={styles.menuLabel}>Quản lý Podcasts</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  deniedText: { fontFamily: 'Cormorant Garamond', fontSize: FontSizes.lg, color: Colors.light.error },
  scrollContent: { padding: Spacing.lg, gap: 24 },
  greeting: {
    fontFamily: 'Playfair Display',
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.light.text,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuItem: {
    width: '47%',
    backgroundColor: Colors.light.panel,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 8,
  },
  menuIcon: { fontSize: 32 },
  menuLabel: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.light.text,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
