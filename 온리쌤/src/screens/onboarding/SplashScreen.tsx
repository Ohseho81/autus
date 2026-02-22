/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎬 SplashScreen - 로고 2초 표시 후 자동 이동
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { colors, typography } from '../../utils/theme';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Splash'>;

export default function SplashScreen() {
  const navigation = useNavigation<Nav>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('Welcome');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, '#0A0A1A', colors.background]}
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View style={[styles.logoWrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient colors={['#FF6B2C', '#FFD60A']} style={styles.logoCircle}>
          <Text style={styles.logoText}>A</Text>
        </LinearGradient>
        <Text style={styles.appName}>AUTUS</Text>
        <Text style={styles.tagline}>관계 유지력 OS</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.background,
  },
  appName: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
    marginTop: 8,
  },
});
