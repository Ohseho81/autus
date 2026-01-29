/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏫 AcademySettingsScreen - KRATON 스타일 학원 설정
 * 학원 정보 관리 + 운영 설정
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
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard } from '../../components/common';

interface AcademyForm {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  openTime: string;
  closeTime: string;
  operatingDays: string[];
}

const dayOptions = ['월', '화', '수', '목', '금', '토', '일'];

export default function AcademySettingsScreen() {
  const navigation = useNavigation();
  const [hasChanges, setHasChanges] = useState(false);
  const [form, setForm] = useState<AcademyForm>({
    name: 'AUTUS 학원',
    address: '서울시 강남구 테헤란로 123',
    phone: '02-1234-5678',
    email: 'contact@autus.kr',
    website: 'www.autus.kr',
    openTime: '09:00',
    closeTime: '22:00',
    operatingDays: ['월', '화', '수', '목', '금', '토'],
  });

  const updateForm = (key: keyof AcademyForm, value: string | string[]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const toggleDay = (day: string) => {
    const newDays = form.operatingDays.includes(day)
      ? form.operatingDays.filter(d => d !== day)
      : [...form.operatingDays, day];
    updateForm('operatingDays', newDays);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      Alert.alert('알림', '학원명을 입력해주세요.');
      return;
    }

    Alert.alert(
      '저장',
      '학원 정보를 저장할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '저장',
          onPress: () => {
            setHasChanges(false);
            Alert.alert('완료', '학원 정보가 저장되었습니다.');
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surface, colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <Header
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        title="학원 설정"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Academy Info */}
        <GlassCard style={styles.formCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="business" size={20} color={colors.safe.primary} />
            <Text style={styles.cardTitle}>학원 정보</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>학원명 *</Text>
            <TextInput
              style={styles.input}
              placeholder="학원명"
              placeholderTextColor={colors.textDim}
              value={form.name}
              onChangeText={(v) => updateForm('name', v)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>주소</Text>
            <TextInput
              style={styles.input}
              placeholder="학원 주소"
              placeholderTextColor={colors.textDim}
              value={form.address}
              onChangeText={(v) => updateForm('address', v)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>대표 연락처</Text>
            <TextInput
              style={styles.input}
              placeholder="02-0000-0000"
              placeholderTextColor={colors.textDim}
              value={form.phone}
              onChangeText={(v) => updateForm('phone', v)}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>이메일</Text>
            <TextInput
              style={styles.input}
              placeholder="contact@academy.com"
              placeholderTextColor={colors.textDim}
              value={form.email}
              onChangeText={(v) => updateForm('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>웹사이트</Text>
            <TextInput
              style={styles.input}
              placeholder="www.academy.com"
              placeholderTextColor={colors.textDim}
              value={form.website}
              onChangeText={(v) => updateForm('website', v)}
              autoCapitalize="none"
            />
          </View>
        </GlassCard>

        {/* Operating Hours */}
        <GlassCard style={styles.formCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="time" size={20} color={colors.caution.primary} />
            <Text style={styles.cardTitle}>운영 시간</Text>
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeInputContainer}>
              <Text style={styles.inputLabel}>운영 시작</Text>
              <TextInput
                style={styles.timeInput}
                placeholder="09:00"
                placeholderTextColor={colors.textDim}
                value={form.openTime}
                onChangeText={(v) => updateForm('openTime', v)}
              />
            </View>
            <Text style={styles.timeSeparator}>~</Text>
            <View style={styles.timeInputContainer}>
              <Text style={styles.inputLabel}>운영 종료</Text>
              <TextInput
                style={styles.timeInput}
                placeholder="22:00"
                placeholderTextColor={colors.textDim}
                value={form.closeTime}
                onChangeText={(v) => updateForm('closeTime', v)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>운영 요일</Text>
            <View style={styles.daysRow}>
              {dayOptions.map((day) => {
                const isSelected = form.operatingDays.includes(day);
                const isWeekend = day === '토' || day === '일';
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      isSelected && styles.dayButtonSelected,
                      isWeekend && isSelected && styles.dayButtonWeekend,
                    ]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      isSelected && styles.dayButtonTextSelected,
                      isWeekend && isSelected && styles.dayButtonTextWeekend,
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </GlassCard>

        {/* Additional Settings */}
        <GlassCard style={styles.formCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="settings" size={20} color={colors.success.primary} />
            <Text style={styles.cardTitle}>추가 설정</Text>
          </View>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>수강료 설정</Text>
              <Text style={styles.settingDesc}>기본 수강료 및 할인 정책 설정</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>시간표 설정</Text>
              <Text style={styles.settingDesc}>수업 시간 및 휴식 시간 설정</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>직원 관리</Text>
              <Text style={styles.settingDesc}>직원 계정 및 권한 관리</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingRow, styles.settingRowLast]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>과목 관리</Text>
              <Text style={styles.settingDesc}>수강 과목 및 담당 선생님 설정</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </GlassCard>

        {/* Save Button */}
        {hasChanges && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <LinearGradient
              colors={[colors.safe.primary, '#0099CC']}
              style={styles.saveButtonGradient}
            >
              <Ionicons name="checkmark" size={20} color={colors.background} />
              <Text style={styles.saveButtonText}>변경사항 저장</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing[4] },
  formCard: { marginBottom: spacing[4] },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  inputGroup: { marginBottom: spacing[4] },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[2],
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.md,
    color: colors.text,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  timeInputContainer: { flex: 1 },
  timeInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.md,
    color: colors.text,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: typography.fontSize.lg,
    color: colors.textMuted,
    marginBottom: spacing[3],
  },
  daysRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  dayButton: {
    flex: 1,
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
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
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.textMuted,
  },
  dayButtonTextSelected: {
    color: colors.safe.primary,
  },
  dayButtonTextWeekend: {
    color: colors.caution.primary,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingInfo: { flex: 1 },
  settingLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  settingDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  saveButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginTop: spacing[4],
  },
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
