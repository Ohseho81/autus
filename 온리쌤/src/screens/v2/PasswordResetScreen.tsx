/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔐 PasswordResetScreen - AUTUS v1.0 비밀번호 재설정
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 기능:
 * - 이메일/전화번호로 재설정 링크 발송
 * - Supabase Auth 연동
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, typography } from '../../utils/theme';
import { useIndustryConfig } from '../../context/IndustryContext';
import type { AuthStackParamList } from '../../navigation/AppNavigatorV2';
import { supabase } from '../../lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function PasswordResetScreen() {
  const { config } = useIndustryConfig();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('알림', '이메일을 입력해주세요.');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('알림', '올바른 이메일 형식을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'onlyssam://reset-password',
      });

      if (error) throw error;

      setSent(true);
    } catch (error: unknown) {
      if (__DEV__) console.error('Password reset error:', error);
      Alert.alert(
        '오류',
        error instanceof Error ? error.message : String(error) || '비밀번호 재설정 이메일 발송 중 문제가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render: Success State
  // ─────────────────────────────────────────────────────────────────────────────

  if (sent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: `${colors.success.primary}20` }]}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success.primary} />
          </View>
          
          <Text style={styles.successTitle}>이메일이 발송되었습니다</Text>
          
          <Text style={styles.successMessage}>
            <Text style={{ fontWeight: '600' }}>{email}</Text>
            {'\n'}
            으로 비밀번호 재설정 링크를 보냈습니다.{'\n\n'}
            메일함을 확인해주세요.
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: config.color.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>로그인으로 돌아가기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={() => {
              setSent(false);
              handleResetPassword();
            }}
          >
            <Text style={styles.resendText}>이메일을 받지 못하셨나요?</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: `${config.color.primary}15` }]}>
            <Ionicons name="lock-closed-outline" size={40} color={config.color.primary} />
          </View>

          <Text style={styles.title}>비밀번호 재설정</Text>
          
          <Text style={styles.description}>
            가입하신 이메일 주소를 입력해주세요.{'\n'}
            비밀번호 재설정 링크를 보내드립니다.
          </Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={colors.text.muted} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="이메일 주소"
                placeholderTextColor={colors.text.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: config.color.primary },
              (!email || loading) && styles.buttonDisabled,
            ]}
            onPress={handleResetPassword}
            disabled={!email || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>재설정 링크 발송</Text>
            )}
          </TouchableOpacity>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Ionicons name="help-circle-outline" size={16} color={colors.text.muted} />
            <Text style={styles.helpText}>
              이메일을 잊으셨나요? 관리자에게 문의해주세요.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  description: {
    fontSize: typography.fontSize.md,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing[6],
  },

  // Input
  inputContainer: {
    width: '100%',
    marginBottom: spacing[4],
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.primary,
    gap: spacing[3],
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
  },

  // Button
  button: {
    width: '100%',
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: '#fff',
  },

  // Help
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  helpText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
  },

  // Success State
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  successTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  successMessage: {
    fontSize: typography.fontSize.md,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing[8],
  },
  resendButton: {
    marginTop: spacing[4],
  },
  resendText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    textDecorationLine: 'underline',
  },
});
