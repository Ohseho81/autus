/**
 * QRScannerScreen.tsx
 * 코치/키오스크용 QR 출석 스캐너
 * - 수납 상태 실시간 체크
 * - 출석 기록 + 자동 차감
 * - 체인 반응 트리거 (알림, 성장 기록)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// Supabase
import { supabase } from '../../lib/supabase';

// Types
import { AttendanceRecord, Student, LessonSlot } from '../../types/attendance';

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = Math.min(width * 0.7, 280);

// Theme
const THEME = {
  background: '#0D1117',
  surface: '#161B22',
  primary: '#FF6B35',
  primaryLight: '#FF8C42',
  success: '#2ED573',
  error: '#FF6B6B',
  warning: '#FFB347',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
  border: 'rgba(255,255,255,0.08)',
};

interface ScanResult {
  success: boolean;
  student?: Student;
  message: string;
  details?: {
    lessonName: string;
    remainingLessons: number;
    parentNotified: boolean;
  };
}

const QRScannerScreen: React.FC = () => {
  const navigation = useNavigation();

  // States
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [todayLessons, setTodayLessons] = useState<LessonSlot[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Animations
  const scanLineAnim = React.useRef(new Animated.Value(0)).current;
  const resultAnim = React.useRef(new Animated.Value(0)).current;

  // Request camera permission
  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Scan line animation
  useEffect(() => {
    const animate = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    animate();
  }, []);

  // Fetch today's lessons
  useEffect(() => {
    fetchTodayLessons();
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchTodayLessons = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('lesson_slots')
      .select('*')
      .eq('date', today)
      .order('start_time', { ascending: true });

    if (data) {
      setTodayLessons(data);
    }
  };

  /**
   * QR 스캔 핸들러
   * 1. QR 파싱 → student_id 추출
   * 2. 수납 상태 체크
   * 3. 출석 기록 생성
   * 4. 체인 반응 트리거
   */
  const handleBarCodeScanned = useCallback(async ({ type, data }: BarCodeScannerResult) => {
    if (scanned || scanning) return;

    setScanning(true);
    setScanned(true);
    Vibration.vibrate(100);

    try {
      // 1. QR 데이터 파싱 (format: "ATB-{student_id}-{timestamp}")
      const qrParts = data.split('-');
      if (qrParts[0] !== 'ATB' || qrParts.length < 3) {
        throw new Error('유효하지 않은 QR 코드입니다');
      }
      const studentId = qrParts[1];

      // 2. 학생 정보 + 수납 상태 조회
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          *,
          payments:student_payments(
            paid,
            remaining_lessons,
            package_name
          )
        `)
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        throw new Error('학생 정보를 찾을 수 없습니다');
      }

      // 3. 수납 상태 체크
      const latestPayment = student.payments?.[0];
      if (!latestPayment?.paid) {
        setScanResult({
          success: false,
          student,
          message: '미납 상태입니다',
        });

        // 미납 알림 전송
        await sendUnpaidNotification(student);
        showResultAnimation();
        return;
      }

      // 4. 현재 레슨 슬롯 확인
      const currentLesson = getCurrentLessonSlot();
      if (!currentLesson) {
        throw new Error('현재 진행 중인 레슨이 없습니다');
      }

      // 5. 출석 기록 생성
      const { error: attendanceError } = await supabase
        .from('attendance_records')
        .insert({
          student_id: studentId,
          lesson_slot_id: currentLesson.id,
          check_in_time: new Date().toISOString(),
          status: 'present',
          verified_by: 'qr_scan',
        });

      if (attendanceError) {
        throw new Error('출석 기록 실패');
      }

      // 6. 레슨 차감
      const newRemaining = latestPayment.remaining_lessons - 1;
      await supabase
        .from('student_payments')
        .update({ remaining_lessons: newRemaining })
        .eq('student_id', studentId)
        .eq('paid', true);

      // 7. 체인 반응 트리거 (Edge Function 호출)
      await triggerChainReaction(studentId, currentLesson.id);

      // 8. 성공 결과 표시
      setScanResult({
        success: true,
        student,
        message: '출석 완료!',
        details: {
          lessonName: currentLesson.name,
          remainingLessons: newRemaining,
          parentNotified: true,
        },
      });

      showResultAnimation();

    } catch (error: any) {
      setScanResult({
        success: false,
        message: error.message || '스캔 실패',
      });
      showResultAnimation();
    } finally {
      setScanning(false);
    }
  }, [scanned, scanning]);

  // 현재 레슨 슬롯 찾기
  const getCurrentLessonSlot = (): LessonSlot | null => {
    const now = currentTime;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    return todayLessons.find(lesson => {
      const start = lesson.start_time;
      const end = lesson.end_time;
      // 레슨 시작 30분 전부터 출석 가능
      const earlyStart = subtractMinutes(start, 30);
      return currentTimeStr >= earlyStart && currentTimeStr <= end;
    }) || null;
  };

  // 미납 알림 전송
  const sendUnpaidNotification = async (student: Student) => {
    await supabase.functions.invoke('send-notification', {
      body: {
        type: 'unpaid_attendance_attempt',
        student_id: student.id,
        parent_phone: student.parent_phone,
        message: `[ATB Hub] ${student.name} 학생이 출석 시도했으나 미납 상태입니다. 결제 후 재시도해주세요.`,
      },
    });
  };

  // 체인 반응 트리거
  const triggerChainReaction = async (studentId: string, lessonSlotId: string) => {
    await supabase.functions.invoke('attendance-chain-reaction', {
      body: {
        student_id: studentId,
        lesson_slot_id: lessonSlotId,
        actions: [
          'send_parent_notification',
          'update_growth_log',
          'prepare_feedback_session',
        ],
      },
    });
  };

  // 결과 애니메이션
  const showResultAnimation = () => {
    Animated.spring(resultAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 10,
    }).start();
  };

  // 리셋
  const resetScanner = () => {
    resultAnim.setValue(0);
    setScanned(false);
    setScanResult(null);
  };

  // 시간 계산 헬퍼
  const subtractMinutes = (time: string, minutes: number): string => {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m - minutes;
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  };

  // Permission states
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>카메라 권한 요청 중...</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-off" size={64} color={THEME.error} />
        <Text style={styles.permissionText}>카메라 권한이 필요합니다</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => BarCodeScanner.requestPermissionsAsync()}
        >
          <Text style={styles.permissionButtonText}>권한 허용</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={THEME.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>ATB Hub</Text>
          <Text style={styles.subtitle}>📍 대치 Red Court</Text>
        </View>
        <TouchableOpacity onPress={fetchTodayLessons}>
          <Ionicons name="refresh" size={24} color={THEME.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Scanner */}
      <View style={styles.scannerContainer}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Scan Area */}
          <View style={styles.scanArea}>
            {/* Corners */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Scan Line */}
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [{
                    translateY: scanLineAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, SCAN_AREA_SIZE - 4],
                    }),
                  }],
                },
              ]}
            />
          </View>

          {/* Instructions */}
          <Text style={styles.instruction}>QR 코드를 스캔하세요</Text>
          <Text style={styles.subInstruction}>앱에서 QR 코드를 띄워주세요</Text>
        </View>
      </View>

      {/* Today's Lessons */}
      <View style={styles.lessonsContainer}>
        <Text style={styles.lessonsTitle}>
          <Ionicons name="calendar" size={16} color={THEME.primary} /> 오늘 레슨
        </Text>
        {todayLessons.map((lesson, index) => {
          const isCurrentSlot = getCurrentLessonSlot()?.id === lesson.id;
          return (
            <View
              key={lesson.id}
              style={[styles.lessonSlot, isCurrentSlot && styles.lessonSlotActive]}
            >
              <Text style={styles.lessonTime}>{lesson.start_time}</Text>
              <View style={styles.lessonInfo}>
                <Text style={styles.lessonName}>{lesson.name}</Text>
                <Text style={styles.lessonCount}>
                  {lesson.current_count}/{lesson.max_count}명
                </Text>
              </View>
              <View style={[
                styles.lessonStatus,
                isCurrentSlot ? styles.statusNow : styles.statusNext
              ]}>
                <Text style={styles.statusText}>
                  {isCurrentSlot ? '진행중' : index === 0 ? '다음' : ''}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Result Overlay */}
      {scanResult && (
        <Animated.View
          style={[
            styles.resultOverlay,
            {
              opacity: resultAnim,
              transform: [{
                scale: resultAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              }],
            },
          ]}
        >
          <View style={styles.resultCard}>
            {scanResult.success ? (
              <>
                {/* Success State */}
                <LinearGradient
                  colors={[THEME.primary, THEME.primaryLight]}
                  style={styles.resultAvatar}
                >
                  <Text style={styles.avatarEmoji}>⚽</Text>
                </LinearGradient>
                <Text style={styles.resultName}>{scanResult.student?.name}</Text>
                <Text style={styles.resultClass}>
                  {scanResult.details?.lessonName} • U-10
                </Text>

                <View style={styles.successIcon}>
                  <Ionicons name="checkmark" size={48} color={THEME.background} />
                </View>
                <Text style={styles.successText}>출석 완료!</Text>
                <Text style={styles.resultTime}>
                  {currentTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 입장
                </Text>

                {/* Chain Reaction Status */}
                <View style={styles.chainContainer}>
                  <Text style={styles.chainTitle}>자동 처리 완료</Text>
                  <View style={styles.chainItems}>
                    <View style={[styles.chainItem, styles.chainDone]}>
                      <Ionicons name="checkmark" size={12} color={THEME.success} />
                      <Text style={styles.chainText}>출석 기록</Text>
                    </View>
                    <View style={[styles.chainItem, styles.chainDone]}>
                      <Ionicons name="checkmark" size={12} color={THEME.success} />
                      <Text style={styles.chainText}>레슨 -1회</Text>
                    </View>
                    <View style={[styles.chainItem, styles.chainDone]}>
                      <Ionicons name="checkmark" size={12} color={THEME.success} />
                      <Text style={styles.chainText}>부모 알림</Text>
                    </View>
                    <View style={[styles.chainItem, styles.chainPending]}>
                      <Ionicons name="time" size={12} color={THEME.primary} />
                      <Text style={styles.chainTextPending}>피드백 대기</Text>
                    </View>
                  </View>
                </View>

                {/* Remaining Lessons */}
                <View style={styles.remainingCard}>
                  <Text style={styles.remainingLabel}>잔여 레슨</Text>
                  <Text style={styles.remainingValue}>
                    {scanResult.details?.remainingLessons}회
                  </Text>
                </View>
              </>
            ) : (
              <>
                {/* Error State */}
                <View style={styles.errorIcon}>
                  <Ionicons name="close" size={48} color={THEME.text} />
                </View>
                <Text style={styles.errorText}>{scanResult.message}</Text>
                {scanResult.student && (
                  <>
                    <Text style={styles.errorName}>{scanResult.student.name}</Text>
                    <TouchableOpacity style={styles.payButton}>
                      <Ionicons name="logo-bitcoin" size={20} color="#3C1E1E" />
                      <Text style={styles.payButtonText}>결제 링크 보내기</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}

            <TouchableOpacity style={styles.resetButton} onPress={resetScanner}>
              <Text style={styles.resetButtonText}>다음 스캔</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerTitle: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.primary,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    borderWidth: 2,
    borderColor: THEME.primary,
    borderRadius: 20,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: THEME.success,
    borderWidth: 4,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  scanLine: {
    position: 'absolute',
    left: '5%',
    width: '90%',
    height: 3,
    backgroundColor: THEME.success,
    borderRadius: 2,
  },
  instruction: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.text,
    marginTop: 24,
  },
  subInstruction: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 8,
  },
  lessonsContainer: {
    padding: 20,
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  lessonsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 12,
  },
  lessonSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    marginBottom: 8,
  },
  lessonSlotActive: {
    borderWidth: 1,
    borderColor: THEME.success,
    backgroundColor: 'rgba(46,213,115,0.1)',
  },
  lessonTime: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.primary,
    minWidth: 50,
  },
  lessonInfo: {
    flex: 1,
    marginLeft: 12,
  },
  lessonName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  lessonCount: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  lessonStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusNow: {
    backgroundColor: 'rgba(46,213,115,0.2)',
  },
  statusNext: {
    backgroundColor: 'rgba(255,107,53,0.2)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.success,
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,17,23,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  resultCard: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  resultAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarEmoji: {
    fontSize: 48,
  },
  resultName: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 4,
  },
  resultClass: {
    fontSize: 16,
    color: THEME.textSecondary,
    marginBottom: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successText: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.success,
    marginBottom: 4,
  },
  resultTime: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: 24,
  },
  chainContainer: {
    width: '100%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    marginBottom: 20,
  },
  chainTitle: {
    fontSize: 12,
    color: THEME.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  chainItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chainItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  chainDone: {
    backgroundColor: 'rgba(46,213,115,0.15)',
  },
  chainPending: {
    backgroundColor: 'rgba(255,107,53,0.15)',
  },
  chainText: {
    fontSize: 11,
    color: THEME.success,
  },
  chainTextPending: {
    fontSize: 11,
    color: THEME.primary,
  },
  remainingCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  remainingLabel: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  remainingValue: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.primary,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.error,
    marginBottom: 8,
  },
  errorName: {
    fontSize: 16,
    color: THEME.text,
    marginBottom: 20,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFE812',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 24,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3C1E1E',
  },
  resetButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 14,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
  },
  permissionText: {
    fontSize: 16,
    color: THEME.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 20,
    backgroundColor: THEME.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
});

export default QRScannerScreen;