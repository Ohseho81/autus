/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📝 RegisterScreen - KRATON 스타일 회원가입
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import { GlassCard } from '../../components/common';
import Header from '../../components/common/Header';
import { useAuthStore } from '../../store/authStore';

export default function RegisterScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: 기본 정보
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: 학원 정보
  const [academyName, setAcademyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');

  // Step 3: 추가 정보
  const [address, setAddress] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);

  const subjectOptions = ['국어', '영어', '수학', '과학', '사회', '예체능', '기타'];

  const toggleSubject = (subject: string) => {
    if (subjects.includes(subject)) {
      setSubjects(subjects.filter(s => s !== subject));
    } else {
      setSubjects([...subjects, subject]);
    }
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else handleRegister();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  };

  const { signUp, isLoading: authLoading } = useAuthStore();
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    setIsLoading(true);
    setError('');
    const result = await signUp(email, password, ownerName);
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
    }
    // Auth state change will auto-navigate
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.stepTitle}>계정 정보</Text>
            <Text style={styles.stepSubtitle}>로그인에 사용할 정보를 입력해주세요</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="이메일"
                placeholderTextColor={colors.textDim}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="비밀번호"
                placeholderTextColor={colors.textDim}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="비밀번호 확인"
                placeholderTextColor={colors.textDim}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          </>
        );

      case 2:
        return (
          <>
            <Text style={styles.stepTitle}>학원 정보</Text>
            <Text style={styles.stepSubtitle}>학원 기본 정보를 입력해주세요</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="business-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="학원 이름"
                placeholderTextColor={colors.textDim}
                value={academyName}
                onChangeText={setAcademyName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="원장님 성함"
                placeholderTextColor={colors.textDim}
                value={ownerName}
                onChangeText={setOwnerName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="연락처"
                placeholderTextColor={colors.textDim}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </>
        );

      case 3:
        return (
          <>
            <Text style={styles.stepTitle}>추가 정보</Text>
            <Text style={styles.stepSubtitle}>학원 상세 정보를 입력해주세요</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="주소"
                placeholderTextColor={colors.textDim}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <Text style={styles.label}>교육 과목</Text>
            <View style={styles.subjectsGrid}>
              {subjectOptions.map((subject) => (
                <TouchableOpacity
                  key={subject}
                  style={[
                    styles.subjectChip,
                    subjects.includes(subject) && styles.subjectChipActive,
                  ]}
                  onPress={() => toggleSubject(subject)}
                >
                  <Text style={[
                    styles.subjectText,
                    subjects.includes(subject) && styles.subjectTextActive,
                  ]}>
                    {subject}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        );
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surface, colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <Header
        leftIcon="arrow-back"
        onLeftPress={handleBack}
        title="회원가입"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={styles.progressItem}>
              <View style={[
                styles.progressDot,
                s <= step && styles.progressDotActive,
              ]}>
                {s < step ? (
                  <Ionicons name="checkmark" size={14} color={colors.background} />
                ) : (
                  <Text style={[
                    styles.progressNumber,
                    s <= step && styles.progressNumberActive,
                  ]}>{s}</Text>
                )}
              </View>
              {s < 3 && (
                <View style={[
                  styles.progressLine,
                  s < step && styles.progressLineActive,
                ]} />
              )}
            </View>
          ))}
        </View>

        {/* Form */}
        <GlassCard style={styles.formCard}>
          {renderStep()}
        </GlassCard>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleNext}
          disabled={isLoading}
        >
          <LinearGradient
            colors={[colors.safe.primary, '#0099CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionButtonGradient}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.actionButtonText}>
                {step === 3 ? '가입 완료' : '다음'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotActive: {
    backgroundColor: colors.safe.primary,
    borderColor: colors.safe.primary,
  },
  progressNumber: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
  },
  progressNumberActive: {
    color: colors.background,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing[2],
  },
  progressLineActive: {
    backgroundColor: colors.safe.primary,
  },
  formCard: {
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  stepTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[1],
  },
  stepSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing[4],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    marginBottom: spacing[3],
    height: 52,
  },
  input: {
    flex: 1,
    marginLeft: spacing[2],
    fontSize: typography.fontSize.base,
    color: colors.text,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: spacing[2],
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  subjectChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  subjectChipActive: {
    backgroundColor: colors.safe.bg,
    borderColor: colors.safe.primary,
  },
  subjectText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  subjectTextActive: {
    color: colors.safe.primary,
    fontWeight: '500',
  },
  actionButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.background,
  },
});
