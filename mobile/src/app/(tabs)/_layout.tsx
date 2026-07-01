import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import type { ColorValue } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/theme';
import { useAppSelector } from '@/store';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  focused,
  color,
  activeIcon,
  inactiveIcon,
}: {
  focused: boolean;
  color: ColorValue;
  activeIcon: IoniconName;
  inactiveIcon: IoniconName;
}) {
  return (
    <Ionicons
      name={focused ? activeIcon : inactiveIcon}
      size={26}
      color={String(color)}
    />
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
        tabBarShowLabel: false,
      }}
      sceneContainerStyle={{ backgroundColor: 'transparent' }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang Chủ',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              focused={focused}
              color={color}
              activeIcon="home"
              inactiveIcon="home-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          title: 'Học Tập',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              focused={focused}
              color={color}
              activeIcon="book"
              inactiveIcon="book-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="podcasts"
        options={{
          title: 'Khám Phá',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              focused={focused}
              color={color}
              activeIcon="headset"
              inactiveIcon="headset-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              focused={focused}
              color={color}
              activeIcon="chatbubble"
              inactiveIcon="chatbubble-outline"
            />
          ),
          tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
          tabBarBadgeStyle: styles.tabBadge,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá Nhân',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              focused={focused}
              color={color}
              activeIcon="person"
              inactiveIcon="person-outline"
            />
          ),
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
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
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
