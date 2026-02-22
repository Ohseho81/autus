/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔐 LoginScreen - AUTUS v1.0 로그인
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 역할 기반 로그인:
 * - Admin: 원장/관리자
 * - Staff: 코치/현장담당자
 * - Consumer: 학부모/고객
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
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import { GlassCard } from '../../components/common';
import { useIndustryConfig } from '../../context/IndustryContext';
import { L } from '../../config/labelMap';
import { useRole, UserRole } from '../../navigation/AppNavigatorV2';
import type { AuthStackParamList } from '../../navigation/AppNavigatorV2';
import { setUserContext, addBreadcrumb } from '../../lib/sentry';
import { supabase } from '../../lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { config } = useIndustryConfig();
  const { setRole } = useRole();
  const insets = useSafeAreaInsets();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // TODO: 실제 서비스에서는 user metadata에서 역할을 가져옵니다
      // 현재는 데모용으로 Admin으로 설정
      if (data.user) setUserContext(data.user.id, 'admin');
      addBreadcrumb('User logged in', 'auth', { method: 'email' });
      setRole('admin');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (role: UserRole) => {
    // 웹에서는 Alert.alert가 작동하지 않으므로 플랫폼 체크
    if (Platform.OS === 'web') {
      // 웹에서는 바로 로그인
      setUserContext('demo', role ?? undefined);
      addBreadcrumb('Demo login', 'auth', { role });
      setRole(role);
    } else {
      // 모바일에서는 확인 다이얼로그 표시
      Alert.alert(
        '데모 로그인',
        `${getRoleName(role)} 역할로 로그인합니다.`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '확인',
            onPress: () => {
              setUserContext('demo', role ?? undefined);
              addBreadcrumb('Demo login', 'auth', { role });
              setRole(role);
            }
          },
        ]
      );
    }
  };

  const getRoleName = (role: UserRole): string => {
    switch (role) {
      case 'admin': return '관리자';
      case 'staff': return L.staff(config);
      case 'consumer': return L.entityParent(config);
      default: return '';
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[colors.background, colors.surface, colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        style={styles.content}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <LinearGradient
              colors={[config.color.primary, colors.caution.primary]}
              style={styles.logoGradient}
            >
              <Text style={styles.logoText}>A</Text>
            </LinearGradient>
          </View>
          <Text style={styles.appName}>AUTUS</Text>
          <Text style={styles.tagline}>관계 유지력 OS</Text>
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
            <Ionicons name="mail-outline" size={20} color={colors.text.muted} />
            <TextInput
              style={styles.input}
              placeholder="이메일"
              placeholderTextColor={colors.text.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.text.muted} />
            <TextInput
              style={styles.input}
              placeholder="비밀번호"
              placeholderTextColor={colors.text.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.text.muted}
              />
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => navigation.navigate('PasswordReset' as never)}
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
              colors={[config.color.primary, '#0099CC']}
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

        {/* Demo Login (개발용) */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>빠른 데모 로그인</Text>
          <View style={styles.demoButtons}>
            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => handleDemoLogin('admin')}
            >
              <Ionicons name="briefcase-outline" size={20} color={config.color.primary} />
              <Text style={styles.demoButtonText}>관리자</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => handleDemoLogin('staff')}
            >
              <Ionicons name="person-outline" size={20} color={colors.success.primary} />
              <Text style={styles.demoButtonText}>{L.staff(config)}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => handleDemoLogin('consumer')}
            >
              <Ionicons name="people-outline" size={20} color={colors.caution.primary} />
              <Text style={styles.demoButtonText}>{L.entityParent(config)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Version */}
      <Text style={[styles.version, { paddingBottom: insets.bottom + spacing[4] }]}>
        AUTUS v1.0 • {config.name}
      </Text>
    </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing[4],
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing[6],
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
    color: colors.text.primary,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    marginTop: spacing[1],
  },

  // Form Card
  formCard: {
    padding: spacing[6],
  },
  formTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: `${colors.danger.primary}15`,
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
    borderColor: colors.border.primary,
    paddingHorizontal: spacing[3],
    marginBottom: spacing[3],
    height: 52,
  },
  input: {
    flex: 1,
    marginLeft: spacing[2],
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
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

  // Demo Section
  demoSection: {
    marginTop: spacing[6],
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    marginBottom: spacing[3],
  },
  demoButtons: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  demoButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },

  // Version
  version: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },
});
