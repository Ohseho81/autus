/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 👤 ProfileSetupScreen - 이름 + 분야 8종 선택
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { colors, typography, spacing, borderRadius } from '../../utils/theme';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'ProfileSetup'>;

interface Industry {
  id: string;
  icon: string;
  label: string;
  code: string;
}

const INDUSTRIES: Industry[] = [
  { id: '1', icon: '🏀', label: '농구', code: 'basketball' },
  { id: '2', icon: '⚽', label: '축구', code: 'soccer' },
  { id: '3', icon: '🏊', label: '수영', code: 'swimming' },
  { id: '4', icon: '🎹', label: '음악', code: 'music' },
  { id: '5', icon: '📐', label: '수학/학원', code: 'academy' },
  { id: '6', icon: '🎨', label: '미술', code: 'art' },
  { id: '7', icon: '💪', label: 'PT/헬스', code: 'fitness' },
  { id: '8', icon: '📚', label: '기타', code: 'other' },
];

export default function ProfileSetupScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  const canProceed = name.trim().length >= 2 && selectedIndustry !== null;

  const handleNext = () => {
    Keyboard.dismiss();
    if (!canProceed) return;
    navigation.navigate('AddStudents');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom }]}>
      {/* 뒤로가기 */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.step}>2 / 4</Text>
        <Text style={styles.title}>프로필 설정</Text>
        <Text style={styles.subtitle}>이름과 분야를 알려주세요</Text>

        {/* 이름 입력 */}
        <Text style={styles.label}>이름</Text>
        <TextInput
          style={styles.input}
          placeholder="홍길동"
          placeholderTextColor={colors.text.muted}
          value={name}
          onChangeText={setName}
          maxLength={20}
        />

        {/* 분야 선택 */}
        <Text style={[styles.label, { marginTop: spacing[6] }]}>분야</Text>
        <View style={styles.grid}>
          {INDUSTRIES.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.industryCard,
                selectedIndustry === item.id && styles.industryCardSelected,
              ]}
              onPress={() => setSelectedIndustry(item.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.industryIcon}>{item.icon}</Text>
              <Text style={[
                styles.industryLabel,
                selectedIndustry === item.id && styles.industryLabelSelected,
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* 다음 버튼 */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing[4] }]}>
        <TouchableOpacity
          style={[styles.nextBtn, !canProceed && styles.btnDisabled]}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <Text style={styles.nextBtnText}>다음</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backBtn: {
    marginLeft: spacing[4],
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    paddingBottom: spacing[16],
  },
  step: {
    fontSize: typography.fontSize.sm,
    color: '#FF6B2C',
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.text.tertiary,
    marginBottom: spacing[8],
  },
  label: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing[2],
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    height: 52,
    paddingHorizontal: spacing[4],
    fontSize: typography.fontSize.lg,
    color: colors.text.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  industryCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    paddingVertical: spacing[4],
    alignItems: 'center',
    gap: spacing[2],
  },
  industryCardSelected: {
    borderColor: '#FF6B2C',
    backgroundColor: '#FF6B2C15',
  },
  industryIcon: {
    fontSize: 32,
  },
  industryLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  industryLabelSelected: {
    color: '#FF6B2C',
    fontWeight: '700',
  },
  bottomBar: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  nextBtn: {
    flexDirection: 'row',
    backgroundColor: '#FF6B2C',
    height: 54,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
  },
  btnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: 'white',
  },
});
