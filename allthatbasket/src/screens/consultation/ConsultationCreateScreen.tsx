/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📝 ConsultationCreateScreen - KRATON 스타일 상담 예약
 * 상담 일정 생성 + 학생 선택 + 메모
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard } from '../../components/common';
import { RootStackParamList } from '../../navigation/AppNavigator';

type ConsultationCreateRouteProp = RouteProp<RootStackParamList, 'ConsultationCreate'>;

interface ConsultationForm {
  studentId: string;
  studentName: string;
  type: 'regular' | 'followup' | 'urgent' | 'phone';
  date: string;
  time: string;
  duration: string;
  topic: string;
  note: string;
  sendNotification: boolean;
}

const typeConfig = {
  regular: { label: '정기 상담', icon: 'calendar', color: colors.safe.primary },
  followup: { label: '후속 상담', icon: 'refresh', color: colors.caution.primary },
  urgent: { label: '긴급 상담', icon: 'warning', color: colors.danger.primary },
  phone: { label: '전화 상담', icon: 'call', color: colors.success.primary },
};

const timeSlots = [
  '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30',
];

const durationOptions = ['15분', '30분', '45분', '1시간'];

const topicOptions = [
  '학습 진도 상담',
  '성적 관련 상담',
  '학습 태도 상담',
  '진로 상담',
  '수납 관련',
  '기타',
];

// Mock students for selection
const mockStudents = [
  { id: '1', name: '김민수', grade: '중2' },
  { id: '2', name: '이서연', grade: '고1' },
  { id: '3', name: '박지훈', grade: '초6' },
  { id: '4', name: '최수아', grade: '중3' },
  { id: '5', name: '정예준', grade: '고2' },
];

