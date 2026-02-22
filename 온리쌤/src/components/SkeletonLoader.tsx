import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';

interface SkeletonLoaderProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * 스켈레톤 로딩 컴포넌트
 * 데이터 로딩 중 플레이스홀더를 표시
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width,
  height,
  borderRadius = 4,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // 반복 애니메이션
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * 학생 카드 스켈레톤
 */
export const SkeletonStudentCard: React.FC = () => (
  <View style={styles.card}>
    <SkeletonLoader width={60} height={60} borderRadius={30} />
    <View style={styles.content}>
      <SkeletonLoader width="60%" height={20} />
      <SkeletonLoader width="40%" height={16} style={{ marginTop: 8 }} />
      <SkeletonLoader width="50%" height={16} style={{ marginTop: 4 }} />
    </View>
  </View>
);

/**
 * 리스트 스켈레톤 (여러 개의 카드)
 */
export const SkeletonList: React.FC<{ count?: number }> = ({ count = 10 }) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonStudentCard key={index} />
    ))}
  </>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E1E9EE',
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
});
