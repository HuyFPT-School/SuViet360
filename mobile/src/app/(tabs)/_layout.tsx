import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSizes } from '@/constants/theme';
import { useAppSelector } from '@/store';
import UnreadBadge from '@/components/ui/UnreadBadge';

function TabIcon({ icon, color }: { icon: string; color: any }) {
  return (
    <Text style={[styles.tabIcon, { color }]}>{icon}</Text>
  );
}

export default function TabLayout() {
  const totalUnread = useAppSelector((state) => state.chat.totalUnread);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.light.gold,
        tabBarInactiveTintColor: Colors.light.goldMuted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang Chủ',
          tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          title: 'Học Tập',
          tabBarIcon: ({ color }) => <TabIcon icon="📚" color={color} />,
        }}
      />
      <Tabs.Screen
        name="podcasts"
        options={{
          title: 'Khám Phá',
          tabBarIcon: ({ color }) => <TabIcon icon="🎧" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <TabIcon icon="💬" color={color} />,
          tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
          tabBarBadgeStyle: styles.tabBadge,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá Nhân',
          tabBarIcon: ({ color }) => <TabIcon icon="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.light.backgroundDark,
    borderTopWidth: 2,
    borderTopColor: Colors.light.goldDark,
    height: 64,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabLabel: {
    fontFamily: 'Cinzel',
    fontSize: FontSizes.xs,
    letterSpacing: 0.5,
  },
  tabIcon: {
    fontSize: 22,
  },
  tabBadge: {
    backgroundColor: Colors.light.gold,
    color: Colors.light.backgroundDark,
    fontSize: 11,
    fontWeight: '700',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
  },
});
