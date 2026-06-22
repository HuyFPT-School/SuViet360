import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Colors, FontSizes, Spacing } from '@/constants/theme';

interface HeaderBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export default function HeaderBar({ title, showBack, onBack, rightElement }: HeaderBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
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
    height: Platform.OS === 'ios' ? 90 : 64,
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
    paddingHorizontal: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  left: {
    width: 60,
    alignItems: 'flex-start',
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
    padding: 8,
  },
  backIcon: {
    fontSize: 22,
    color: Colors.light.goldLight,
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
