import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { subscriptionApi } from '@/services/subscriptionApi';
import type { LessonRequest } from '@/types/subscription';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';

export default function AdminLessonRequestsTab() {
  const [requests, setRequests] = useState<LessonRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subscriptionApi.getAdminLessonRequests()
      .then((data) => setRequests(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator size="large" color={Colors.light.gold} style={{ padding: 40 }} />;

  if (requests.length === 0) {
    return <Text style={S.empty}>Không có yêu cầu bài học nào.</Text>;
  }

  return (
    <ScrollView>
      {requests.map((req) => {
        const requesterName = typeof req.requesterId === 'object' && req.requesterId
          ? req.requesterId.name : typeof req.requesterId === 'string' ? req.requesterId : 'N/A';
        const status = req.status === 'Pending' ? 'Chờ duyệt' : req.status === 'Accepted' ? 'Đã nhận' : req.status === 'InProgress' ? 'Đang soạn' : req.status === 'Completed' ? 'Hoàn thành' : req.status;
        return (
          <View key={req._id} style={S.card}>
            <Text style={S.title}>{req.title}</Text>
            <Text style={S.body} numberOfLines={2}>{req.description}</Text>
            <Text style={S.meta}>Người yêu cầu: {requesterName} · {status} · {new Date(req.createdAt).toLocaleDateString('vi-VN')}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const S = {
  empty: { color: '#6b4f14', fontSize: FontSizes.sm, textAlign: 'center' as const, padding: 24, fontStyle: 'italic' as const },
  card: { backgroundColor: '#1e1508', borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: 'rgba(201, 161, 90, 0.2)', padding: Spacing.sm, marginBottom: 8 },
  title: { color: '#f0ddb7', fontSize: FontSizes.sm, fontWeight: '600' as const },
  body: { color: '#8c6a34', fontSize: FontSizes.xs, marginTop: 4 },
  meta: { color: '#6b4f14', fontSize: 10, marginTop: 4 },
};
