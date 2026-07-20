import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/theme';
import { notificationApi } from '@/services/notificationApi';
import { connectSocket } from '@/services/socketClient';
import { useAuth } from '@/hooks/useAuth';

export default function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  const fetchUnread = async () => {
    if (!user) return;
    try {
      const res = await notificationApi.getNotifications();
      const count = (res.notifications || []).filter((n: any) => !n.isRead).length;
      setUnread(count);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Real-time socket
  useEffect(() => {
    if (!user) return;
    let socket: ReturnType<typeof connectSocket> | null = null;
    try {
      socket = connectSocket();
      socket.on('new_notification', () => {
        setUnread((prev) => prev + 1);
        fetchUnread();
      });
    } catch { /* socket not available */ }
    return () => {
      if (socket) socket.off('new_notification');
    };
  }, [user]);

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={() => {
        setUnread(0);
        router.push('/notifications' as any);
      }}
    >
      <Ionicons name="notifications-outline" size={22} color={Colors.light.goldLight} />
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 4, position: 'relative' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
