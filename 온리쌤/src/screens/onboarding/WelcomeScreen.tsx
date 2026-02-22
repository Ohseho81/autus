/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 👋 WelcomeScreen - 3슬라이드 소개 + 카카오 로그인
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { colors, typography, spacing, borderRadius } from '../../utils/theme';
import { loginWithKakao } from '../../services/kakaoAuth';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;

const { width: SCREEN_W } = Dimensions.get('window');

interface Slide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    icon: 'shield-checkmark',
    title: '퇴원 방지 AI',
    subtitle: '위험 신호를 미리 감지하고\n자동으로 케어합니다',
    color: '#FF6B2C',
  },
  {
    id: '2',
    icon: 'flash',
    title: '입력 제로',
    subtitle: '코치는 버튼 3개만 누르면 끝\n나머지는 시스템이 알아서',
    color: '#30D158',
  },
  {
    id: '3',
    icon: 'trending-up',
    title: '성장 추적',
    subtitle: '학생 성장 데이터를 자동 수집\n학부모가 직접 확인',
    color: '#007AFF',
  },
];

export default function WelcomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    const result = await loginWithKakao();
    setIsLoading(false);

    if (result.success) {
      navigation.navigate('AcademyConnect');
    } else {
      if (Platform.OS === 'web') {
        // 웹에서는 바로 다음으로
        navigation.navigate('AcademyConnect');
      } else {
        Alert.alert('로그인 실패', result.error ?? '다시 시도해주세요.');
      }
    }
  };

  const handleSkip = () => {
    navigation.navigate('AcademyConnect');
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={[styles.slide, { width: SCREEN_W }]}>
      <View style={[styles.iconCircle, { backgroundColor: `${item.color}20` }]}>
        <Ionicons name={item.icon} size={60} color={item.color} />
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* 슬라이드 */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
        }}
        style={styles.slideList}
      />

      {/* 페이지 인디케이터 */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* 버튼 영역 */}
      <View style={styles.buttonArea}>
        {/* 카카오 로그인 */}
        <TouchableOpacity
          style={styles.kakaoBtn}
          onPress={handleKakaoLogin}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#3C1E1E" />
          ) : (
            <>
              <Text style={styles.kakaoBtnIcon}>{'💬'}</Text>
              <Text style={styles.kakaoBtnText}>카카오로 시작하기</Text>
            </>
          )}
        </TouchableOpacity>

        {/* 건너뛰기 */}
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>먼저 둘러볼게요</Text>
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
  slideList: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  slideTitle: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  slideSubtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 26,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing[8],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceTertiary,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#FF6B2C',
  },
  buttonArea: {
    paddingHorizontal: spacing[6],
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  kakaoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE500',
    height: 54,
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  kakaoBtnIcon: {
    fontSize: 20,
  },
  kakaoBtnText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: '#3C1E1E',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  skipText: {
    fontSize: typography.fontSize.base,
    color: colors.text.quaternary,
  },
});
