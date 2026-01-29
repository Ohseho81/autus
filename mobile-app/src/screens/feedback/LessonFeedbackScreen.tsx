/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎬 LessonFeedbackScreen - 영상 피드백 시스템
 * 영상 업로드 + 스킬 평가 + AI 분석 + 코치 코멘트
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography, borderRadius } from '../../utils/theme';
import Header from '../../components/common/Header';
import { GlassCard } from '../../components/common';
import { SkillRating } from '../../types/lesson';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RouteParams = {
  LessonFeedback: {
    lessonId: string;
  };
};

interface VideoItem {
  id: string;
  thumbnail: string;
  duration: number;
  title: string;
}

interface SkillItem {
  key: string;
  label: string;
  icon: string;
  rating: number;
  previousRating?: number;
}

const skillOptions: Omit<SkillItem, 'rating' | 'previousRating'>[] = [
  { key: 'dribble', label: '드리블', icon: 'basketball' },
  { key: 'shoot', label: '슛', icon: 'flame' },
  { key: 'pass', label: '패스', icon: 'git-merge' },
  { key: 'defense', label: '수비', icon: 'shield' },
  { key: 'stamina', label: '체력', icon: 'heart' },
  { key: 'teamwork', label: '협동', icon: 'people' },
];

export default function LessonFeedbackScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'LessonFeedback'>>();
  const { lessonId } = route.params;

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>(
    skillOptions.map(s => ({ ...s, rating: 0, previousRating: 3 }))
  );
  const [coachComment, setCoachComment] = useState('');
  const [shareWithParent, setShareWithParent] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const handleAddVideo = () => {
    // Mock video picker
    Alert.alert(
      '영상 추가',
      '영상을 어떻게 추가하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '촬영',
          onPress: () => {
            const newVideo: VideoItem = {
              id: Date.now().toString(),
              thumbnail: 'https://via.placeholder.com/200x120',
              duration: 15,
              title: `클립 ${videos.length + 1}`,
            };
            setVideos(prev => [...prev, newVideo]);
          },
        },
        {
          text: '갤러리',
          onPress: () => {
            const newVideo: VideoItem = {
              id: Date.now().toString(),
              thumbnail: 'https://via.placeholder.com/200x120',
              duration: 30,
              title: `클립 ${videos.length + 1}`,
            };
            setVideos(prev => [...prev, newVideo]);
          },
        },
      ]
    );
  };

  const handleRemoveVideo = (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  const setSkillRating = (key: string, rating: number) => {
    setSkills(prev => prev.map(s =>
      s.key === key ? { ...s, rating } : s
    ));
  };

  const handleAiAnalysis = () => {
    if (videos.length === 0) {
      Alert.alert('알림', '분석할 영상을 먼저 추가해주세요.');
      return;
    }

    setIsAnalyzing(true);

    // Mock AI analysis
    setTimeout(() => {
      setAiAnalysis(
        '📊 AI 분석 결과\n\n' +
        '✅ 드리블 시 무릎 굽힘이 좋아졌습니다. (이전 대비 +15%)\n' +
        '⚠️ 슛 동작에서 팔꿈치가 벌어지는 경향이 있습니다.\n' +
        '💡 추천: 벽에서 한 손 슛 연습 10분씩 추가하세요.'
      );
      setIsAnalyzing(false);
    }, 2000);
  };

  const handleSave = () => {
    const ratedSkills = skills.filter(s => s.rating > 0);

    if (ratedSkills.length === 0 && !coachComment && videos.length === 0) {
      Alert.alert('알림', '피드백 내용을 입력해주세요.');
      return;
    }

    Alert.alert(
      '피드백 저장',
      shareWithParent
        ? '피드백이 저장되고 학부모에게 공유됩니다.'
        : '피드백이 저장됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '저장',
          onPress: () => {
            Alert.alert('완료', '피드백이 저장되었습니다.', [
              { text: '확인', onPress: () => navigation.goBack() },
            ]);
          },
        },
      ]
    );
  };

  const renderStarRating = (skill: SkillItem) => {
    const trend = skill.previousRating
      ? skill.rating > skill.previousRating
        ? 'up'
        : skill.rating < skill.previousRating
        ? 'down'
        : 'same'
      : 'same';

    return (
      <View style={styles.skillRow} key={skill.key}>
        <View style={styles.skillInfo}>
          <View style={styles.skillIcon}>
            <Ionicons name={skill.icon as any} size={18} color={colors.safe.primary} />
          </View>
          <Text style={styles.skillLabel}>{skill.label}</Text>
        </View>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setSkillRating(skill.key, star)}
            >
              <Ionicons
                name={star <= skill.rating ? 'star' : 'star-outline'}
                size={24}
                color={star <= skill.rating ? colors.caution.primary : colors.textMuted}
              />
            </TouchableOpacity>
          ))}
          {skill.rating > 0 && trend !== 'same' && (
            <View style={[
              styles.trendBadge,
              { backgroundColor: trend === 'up' ? colors.success.bg : colors.danger.bg },
            ]}>
              <Ionicons
                name={trend === 'up' ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={trend === 'up' ? colors.success.primary : colors.danger.primary}
              />
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background, colors.surface, colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <Header
        leftIcon="close"
        onLeftPress={() => navigation.goBack()}
        title="레슨 피드백"
        rightIcon="checkmark"
        onRightPress={handleSave}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Video Section */}
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="videocam" size={20} color={colors.caution.primary} />
            <Text style={styles.sectionTitle}>영상 피드백</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.videoScroll}
          >
            {/* Add Video Button */}
            <TouchableOpacity style={styles.addVideoButton} onPress={handleAddVideo}>
              <Ionicons name="add-circle" size={32} color={colors.safe.primary} />
              <Text style={styles.addVideoText}>영상 추가</Text>
            </TouchableOpacity>

            {/* Video Items */}
            {videos.map((video) => (
              <View key={video.id} style={styles.videoItem}>
                <View style={styles.videoThumbnail}>
                  <Ionicons name="play-circle" size={32} color={colors.text} />
                  <Text style={styles.videoDuration}>{video.duration}초</Text>
                </View>
                <Text style={styles.videoTitle} numberOfLines={1}>{video.title}</Text>
                <TouchableOpacity
                  style={styles.removeVideoButton}
                  onPress={() => handleRemoveVideo(video.id)}
                >
                  <Ionicons name="close-circle" size={20} color={colors.danger.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* AI Analysis Button */}
          {videos.length > 0 && (
            <TouchableOpacity
              style={styles.aiButton}
              onPress={handleAiAnalysis}
              disabled={isAnalyzing}
            >
              <Ionicons
                name={isAnalyzing ? 'sync' : 'sparkles'}
                size={18}
                color={colors.caution.primary}
              />
              <Text style={styles.aiButtonText}>
                {isAnalyzing ? 'AI 분석 중...' : 'AI 자동 분석'}
              </Text>
            </TouchableOpacity>
          )}

          {/* AI Analysis Result */}
          {aiAnalysis && (
            <View style={styles.aiResult}>
              <Text style={styles.aiResultText}>{aiAnalysis}</Text>
            </View>
          )}
        </GlassCard>

        {/* Skill Rating Section */}
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="stats-chart" size={20} color={colors.success.primary} />
            <Text style={styles.sectionTitle}>스킬 평가</Text>
          </View>

          {skills.map(renderStarRating)}
        </GlassCard>

        {/* Coach Comment Section */}
        <GlassCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="create" size={20} color={colors.safe.primary} />
            <Text style={styles.sectionTitle}>코치 코멘트</Text>
          </View>

          <TextInput
            style={styles.commentInput}
            placeholder="오늘 레슨에 대한 피드백을 작성하세요..."
            placeholderTextColor={colors.textDim}
            value={coachComment}
            onChangeText={setCoachComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Quick Comments */}
          <View style={styles.quickComments}>
            {[
              '오늘 집중력이 좋았습니다! 👍',
              '기본기 연습을 더 해주세요',
              '다음 시간에 게임 연습 예정',
            ].map((comment, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickCommentChip}
                onPress={() => setCoachComment(prev => prev ? `${prev}\n${comment}` : comment)}
              >
                <Text style={styles.quickCommentText}>{comment}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        {/* Share Settings */}
        <GlassCard style={styles.section}>
          <TouchableOpacity
            style={styles.shareRow}
            onPress={() => setShareWithParent(!shareWithParent)}
          >
            <View style={styles.shareInfo}>
              <Ionicons name="share-social" size={20} color={colors.safe.primary} />
              <View style={styles.shareText}>
                <Text style={styles.shareTitle}>학부모에게 공유</Text>
                <Text style={styles.shareDesc}>저장 시 학부모 앱으로 알림 발송</Text>
              </View>
            </View>
            <View style={[styles.toggle, shareWithParent && styles.toggleActive]}>
              <View style={[styles.toggleKnob, shareWithParent && styles.toggleKnobActive]} />
            </View>
          </TouchableOpacity>
        </GlassCard>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <LinearGradient
            colors={[colors.safe.primary, '#0099CC']}
            style={styles.saveButtonGradient}
          >
            <Ionicons name="checkmark" size={20} color={colors.background} />
            <Text style={styles.saveButtonText}>피드백 저장</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing[4] },

  // Section
  section: { marginBottom: spacing[4] },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },

  // Video
  videoScroll: {
    gap: spacing[3],
    paddingBottom: spacing[2],
  },
  addVideoButton: {
    width: 120,
    height: 90,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.safe.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.safe.bg,
  },
  addVideoText: {
    fontSize: typography.fontSize.sm,
    color: colors.safe.primary,
    marginTop: spacing[1],
  },
  videoItem: {
    width: 120,
    position: 'relative',
  },
  videoThumbnail: {
    width: 120,
    height: 90,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoDuration: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    fontSize: typography.fontSize.xs,
    color: colors.text,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  videoTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text,
    marginTop: spacing[1],
  },
  removeVideoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.caution.bg,
    marginTop: spacing[3],
  },
  aiButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    color: colors.caution.primary,
  },
  aiResult: {
    marginTop: spacing[3],
    padding: spacing[3],
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.caution.primary,
  },
  aiResultText: {
    fontSize: typography.fontSize.sm,
    color: colors.text,
    lineHeight: 22,
  },

  // Skills
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  skillInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  skillIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.safe.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skillLabel: {
    fontSize: typography.fontSize.md,
    color: colors.text,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  trendBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing[1],
  },

  // Comment
  commentInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    fontSize: typography.fontSize.md,
    color: colors.text,
    minHeight: 100,
  },
  quickComments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  quickCommentChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickCommentText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },

  // Share
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shareInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  shareText: {},
  shareTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  shareDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.safe.bg,
    borderColor: colors.safe.primary,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.textMuted,
  },
  toggleKnobActive: {
    backgroundColor: colors.safe.primary,
    alignSelf: 'flex-end',
  },

  // Bottom
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
