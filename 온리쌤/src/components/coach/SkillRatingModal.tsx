/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⭐ SkillRatingModal - 학생 스킬 평가 모달
 * 6가지 농구 스킬을 별점으로 평가
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography, borderRadius, shadows } from '../../utils/theme';

const { width } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface SkillItem {
  key: string;
  label: string;
  emoji: string;
  rating: number;
}

interface SkillRatingModalProps {
  visible: boolean;
  studentName: string;
  studentId: string;
  initialSkills?: Record<string, number>;
  onClose: () => void;
  onSave: (skills: Record<string, number>) => void;
}

// ═══════════════════════════════════════════════════════════════
// Default Skills
// ═══════════════════════════════════════════════════════════════

const defaultSkills: SkillItem[] = [
  { key: 'dribble', label: '드리블', emoji: '🏀', rating: 0 },
  { key: 'shoot', label: '슛', emoji: '🔥', rating: 0 },
  { key: 'pass', label: '패스', emoji: '🎯', rating: 0 },
  { key: 'defense', label: '수비', emoji: '🛡️', rating: 0 },
  { key: 'stamina', label: '체력', emoji: '💪', rating: 0 },
  { key: 'teamwork', label: '협동', emoji: '🤝', rating: 0 },
];

// ═══════════════════════════════════════════════════════════════
// Star Rating Component
// ═══════════════════════════════════════════════════════════════

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  size?: number;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onRatingChange, size = 24 }) => {
  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity
          key={star}
          onPress={() => onRatingChange(star)}
          hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
        >
          <Ionicons
            name={star <= rating ? 'star' : 'star-outline'}
            size={size}
            color={star <= rating ? colors.special.gold : colors.text.muted}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export default function SkillRatingModal({
  visible,
  studentName,
  studentId,
  initialSkills = {},
  onClose,
  onSave,
}: SkillRatingModalProps) {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initialize skills with initial values
    const initializedSkills = defaultSkills.map(skill => ({
      ...skill,
      rating: initialSkills[skill.key] || 0,
    }));
    setSkills(initializedSkills);
  }, [initialSkills, visible]);

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const handleRatingChange = (skillKey: string, rating: number) => {
    setSkills(prev =>
      prev.map(skill =>
        skill.key === skillKey ? { ...skill, rating } : skill
      )
    );
  };

  const handleSave = () => {
    const skillsRecord = skills.reduce((acc, skill) => {
      acc[skill.key] = skill.rating;
      return acc;
    }, {} as Record<string, number>);

    onSave(skillsRecord);
    onClose();
  };

  const getTotalScore = () => {
    const total = skills.reduce((sum, skill) => sum + skill.rating, 0);
    const max = skills.length * 5;
    return Math.round((total / max) * 100);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>스킬 평가</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.text.muted} />
              </TouchableOpacity>
            </View>

            {/* Student Info */}
            <View style={styles.studentInfo}>
              <LinearGradient colors={['#FF6B35', '#FF8C42']} style={styles.studentAvatar}>
                <Text style={styles.studentEmoji}>🏀</Text>
              </LinearGradient>
              <Text style={styles.studentName}>{studentName}</Text>
              <View style={styles.totalScore}>
                <Text style={styles.totalScoreValue}>{getTotalScore()}%</Text>
                <Text style={styles.totalScoreLabel}>종합 점수</Text>
              </View>
            </View>

            {/* Skills Grid */}
            <View style={styles.skillsGrid}>
              {skills.map(skill => (
                <View key={skill.key} style={styles.skillItem}>
                  <Text style={styles.skillEmoji}>{skill.emoji}</Text>
                  <Text style={styles.skillLabel}>{skill.label}</Text>
                  <StarRating
                    rating={skill.rating}
                    onRatingChange={rating => handleRatingChange(skill.key, rating)}
                    size={20}
                  />
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <LinearGradient
                  colors={[colors.safe.primary, '#7BED9F']}
                  style={styles.saveBtnGradient}
                >
                  <Text style={styles.saveBtnText}>저장하기</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[5],
  },
  modalContainer: {
    width: '100%',
    maxWidth: 360,
  },
  modal: {
    backgroundColor: colors.background,
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    ...shadows.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Student Info
  studentInfo: {
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  studentAvatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  studentEmoji: {
    fontSize: 28,
  },
  studentName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  totalScore: {
    alignItems: 'center',
  },
  totalScoreValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.extrabold,
    color: colors.safe.primary,
  },
  totalScoreLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
  },

  // Skills Grid
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  skillItem: {
    width: (width - spacing[5] * 2 - spacing[6] * 2 - spacing[3]) / 2 - 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    alignItems: 'center',
  },
  skillEmoji: {
    fontSize: 24,
    marginBottom: spacing[2],
  },
  skillLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    marginBottom: spacing[2],
  },

  // Star Rating
  starContainer: {
    flexDirection: 'row',
    gap: 4,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  saveBtn: {
    flex: 1,
  },
  saveBtnGradient: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.background,
  },
});
