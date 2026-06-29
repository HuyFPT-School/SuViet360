import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, FontSizes, Spacing } from '@/constants/theme';

interface HeaderBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export default function HeaderBar({ title, showBack, onBack, rightElement }: HeaderBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0
  );

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <Ionicons name="chevron-back" size={30} color={Colors.light.goldLight} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.center}>
        {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
      </View>
      <View style={styles.right}>
        {rightElement}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.backgroundDark,
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.goldDark,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingBottom: 8,
    paddingHorizontal: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  left: {
    width: 60,
    alignItems: 'flex-start',
    zIndex: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  right: {
    width: 60,
    alignItems: 'flex-end',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201, 161, 90, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201, 161, 90, 0.22)',
    elevation: 10,
    zIndex: 20,
  },
  title: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.light.goldLight,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
