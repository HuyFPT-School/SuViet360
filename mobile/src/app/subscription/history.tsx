import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { PageBackground } from '@/components/PageBackground';
import HeaderBar from '@/components/ui/HeaderBar';
import { useAuth } from '@/hooks/useAuth';
import { subscriptionApi } from '@/services/subscriptionApi';
import type { Transaction } from '@/types/subscription';

const STATUS_COLORS: Record<string, string> = {
  Completed: Colors.light.success,
  Pending: Colors.light.gold,
  Failed: Colors.light.error,
  Refunded: Colors.light.textMuted,
};

const STATUS_LABELS: Record<string, string> = {
  Completed: 'Hoàn thành',
  Pending: 'Đang xử lý',
  Failed: 'Thất bại',
  Refunded: 'Đã hoàn tiền',
};

export default function HistoryScreen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await subscriptionApi.getTransactions();
        setTransactions(data);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    if (user) load();
  }, [user]);

  const formatAmount = (amount: number) => amount.toLocaleString('vi-VN') + '₫';
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.txCard}>
      <View style={styles.txHeader}>
        <Text style={styles.txId}>#{item.transactionId?.slice(-8) || item._id.slice(-8)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] || Colors.light.textMuted) + '22' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || Colors.light.textMuted }]}>
            {STATUS_LABELS[item.status] || item.status}
          </Text>
        </View>
      </View>
      <View style={styles.txBody}>
        <View style={styles.txDetail}>
          <Ionicons name="layers-outline" size={14} color={Colors.light.textMuted} />
          <Text style={styles.txDetailText}>{item.tierId?.name || 'N/A'}</Text>
        </View>
        <View style={styles.txDetail}>
          <Ionicons name="card-outline" size={14} color={Colors.light.textMuted} />
          <Text style={styles.txDetailText}>{item.billingCycle === 'yearly' ? 'Hàng năm' : 'Hàng tháng'}</Text>
        </View>
        {item.isGift && (
          <View style={styles.txDetail}>
            <Ionicons name="gift-outline" size={14} color={Colors.light.textMuted} />
            <Text style={styles.txDetailText}>Quà tặng</Text>
          </View>
        )}
        {!!item.couponCode && (
          <View style={styles.txDetail}>
            <Ionicons name="pricetag-outline" size={14} color={Colors.light.textMuted} />
            <Text style={styles.txDetailText}>Mã: {item.couponCode}</Text>
          </View>
        )}
      </View>
      <View style={styles.txFooter}>
        <Text style={styles.txDate}>{formatDate(item.createdAt)}</Text>
        <Text style={styles.txAmount}>
          {item.discountAmount > 0 && (
            <Text style={styles.txOriginalAmount}>{formatAmount(item.originalAmount)} → </Text>
          )}
          {formatAmount(item.amount)}
        </Text>
      </View>
    </View>
  );

  return (
    <PageBackground style={styles.container}>
      <HeaderBar title="Lịch Sử Giao Dịch" showBack />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.gold} />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={48} color={Colors.light.textMuted} />
          <Text style={styles.emptyText}>Chưa có giao dịch nào.</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </PageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: Colors.light.textMuted, fontSize: FontSizes.md, marginTop: 12 },
  listContent: { padding: Spacing.md },
  txCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.panelBorder,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  txHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  txId: { color: Colors.light.textMuted, fontSize: FontSizes.xs, fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: FontSizes.xs, fontWeight: '600' },
  txBody: { gap: 4, marginBottom: 8 },
  txDetail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  txDetailText: { color: Colors.light.textMain, fontSize: FontSizes.sm },
  txFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txDate: { color: Colors.light.textDim, fontSize: FontSizes.xs },
  txAmount: { color: Colors.light.gold, fontSize: FontSizes.md, fontWeight: '700' },
  txOriginalAmount: { color: Colors.light.textMuted, fontSize: FontSizes.xs, fontWeight: '400', textDecorationLine: 'line-through' },
});
