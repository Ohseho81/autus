/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎉 CompleteScreen - 컨페티 + 시작 버튼
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { colors, typography, spacing, borderRadius } from '../../utils/theme';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Complete'>;

// 컨페티 파티클
const CONFETTI = ['🎉', '🏀', '⭐', '🎊', '✨', '🔥', '💪', '🎯'];

function ConfettiParticle({ emoji, delay }: { emoji: string; delay: number }) {
  const translateY = useRef(new Animated.Value(-60)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const startX = Math.random() * 300 - 150;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 600,
          duration: 2500 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 2300, delay: 500, useNativeDriver: true }),
        ]),
        Animated.timing(translateX, {
          toValue: startX + (Math.random() - 0.5) * 100,
          duration: 2500,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.Text
      style={[
        styles.confetti,
        {
          transform: [{ translateY }, { translateX: Animated.add(new Animated.Value(startX), translateX) }],
          opacity,
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}

interface CompleteScreenProps {
  onComplete?: () => void;
}

export default function CompleteScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // route params에서 onComplete 가져오기
  const route = navigation.getState()?.routes?.find(r => r.name === 'Complete');
  const onComplete = (route?.params as Record<string, unknown> | undefined)?.onComplete as (() => void) | undefined;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleStart = () => {
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* 컨페티 */}
      <View style={styles.confettiContainer} pointerEvents="none">
        {CONFETTI.map((emoji, i) =>
          Array.from({ length: 3 }).map((_, j) => (
            <ConfettiParticle
              key={`${i}-${j}`}
              emoji={emoji}
              delay={i * 150 + j * 300}
            />
          ))
        )}
      </View>

      {/* 메인 콘텐츠 */}
      <View style={styles.content}>
        <Animated.View style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient colors={['#30D158', '#34C759']} style={styles.checkGradient}>
            <Ionicons name="checkmark" size={60} color="white" />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={styles.title}>준비 완료!</Text>
          <Text style={styles.subtitle}>
            {'모든 설정이 끝났습니다\nAUTUS와 함께 시작하세요'}
          </Text>

          <View style={styles.features}>
            {[
              { icon: 'shield-checkmark', text: '퇴원 방지 AI 활성화', color: '#FF6B2C' },
              { icon: 'notifications', text: '자동 알림톡 준비 완료', color: '#007AFF' },
              { icon: 'analytics', text: '성장 분석 시작', color: '#30D158' },
            ].map((item, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={20} color={item.color} />
                <Text style={styles.featureText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>

      {/* 시작 버튼 */}
      <Animated.View style={[styles.bottomBar, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.8}>
          <LinearGradient
            colors={['#FF6B2C', '#FF8C42']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startBtnGradient}
          >
            <Text style={styles.startBtnText}>시작하기</Text>
            <Ionicons name="rocket" size={22} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    overflow: 'hidden',
  },
  confetti: {
    position: 'absolute',
    fontSize: 28,
    top: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
  },
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: spacing[8],
  },
  checkGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing[3],
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: spacing[8],
  },
  features: {
    gap: spacing[3],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  featureText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  bottomBar: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[4],
  },
  startBtn: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  startBtnGradient: {
    flexDirection: 'row',
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
  },
  startBtnText: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: 'white',
  },
});
