/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 👤 ProfileSettingsScreen - KRATON 스타일 프로필 설정
 * 사용자 프로필 관리 + 비밀번호 변경
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

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  role: string;
}

export default function ProfileSettingsScreen() {
  const navigation = useNavigation();
  const [hasChanges, setHasChanges] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [form, setForm] = useState<ProfileForm>({
    name: '홍길동',
    email: 'admin@autus.kr',
    phone: '010-1234-5678',
    role: '원장',
  });
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const updateForm = (key: keyof ProfileForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updatePasswordForm = (key: keyof typeof passwordForm, value: string) => {
    setPasswordForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    Alert.alert(
      '저장',
      '프로필 정보를 저장할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '저장',
          onPress: () => {
            setHasChanges(false);
            Alert.alert('완료', '프로필이 저장되었습니다.');
          }
        },
      ]
    );
  };

  const handleChangePassword = () => {
    if (!passwordForm.current) {
      Alert.alert('알림', '현재 비밀번호를 입력해주세요.');
      return;
    }
    if (!passwordForm.new || passwordForm.new.length < 8) {
      Alert.alert('알림', '새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      Alert.alert('알림', '새 비밀번호가 일치하지 않습니다.');
      return;
    }

    Alert.alert(
      '비밀번호 변경',
      '비밀번호를 변경할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '변경',
          onPress: () => {
            setShowPasswordForm(false);
            setPasswordForm({ current: '', new: '', confirm: '' });
            Alert.alert('완료', '비밀번호가 변경되었습니다.');
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
        title="프로필 설정"
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
          {/* Profile Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={[colors.safe.primary, colors.caution.primary]}
                style={styles.avatarGradient}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{form.name.charAt(0)}</Text>
                </View>
              </LinearGradient>
              <TouchableOpacity style={styles.avatarEditButton}>
                <Ionicons name="camera" size={16} color={colors.background} />
              </TouchableOpacity>
            </View>
            <Text style={styles.roleBadge}>{form.role}</Text>
          </View>

          {/* Profile Form */}
          <GlassCard style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>이름</Text>
              <TextInput
                style={styles.input}
                placeholder="이름"
                placeholderTextColor={colors.textDim}
                value={form.name}
                onChangeText={(v) => updateForm('name', v)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>이메일</Text>
              <TextInput
                style={styles.input}
                placeholder="이메일"
                placeholderTextColor={colors.textDim}
                value={form.email}
                onChangeText={(v) => updateForm('email', v)}
                keyboardType="email-address"
                autoCapitalize="none"
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
          </GlassCard>

          {/* Password Section */}
          <GlassCard style={styles.passwordCard}>
            <TouchableOpacity
              style={styles.passwordHeader}
              onPress={() => setShowPasswordForm(!showPasswordForm)}
            >
              <View style={styles.passwordHeaderLeft}>
                <Ionicons name="lock-closed" size={20} color={colors.caution.primary} />
                <Text style={styles.passwordTitle}>비밀번호 변경</Text>
              </View>
              <Ionicons
                name={showPasswordForm ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {showPasswordForm && (
              <View style={styles.passwordForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>현재 비밀번호</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="현재 비밀번호 입력"
                    placeholderTextColor={colors.textDim}
                    value={passwordForm.current}
                    onChangeText={(v) => updatePasswordForm('current', v)}
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>새 비밀번호</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="새 비밀번호 (8자 이상)"
                    placeholderTextColor={colors.textDim}
                    value={passwordForm.new}
                    onChangeText={(v) => updatePasswordForm('new', v)}
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>비밀번호 확인</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="새 비밀번호 다시 입력"
                    placeholderTextColor={colors.textDim}
                    value={passwordForm.confirm}
                    onChangeText={(v) => updatePasswordForm('confirm', v)}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={styles.changePasswordButton}
                  onPress={handleChangePassword}
                >
                  <Text style={styles.changePasswordButtonText}>비밀번호 변경</Text>
                </TouchableOpacity>
              </View>
            )}
          </GlassCard>

          {/* Danger Zone */}
          <GlassCard style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>계정 관리</Text>
            <TouchableOpacity style={styles.dangerButton}>
              <Ionicons name="log-out-outline" size={20} color={colors.danger.primary} />
              <Text style={styles.dangerButtonText}>로그아웃</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dangerButton, styles.dangerButtonLast]}>
              <Ionicons name="trash-outline" size={20} color={colors.danger.primary} />
              <Text style={styles.dangerButtonText}>계정 삭제</Text>
            </TouchableOpacity>
          </GlassCard>

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
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing[4] },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing[2],
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
  },
  avatar: {
    flex: 1,
    borderRadius: 48,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
  },
  avatarEditButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.safe.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  roleBadge: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.safe.primary,
    backgroundColor: colors.safe.bg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  formCard: { marginBottom: spacing[4] },
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
  passwordCard: { marginBottom: spacing[4] },
  passwordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passwordHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  passwordTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  passwordForm: {
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  changePasswordButton: {
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.caution.bg,
    alignItems: 'center',
  },
  changePasswordButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.caution.primary,
  },
  dangerCard: { marginBottom: spacing[4] },
  dangerTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.danger.primary,
    marginBottom: spacing[3],
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dangerButtonLast: {
    borderBottomWidth: 0,
  },
  dangerButtonText: {
    fontSize: typography.fontSize.md,
    color: colors.danger.primary,
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
