import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PageBackground } from '@/components/PageBackground';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import HeaderBar from '@/components/ui/HeaderBar';

export default function StaffScreen() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
    return (
      <PageBackground style={styles.container}>
        <HeaderBar title="Staff" showBack />
        <View style={styles.centered}>
          <Text style={styles.deniedText}>Bạn không có quyền truy cập</Text>
        </View>
      </PageBackground>
    );
  }

  return (
    <PageBackground style={styles.container}>
      <HeaderBar title="Nhân Viên" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.greeting}>Xin chào, {user.name}</Text>

        <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="book-outline" size={32} color={Colors.light.goldDark} />
            <Text style={styles.menuLabel}>Tạo Lesson</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="headset-outline" size={32} color={Colors.light.goldDark} />
            <Text style={styles.menuLabel}>Tạo Podcast</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  menuLabel: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.light.text,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
