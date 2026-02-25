/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 ConsultationDetailScreen - KRATON 스타일 상담 상세
 * 상담 기록 확인 + 후속 조치 + 메모
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard } from '../../components/common';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';

type ConsultationDetailRouteProp = RouteProp<RootStackParamList, 'ConsultationDetail'>;

interface ConsultationData {
  id: string;
  studentId: string;
  studentName: string;
  studentGrade: string;
  type: 'regular' | 'followup' | 'urgent' | 'phone';
  status: 'scheduled' | 'completed' | 'cancelled';
  date: string;
  time: string;
  duration: string;
  topic: string;
  note: string;
  result?: string;
  followUpActions?: string[];
  parentAttended: boolean;
}

const typeConfig = {
  regular: { label: '정기 상담', icon: 'calendar', color: colors.safe.primary },
  followup: { label: '후속 상담', icon: 'refresh', color: colors.caution.primary },
  urgent: { label: '긴급 상담', icon: 'warning', color: colors.danger.primary },
  phone: { label: '전화 상담', icon: 'call', color: colors.success.primary },
};

const statusConfig = {
  scheduled: { label: '예정', color: colors.safe.primary },
  completed: { label: '완료', color: colors.success.primary },
  cancelled: { label: '취소', color: colors.danger.primary },
};