export default function ConsultationCreateScreen() {
  const navigation = useNavigation();
  const route = useRoute<ConsultationCreateRouteProp>();
  const preSelectedStudentId = route.params?.studentId;

  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [form, setForm] = useState<ConsultationForm>({
    studentId: preSelectedStudentId || '',
    studentName: preSelectedStudentId ? mockStudents.find(s => s.id === preSelectedStudentId)?.name || '' : '',
    type: 'regular',
    date: getTomorrowDate(),
    time: '',
    duration: '30분',
    topic: '',
    note: '',
    sendNotification: true,
  });

  function getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  const updateForm = (key: keyof ConsultationForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const selectStudent = (student: typeof mockStudents[0]) => {
    setForm(prev => ({ ...prev, studentId: student.id, studentName: student.name }));
    setShowStudentPicker(false);
  };

  const handleSubmit = () => {
    if (!form.studentId) {
      Alert.alert('알림', '학생을 선택해주세요.');
      return;
    }
    if (!form.time) {
      Alert.alert('알림', '상담 시간을 선택해주세요.');
      return;
    }

    const typeLabel = typeConfig[form.type].label;

    Alert.alert(
      '상담 예약',
      `${form.studentName} 학생의 ${typeLabel}을 예약할까요?\n\n📅 ${form.date}\n⏰ ${form.time} (${form.duration})`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '예약',
          onPress: () => {
            // TODO: API call
            Alert.alert('완료', '상담이 예약되었습니다.', [
              { text: '확인', onPress: () => navigation.goBack() }
            ]);
          }
        },
      ]
    );
  };

  const renderTypeButton = (type: keyof typeof typeConfig) => {
    const config = typeConfig[type];
    const isSelected = form.type === type;

    return (
      <TouchableOpacity
        key={type}
        style={[
          styles.typeButton,
          isSelected && { backgroundColor: `${config.color}15`, borderColor: config.color },
        ]}
        onPress={() => updateForm('type', type)}
      >
        <Ionicons
          name={config.icon as any}
          size={20}
          color={isSelected ? config.color : colors.textMuted}
        />
        <Text style={[
          styles.typeLabel,
          isSelected && { color: config.color },
        ]}>
          {config.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surface, colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <Header
        leftIcon="close"
        onLeftPress={() => navigation.goBack()}
        title="상담 예약"
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
          {/* Student Selection */}
          <Text style={styles.sectionTitle}>학생 선택</Text>
          <TouchableOpacity
            style={styles.studentSelector}
            onPress={() => setShowStudentPicker(!showStudentPicker)}
          >
            <View style={styles.studentSelectorContent}>
              <Ionicons
                name="person"
                size={20}
                color={form.studentName ? colors.safe.primary : colors.textMuted}
              />
              <Text style={[
                styles.studentSelectorText,
                form.studentName && { color: colors.text },
              ]}>
                {form.studentName || '학생을 선택하세요'}
              </Text>
            </View>
            <Ionicons
              name={showStudentPicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {showStudentPicker && (
            <GlassCard style={styles.studentList} padding={0}>
              {mockStudents.map((student) => (
                <TouchableOpacity
                  key={student.id}
                  style={[
                    styles.studentItem,
                    form.studentId === student.id && styles.studentItemSelected,
                  ]}
                  onPress={() => selectStudent(student)}
                >
                  <Text style={styles.studentItemName}>{student.name}</Text>
                  <Text style={styles.studentItemGrade}>{student.grade}</Text>
                </TouchableOpacity>
              ))}
            </GlassCard>
          )}

          {/* Consultation Type */}
          <Text style={styles.sectionTitle}>상담 유형</Text>
          <View style={styles.typeGrid}>
            {(Object.keys(typeConfig) as Array<keyof typeof typeConfig>).map(renderTypeButton)}
          </View>

          {/* Date & Time */}
          <Text style={styles.sectionTitle}>일시</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>날짜</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textDim}
              value={form.date}
              onChangeText={(v) => updateForm('date', v)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>시간</Text>
            <View style={styles.timeGrid}>
              {timeSlots.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    form.time === time && styles.timeSlotSelected,
                  ]}
                  onPress={() => updateForm('time', time)}
                >
                  <Text style={[
                    styles.timeSlotText,
                    form.time === time && styles.timeSlotTextSelected,
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>소요 시간</Text>
            <View style={styles.durationRow}>
              {durationOptions.map((duration) => (
                <TouchableOpacity
                  key={duration}
                  style={[
                    styles.durationButton,
                    form.duration === duration && styles.durationButtonSelected,
                  ]}
                  onPress={() => updateForm('duration', duration)}
                >
                  <Text style={[
                    styles.durationText,
                    form.duration === duration && styles.durationTextSelected,
                  ]}>
                    {duration}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Topic */}
          <Text style={styles.sectionTitle}>상담 주제</Text>
          <View style={styles.topicGrid}>
            {topicOptions.map((topic) => (
              <TouchableOpacity
                key={topic}
                style={[
                  styles.topicButton,
                  form.topic === topic && styles.topicButtonSelected,
                ]}
                onPress={() => updateForm('topic', topic)}
              >
                <Text style={[
                  styles.topicText,
                  form.topic === topic && styles.topicTextSelected,
                ]}>
                  {topic}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Note */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>메모 (선택)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="상담 전 참고할 내용을 입력하세요"
              placeholderTextColor={colors.textDim}
              value={form.note}
              onChangeText={(v) => updateForm('note', v)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Notification Toggle */}
          <GlassCard style={styles.notificationCard} padding={spacing[4]}>
            <View style={styles.notificationRow}>
              <View style={styles.notificationInfo}>
                <Ionicons name="notifications" size={20} color={colors.safe.primary} />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationTitle}>알림 발송</Text>
                  <Text style={styles.notificationDesc}>학부모에게 상담 예약 알림을 보냅니다</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggle,
                  form.sendNotification && styles.toggleActive,
                ]}
                onPress={() => updateForm('sendNotification', !form.sendNotification)}
              >
                <View style={[
                  styles.toggleKnob,
                  form.sendNotification && styles.toggleKnobActive,
                ]} />
              </TouchableOpacity>
            </View>
          </GlassCard>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <LinearGradient
              colors={[typeConfig[form.type].color, colors.safe.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitButtonGradient}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.background} />
              <Text style={styles.submitButtonText}>상담 예약하기</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing[4] },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing[4],
    marginBottom: spacing[3],
  },
  studentSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  studentSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  studentSelectorText: {
    fontSize: typography.fontSize.md,
    color: colors.textMuted,
  },
  studentList: { marginTop: spacing[2] },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  studentItemSelected: {
    backgroundColor: colors.safe.bg,
  },
  studentItemName: {
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  studentItemGrade: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textMuted,
  },
  inputGroup: { marginBottom: spacing[4] },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[2],
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.md,
    color: colors.text,
  },
  textArea: {
    height: 80,
    paddingTop: spacing[3],
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  timeSlot: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  timeSlotSelected: {
    backgroundColor: colors.safe.bg,
    borderColor: colors.safe.primary,
  },
  timeSlotText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  timeSlotTextSelected: {
    color: colors.safe.primary,
    fontWeight: '600',
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  durationButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  durationButtonSelected: {
    backgroundColor: colors.caution.bg,
    borderColor: colors.caution.primary,
  },
  durationText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textMuted,
  },
  durationTextSelected: {
    color: colors.caution.primary,
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  topicButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  topicButtonSelected: {
    backgroundColor: colors.success.bg,
    borderColor: colors.success.primary,
  },
  topicText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  topicTextSelected: {
    color: colors.success.primary,
    fontWeight: '500',
  },
  notificationCard: { marginTop: spacing[4] },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
  },
  notificationText: { flex: 1 },
  notificationTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  notificationDesc: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.safe.bg,
    borderColor: colors.safe.primary,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.textMuted,
  },
  toggleKnobActive: {
    backgroundColor: colors.safe.primary,
    alignSelf: 'flex-end',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[4],
    paddingBottom: spacing[8],
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  submitButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.background,
  },
});
