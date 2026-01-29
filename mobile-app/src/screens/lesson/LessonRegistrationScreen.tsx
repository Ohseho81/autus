/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📝 LessonRegistrationScreen - 통합 등록 플로우
 * Step 1: 학생 선택/등록
 * Step 2: 레슨 패키지 선택 + 수납
 * Step 3: 시간표 설정
 * Step 4: 출석부 자동 생성 (완료)
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
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard } from '../../components/common';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock data
const mockStudents = [
  { id: '1', name: '김민수', grade: '중2', phone: '010-1234-5678' },
  { id: '2', name: '이서연', grade: '고1', phone: '010-2345-6789' },
  { id: '3', name: '박지훈', grade: '초6', phone: '010-3456-7890' },
];

const packageOptions = [
  { id: 'p1', name: '4회 체험권', count: 4, price: 120000, popular: false },
  { id: 'p2', name: '10회 레슨권', count: 10, price: 280000, popular: true },
  { id: 'p3', name: '20회 레슨권', count: 20, price: 500000, popular: false },
  { id: 'p4', name: '월정액 무제한', count: -1, price: 350000, popular: false },
];

const dayOptions = [
  { key: 0, label: '일' },
  { key: 1, label: '월' },
  { key: 2, label: '화' },
  { key: 3, label: '수' },
  { key: 4, label: '목' },
  { key: 5, label: '금' },
  { key: 6, label: '토' },
];

const timeSlots = [
  '09:00', '10:00', '11:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00',
];

interface RegistrationData {
  studentId: string;
  studentName: string;
  isNewStudent: boolean;
  packageId: string;
  packageName: string;
  packageCount: number;
  packagePrice: number;
  paymentMethod: 'card' | 'transfer' | 'cash' | 'kakao';
  scheduleDays: number[];
  scheduleTime: string;
  startDate: string;
  coachId?: string;
}