export default function ConsultationDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<ConsultationDetailRouteProp>();
  const { consultationId } = route.params;

  const [isEditing, setIsEditing] = useState(false);
  const [resultNote, setResultNote] = useState('');

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['consultation', consultationId],
    queryFn: () => api.getConsultation(consultationId),
  });

  const raw = apiData?.data;
  const consultation: ConsultationData | null = raw
    ? {
        id: raw.id,
        studentId: raw.student_id,
        studentName: raw.student_name,
        studentGrade: raw.student_grade,
        type: (raw.type as ConsultationData['type']) || 'regular',
        status: raw.result ? 'completed' : 'scheduled',
        date: raw.created_at?.slice(0, 10) || '',
        time: raw.created_at?.slice(11, 16) || '',
        duration: '30분',
        topic: raw.content || '',
        note: raw.content || '',
        result: raw.result,
        followUpActions: Array.isArray(raw.follow_up) ? raw.follow_up : [],
        parentAttended: false,
      }
    : null;

  const handleComplete = () => {
    if (!resultNote.trim()) {
      Alert.alert('알림', '상담 결과를 입력해주세요.');
      return;
    }

    Alert.alert(
      '상담 완료',
      '상담을 완료 처리할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '완료',
          onPress: () => {
            updateMutation.mutate({ result: resultNote }, {
              onSuccess: () => {
                setIsEditing(false);
                Alert.alert('완료', '상담이 완료되었습니다.');
              },
              onError: () => Alert.alert('오류', '상담 완료 처리에 실패했습니다.'),
            });
          }
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      '상담 취소',
      '이 상담을 취소할까요?',
      [
        { text: '아니오', style: 'cancel' },
        {
          text: '취소하기',
          style: 'destructive',
          onPress: () => {
            updateMutation.mutate({ status: 'cancelled' }, {
              onSuccess: () => Alert.alert('완료', '상담이 취소되었습니다.'),
              onError: () => Alert.alert('오류', '취소 처리에 실패했습니다.'),
            });
          }
        },
      ]
    );
  };

  const handleScheduleFollowUp = () => {
    navigation.navigate('ConsultationCreate' as never, {
      studentId: consultation?.studentId,
    } as never);
  };

  if (isLoading || !consultation) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  const typeInfo = typeConfig[consultation.type];
  const statusInfo = statusConfig[consultation.status];
  const isScheduled = consultation.status === 'scheduled';
  const isCompleted = consultation.status === 'completed';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surface, colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <Header
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        title="상담 상세"
        rightIcon={isScheduled ? 'create-outline' : undefined}
        onRightPress={isScheduled ? () => setIsEditing(!isEditing) : undefined}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Banner */}
          <GlassCard
            style={styles.statusBanner}
            glowColor={statusInfo.color}
          >
            <View style={styles.statusHeader}>
              <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}20` }]}>
                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
              <View style={[styles.typeBadge, { backgroundColor: `${typeInfo.color}20` }]}>
                <Ionicons name={typeInfo.icon as any} size={14} color={typeInfo.color} />
                <Text style={[styles.typeText, { color: typeInfo.color }]}>
                  {typeInfo.label}
                </Text>
              </View>
            </View>

            <View style={styles.consultationInfo}>
              <Text style={styles.dateTime}>
                {consultation.date} {consultation.time}
              </Text>
              <Text style={styles.duration}>({consultation.duration})</Text>
            </View>
          </GlassCard>

          {/* Student Info */}
          <GlassCard style={styles.studentCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="person" size={18} color={colors.safe.primary} />
              <Text style={styles.cardTitle}>학생 정보</Text>
            </View>
            <TouchableOpacity
              style={styles.studentRow}
              onPress={() => navigation.navigate('StudentDetail' as never, { studentId: consultation.studentId } as never)}
            >
              <View style={styles.studentAvatar}>
                <Text style={styles.studentAvatarText}>
                  {consultation.studentName.charAt(0)}
                </Text>
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{consultation.studentName}</Text>
                <Text style={styles.studentGrade}>{consultation.studentGrade}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            {consultation.parentAttended && (
              <View style={styles.parentTag}>
                <Ionicons name="people" size={14} color={colors.success.primary} />
                <Text style={styles.parentTagText}>학부모 참석</Text>
              </View>
            )}
          </GlassCard>

          {/* Topic */}
          <GlassCard style={styles.topicCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="chatbubble-ellipses" size={18} color={colors.caution.primary} />
              <Text style={styles.cardTitle}>상담 주제</Text>
            </View>
            <Text style={styles.topicText}>{consultation.topic}</Text>
            {consultation.note && (
              <Text style={styles.noteText}>{consultation.note}</Text>
            )}
          </GlassCard>

          {/* Result (if completed or editing) */}
          {(isCompleted || isEditing) && (
            <GlassCard style={styles.resultCard} glowColor={colors.success.primary}>
              <View style={styles.cardHeader}>
                <Ionicons name="document-text" size={18} color={colors.success.primary} />
                <Text style={styles.cardTitle}>상담 결과</Text>
              </View>

              {isEditing ? (
                <TextInput
                  style={styles.resultInput}
                  placeholder="상담 결과를 입력하세요"
                  placeholderTextColor={colors.textDim}
                  value={resultNote}
                  onChangeText={setResultNote}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              ) : (
                <Text style={styles.resultText}>{consultation.result}</Text>
              )}
            </GlassCard>
          )}

          {/* Follow Up Actions */}
          {isCompleted && consultation.followUpActions && consultation.followUpActions.length > 0 && (
            <GlassCard style={styles.followUpCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="flag" size={18} color={colors.caution.primary} />
                <Text style={styles.cardTitle}>후속 조치</Text>
              </View>
              {consultation.followUpActions.map((action, index) => (
                <View key={index} style={styles.followUpItem}>
                  <View style={styles.followUpBullet}>
                    <Text style={styles.followUpBulletText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.followUpText}>{action}</Text>
                </View>
              ))}
            </GlassCard>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {isScheduled && !isEditing && (
            <>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.completeButton} onPress={() => setIsEditing(true)}>
                <LinearGradient
                  colors={[colors.success.primary, '#00C07B']}
                  style={styles.completeButtonGradient}
                >
                  <Ionicons name="checkmark" size={20} color={colors.background} />
                  <Text style={styles.completeButtonText}>완료 처리</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {isEditing && (
            <>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
                <LinearGradient
                  colors={[colors.success.primary, '#00C07B']}
                  style={styles.completeButtonGradient}
                >
                  <Ionicons name="checkmark" size={20} color={colors.background} />
                  <Text style={styles.completeButtonText}>저장</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {isCompleted && (
            <TouchableOpacity style={styles.followUpButton} onPress={handleScheduleFollowUp}>
              <LinearGradient
                colors={[colors.caution.primary, '#FF8F5C']}
                style={styles.followUpButtonGradient}
              >
                <Ionicons name="add-circle" size={20} color={colors.background} />
                <Text style={styles.followUpButtonText}>후속 상담 예약</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textMuted, fontSize: typography.fontSize.md },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing[4] },
  statusBanner: { marginBottom: spacing[4] },
  statusHeader: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  statusBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  typeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  consultationInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[2],
  },
  dateTime: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  duration: {
    fontSize: typography.fontSize.md,
    color: colors.textMuted,
  },
  studentCard: { marginBottom: spacing[3] },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  cardTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.safe.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentAvatarText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.safe.primary,
  },
  studentInfo: { flex: 1 },
  studentName: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  studentGrade: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  parentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  parentTagText: {
    fontSize: typography.fontSize.sm,
    color: colors.success.primary,
  },
  topicCard: { marginBottom: spacing[3] },
  topicText: {
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing[2],
  },
  noteText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  resultCard: { marginBottom: spacing[3] },
  resultInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    fontSize: typography.fontSize.md,
    color: colors.text,
    minHeight: 120,
  },
  resultText: {
    fontSize: typography.fontSize.md,
    color: colors.text,
    lineHeight: 24,
  },
  followUpCard: { marginBottom: spacing[3] },
  followUpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  followUpBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.caution.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followUpBulletText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.caution.primary,
  },
  followUpText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text,
    lineHeight: 22,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[4],
    paddingBottom: spacing[8],
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    color: colors.textMuted,
  },
  completeButton: { flex: 2, borderRadius: borderRadius.lg, overflow: 'hidden' },
  completeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  completeButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.background,
  },
  followUpButton: { flex: 1, borderRadius: borderRadius.lg, overflow: 'hidden' },
  followUpButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  followUpButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.background,
  },
});
