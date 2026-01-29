/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💬 LessonChatScreen - 레슨 소통 채널
 * 코치 ↔ 학부모 소통 + 레슨 노트 + 자동 알림 메시지
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard } from '../../components/common';

type RouteParams = {
  LessonChat: {
    lessonId: string;
    studentId?: string;
  };
};

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'coach' | 'parent' | 'system';
  type: 'text' | 'image' | 'video' | 'feedback' | 'attendance' | 'payment';
  content: string;
  timestamp: string;
  isRead: boolean;
}

// Mock data
const mockMessages: ChatMessage[] = [
  {
    id: '1',
    senderId: 'system',
    senderName: '시스템',
    senderRole: 'system',
    type: 'attendance',
    content: '김민수 학생이 14:00 레슨에 출석했습니다. (체크인 13:58)',
    timestamp: '13:58',
    isRead: true,
  },
  {
    id: '2',
    senderId: 'coach1',
    senderName: '김코치',
    senderRole: 'coach',
    type: 'text',
    content: '안녕하세요! 오늘 민수가 드리블 연습을 열심히 했습니다. 다음 시간에는 슛 연습을 집중적으로 할 예정입니다.',
    timestamp: '15:05',
    isRead: true,
  },
  {
    id: '3',
    senderId: 'parent1',
    senderName: '김철수 (학부모)',
    senderRole: 'parent',
    type: 'text',
    content: '감사합니다 코치님! 집에서도 드리블 연습 시키겠습니다. 혹시 추천하시는 연습 방법이 있을까요?',
    timestamp: '15:12',
    isRead: true,
  },
  {
    id: '4',
    senderId: 'coach1',
    senderName: '김코치',
    senderRole: 'coach',
    type: 'feedback',
    content: '📹 레슨 피드백이 등록되었습니다\n\n드리블 ⭐⭐⭐⭐ (향상됨)\n슛 ⭐⭐⭐\n\n코치 코멘트: 오늘 집중력이 좋았습니다!',
    timestamp: '15:30',
    isRead: true,
  },
  {
    id: '5',
    senderId: 'system',
    senderName: '시스템',
    senderRole: 'system',
    type: 'payment',
    content: '💰 레슨 1회가 차감되었습니다.\n\n잔여 횟수: 6회\n다음 레슨: 1/17(수) 14:00',
    timestamp: '15:35',
    isRead: false,
  },
];

const quickReplies = [
  '감사합니다!',
  '확인했습니다',
  '다음 시간에 뵙겠습니다',
  '추가 문의 드려도 될까요?',
];

