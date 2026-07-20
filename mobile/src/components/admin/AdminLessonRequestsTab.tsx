import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { subscriptionApi } from '@/services/subscriptionApi';
import type { LessonRequest } from '@/types/subscription';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';

export default function AdminLessonRequestsTab() {
  const [requests, setRequests] = useState<LessonRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subscriptionApi.getAllLessonRequests()
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
  empty: { color: Colors.light.textMuted, fontSize: FontSizes.sm, textAlign: 'center' as const, padding: 24, fontStyle: 'italic' as const },
  card: { backgroundColor: Colors.light.backgroundCard, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.light.panelBorder, padding: Spacing.sm, marginBottom: 8 },
  title: { color: Colors.light.textMain, fontSize: FontSizes.sm, fontWeight: '600' as const },
  body: { color: Colors.light.textMuted, fontSize: FontSizes.xs, marginTop: 4 },
  meta: { color: Colors.light.textDim, fontSize: 10, marginTop: 4 },
};
