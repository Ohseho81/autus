/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎬 Video Upload Screen - 코치 영상 업로드 (단순화)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 철학: "촬영 → 업로드 → 끝. 나머지는 시스템이 알아서"
 *
 * 코치가 하는 것:
 * 1. 영상 촬영/선택
 * 2. 학생 선택 (선택사항)
 * 3. 업로드 버튼 클릭
 *
 * 시스템이 하는 것:
 * - 영상 압축 최적화
 * - 학부모 알림 발송
 * - 클라우드 저장
 * - 메타데이터 태깅
 * - 분석용 데이터 수집
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../../utils/theme';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import personalAIService from '../../services/PersonalAIService';
import type { StaffStackParamList } from '../../navigation/AppNavigatorV2';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface Student {
  id: string;
  name: string;
  number: number;
}

interface UploadProgress {
  stage: 'selecting' | 'compressing' | 'uploading' | 'notifying' | 'complete';
  progress: number;
  message: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const UPLOAD_STAGES: Record<UploadProgress['stage'], { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  selecting: { icon: 'videocam', label: '영상 선택' },
  compressing: { icon: 'resize', label: '최적화 중...' },
  uploading: { icon: 'cloud-upload', label: '업로드 중...' },
  notifying: { icon: 'notifications', label: '학부모 알림 중...' },
  complete: { icon: 'checkmark-circle', label: '완료!' },
};

// Mock data - 실제로는 현재 수업의 학생 목록
const MOCK_STUDENTS: Student[] = [
  { id: '1', name: '김민준', number: 1 },
  { id: '2', name: '이서윤', number: 2 },
  { id: '3', name: '박지호', number: 3 },
  { id: '4', name: '최서아', number: 4 },
  { id: '5', name: '정하준', number: 5 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function VideoUploadScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSelectVideo = async () => {
    // TODO: 실제 구현 - expo-image-picker 사용
    // const result = await ImagePicker.launchImageLibraryAsync({
    //   mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    //   allowsEditing: true,
    //   quality: 1,
    // });

    // Mock: 영상 선택됨
    setSelectedVideo('mock_video_uri');
    Alert.alert('영상 선택됨', '영상이 선택되었습니다. (데모)');
  };

  const handleRecordVideo = async () => {
    // TODO: 실제 구현 - expo-camera 사용
    // const result = await ImagePicker.launchCameraAsync({
    //   mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    //   allowsEditing: true,
    //   quality: 1,
    // });

    // Mock: 영상 촬영됨
    setSelectedVideo('mock_recorded_video_uri');
    Alert.alert('촬영 완료', '영상이 촬영되었습니다. (데모)');
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === MOCK_STUDENTS.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(MOCK_STUDENTS.map(s => s.id));
    }
  };

  const handleUpload = async () => {
    if (!selectedVideo) {
      Alert.alert('영상 필요', '먼저 영상을 선택하거나 촬영해주세요.');
      return;
    }

    // 업로드 프로세스 시뮬레이션 (실제로는 백그라운드에서 처리)
    const stages: UploadProgress['stage'][] = ['compressing', 'uploading', 'notifying', 'complete'];

    for (let i = 0; i < stages.length; i++) {
      setUploadProgress({
        stage: stages[i],
        progress: ((i + 1) / stages.length) * 100,
        message: UPLOAD_STAGES[stages[i]].label,
      });

      // 각 단계 시뮬레이션 (실제로는 실제 작업)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Personal AI 로그
    try {
      await personalAIService.logEvent('VIDEO_UPLOAD', {
        videoUrl: selectedVideo,
        studentIds: selectedStudents
      });
    } catch { /* ignore */ }

    // 완료 후 초기화
    setTimeout(() => {
      setUploadProgress(null);
      setSelectedVideo(null);
      setSelectedStudents([]);
      Alert.alert(
        '업로드 완료! 🎉',
        '영상이 업로드되었습니다.\n학부모에게 알림이 발송되었습니다.',
        [{ text: '확인', onPress: () => navigation.goBack() }]
      );
    }, 500);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  // 업로드 진행 중 화면
  if (uploadProgress) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.uploadingContainer}>
          <View style={styles.uploadingIcon}>
            <Ionicons
              name={UPLOAD_STAGES[uploadProgress.stage].icon}
              size={64}
              color={uploadProgress.stage === 'complete' ? colors.safe.primary : colors.status.warning.primary}
            />
          </View>
          <Text style={styles.uploadingTitle}>{uploadProgress.message}</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${uploadProgress.progress}%` }]} />
          </View>
          <Text style={styles.uploadingSubtitle}>
            잠시만 기다려주세요. 자동으로 처리됩니다.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>영상 업로드</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: 영상 선택/촬영 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. 영상 선택</Text>
          <View style={styles.videoButtons}>
            <TouchableOpacity
              style={[styles.videoButton, selectedVideo ? styles.videoButtonSelected : undefined]}
              onPress={handleRecordVideo}
            >
              <Ionicons name="videocam" size={48} color={colors.safe.primary} />
              <Text style={styles.videoButtonText}>촬영하기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.videoButton, selectedVideo ? styles.videoButtonSelected : undefined]}
              onPress={handleSelectVideo}
            >
              <Ionicons name="folder-open" size={48} color={colors.status.info.primary} />
              <Text style={styles.videoButtonText}>갤러리에서</Text>
            </TouchableOpacity>
          </View>
          {selectedVideo && (
            <View style={styles.selectedVideoIndicator}>
              <Ionicons name="checkmark-circle" size={20} color={colors.safe.primary} />
              <Text style={styles.selectedVideoText}>영상 선택됨</Text>
            </View>
          )}
        </View>

        {/* Step 2: 학생 선택 (선택사항) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>2. 학생 선택 (선택)</Text>
            <TouchableOpacity onPress={selectAllStudents}>
              <Text style={styles.selectAllText}>
                {selectedStudents.length === MOCK_STUDENTS.length ? '전체 해제' : '전체 선택'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>
            선택하지 않으면 전체 학생에게 공유됩니다
          </Text>
          <View style={styles.studentGrid}>
            {MOCK_STUDENTS.map(student => (
              <TouchableOpacity
                key={student.id}
                style={[
                  styles.studentChip,
                  selectedStudents.includes(student.id) && styles.studentChipSelected
                ]}
                onPress={() => toggleStudentSelection(student.id)}
              >
                <Text style={[
                  styles.studentNumber,
                  selectedStudents.includes(student.id) && styles.studentNumberSelected
                ]}>
                  {student.number}
                </Text>
                <Text style={[
                  styles.studentName,
                  selectedStudents.includes(student.id) && styles.studentNameSelected
                ]}>
                  {student.name}
                </Text>
                {selectedStudents.includes(student.id) && (
                  <Ionicons name="checkmark" size={16} color={colors.white} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 안내 메시지 */}
        <View style={styles.guideSection}>
          <Ionicons name="information-circle" size={24} color={colors.text.muted} />
          <Text style={styles.guideText}>
            업로드만 하세요.{'\n'}
            압축, 저장, 학부모 알림은 자동입니다.
          </Text>
        </View>
      </ScrollView>

      {/* Upload Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.uploadButton, !selectedVideo && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={!selectedVideo}
        >
          <Ionicons name="cloud-upload" size={24} color={colors.white} />
          <Text style={styles.uploadButtonText}>업로드</Text>
        </TouchableOpacity>
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  backButton: {
    padding: spacing[2],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    padding: spacing[4],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[2],
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: spacing[3],
  },
  selectAllText: {
    fontSize: 14,
    color: colors.safe.primary,
    fontWeight: '600',
  },
  videoButtons: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  videoButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border.primary,
  },
  videoButtonSelected: {
    borderColor: colors.safe.primary,
    backgroundColor: `${colors.safe.primary}10`,
  },
  videoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing[2],
  },
  selectedVideoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
    padding: spacing[2],
    backgroundColor: `${colors.safe.primary}20`,
    borderRadius: borderRadius.lg,
  },
  selectedVideoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.safe.primary,
  },
  studentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  studentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  studentChipSelected: {
    backgroundColor: colors.safe.primary,
    borderColor: colors.safe.primary,
  },
  studentNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.muted,
    backgroundColor: colors.background,
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  studentNumberSelected: {
    backgroundColor: colors.white,
    color: colors.safe.primary,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  studentNameSelected: {
    color: colors.white,
  },
  guideSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginTop: spacing[4],
  },
  guideText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.muted,
    lineHeight: 22,
  },
  footer: {
    padding: spacing[4],
    paddingBottom: spacing[6],
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.safe.primary,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
  },
  uploadButtonDisabled: {
    backgroundColor: colors.text.disabled,
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  // Uploading state
  uploadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
  },
  uploadingIcon: {
    marginBottom: spacing[6],
  },
  uploadingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing[4],
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing[4],
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.safe.primary,
    borderRadius: 4,
  },
  uploadingSubtitle: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
  },
});
