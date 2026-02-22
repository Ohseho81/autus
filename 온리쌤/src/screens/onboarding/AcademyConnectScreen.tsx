/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏫 AcademyConnectScreen - 초대코드 / 새 학원 연결
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { colors, typography, spacing, borderRadius } from '../../utils/theme';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'AcademyConnect'>;

export default function AcademyConnectScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'select' | 'code'>('select');
  const [inviteCode, setInviteCode] = useState('');

  const handleCodeSubmit = () => {
    Keyboard.dismiss();
    if (inviteCode.trim().length < 4) {
      if (Platform.OS !== 'web') {
        Alert.alert('알림', '초대코드를 정확히 입력해주세요.');
      }
      return;
    }
    // TODO: 초대코드 검증 API
    navigation.navigate('ProfileSetup');
  };

  const handleNewAcademy = () => {
    navigation.navigate('ProfileSetup');
  };

  if (mode === 'code') {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom }]}>
        {/* 뒤로가기 */}
        <TouchableOpacity style={styles.backBtn} onPress={() => setMode('select')}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>초대코드 입력</Text>
          <Text style={styles.subtitle}>학원에서 받은 코드를 입력하세요</Text>

          <TextInput
            style={styles.codeInput}
            placeholder="ABCD-1234"
            placeholderTextColor={colors.text.muted}
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
            maxLength={9}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.primaryBtn, !inviteCode.trim() && styles.btnDisabled]}
            onPress={handleCodeSubmit}
            disabled={!inviteCode.trim()}
          >
            <Text style={styles.primaryBtnText}>확인</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Text style={styles.title}>학원 연결</Text>
        <Text style={styles.subtitle}>이미 소속 학원이 있나요?</Text>

        {/* 초대코드로 연결 */}
        <TouchableOpacity style={styles.optionCard} onPress={() => setMode('code')}>
          <View style={[styles.optionIcon, { backgroundColor: '#FF6B2C20' }]}>
            <Ionicons name="key" size={28} color="#FF6B2C" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>초대코드로 참여</Text>
            <Text style={styles.optionDesc}>학원에서 받은 코드를 입력합니다</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
        </TouchableOpacity>

        {/* 새 학원 만들기 */}
        <TouchableOpacity style={styles.optionCard} onPress={handleNewAcademy}>
          <View style={[styles.optionIcon, { backgroundColor: '#30D15820' }]}>
            <Ionicons name="add-circle" size={28} color="#30D158" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>새 학원 만들기</Text>
            <Text style={styles.optionDesc}>원장님이라면 여기서 시작하세요</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
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
  content: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[8],
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
    marginBottom: spacing[10],
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  codeInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.primary,
    height: 60,
    paddingHorizontal: spacing[5],
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: spacing[5],
  },
  primaryBtn: {
    backgroundColor: '#FF6B2C',
    height: 54,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: 'white',
  },
});
