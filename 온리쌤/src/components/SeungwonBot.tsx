/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 승원봇 - 앱 내 수정사항 입력 봇
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Platform,
  Animated,
  Modal,
  Keyboard,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
import { captureScreen } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { colors } from '../utils/theme';
import { captureError } from '../lib/sentry';
import ScreenshotAnnotator from './ScreenshotAnnotator';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  screenshot?: string; // base64 data URI
}

interface SeungwonBotProps {
  userRole?: string;
  userName?: string;
  currentScreen?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function SeungwonBot({ userRole, userName, currentScreen }: SeungwonBotProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'bot', content: '화면/디자인에서 불편한 점을 알려주세요 🎨' },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Keyboard — Modal 안에서 KAV가 안 먹으므로 직접 높이 감지
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Pulse Animation
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!animationRef.current) {
      animationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      animationRef.current.start();
    }
    return () => { animationRef.current?.stop(); };
  }, [pulseAnim]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const getFallbackResponse = useCallback((input: string): string => {
    const lc = input.toLowerCase();
    if (lc.includes('버튼') || lc.includes('클릭') || lc.includes('눌러'))
      return '버튼 관련 피드백 접수! 🔘\n어떤 화면의 버튼인지 알려주시면 바로 반영할게요.';
    if (lc.includes('글자') || lc.includes('폰트') || lc.includes('크기') || lc.includes('작아') || lc.includes('커'))
      return '텍스트/폰트 피드백 접수! 📝\n어떤 화면에서 불편하셨나요?';
    if (lc.includes('색') || lc.includes('컬러') || lc.includes('어두') || lc.includes('밝'))
      return '색상 피드백 접수! 🎨\n어떤 색으로 바꾸면 좋을지 알려주세요.';
    if (lc.includes('간격') || lc.includes('여백') || lc.includes('좁') || lc.includes('넓') || lc.includes('레이아웃'))
      return '레이아웃 피드백 접수! 📐\n해당 화면 이름을 알려주시면 더 빠르게 수정할게요.';
    if (lc.includes('위치') || lc.includes('옮겨') || lc.includes('동선') || lc.includes('찾기'))
      return '화면 동선 피드백 접수! 🗺️\n어디서 뭘 찾기 어려우셨나요?';
    if (lc.includes('감사') || lc.includes('고마') || lc.includes('좋아'))
      return '감사합니다! UI/UX 개선 의견 언제든 주세요! 🎨';
    return 'UI/UX 피드백 감사합니다! 🙏\n어떤 화면에서 불편하셨는지 알려주시면 바로 반영할게요.';
  }, []);

  const getAIResponse = useCallback(async (allMessages: Message[], screenshot?: string | null): Promise<string> => {
    // 최근 10개 메시지를 Claude API 형식으로 변환
    const recentMessages = allMessages
      .filter(m => m.id !== '0') // 초기 안내 메시지 제외
      .slice(-10)
      .map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));

    // 현재 화면 컨텍스트를 첫 번째 user 메시지 앞에 시스템 컨텍스트로 주입
    const screenContext = currentScreen ? `[현재 화면: ${currentScreen}]` : '';
    if (screenContext && recentMessages.length > 0 && recentMessages[0].role === 'user') {
      recentMessages[0] = {
        ...recentMessages[0],
        content: `${screenContext}\n${recentMessages[0].content}`,
      };
    }

    // file URI → base64 변환 (300KB 이상이면 스킵)
    let screenshotBase64: string | undefined;
    if (screenshot) {
      try {
        const b64 = await FileSystem.readAsStringAsync(screenshot, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (b64.length < 300_000) {
          screenshotBase64 = b64;
        } else {
          if (__DEV__) console.warn('[SeungwonBot] Screenshot too large, skipping:', Math.round(b64.length / 1024), 'KB');
        }
      } catch (e: unknown) {
        if (__DEV__) console.warn('[SeungwonBot] Screenshot base64 failed:', e);
      }
    }

    const deviceInfo = `${Platform.OS} ${Platform.Version}, ${Math.round(screenWidth)}x${Math.round(screenHeight)}pt @${PixelRatio.get()}x`;

    const { data, error } = await supabase.functions.invoke('chat-ai', {
      body: { messages: recentMessages, screenshot: screenshotBase64, deviceInfo },
    });

    if (error) {
      captureError(new Error(error?.message || 'Edge Function error'), { context: 'seungwon_bot', error });
      throw new Error(error?.message || 'Edge Function error');
    }

    if (!data?.reply) {
      captureError(new Error('No reply from chat-ai'), { context: 'seungwon_bot', data });
      throw new Error('No reply');
    }

    return data.reply;
  }, [currentScreen]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isSending) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputText.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    // app_feedback 저장 (비동기, 실패해도 AI 응답에 영향 없음)
    supabase.from('app_feedback').insert({
      message: userMsg.content,
      user_role: userRole || 'unknown',
      user_name: userName || 'anonymous',
      status: 'pending',
      created_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error && __DEV__) console.warn('[SeungwonBot] Feedback save skipped:', error.message);
    }).catch((err) => {
      if (__DEV__) console.warn('[SeungwonBot] Feedback save error:', err);
    });

    // 첫 유저 메시지에만 스크린샷 첨부
    const isFirstUserMsg = messages.filter(m => m.role === 'user').length === 0;
    const attachScreenshot = isFirstUserMsg ? screenshotUri : null;

    try {
      const currentMessages = [...messages, userMsg];
      const aiReply = await getAIResponse(currentMessages, attachScreenshot);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: aiReply,
      }]);
    } catch (e: unknown) {
      captureError(e instanceof Error ? e : new Error(String(e)), { context: 'seungwon_bot_fallback' });
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: getFallbackResponse(userMsg.content),
      }]);
    } finally {
      setIsSending(false);
      if (attachScreenshot) setScreenshotUri(null);
    }
  }, [inputText, isSending, userRole, userName, messages, screenshotUri, getAIResponse, getFallbackResponse]);

  const handleOpen = useCallback(async () => {
    try {
      const uri = await captureScreen({ format: 'jpg', quality: 0.3, width: 390 });
      setScreenshotUri(uri);
    } catch (e: unknown) {
      if (__DEV__) console.warn('[SeungwonBot] Screenshot capture failed:', e);
      setScreenshotUri(null);
    }
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    setIsOpen(false);
  }, []);

  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.botBubble]}>
      <Text style={[styles.bubbleText, item.role === 'user' ? styles.userText : styles.botText]}>
        {item.content}
      </Text>
    </View>
  ), []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  // 키보드 열리면 컨테이너 높이를 줄여서 입력창이 키보드 위에 위치
  const containerHeight = keyboardHeight > 0
    ? screenHeight - keyboardHeight
    : screenHeight;

  return (
    <>
      {/* 플로팅 버튼 */}
      <Animated.View style={[styles.fab, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity onPress={handleOpen} activeOpacity={0.8}>
          <LinearGradient colors={['#FF6B00', '#FF8C00']} style={styles.fabGradient}>
            <Ionicons name="chatbubble-ellipses" size={28} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* 풀스크린 채팅 모달 — 컨테이너 높이로 키보드 회피 */}
      <Modal visible={isOpen} animationType="slide" onRequestClose={handleClose}>
        <View style={[styles.container, { height: containerHeight }]}>
          {/* 상단 safe area */}
          <View style={{ height: insets.top, backgroundColor: '#FF6B00' }} />

          {/* 헤더 */}
          <LinearGradient colors={['#FF6B00', '#FF8C00']} style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatar}>
                <Text style={{ fontSize: 14, fontWeight: '700' }}>SW</Text>
              </View>
              <View>
                <Text style={styles.headerTitle}>승원봇</Text>
                <Text style={styles.headerSub}>{currentScreen ? `${currentScreen} · UI/UX 피드백` : 'UI/UX 피드백'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </LinearGradient>

          {/* 스크린샷 프리뷰 */}
          {screenshotUri && (
            <View style={styles.screenshotPreview}>
              <TouchableOpacity onPress={() => setIsAnnotating(true)} activeOpacity={0.7}>
                <Image source={{ uri: screenshotUri }} style={styles.screenshotThumb} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.screenshotInfo} onPress={() => setIsAnnotating(true)} activeOpacity={0.7}>
                <Text style={styles.screenshotLabel}>캡처된 화면</Text>
                <Text style={styles.screenshotHint}>탭하여 그려서 표시하기 ✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setScreenshotUri(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={22} color={colors.text.muted} />
              </TouchableOpacity>
            </View>
          )}

          {/* 메시지 목록 — 스크롤하면 키보드 닫힘 */}
          <FlatList
            ref={flatListRef}
            data={[...messages, ...(isSending ? [{ id: '_typing', role: 'bot' as const, content: '입력 중...' }] : [])]}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />

          {/* 입력창 */}
          <View style={[styles.inputBar, keyboardHeight === 0 && { paddingBottom: 8 + insets.bottom }]}>
            <TextInput
              style={styles.input}
              placeholder="화면/디자인 불편한 점을 알려주세요..."
              placeholderTextColor={colors.text.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
            >
              <Ionicons name="send" size={20} color={inputText.trim() ? 'white' : colors.text.muted} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 스크린샷 어노테이션 모달 */}
      {screenshotUri && (
        <ScreenshotAnnotator
          uri={screenshotUri}
          visible={isAnnotating}
          onDone={(annotatedUri) => {
            setScreenshotUri(annotatedUri);
            setIsAnnotating(false);
          }}
          onCancel={() => setIsAnnotating(false)}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: 'white',
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    gap: 8,
  },
  bubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF6B00',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: 'white',
  },
  botText: {
    color: colors.text.primary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    backgroundColor: colors.surface,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.border.primary,
  },
  screenshotPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    gap: 10,
  },
  screenshotThumb: {
    width: 48,
    height: 80,
    borderRadius: 6,
    backgroundColor: colors.border.primary,
  },
  screenshotInfo: {
    flex: 1,
  },
  screenshotLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  screenshotHint: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
});
