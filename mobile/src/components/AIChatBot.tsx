import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, FontSizes, BorderRadius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { chatbotApi, type ChatbotSource } from '@/services/chatbotApi';

interface Message {
  role: 'system' | 'user' | 'ai';
  text: string;
  sources?: ChatbotSource[];
}

export default function AIChatBot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      text: 'Chào bạn! Tôi là Trợ lý AI Sử Việt. Hãy đặt bất kỳ câu hỏi nào về Lịch sử Việt Nam, tôi sẽ hỗ trợ giải đáp.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [showSourcesIdx, setShowSourcesIdx] = useState<number | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // ─── Draggable floating button ────────────────────
  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_W - 72, y: SCREEN_H - 160 })).current;
  const lastPosition = useRef({ x: SCREEN_W - 72, y: SCREEN_H - 160 });
  const isDragging = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
      onPanResponderGrant: () => {
        isDragging.current = false;
        const val = (pan.x as any)._value !== undefined ? { x: (pan.x as any)._value, y: (pan.y as any)._value } : lastPosition.current;
        pan.setOffset({ x: val.x, y: val.y });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3) isDragging.current = true;
        pan.setValue({ x: g.dx, y: g.dy });
      },
      onPanResponderRelease: (_, g) => {
        pan.flattenOffset();
        const currentX = (pan.x as any)._value;
        const currentY = (pan.y as any)._value;
        // Snap to nearest edge
        const snapX = currentX < SCREEN_W / 2 ? 16 : SCREEN_W - 72;
        const clampedY = Math.max(80, Math.min(currentY, SCREEN_H - 160));
        Animated.spring(pan, { toValue: { x: snapX, y: clampedY }, useNativeDriver: false }).start();
        lastPosition.current = { x: snapX, y: clampedY };
        // If not dragging, treat as tap → open
        if (!isDragging.current) setIsOpen(true);
      },
    })
  ).current;

  if (!user) return null;

  const handleSend = async () => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setQuestion('');
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setLoading(true);

    try {
      const res = await chatbotApi.ask(q);
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: res.success
            ? res.answer
            : 'Xin lỗi, đã xảy ra lỗi trong quá trình xử lý câu trả lời.',
          sources: res.sources,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: 'Không thể kết nối với máy chủ AI. Vui lòng thử lại sau.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';
    const showSources = showSourcesIdx === index;

    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowRight : styles.msgRowLeft]}>
        <View
          style={[
            styles.msgBubble,
            isUser
              ? styles.msgUser
              : isSystem
                ? styles.msgSystem
                : styles.msgAi,
          ]}
        >
          <Text style={[styles.msgText, isUser && styles.msgTextUser]}>{item.text}</Text>
        </View>

        {/* Sources */}
        {item.role === 'ai' && item.sources && item.sources.length > 0 && (
          <TouchableOpacity
            style={styles.sourceBtn}
            onPress={() => setShowSourcesIdx(showSources ? null : index)}
          >
            <Ionicons
              name={showSources ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={Colors.light.gold}
            />
            <Text style={styles.sourceBtnText}>
              Xem nguồn tài liệu ({item.sources.length})
            </Text>
          </TouchableOpacity>
        )}

        {showSources && item.sources && (
          <View style={styles.sourceList}>
            {item.sources.map((src, sIdx) => (
              <View key={sIdx} style={styles.sourceItem}>
                <Text style={styles.sourceNum}>Nguồn {sIdx + 1}:</Text>
                <Text style={styles.sourceQ} numberOfLines={2}>{src.question}</Text>
                <Text style={styles.sourceA} numberOfLines={2}>{src.answer}</Text>
                <Text style={styles.sourceScore}>Độ khớp: {Math.round(src.score * 100)}%</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      {/* Floating Button - Draggable */}
      <Animated.View
        style={[
          styles.floatBtn,
          { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
        ]}
        {...panResponder.panHandlers}
      >
        <Ionicons name="chatbubble-ellipses" size={26} color="#f0ddb7" />
      </Animated.View>

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setIsOpen(false)}
        onShow={() => {
          StatusBar.setBarStyle('light-content');
          StatusBar.setBackgroundColor('transparent');
        }}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="book-outline" size={18} color="#f0ddb7" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Sử Việt Trợ Lý AI</Text>
                <Text style={styles.headerSub}>Trực tuyến · Hỗ trợ học tập</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#f0ddb7" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
            ListFooterComponent={
              loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={Colors.light.gold} />
                  <Text style={styles.loadingText}>AI đang tìm cứu sử liệu...</Text>
                </View>
              ) : null
            }
          />
          </KeyboardAvoidingView>

          {/* Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Hỏi trợ lý Sử Việt..."
              placeholderTextColor={Colors.light.textDim}
              value={question}
              onChangeText={setQuestion}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!question.trim() || loading) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!question.trim() || loading}
            >
              <Ionicons name="arrow-forward" size={18} color="#f0ddb7" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Float button
  floatBtn: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5c3a21',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: Colors.light.goldDark,
    zIndex: 100,
  },
  // Modal
  container: { flex: 1, backgroundColor: '#1a0f0a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a1508',
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight || 24) + 8,
    paddingBottom: 12,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.goldDark,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(201,161,90,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201,161,90,0.3)',
  },
  headerTitle: {
    fontFamily: 'Playfair Display',
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: '#f0ddb7',
    letterSpacing: 0.5,
  },
  headerSub: { fontSize: 10, color: Colors.light.goldMuted },
  closeBtn: { padding: 4 },
  // Messages
  msgList: { padding: Spacing.sm, paddingBottom: 8 },
  msgRow: { marginBottom: 12 },
  msgRowLeft: { alignItems: 'flex-start' },
  msgRowRight: { alignItems: 'flex-end' },
  msgBubble: {
    maxWidth: '80%',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  msgUser: {
    backgroundColor: '#5c3a21',
    borderColor: '#7a5030',
    borderBottomRightRadius: 4,
  },
  msgAi: {
    backgroundColor: '#2a1a0c',
    borderColor: '#4a3520',
    borderBottomLeftRadius: 4,
  },
  msgSystem: {
    backgroundColor: 'rgba(201,161,90,0.08)',
    borderColor: 'rgba(201,161,90,0.15)',
    borderBottomLeftRadius: 4,
    alignSelf: 'center',
    maxWidth: '90%',
  },
  msgText: { color: '#e0d5c0', fontSize: FontSizes.sm, lineHeight: 20 },
  msgTextUser: { color: '#f0ddb7' },
  // Sources
  sourceBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingLeft: 4 },
  sourceBtnText: { color: Colors.light.gold, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sourceList: {
    marginTop: 6,
    backgroundColor: 'rgba(201,161,90,0.06)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(201,161,90,0.15)',
    padding: 10,
    maxWidth: '90%',
    gap: 6,
  },
  sourceItem: { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(201,161,90,0.1)' },
  sourceNum: { color: Colors.light.gold, fontSize: 10, fontWeight: '700' },
  sourceQ: { color: '#c0b090', fontSize: 10, marginTop: 2 },
  sourceA: { color: '#8a7960', fontSize: 10, fontStyle: 'italic', marginTop: 1 },
  sourceScore: { color: '#6a5a40', fontSize: 9, fontWeight: '600', marginTop: 2 },
  // Loading
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  loadingText: { color: Colors.light.goldMuted, fontSize: FontSizes.xs, fontStyle: 'italic' },
  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.sm,
    backgroundColor: '#2a1508',
    borderTopWidth: 1,
    borderTopColor: '#4a3520',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a0f0a',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#4a3520',
    color: '#e0d5c0',
    fontSize: FontSizes.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5c3a21',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.goldDark,
  },
  sendBtnDisabled: { opacity: 0.4 },
});