export default function LessonChatScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'LessonChat'>>();
  const { lessonId, studentId } = route.params;

  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [inputText, setInputText] = useState('');
  const [isCoachMode, setIsCoachMode] = useState(true); // true = coach, false = parent view
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: isCoachMode ? 'coach1' : 'parent1',
      senderName: isCoachMode ? '김코치' : '김철수 (학부모)',
      senderRole: isCoachMode ? 'coach' : 'parent',
      type: 'text',
      content: inputText.trim(),
      timestamp: new Date().toTimeString().slice(0, 5),
      isRead: false,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
  };

  const handleQuickReply = (reply: string) => {
    setInputText(reply);
  };

  const handleAttachment = () => {
    Alert.alert(
      '첨부하기',
      '무엇을 첨부하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '사진', onPress: () => {} },
        { text: '영상', onPress: () => {} },
        { text: '피드백 카드', onPress: () => navigation.navigate('LessonFeedback' as never, { lessonId } as never) },
      ]
    );
  };

  const getMessageStyle = (message: ChatMessage) => {
    const isMe = (isCoachMode && message.senderRole === 'coach') ||
                 (!isCoachMode && message.senderRole === 'parent');
    const isSystem = message.senderRole === 'system';

    return { isMe, isSystem };
  };

  const getTypeIcon = (type: ChatMessage['type']) => {
    switch (type) {
      case 'feedback': return 'videocam';
      case 'attendance': return 'checkmark-circle';
      case 'payment': return 'card';
      default: return null;
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const { isMe, isSystem } = getMessageStyle(item);
    const typeIcon = getTypeIcon(item.type);

    if (isSystem) {
      return (
        <View style={styles.systemMessage}>
          <GlassCard style={styles.systemCard} padding={spacing[3]}>
            {typeIcon && (
              <Ionicons
                name={typeIcon as any}
                size={18}
                color={item.type === 'attendance' ? colors.safe.primary : colors.caution.primary}
                style={styles.systemIcon}
              />
            )}
            <Text style={styles.systemText}>{item.content}</Text>
            <Text style={styles.systemTime}>{item.timestamp}</Text>
          </GlassCard>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
        {!isMe && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.senderName.charAt(0)}</Text>
          </View>
        )}
        <View style={[styles.messageBubble, isMe && styles.messageBubbleMe]}>
          {!isMe && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}
          {item.type === 'feedback' ? (
            <View style={styles.feedbackContent}>
              <Ionicons name="videocam" size={16} color={colors.caution.primary} />
              <Text style={styles.messageText}>{item.content}</Text>
            </View>
          ) : (
            <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
              {item.content}
            </Text>
          )}
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
              {item.timestamp}
            </Text>
            {isMe && (
              <Ionicons
                name={item.isRead ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.isRead ? colors.safe.primary : colors.textMuted}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surface, colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <Header
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        title="김민수 레슨 노트"
        rightIcon="information-circle-outline"
        onRightPress={() => navigation.navigate('StudentDetail' as never, { studentId } as never)}
      />

      {/* Student Info Bar */}
      <View style={styles.infoBar}>
        <View style={styles.studentInfoBar}>
          <View style={styles.studentAvatarSmall}>
            <Text style={styles.studentAvatarSmallText}>김</Text>
          </View>
          <View>
            <Text style={styles.studentNameSmall}>김민수</Text>
            <Text style={styles.packageInfo}>10회 레슨권 • 잔여 6회</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.viewFeedbackButton}>
          <Ionicons name="document-text" size={18} color={colors.safe.primary} />
          <Text style={styles.viewFeedbackText}>피드백</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />

        {/* Quick Replies */}
        <View style={styles.quickRepliesContainer}>
          <FlatList
            horizontal
            data={quickReplies}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRepliesList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.quickReplyChip}
                onPress={() => handleQuickReply(item)}
              >
                <Text style={styles.quickReplyText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton} onPress={handleAttachment}>
            <Ionicons name="add-circle" size={28} color={colors.safe.primary} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor={colors.textDim}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? colors.safe.primary : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1 },

  // Info Bar
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  studentInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  studentAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.safe.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentAvatarSmallText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.safe.primary,
  },
  studentNameSmall: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  packageInfo: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },
  viewFeedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.safe.bg,
  },
  viewFeedbackText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.safe.primary,
  },

  // Messages
  messagesList: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing[3],
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2],
  },
  avatarText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
  },
  messageBubble: {
    maxWidth: '75%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderTopLeftRadius: 4,
    padding: spacing[3],
  },
  messageBubbleMe: {
    backgroundColor: colors.safe.bg,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: 4,
  },
  senderName: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing[1],
  },
  feedbackContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  messageText: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  messageTextMe: {
    color: colors.text,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },
  messageTimeMe: {
    color: colors.textMuted,
  },

  // System Message
  systemMessage: {
    alignItems: 'center',
    marginVertical: spacing[2],
  },
  systemCard: {
    maxWidth: '85%',
    alignItems: 'center',
  },
  systemIcon: {
    marginBottom: spacing[2],
  },
  systemText: {
    fontSize: typography.fontSize.sm,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  systemTime: {
    fontSize: typography.fontSize.xs,
    color: colors.textDim,
    marginTop: spacing[2],
  },

  // Quick Replies
  quickRepliesContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing[2],
  },
  quickRepliesList: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  quickReplyChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing[2],
  },
  quickReplyText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    paddingBottom: spacing[6],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing[2],
  },
  attachButton: {
    paddingBottom: 4,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.md,
    color: colors.text,
  },
  sendButton: {
    paddingBottom: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
