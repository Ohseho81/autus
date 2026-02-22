/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CoachHomeScreen - 코치 전용 홈 (출석 3버튼 + 2 액션)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 코치가 하는 일:
 * 1. 출석체크 (PRESENT / ABSENT / LATE - 3버튼 인라인)
 * 2. 출석체크 자동화 (AttendanceAuto)
 * 3. 영상 촬영/업로드 (VideoUpload)
 *
 * 그 외 모든 것은 시스템이 자동으로
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import { colors, typography, spacing, borderRadius, REFRESH_INTERVAL } from '../../utils/theme';
import { StaffStackParamList } from '../../navigation/AppNavigatorV2';
import { EncounterService, PresenceStatus, Encounter } from '../../lib/encounterService';
import { addBreadcrumb } from '../../lib/sentry';
import { eventService } from '../../services/eventService';
import { alimtalkService } from '../../services/alimtalkService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface CurrentClass {
  id: string;
  name: string;
  time: string;
  court: string;
  studentCount: number;
  checkedCount: number;
}

interface CoachInfo {
  name: string;
  todayClasses: number;
  completedClasses: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Students (until real class enrollment is available)
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_STUDENTS: { id: string; name: string }[] = [
  { id: 'student_001', name: '김민준' },
  { id: 'student_002', name: '이서윤' },
  { id: 'student_003', name: '박지호' },
  { id: 'student_004', name: '최수아' },
  { id: 'student_005', name: '정예준' },
  { id: 'student_006', name: '강하은' },
  { id: 'student_007', name: '조도현' },
  { id: 'student_008', name: '윤서연' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Presence colors
// ═══════════════════════════════════════════════════════════════════════════════

const PRESENCE_COLORS: Record<PresenceStatus, string> = {
  PRESENT: '#4CAF50',
  ABSENT: '#F44336',
  LATE: '#FF9800',
  PENDING: colors.surfaceTertiary,
};

const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  PRESENT: '출석',
  ABSENT: '결석',
  LATE: '지각',
  PENDING: '대기',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 큰 버튼 컴포넌트 (2개만)
// ═══════════════════════════════════════════════════════════════════════════════

interface BigActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel: string;
  color: string;
  gradientColors: [string, string];
  onPress: () => void;
  badge?: number;
}

const BigActionButton: React.FC<BigActionButtonProps> = React.memo(function BigActionButton({
  icon,
  label,
  sublabel,
  gradientColors,
  onPress,
  badge,
}) {
  return (
    <TouchableOpacity
      style={styles.bigButton}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={gradientColors}
        style={styles.bigButtonGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.bigButtonIcon}>
          <Ionicons name={icon} size={48} color="#fff" />
          {badge !== undefined && badge > 0 && (
            <View style={styles.bigButtonBadge}>
              <Text style={styles.bigButtonBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={styles.bigButtonLabel}>{label}</Text>
        <Text style={styles.bigButtonSublabel}>{sublabel}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// 현재 수업 카드
// ═══════════════════════════════════════════════════════════════════════════════

interface CurrentClassCardProps {
  currentClass: CurrentClass | null;
}

const CurrentClassCard: React.FC<CurrentClassCardProps> = React.memo(function CurrentClassCard({ currentClass }) {
  const progress = useMemo(
    () => currentClass && currentClass.studentCount > 0
      ? (currentClass.checkedCount / currentClass.studentCount) * 100
      : 0,
    [currentClass?.checkedCount, currentClass?.studentCount]
  );

  if (!currentClass) {
    return (
      <View style={styles.noClassCard}>
        <Ionicons name="time-outline" size={32} color={colors.text.muted} />
        <Text style={styles.noClassText}>현재 진행 중인 수업이 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={styles.currentClassCard}>
      <View style={styles.classHeader}>
        <View style={styles.classInfo}>
          <Text style={styles.className}>{currentClass.name}</Text>
          <Text style={styles.classDetail}>
            {currentClass.time} • {currentClass.court}
          </Text>
        </View>
        <View style={styles.classStats}>
          <Text style={styles.classStatsNum}>
            {currentClass.checkedCount}/{currentClass.studentCount}
          </Text>
          <Text style={styles.classStatsLabel}>출석</Text>
        </View>
      </View>

      {/* 출석 진행률 */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// StudentPresenceRow - 학생별 출석 버튼 3개
// ═══════════════════════════════════════════════════════════════════════════════

interface StudentPresenceRowProps {
  student: { id: string; name: string };
  currentStatus: PresenceStatus;
  onPresence: (studentId: string, status: PresenceStatus) => void;
}

const StudentPresenceRow: React.FC<StudentPresenceRowProps> = React.memo(
  function StudentPresenceRow({ student, currentStatus, onPresence }) {
    const statuses: PresenceStatus[] = ['PRESENT', 'ABSENT', 'LATE'];

    return (
      <View style={styles.studentRow}>
        <Text style={styles.studentName} numberOfLines={1}>
          {student.name}
        </Text>
        <View style={styles.presenceButtons}>
          {statuses.map((status) => {
            const isActive = currentStatus === status;
            const color = PRESENCE_COLORS[status];
            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.presenceButton,
                  isActive
                    ? { backgroundColor: color, borderColor: color }
                    : { backgroundColor: 'transparent', borderColor: color },
                ]}
                onPress={() => onPresence(student.id, status)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.presenceButtonText,
                    { color: isActive ? '#FFFFFF' : color },
                  ]}
                >
                  {PRESENCE_LABELS[status]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// AttendancePanel - 출석 체크 패널
// ═══════════════════════════════════════════════════════════════════════════════

interface AttendancePanelProps {
  students: { id: string; name: string }[];
  presenceMap: Record<string, PresenceStatus>;
  onPresence: (studentId: string, status: PresenceStatus) => void;
}

const AttendancePanel: React.FC<AttendancePanelProps> = React.memo(
  function AttendancePanel({ students, presenceMap, onPresence }) {
    const checkedCount = useMemo(() => {
      return students.filter((s) => {
        const status = presenceMap[s.id];
        return status && status !== 'PENDING';
      }).length;
    }, [students, presenceMap]);

    const renderStudent = useCallback(
      ({ item }: { item: { id: string; name: string } }) => (
        <StudentPresenceRow
          student={item}
          currentStatus={presenceMap[item.id] ?? 'PENDING'}
          onPresence={onPresence}
        />
      ),
      [presenceMap, onPresence],
    );

    const keyExtractor = useCallback((item: { id: string }) => item.id, []);

    return (
      <View style={styles.presencePanel}>
        {/* Header */}
        <View style={styles.presenceHeader}>
          <View style={styles.presenceHeaderLeft}>
            <Ionicons name="people" size={20} color={colors.text.primary} />
            <Text style={styles.presenceHeaderTitle}>출석 체크</Text>
          </View>
          <View style={styles.presenceCountBadge}>
            <Text style={styles.presenceCountText}>
              {checkedCount}/{students.length}
            </Text>
          </View>
        </View>

        {/* Student List */}
        <FlatList
          data={students}
          renderItem={renderStudent}
          keyExtractor={keyExtractor}
          style={styles.presenceList}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.studentSeparator} />}
        />
      </View>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export default function CoachHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffStackParamList>>();
  const [currentClass, setCurrentClass] = useState<CurrentClass | null>(null);
  const [coachInfo, setCoachInfo] = useState<CoachInfo>({
    name: '박코치',
    todayClasses: 5,
    completedClasses: 2,
  });

  // Encounter / Presence state
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceStatus>>({});

  // 현재 수업 로드
  const loadCurrentClass = useCallback(async () => {
    // 실제로는 API 호출
    // 현재 시간 기준 진행 중인 수업 조회
    const now = new Date();
    const hour = now.getHours();

    // Mock: 17시~18시 30분 수업 중
    if (hour >= 17 && hour < 19) {
      setCurrentClass({
        id: 'class_001',
        name: '초5,6부',
        time: '17:00~18:30',
        court: 'A코트',
        studentCount: 12,
        checkedCount: 8,
      });
    } else {
      setCurrentClass(null);
    }

    // Try to load real encounter data
    try {
      const encounters = await EncounterService.getTodayEncounters('coach_001');
      const activeEnc = encounters.find(e => e.status === 'IN_PROGRESS' || e.status === 'SCHEDULED');
      if (activeEnc) {
        setEncounter(activeEnc);
        const classStudents = await EncounterService.getEncounterStudents(activeEnc.id);
        if (classStudents.length > 0) {
          setStudents(classStudents.map(s => ({ id: s.id, name: s.name })));
        } else {
          // Fallback to mock students until real enrollment data exists
          setStudents(MOCK_STUDENTS);
        }
      } else {
        // No real encounter -- use mock students when there is a class
        if (hour >= 17 && hour < 19) {
          setStudents(MOCK_STUDENTS);
        } else {
          setStudents([]);
        }
      }
    } catch {
      // Fallback: use mock students when there is a current class
      if (hour >= 17 && hour < 19) {
        setStudents(MOCK_STUDENTS);
      }
    }
  }, []);

  useEffect(() => {
    loadCurrentClass();
    const interval = setInterval(loadCurrentClass, REFRESH_INTERVAL); // 30초마다 갱신
    return () => clearInterval(interval);
  }, [loadCurrentClass]);

  // 출석 상태 변경 핸들러
  const handlePresence = useCallback(
    async (studentId: string, status: PresenceStatus) => {
      // Haptic feedback
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // Haptics may not be available in simulator
      }

      // Optimistic update
      setPresenceMap((prev) => ({
        ...prev,
        [studentId]: status,
      }));

      // Update checkedCount on currentClass
      setCurrentClass((prev) => {
        if (!prev) return prev;
        const newPresenceMap = { ...presenceMap, [studentId]: status };
        const checkedCount = Object.values(newPresenceMap).filter(
          (s) => s && s !== 'PENDING',
        ).length;
        return { ...prev, checkedCount };
      });

      // Persist to backend if we have a real encounter
      if (encounter) {
        addBreadcrumb(`Attendance: ${status}`, 'attendance', { studentId, encounterId: encounter.id });
        const success = await EncounterService.recordPresence(
          encounter.id,
          studentId,
          status,
          encounter.coach_id,
        );

        // 🔥 AUTUS Event Ledger: V-Index 자동 업데이트
        if (success) {
          const eventStatus = status === 'PRESENT' ? 'present' : status === 'ABSENT' ? 'absent' : 'late';
          await eventService.logAttendance(studentId, eventStatus, {
            encounter_id: encounter.id,
            coach_id: encounter.coach_id,
            class_name: currentClass?.name,
          });

          // 📱 알림톡 발송 (출석 확인)
          try {
            const student = students.find((s) => s.id === studentId);
            if (student?.phone) {
              const now = new Date();
              const timeStr = now.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              // 출석 확인 알림 발송
              if (status === 'PRESENT') {
                await alimtalkService.sendAttendanceConfirm(studentId, student.phone, {
                  name: student.name,
                  class_name: currentClass?.name || '수업',
                  time: timeStr,
                  attendance_count: student.attendance_count || 1,
                });
              }
              // 결석 알림 발송
              else if (status === 'ABSENT') {
                await alimtalkService.sendAbsenceNotice(studentId, student.phone, {
                  name: student.name,
                  class_name: currentClass?.name || '수업',
                  makeup_link: 'https://onlyssam.com/makeup', // TODO: 실제 링크로 변경
                });
              }
              // 지각 알림 발송
              else if (status === 'LATE') {
                await alimtalkService.sendLateNotice(studentId, student.phone, {
                  name: student.name,
                  class_name: currentClass?.name || '수업',
                  time: timeStr,
                });
              }
            }
          } catch (notificationError: unknown) {
            // 알림 실패는 무시 (출석 기록은 성공)
            if (__DEV__) console.warn('[CoachHomeScreen] Notification error:', notificationError);
          }
        }

        if (!success) {
          // Revert on failure
          Alert.alert('오류', '출석 기록에 실패했습니다. 다시 시도해주세요.');
          setPresenceMap((prev) => {
            const reverted = { ...prev };
            delete reverted[studentId];
            return reverted;
          });
        }
      }
    },
    [encounter, presenceMap],
  );

  // 출석체크 이동
  const handleAttendance = useCallback(() => {
    navigation.navigate('AttendanceAuto');
  }, [navigation]);

  // 영상업로드 이동
  const handleVideoUpload = useCallback(() => {
    navigation.navigate('VideoUpload');
  }, [navigation]);

  // Determine if attendance panel should show
  const showAttendancePanel = currentClass !== null && students.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 - 최소화 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>🔥 Hot Reload 테스트! {coachInfo.name}님</Text>
          <Text style={styles.subgreeting}>
            오늘 {coachInfo.completedClasses}/{coachInfo.todayClasses} 수업 완료
          </Text>
        </View>
        <View style={styles.todayBadge}>
          <Text style={styles.todayText}>
            {new Date().toLocaleDateString('ko-KR', { weekday: 'short', month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>

      {/* 현재 수업 */}
      <CurrentClassCard currentClass={currentClass} />

      {/* 출석 체크 패널 - 수업 진행 중일 때만 표시 */}
      {showAttendancePanel && (
        <AttendancePanel
          students={students}
          presenceMap={presenceMap}
          onPresence={handlePresence}
        />
      )}

      {/* 2개 버튼만 */}
      <View style={styles.actionContainer}>
        <Text style={styles.sectionTitle}>오늘 할 일</Text>

        <View style={styles.buttonRow}>
          {/* 출석체크 */}
          <BigActionButton
            icon="keypad"
            label="출석체크"
            sublabel={currentClass ? `${currentClass.studentCount - currentClass.checkedCount}명 대기` : '수업 없음'}
            color={colors.caution.primary}
            gradientColors={['#FF9500', '#FF7B00']}
            onPress={handleAttendance}
            badge={currentClass ? currentClass.studentCount - currentClass.checkedCount : 0}
          />

          {/* 영상업로드 */}
          <BigActionButton
            icon="videocam"
            label="영상업로드"
            sublabel="촬영 후 업로드"
            color={colors.apple.blue}
            gradientColors={['#2196F3', '#1976D2']}
            onPress={handleVideoUpload}
          />
        </View>
      </View>

      {/* 안내 메시지 */}
      <View style={styles.guideCard}>
        <Ionicons name="information-circle" size={20} color={colors.success.primary} />
        <Text style={styles.guideText}>
          출석과 영상만 하세요. 나머지는 시스템이 알아서 합니다.
        </Text>
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
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
  },
  subgreeting: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 4,
  },
  todayBadge: {
    backgroundColor: colors.caution.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  todayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  // 현재 수업 카드
  currentClassCard: {
    margin: 20,
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  noClassCard: {
    margin: 20,
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  noClassText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.text.muted,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  classInfo: {},
  className: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  classDetail: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 4,
  },
  classStats: {
    alignItems: 'flex-end',
  },
  classStatsNum: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.caution.primary,
  },
  classStatsLabel: {
    fontSize: 12,
    color: colors.text.muted,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success.primary,
    width: 45,
    textAlign: 'right',
  },

  // ═══════════════════════════════════════════════════════════════
  // 출석 체크 패널
  // ═══════════════════════════════════════════════════════════════
  presencePanel: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    maxHeight: 300,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  presenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  presenceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presenceHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
  },
  presenceCountBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  presenceCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  presenceList: {
    flexGrow: 0,
  },

  // ═══════════════════════════════════════════════════════════════
  // 학생 행
  // ═══════════════════════════════════════════════════════════════
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    paddingHorizontal: 4,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    marginRight: 12,
  },
  studentSeparator: {
    height: 0.5,
    backgroundColor: colors.border.primary,
  },

  // ═══════════════════════════════════════════════════════════════
  // 출석 버튼 (3개: PRESENT / ABSENT / LATE)
  // ═══════════════════════════════════════════════════════════════
  presenceButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  presenceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presenceButtonText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // 액션 영역
  actionContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  bigButton: {
    flex: 1,
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  bigButtonGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigButtonIcon: {
    position: 'relative',
    marginBottom: 12,
  },
  bigButtonBadge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: '#F44336',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  bigButtonBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  bigButtonLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  bigButtonSublabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },

  // 가이드
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    marginTop: 0,
    padding: 16,
    backgroundColor: colors.success.bg,
    borderRadius: 12,
    gap: 10,
  },
  guideText: {
    flex: 1,
    fontSize: 13,
    color: colors.success.primary,
    lineHeight: 18,
  },
});
