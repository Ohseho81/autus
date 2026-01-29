/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ✏️ StudentEditScreen - KRATON 스타일 학생 정보 수정
 * 기존 학생 정보 편집 + 상태 관리
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
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
  Switch,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard } from '../../components/common';
import { RootStackParamList } from '../../navigation/AppNavigator';

type StudentEditRouteProp = RouteProp<RootStackParamList, 'StudentEdit'>;

interface StudentData {
  name: string;
  phone: string;
  grade: string;
  school: string;
  subject: string;
  parentName: string;
  parentPhone: string;
  parentRelation: string;
  note: string;
  isActive: boolean;
  enrollDate: string;
}

const gradeOptions = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3', '기타'];
const subjectOptions = ['수학', '영어', '국어', '과학', '사회', '논술', '코딩', '기타'];

export default function StudentEditScreen() {
  const navigation = useNavigation();
  const route = useRoute<StudentEditRouteProp>();
  const { studentId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [form, setForm] = useState<StudentData>({
    name: '',
    phone: '',
    grade: '',
    school: '',
    subject: '',
    parentName: '',
    parentPhone: '',
    parentRelation: '',
    note: '',
    isActive: true,
    enrollDate: '',
  });

  useEffect(() => {
    // TODO: Fetch student data
    setTimeout(() => {
      setForm({
        name: '김민수',
        phone: '010-1234-5678',
        grade: '중2',
        school: '서울중학교',
        subject: '수학',
        parentName: '김철수',
        parentPhone: '010-9876-5432',
        parentRelation: '아버지',
        note: '수학 기초 보충 필요',
        isActive: true,
        enrollDate: '2024-03-01',
      });
      setIsLoading(false);
    }, 500);
  }, [studentId]);

  const updateForm = (key: keyof StudentData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      Alert.alert('알림', '학생 이름을 입력해주세요.');
      return;
    }

    Alert.alert(
      '저장',
      '변경사항을 저장할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '저장',
          onPress: () => {
            // TODO: API call
            Alert.alert('완료', '저장되었습니다.', [
              { text: '확인', onPress: () => navigation.goBack() }
            ]);
          }
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      '학생 삭제',
      `${form.name} 학생을 정말 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            // TODO: API call
            navigation.navigate('Students' as never);
          }
        },
      ]
    );
  };

  const handleBack = () => {
    if (hasChanges) {
      Alert.alert(
        '변경사항 있음',
        '저장하지 않은 변경사항이 있습니다. 나가시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          { text: '나가기', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const renderOptionButton = (
    label: string,
    selected: boolean,
    onPress: () => void,
    color?: string
  ) => (
    <TouchableOpacity
      style={[
        styles.optionButton,
        selected && { backgroundColor: color || colors.safe.bg, borderColor: color || colors.safe.primary },
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.optionText,
        selected && { color: color || colors.safe.primary },
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surface, colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <Header
        leftIcon="close"
        onLeftPress={handleBack}
        title="학생 정보 수정"
        rightIcon="trash-outline"
        onRightPress={handleDelete}
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
          {/* Status Card */}
          <GlassCard style={styles.statusCard} glowColor={form.isActive ? colors.success.primary : colors.danger.primary}>
            <View style={styles.statusRow}>
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>학생 상태</Text>
                <Text style={[
                  styles.statusValue,
                  { color: form.isActive ? colors.success.primary : colors.danger.primary }
                ]}>
                  {form.isActive ? '재원 중' : '퇴원'}
                </Text>
              </View>
              <Switch
                value={form.isActive}
                onValueChange={(v) => updateForm('isActive', v)}
                trackColor={{ false: colors.surface, true: colors.success.bg }}
                thumbColor={form.isActive ? colors.success.primary : colors.textMuted}
              />
            </View>
            <Text style={styles.enrollDate}>등록일: {form.enrollDate}</Text>
          </GlassCard>

          {/* Student Info Section */}
          <Text style={styles.sectionTitle}>학생 정보</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>이름 *</Text>
            <TextInput
              style={styles.input}
              placeholder="학생 이름"
              placeholderTextColor={colors.textDim}
              value={form.name}
              onChangeText={(v) => updateForm('name', v)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>연락처</Text>
            <TextInput
              style={styles.input}
              placeholder="010-0000-0000"
              placeholderTextColor={colors.textDim}
              value={form.phone}
              onChangeText={(v) => updateForm('phone', v)}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>학년</Text>
            <View style={styles.optionsGrid}>
              {gradeOptions.map((grade) => (
                <View key={grade} style={styles.optionWrapper}>
                  {renderOptionButton(grade, form.grade === grade, () => updateForm('grade', grade))}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>학교</Text>
            <TextInput
              style={styles.input}
              placeholder="학교명"
              placeholderTextColor={colors.textDim}
              value={form.school}
              onChangeText={(v) => updateForm('school', v)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>수강 과목</Text>
            <View style={styles.optionsGrid}>
              {subjectOptions.map((subject) => (
                <View key={subject} style={styles.optionWrapper}>
                  {renderOptionButton(
                    subject,
                    form.subject === subject,
                    () => updateForm('subject', subject),
                    colors.caution.primary
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Parent Info Section */}
          <Text style={[styles.sectionTitle, { marginTop: spacing[6] }]}>학부모 정보</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>학부모 성함</Text>
            <TextInput
              style={styles.input}
              placeholder="학부모 이름"
              placeholderTextColor={colors.textDim}
              value={form.parentName}
              onChangeText={(v) => updateForm('parentName', v)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>연락처</Text>
            <TextInput
              style={styles.input}
              placeholder="010-0000-0000"
              placeholderTextColor={colors.textDim}
              value={form.parentPhone}
              onChangeText={(v) => updateForm('parentPhone', v)}
              keyboardType="phone-pad"
            />
          </View>

          {/* Note Section */}
          <Text style={[styles.sectionTitle, { marginTop: spacing[6] }]}>메모</Text>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="학생에 대한 참고사항"
              placeholderTextColor={colors.textDim}
              value={form.note}
              onChangeText={(v) => updateForm('note', v)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Save Button */}
        {hasChanges && (
          <View style={styles.bottomActions}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <LinearGradient
                colors={[colors.safe.primary, '#0099CC']}
                style={styles.saveButtonGradient}
              >
                <Ionicons name="checkmark" size={20} color={colors.background} />
                <Text style={styles.saveButtonText}>변경사항 저장</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
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
  statusCard: { marginBottom: spacing[6] },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {},
  statusLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  statusValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    marginTop: spacing[1],
  },
  enrollDate: {
    fontSize: typography.fontSize.xs,
    color: colors.textDim,
    marginTop: spacing[2],
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[4],
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
    height: 100,
    paddingTop: spacing[3],
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  optionWrapper: {
    marginBottom: spacing[1],
  },
  optionButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textMuted,
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
  saveButton: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  saveButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.background,
  },
});
