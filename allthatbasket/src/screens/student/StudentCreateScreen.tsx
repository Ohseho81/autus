/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ➕ StudentCreateScreen - KRATON 스타일 학생 등록
 * 신규 학생 정보 입력 + 학부모 연동
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard } from '../../components/common';

interface StudentForm {
  name: string;
  phone: string;
  grade: string;
  school: string;
  subject: string;
  parentName: string;
  parentPhone: string;
  parentRelation: string;
  note: string;
}

const gradeOptions = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3', '기타'];
const subjectOptions = ['수학', '영어', '국어', '과학', '사회', '논술', '코딩', '기타'];
const relationOptions = ['어머니', '아버지', '조부모', '기타'];

export default function StudentCreateScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<StudentForm>({
    name: '',
    phone: '',
    grade: '',
    school: '',
    subject: '',
    parentName: '',
    parentPhone: '',
    parentRelation: '',
    note: '',
  });

  const updateForm = (key: keyof StudentForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!form.name.trim()) {
          Alert.alert('알림', '학생 이름을 입력해주세요.');
          return false;
        }
        if (!form.grade) {
          Alert.alert('알림', '학년을 선택해주세요.');
          return false;
        }
        return true;
      case 2:
        if (!form.parentName.trim()) {
          Alert.alert('알림', '학부모 이름을 입력해주세요.');
          return false;
        }
        if (!form.parentPhone.trim()) {
          Alert.alert('알림', '학부모 연락처를 입력해주세요.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = () => {
    Alert.alert(
      '학생 등록',
      `${form.name} 학생을 등록할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '등록',
          onPress: () => {
            // TODO: API call
            Alert.alert('완료', '학생이 등록되었습니다.', [
              { text: '확인', onPress: () => navigation.goBack() }
            ]);
          }
        },
      ]
    );
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((s) => (
        <React.Fragment key={s}>
          <View style={[
            styles.stepDot,
            s === step && styles.stepDotActive,
            s < step && styles.stepDotCompleted,
          ]}>
            {s < step ? (
              <Ionicons name="checkmark" size={14} color={colors.background} />
            ) : (
              <Text style={[styles.stepNumber, s === step && styles.stepNumberActive]}>
                {s}
              </Text>
            )}
          </View>
          {s < 3 && (
            <View style={[styles.stepLine, s < step && styles.stepLineActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

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

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>학생 정보</Text>
      <Text style={styles.stepSubtitle}>학생의 기본 정보를 입력해주세요</Text>

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
        <Text style={styles.inputLabel}>학년 *</Text>
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
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>학부모 정보</Text>
      <Text style={styles.stepSubtitle}>학부모 연락처를 입력해주세요</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>학부모 성함 *</Text>
        <TextInput
          style={styles.input}
          placeholder="학부모 이름"
          placeholderTextColor={colors.textDim}
          value={form.parentName}
          onChangeText={(v) => updateForm('parentName', v)}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>관계</Text>
        <View style={styles.optionsRow}>
          {relationOptions.map((relation) =>
            renderOptionButton(
              relation,
              form.parentRelation === relation,
              () => updateForm('parentRelation', relation),
              colors.success.primary
            )
          )}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>연락처 *</Text>
        <TextInput
          style={styles.input}
          placeholder="010-0000-0000"
          placeholderTextColor={colors.textDim}
          value={form.parentPhone}
          onChangeText={(v) => updateForm('parentPhone', v)}
          keyboardType="phone-pad"
        />
      </View>

      <GlassCard style={styles.infoCard} padding={spacing[3]}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={20} color={colors.safe.primary} />
          <Text style={styles.infoTitle}>알림 설정</Text>
        </View>
        <Text style={styles.infoText}>
          학부모 연락처로 출석, 수납, 상담 알림이 발송됩니다.
        </Text>
      </GlassCard>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>추가 정보</Text>
      <Text style={styles.stepSubtitle}>기타 참고사항을 입력해주세요 (선택)</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>메모</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="학생에 대한 참고사항이나 특이사항을 입력하세요"
          placeholderTextColor={colors.textDim}
          value={form.note}
          onChangeText={(v) => updateForm('note', v)}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Summary Card */}
      <GlassCard style={styles.summaryCard} glowColor={colors.safe.primary}>
        <Text style={styles.summaryTitle}>등록 정보 확인</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>학생</Text>
          <Text style={styles.summaryValue}>{form.name} ({form.grade})</Text>
        </View>
        {form.school && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>학교</Text>
            <Text style={styles.summaryValue}>{form.school}</Text>
          </View>
        )}
        {form.subject && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>과목</Text>
            <Text style={styles.summaryValue}>{form.subject}</Text>
          </View>
        )}
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>학부모</Text>
          <Text style={styles.summaryValue}>
            {form.parentName} {form.parentRelation && `(${form.parentRelation})`}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>연락처</Text>
          <Text style={styles.summaryValue}>{form.parentPhone}</Text>
        </View>
      </GlassCard>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surface, colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <Header
        leftIcon="arrow-back"
        onLeftPress={handleBack}
        title="학생 등록"
      />

      {renderStepIndicator()}

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {step > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color={colors.textMuted} />
              <Text style={styles.backButtonText}>이전</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.nextButton, step === 1 && styles.nextButtonFull]}
            onPress={step < 3 ? handleNext : handleSubmit}
          >
            <LinearGradient
              colors={step === 3 ? [colors.success.primary, '#00C07B'] : [colors.safe.primary, '#0099CC']}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>
                {step === 3 ? '등록하기' : '다음'}
              </Text>
              <Ionicons
                name={step === 3 ? 'checkmark' : 'arrow-forward'}
                size={20}
                color={colors.background}
              />
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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    borderColor: colors.safe.primary,
    backgroundColor: colors.safe.bg,
  },
  stepDotCompleted: {
    borderColor: colors.success.primary,
    backgroundColor: colors.success.primary,
  },
  stepNumber: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
  },
  stepNumberActive: {
    color: colors.safe.primary,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing[1],
  },
  stepLineActive: {
    backgroundColor: colors.success.primary,
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing[4], paddingBottom: 120 },
  stepContent: {},
  stepTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing[1],
  },
  stepSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textMuted,
    marginBottom: spacing[6],
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
    height: 120,
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
  optionsRow: {
    flexDirection: 'row',
    gap: spacing[2],
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
  infoCard: { marginTop: spacing[4] },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  infoTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  summaryCard: { marginTop: spacing[4] },
  summaryTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[4],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing[3],
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    color: colors.textMuted,
  },
  nextButton: { flex: 1 },
  nextButtonFull: { flex: 1 },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
  },
  nextButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.background,
  },
});
