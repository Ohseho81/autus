/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ✨ GlassCard - 글래스모피즘 카드 (KRATON Cycle 5)
 * React Native 버전
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing, shadows } from '../../utils/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  glow?: string | null;
  onPress?: () => void;
  pulse?: boolean;
  padding?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  glow = null,
  onPress,
  pulse = false,
  padding = spacing[4],
}) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (pulse) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [pulse]);

  const cardStyle: ViewStyle = {
    ...styles.card,
    padding,
    ...(glow && shadows.glow(glow)),
    ...style,
  };

  const content = (
    <Animated.View
      style={[
        cardStyle,
        pulse && { transform: [{ scale: pulseAnim }] },
      ]}
    >
      {/* Gradient Overlay */}
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientOverlay}
      />
      <View style={styles.content}>
        {children}
      </View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.md,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});

export default GlassCard;
