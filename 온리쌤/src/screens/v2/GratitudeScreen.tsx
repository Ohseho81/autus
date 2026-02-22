/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💝 GratitudeScreen - 감사 현황 (온리쌤 스타일)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 철학: 최소 노력 → 최대 퍼포먼스 → 감동 → 감사
 *
 * 기능:
 * - 감사 누적 금액 표시
 * - 감사 기록 목록
 * - 감사 발생 플로우 설명
 * - 카카오톡 미리보기
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography } from '../../utils/theme';
import { useIndustryConfig } from '../../context/IndustryContext';
import { supabase } from '../../lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface GratitudeRecord {
  id: string;
  sender_name: string;
  student_name: string;
  emoji: string;
  message: string;
  amount: number;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function GratitudeScreen() {
  const { config } = useIndustryConfig();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<GratitudeRecord[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  // ─────────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchGratitude = async () => {
    try {
      const { data, error } = await supabase
        .from('gratitude_records')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) {
        if (__DEV__) console.error('[Gratitude] Fetch error:', error);
        // Mock 데이터
        setRecords([
          { id: '1', sender_name: '조하은 학부모님', student_name: '조하은', emoji: '💐', message: '항상 잘 봐주셔서 감사합니다', amount: 30000, created_at: '2026-02-04' },
          { id: '2', sender_name: '이현범 학부모님', student_name: '이현범', emoji: '☕', message: '코치님 수업을 너무 좋아합니다', amount: 5000, created_at: '2026-02-03' },
          { id: '3', sender_name: '강민준 학부모님', student_name: '강민준', emoji: '☕', message: '실력이 눈에 띄게 늘었어요', amount: 4500, created_at: '2026-02-01' },
        ]);
        setTotalAmount(39500);
      } else {
        setRecords(data || []);
        const total = (data || []).reduce((sum, r) => sum + r.amount, 0);
        setTotalAmount(total);
      }
    } catch (err: unknown) {
      if (__DEV__) console.error('[Gratitude] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGratitude();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGratitude();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={config.color.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={config.color.primary} />}
      >
        {/* 헤더 - 감사 누적 */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>감사 현황</Text>
          <Text style={styles.totalAmount}>
            {formatAmount(totalAmount)}
            <Text style={styles.totalUnit}>원</Text>
          </Text>
          <Text style={styles.totalCount}>{records.length}건의 감사를 받았습니다</Text>
        </View>

        {/* 감사 기록 목록 */}
        <View style={styles.section}>
          {records.map((record) => (
            <View key={record.id} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <View style={styles.emojiBox}>
                  <Text style={styles.emoji}>{record.emoji}</Text>
                </View>
                <View style={styles.recordInfo}>
                  <Text style={styles.senderName}>{record.sender_name}</Text>
                  <Text style={styles.recordMeta}>
                    {record.student_name} · {formatDate(record.created_at)}
                  </Text>
                </View>
                <Text style={styles.recordAmount}>{formatAmount(record.amount)}</Text>
              </View>
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>{`"${record.message}"`}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 감사 발생 플로우 */}
        <View style={styles.flowSection}>
          <Text style={styles.flowTitle}>감사는 어떻게 발생하나요?</Text>
          {[
            { step: '1', title: '수업 후 성장영상 촬영', desc: '아이의 변화가 담긴 영상', color: config.color.primary },
            { step: '2', title: '시스템이 학부모에게 알림', desc: '성장 영상 + 코치 코멘트', color: '#64D2FF' },
            { step: '3', title: '학부모가 감동', desc: '내 아이의 성장을 눈으로 확인', color: '#30D158' },
            { step: '4', title: '감사 표현', desc: '알림 하단 "감사 표현" 버튼', color: '#FF375F' },
          ].map((item) => (
            <View key={item.step} style={styles.flowItem}>
              <View style={[styles.flowStepBox, { backgroundColor: `${item.color}22` }]}>
                <Text style={[styles.flowStepText, { color: item.color }]}>{item.step}</Text>
              </View>
              <View style={styles.flowContent}>
                <Text style={styles.flowItemTitle}>{item.title}</Text>
                <Text style={styles.flowItemDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 카카오톡 미리보기 */}
        <View style={styles.kakaoPreview}>
          <View style={styles.kakaoCard}>
            <Text style={styles.kakaoTitle}>⭐ AUTUS | 코치</Text>
            <Text style={styles.kakaoBody}>
              김승현의 오늘 수업 영상입니다 🏀{'\n'}
              <Text style={styles.kakaoLink}>▶ 성장 영상 보기</Text>
              {'\n\n'}
              {'"오늘 드리블이 좋아졌어요!"'}
            </Text>
            <View style={styles.kakaoButton}>
              <Text style={styles.kakaoButtonText}>💝 감사 표현하기</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Header
  header: {
    padding: 24,
    paddingTop: 20,
  },
  headerLabel: {
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: 6,
  },
  totalAmount: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FF375F',
    letterSpacing: -0.5,
  },
  totalUnit: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.muted,
  },
  totalCount: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 4,
  },

  // Section
  section: {
    paddingHorizontal: 16,
  },

  // Record Card
  recordCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  emojiBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,55,95,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 18,
  },
  recordInfo: {
    flex: 1,
  },
  senderName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  recordMeta: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 1,
  },
  recordAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF375F',
  },
  messageBox: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: borderRadius.md,
  },
  messageText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },

  // Flow Section
  flowSection: {
    backgroundColor: colors.surface,
    margin: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  flowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  flowItem: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  flowStepBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  flowStepText: {
    fontSize: 13,
    fontWeight: '700',
  },
  flowContent: {
    flex: 1,
  },
  flowItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  flowItemDesc: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },

  // Kakao Preview
  kakaoPreview: {
    margin: 16,
    marginTop: 4,
    padding: 20,
    borderRadius: borderRadius.lg,
    backgroundColor: '#FEE500',
  },
  kakaoCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: borderRadius.md,
  },
  kakaoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  kakaoBody: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
  kakaoLink: {
    color: '#4DA6FF',
    fontWeight: '600',
  },
  kakaoButton: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFE4EC',
    alignItems: 'center',
  },
  kakaoButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF375F',
  },
});