export default function LessonRegistrationScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<RegistrationData>({
    studentId: '',
    studentName: '',
    isNewStudent: false,
    packageId: '',
    packageName: '',
    packageCount: 0,
    packagePrice: 0,
    paymentMethod: 'card',
    scheduleDays: [],
    scheduleTime: '',
    startDate: getNextMonday(),
    coachId: '',
  });

  function getNextMonday() {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    today.setDate(today.getDate() + diff);
    return today.toISOString().split('T')[0];
  }

  const updateData = (key: keyof RegistrationData, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const selectStudent = (student: typeof mockStudents[0]) => {
    setData(prev => ({
      ...prev,
      studentId: student.id,
      studentName: student.name,
      isNewStudent: false,
    }));
  };

  const selectPackage = (pkg: typeof packageOptions[0]) => {
    setData(prev => ({
      ...prev,
      packageId: pkg.id,
      packageName: pkg.name,
      packageCount: pkg.count,
      packagePrice: pkg.price,
    }));
  };

  const toggleDay = (day: number) => {
    setData(prev => ({
      ...prev,
      scheduleDays: prev.scheduleDays.includes(day)
        ? prev.scheduleDays.filter(d => d !== day)
        : [...prev.scheduleDays, day].sort(),
    }));
  };

  const validateStep = (): boolean => {
    switch (step) {
      case 1:
        if (!data.studentId && !data.isNewStudent) {
          Alert.alert('알림', '학생을 선택하거나 새로 등록해주세요.');
          return false;
        }
        return true;
      case 2:
        if (!data.packageId) {
          Alert.alert('알림', '레슨 패키지를 선택해주세요.');
          return false;
        }
        return true;
      case 3:
        if (data.scheduleDays.length === 0) {
          Alert.alert('알림', '레슨 요일을 선택해주세요.');
          return false;
        }
        if (!data.scheduleTime) {
          Alert.alert('알림', '레슨 시간을 선택해주세요.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      if (step < 4) {
        setStep(prev => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleComplete = () => {
    Alert.alert(
      '등록 완료',
      `${data.studentName} 학생의 ${data.packageName} 등록이 완료되었습니다!\n\n✅ 시간표 자동 생성\n✅ 출석부 자동 생성\n✅ V-Index 연동`,
      [
        { text: '확인', onPress: () => navigation.goBack() }
      ]
    );
  };

  // Step Indicator
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {['학생', '수납', '시간표', '완료'].map((label, index) => {
        const stepNum = index + 1;
        const isActive = step === stepNum;
        const isCompleted = step > stepNum;

        return (
          <React.Fragment key={label}>
            <View style={styles.stepItem}>
              <View style={[
                styles.stepDot,
                isActive && styles.stepDotActive,
                isCompleted && styles.stepDotCompleted,
              ]}>
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color={colors.background} />
                ) : (
                  <Text style={[
                    styles.stepNumber,
                    (isActive || isCompleted) && styles.stepNumberActive,
                  ]}>
                    {stepNum}
                  </Text>
                )}
              </View>
              <Text style={[
                styles.stepLabel,
                isActive && styles.stepLabelActive,
              ]}>
                {label}
              </Text>
            </View>
            {stepNum < 4 && (
              <View style={[
                styles.stepLine,
                isCompleted && styles.stepLineActive,
              ]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  // Step 1: 학생 선택
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>학생 선택</Text>
      <Text style={styles.stepSubtitle}>등록할 학생을 선택하거나 새로 등록하세요</Text>

      {/* New Student Button */}
      <TouchableOpacity
        style={[
          styles.newStudentButton,
          data.isNewStudent && styles.newStudentButtonActive,
        ]}
        onPress={() => navigation.navigate('StudentCreate' as never)}
      >
        <View style={styles.newStudentIcon}>
          <Ionicons name="add" size={24} color={colors.safe.primary} />
        </View>
        <Text style={styles.newStudentText}>새 학생 등록</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Existing Students */}
      <Text style={styles.sectionLabel}>기존 학생</Text>
      {mockStudents.map((student) => (
        <TouchableOpacity
          key={student.id}
          style={[
            styles.studentCard,
            data.studentId === student.id && styles.studentCardSelected,
          ]}
          onPress={() => selectStudent(student)}
        >
          <View style={styles.studentAvatar}>
            <Text style={styles.studentAvatarText}>{student.name.charAt(0)}</Text>
          </View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{student.name}</Text>
            <Text style={styles.studentMeta}>{student.grade} • {student.phone}</Text>
          </View>
          {data.studentId === student.id && (
            <View style={styles.checkIcon}>
              <Ionicons name="checkmark-circle" size={24} color={colors.safe.primary} />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  // Step 2: 패키지 선택 + 수납
  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>레슨 패키지</Text>
      <Text style={styles.stepSubtitle}>{data.studentName} 학생의 레슨권을 선택하세요</Text>

      {/* Package Options */}
      <View style={styles.packageGrid}>
        {packageOptions.map((pkg) => (
          <TouchableOpacity
            key={pkg.id}
            style={[
              styles.packageCard,
              data.packageId === pkg.id && styles.packageCardSelected,
            ]}
            onPress={() => selectPackage(pkg)}
          >
            {pkg.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>인기</Text>
              </View>
            )}
            <Text style={styles.packageName}>{pkg.name}</Text>
            <Text style={styles.packageCount}>
              {pkg.count === -1 ? '무제한' : `${pkg.count}회`}
            </Text>
            <Text style={styles.packagePrice}>
              {pkg.price.toLocaleString()}원
            </Text>
            {pkg.count > 0 && (
              <Text style={styles.packageUnit}>
                회당 {Math.round(pkg.price / pkg.count).toLocaleString()}원
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Payment Method */}
      {data.packageId && (
        <GlassCard style={styles.paymentCard}>
          <Text style={styles.paymentTitle}>결제 방법</Text>
          <View style={styles.paymentOptions}>
            {[
              { key: 'kakao', label: '카카오페이', icon: 'logo-bitcoin' },
              { key: 'card', label: '카드', icon: 'card' },
              { key: 'transfer', label: '계좌이체', icon: 'swap-horizontal' },
              { key: 'cash', label: '현금', icon: 'cash' },
            ].map((method) => (
              <TouchableOpacity
                key={method.key}
                style={[
                  styles.paymentMethod,
                  data.paymentMethod === method.key && styles.paymentMethodActive,
                ]}
                onPress={() => updateData('paymentMethod', method.key as any)}
              >
                <Ionicons
                  name={method.icon as any}
                  size={20}
                  color={data.paymentMethod === method.key ? colors.safe.primary : colors.textMuted}
                />
                <Text style={[
                  styles.paymentMethodText,
                  data.paymentMethod === method.key && styles.paymentMethodTextActive,
                ]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>결제 금액</Text>
            <Text style={styles.totalAmount}>
              {data.packagePrice.toLocaleString()}원
            </Text>
          </View>
        </GlassCard>
      )}
    </View>
  );

  // Step 3: 시간표 설정
  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>시간표 설정</Text>
      <Text style={styles.stepSubtitle}>레슨 요일과 시간을 설정하세요</Text>

      {/* Day Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>레슨 요일</Text>
        <View style={styles.daysRow}>
          {dayOptions.map((day) => {
            const isSelected = data.scheduleDays.includes(day.key);
            const isWeekend = day.key === 0 || day.key === 6;
            return (
              <TouchableOpacity
                key={day.key}
                style={[
                  styles.dayButton,
                  isSelected && styles.dayButtonSelected,
                  isWeekend && isSelected && styles.dayButtonWeekend,
                ]}
                onPress={() => toggleDay(day.key)}
              >
                <Text style={[
                  styles.dayButtonText,
                  isSelected && styles.dayButtonTextSelected,
                  isWeekend && isSelected && styles.dayButtonTextWeekend,
                ]}>
                  {day.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Time Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>레슨 시간</Text>
        <View style={styles.timeGrid}>
          {timeSlots.map((time) => (
            <TouchableOpacity
              key={time}
              style={[
                styles.timeSlot,
                data.scheduleTime === time && styles.timeSlotSelected,
              ]}
              onPress={() => updateData('scheduleTime', time)}
            >
              <Text style={[
                styles.timeSlotText,
                data.scheduleTime === time && styles.timeSlotTextSelected,
              ]}>
                {time}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Start Date */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>시작일</Text>
        <TextInput
          style={styles.input}
          value={data.startDate}
          onChangeText={(v) => updateData('startDate', v)}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textDim}
        />
      </View>

      {/* Preview */}
      {data.scheduleDays.length > 0 && data.scheduleTime && (
        <GlassCard style={styles.previewCard} glowColor={colors.safe.primary}>
          <View style={styles.previewHeader}>
            <Ionicons name="calendar" size={20} color={colors.safe.primary} />
            <Text style={styles.previewTitle}>생성될 일정</Text>
          </View>
          <Text style={styles.previewText}>
            매주 {data.scheduleDays.map(d => dayOptions.find(o => o.key === d)?.label).join(', ')}요일 {data.scheduleTime}
          </Text>
          <Text style={styles.previewSubtext}>
            {data.startDate}부터 시작 • {data.packageCount > 0 ? `${data.packageCount}회` : '무제한'}
          </Text>
        </GlassCard>
      )}
    </View>
  );

  // Step 4: 완료
  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <View style={styles.completeAnimation}>
        <LinearGradient
          colors={[colors.success.primary, colors.safe.primary]}
          style={styles.completeIcon}
        >
          <Ionicons name="checkmark" size={48} color={colors.background} />
        </LinearGradient>
      </View>

      <Text style={styles.completeTitle}>등록 준비 완료!</Text>
      <Text style={styles.completeSubtitle}>아래 내용을 확인하고 등록을 완료하세요</Text>

      <GlassCard style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>학생</Text>
          <Text style={styles.summaryValue}>{data.studentName}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>레슨권</Text>
          <Text style={styles.summaryValue}>{data.packageName}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>결제 금액</Text>
          <Text style={[styles.summaryValue, { color: colors.safe.primary }]}>
            {data.packagePrice.toLocaleString()}원
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>레슨 일정</Text>
          <Text style={styles.summaryValue}>
            {data.scheduleDays.map(d => dayOptions.find(o => o.key === d)?.label).join(', ')} {data.scheduleTime}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>시작일</Text>
          <Text style={styles.summaryValue}>{data.startDate}</Text>
        </View>
      </GlassCard>

      {/* Auto Features */}
      <View style={styles.autoFeatures}>
        <View style={styles.autoFeatureItem}>
          <View style={[styles.autoFeatureIcon, { backgroundColor: colors.safe.bg }]}>
            <Ionicons name="calendar" size={18} color={colors.safe.primary} />
          </View>
          <Text style={styles.autoFeatureText}>시간표 자동 생성</Text>
        </View>
        <View style={styles.autoFeatureItem}>
          <View style={[styles.autoFeatureIcon, { backgroundColor: colors.caution.bg }]}>
            <Ionicons name="checkbox" size={18} color={colors.caution.primary} />
          </View>
          <Text style={styles.autoFeatureText}>출석부 자동 생성</Text>
        </View>
        <View style={styles.autoFeatureItem}>
          <View style={[styles.autoFeatureIcon, { backgroundColor: colors.success.bg }]}>
            <Ionicons name="pulse" size={18} color={colors.success.primary} />
          </View>
          <Text style={styles.autoFeatureText}>V-Index 연동</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surface, colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <Header
        leftIcon="close"
        onLeftPress={handleBack}
        title="레슨 등록"
      />

      {renderStepIndicator()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {step > 1 && step < 4 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color={colors.textMuted} />
            <Text style={styles.backButtonText}>이전</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextButton, (step === 1 || step === 4) && styles.nextButtonFull]}
          onPress={step === 4 ? handleComplete : handleNext}
        >
          <LinearGradient
            colors={step === 4 ? [colors.success.primary, '#00C07B'] : [colors.safe.primary, '#0099CC']}
            style={styles.nextButtonGradient}
          >
            <Text style={styles.nextButtonText}>
              {step === 4 ? '등록 완료' : '다음'}
            </Text>
            <Ionicons
              name={step === 4 ? 'checkmark' : 'arrow-forward'}
              size={20}
              color={colors.background}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing[4] },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
  },
  stepItem: { alignItems: 'center' },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  stepNumberActive: { color: colors.safe.primary },
  stepLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  stepLabelActive: { color: colors.safe.primary, fontWeight: '600' },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing[1],
    marginBottom: 16,
  },
  stepLineActive: { backgroundColor: colors.success.primary },

  // Content
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

  // Step 1 - Student
  newStudentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  newStudentButtonActive: {
    borderColor: colors.safe.primary,
    backgroundColor: colors.safe.bg,
  },
  newStudentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.safe.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  newStudentText: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing[2],
    marginTop: spacing[2],
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    marginBottom: spacing[2],
  },
  studentCardSelected: {
    borderColor: colors.safe.primary,
    backgroundColor: colors.safe.bg,
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  studentAvatarText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.safe.primary,
  },
  studentInfo: { flex: 1 },
  studentName: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  studentMeta: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  checkIcon: {},

  // Step 2 - Package
  packageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  packageCard: {
    width: (SCREEN_WIDTH - spacing[8] - spacing[3]) / 2 - spacing[2],
    padding: spacing[4],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  packageCardSelected: {
    borderColor: colors.safe.primary,
    backgroundColor: colors.safe.bg,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.caution.primary,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background,
  },
  packageName: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[1],
  },
  packageCount: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.safe.primary,
    marginBottom: spacing[1],
  },
  packagePrice: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  packageUnit: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  paymentCard: { marginTop: spacing[2] },
  paymentTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[3],
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  paymentMethod: {
    flex: 1,
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  paymentMethodActive: {
    borderColor: colors.safe.primary,
    backgroundColor: colors.safe.bg,
  },
  paymentMethodText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing[1],
  },
  paymentMethodTextActive: {
    color: colors.safe.primary,
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: typography.fontSize.md,
    color: colors.textMuted,
  },
  totalAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.safe.primary,
  },

  // Step 3 - Schedule
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
  daysRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  dayButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: colors.safe.bg,
    borderColor: colors.safe.primary,
  },
  dayButtonWeekend: {
    backgroundColor: colors.caution.bg,
    borderColor: colors.caution.primary,
  },
  dayButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    color: colors.textMuted,
  },
  dayButtonTextSelected: { color: colors.safe.primary },
  dayButtonTextWeekend: { color: colors.caution.primary },
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
  previewCard: { marginTop: spacing[4] },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  previewTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  previewText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  previewSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing[1],
  },

  // Step 4 - Complete
  completeAnimation: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  completeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  completeSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  summaryCard: { marginBottom: spacing[4] },
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
    fontWeight: '600',
    color: colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing[3],
  },
  autoFeatures: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  autoFeatureItem: { alignItems: 'center' },
  autoFeatureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  autoFeatureText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Bottom Actions
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
