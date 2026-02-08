/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔐 LoginScreen - KRATON 스타일 로그인
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import { GlassCard } from '../../components/common';
import { api } from '../../services/api';

export default function LoginScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await api.login(email, password);
      // Navigation will be handled by auth state change
    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[colors.background, colors.surface, colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <LinearGradient
              colors={[colors.safe.primary, colors.caution.primary]}
              style={styles.logoGradient}
            >
              <Text style={styles.logoText}>온</Text>
            </LinearGradient>
          </View>
          <Text style={styles.appName}>온리쌤</Text>
          <Text style={styles.tagline}>관계 유지력의 물리학</Text>
        </View>

        {/* Login Form */}
        <GlassCard style={styles.formCard}>
          <Text style={styles.formTitle}>로그인</Text>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={colors.danger.primary} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email Input */}
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
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="비밀번호"
              placeholderTextColor={colors.textDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => navigation.navigate('ForgotPassword' as never)}
          >
            <Text style={styles.forgotText}>비밀번호를 잊으셨나요?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <LinearGradient
              colors={[colors.safe.primary, '#0099CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.loginButtonText}>로그인</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </GlassCard>

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>아직 계정이 없으신가요?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register' as never)}>
            <Text style={styles.registerLink}>회원가입</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Version */}
      <Text style={[styles.version, { paddingBottom: insets.bottom + spacing[4] }]}>
        AUTUS v2.0 (KRATON)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing[4],
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: spacing[4],
  },
  logoGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.background,
  },
  appName: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing[1],
  },
  formCard: {
    padding: spacing[6],
  },
  formTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.danger.bg,
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[3],
  },
  errorText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.danger.primary,
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing[4],
  },
  forgotText: {
    fontSize: typography.fontSize.sm,
    color: colors.safe.primary,
  },
  loginButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonGradient: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.background,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[4],
  },
  registerText: {
    fontSize: typography.fontSize.md,
    color: colors.textMuted,
  },
  registerLink: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.safe.primary,
  },
  version: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    color: colors.textDim,
  },
});
