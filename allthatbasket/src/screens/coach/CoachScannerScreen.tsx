/**
 * CoachScannerScreen.tsx
 * 코치용 QR 스캐너 (메인 화면)
 * - 출근/퇴근 QR 스캔
 * - 학생 출석 스캔
 * - 피드백 퀵 액션
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Vibration,
  Animated, Dimensions, Modal,
} from 'react-native';
import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const SCAN_SIZE = Math.min(width * 0.65, 240);

const THEME = {
  background: '#0D1117',
  surface: '#161B22',
  primary: '#2ED573',
  primaryLight: '#7BED9F',
  orange: '#FF6B35',
  blue: '#74B9FF',
  gold: '#FFD700',
  error: '#FF6B6B',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
  border: 'rgba(255,255,255,0.08)',
};

type ScanMode = 'idle' | 'clock_in' | 'clock_out' | 'student_attendance';
type ResultType = 'clock_in' | 'clock_out' | 'student' | 'error';

interface ScanResult {
  type: ResultType;
  success: boolean;
  data?: any;
  message: string;
}

const CoachScannerScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [todayLessons, setTodayLessons] = useState<any[]>([]);
  const [workStartTime, setWorkStartTime] = useState<Date | null>(null);
  const [coachId] = useState('coach-123'); // From auth context

  const scanLineAnim = React.useRef(new Animated.Value(0)).current;
  const resultAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    checkClockInStatus();
    fetchTodayLessons();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const checkClockInStatus = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('coach_work_logs')
      .select('*')
      .eq('coach_id', coachId)
      .eq('work_date', today)
      .is('clock_out_time', null)
      .single();

    if (data) {
      setIsClockedIn(true);
      setWorkStartTime(new Date(data.clock_in_time));
    }
  };

  const fetchTodayLessons = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('lesson_slots')
      .select('*')
      .eq('coach_id', coachId)
      .eq('date', today)
      .order('start_time');
    
    if (data) setTodayLessons(data);
  };

  const handleBarCodeScanned = useCallback(async ({ data }: BarCodeScannerResult) => {
    if (scanned || scanning) return;
    setScanning(true);
    setScanned(true);
    Vibration.vibrate(100);

    try {
      const parts = data.split('-');
      const qrType = parts[0]; // 'ATB' for student, 'COACH' for coach

      if (qrType === 'COACH' && parts[1] === coachId) {
        // Coach QR - Clock in/out
        if (!isClockedIn) {
          await handleClockIn();
        } else {
          await handleClockOut();
        }
      } else if (qrType === 'ATB') {
        // Student QR - Attendance
        await handleStudentAttendance(parts[1]);
      } else {
        throw new Error('유효하지 않은 QR 코드');
      }
    } catch (error: any) {
      setResult({
        type: 'error',
        success: false,
        message: error.message || '스캔 실패',
      });
      showResultModal();
    } finally {
      setScanning(false);
    }
  }, [scanned, scanning, isClockedIn, coachId]);

  const handleClockIn = async () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Create work log
    const { error } = await supabase.from('coach_work_logs').insert({
      coach_id: coachId,
      work_date: today,
      clock_in_time: now.toISOString(),
      location: '대치 Red Court', // From GPS
    });

    if (error) throw error;

    setIsClockedIn(true);
    setWorkStartTime(now);

    setResult({
      type: 'clock_in',
      success: true,
      data: { lessons: todayLessons },
      message: '출근 완료!',
    });
    showResultModal();
  };

  const handleClockOut = async () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Calculate work hours
    const workHours = workStartTime
      ? (now.getTime() - workStartTime.getTime()) / (1000 * 60 * 60)
      : 0;

    // Get today's attendance count
    const { count: attendanceCount } = await supabase
      .from('attendance_records')
      .select('*', { count: 'exact' })
      .gte('check_in_time', today);

    // Update work log with clock out
    const { error } = await supabase
      .from('coach_work_logs')
      .update({
        clock_out_time: now.toISOString(),
        total_hours: workHours,
        lessons_completed: todayLessons.length,
        students_attended: attendanceCount || 0,
      })
      .eq('coach_id', coachId)
      .eq('work_date', today);

    if (error) throw error;

    // Calculate salary
    const hourlyRate = 30000;
    const baseSalary = Math.round(workHours * hourlyRate);
    const attendanceBonus = (attendanceCount || 0) * 500;
    const totalSalary = baseSalary + attendanceBonus;

    // Trigger chain reaction (video upload, notifications, etc.)
    await supabase.functions.invoke('coach-clock-out-chain', {
      body: { coach_id: coachId, work_date: today },
    });

    setIsClockedIn(false);
    setResult({
      type: 'clock_out',
      success: true,
      data: {
        workHours: workHours.toFixed(1),
        lessonsCompleted: todayLessons.length,
        studentsAttended: attendanceCount,
        baseSalary,
        attendanceBonus,
        totalSalary,
      },
      message: '퇴근 완료!',
    });
    showResultModal();
  };

  const handleStudentAttendance = async (studentId: string) => {
    // Check payment status
    const { data: payment } = await supabase
      .from('student_payments')
      .select('paid, remaining_lessons')
      .eq('student_id', studentId)
      .eq('paid', true)
      .single();

    if (!payment?.paid) {
      setResult({
        type: 'error',
        success: false,
        message: '미납 학생입니다',
      });
      showResultModal();
      return;
    }

    // Get student info
    const { data: student } = await supabase
      .from('students')
      .select('name, grade, team')
      .eq('id', studentId)
      .single();

    // Record attendance
    const currentLesson = todayLessons[0]; // Simplified
    await supabase.from('attendance_records').insert({
      student_id: studentId,
      lesson_slot_id: currentLesson?.id,
      check_in_time: new Date().toISOString(),
      status: 'present',
      verified_by: 'coach_qr',
    });

    // Deduct lesson
    await supabase
      .from('student_payments')
      .update({ remaining_lessons: payment.remaining_lessons - 1 })
      .eq('student_id', studentId)
      .eq('paid', true);

    // Trigger student chain reaction
    await supabase.functions.invoke('attendance-chain-reaction', {
      body: {
        student_id: studentId,
        lesson_slot_id: currentLesson?.id,
        actions: ['send_parent_notification', 'update_growth_log'],
      },
    });

    setResult({
      type: 'student',
      success: true,
      data: {
        student,
        remainingLessons: payment.remaining_lessons - 1,
        lessonName: currentLesson?.name,
      },
      message: '출석 완료!',
    });
    showResultModal();
  };

  const showResultModal = () => {
    setShowResult(true);
    Animated.spring(resultAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const closeResult = () => {
    resultAnim.setValue(0);
    setShowResult(false);
    setScanned(false);
    setResult(null);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  if (hasPermission === null || hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>카메라 권한이 필요합니다</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Overlay */}
      <SafeAreaView style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.coachBadge}>
            <LinearGradient colors={[THEME.primary, THEME.primaryLight]} style={styles.coachAvatar}>
              <Text style={styles.coachInitial}>박</Text>
            </LinearGradient>
            <Text style={styles.coachName}>박진호 코치</Text>
          </View>
          <View style={styles.locationBadge}>
            <Text style={styles.locationText}>📍 대치 Red Court</Text>
          </View>
        </View>

        {/* Status Badge */}
        {isClockedIn && workStartTime && (
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle" size={16} color={THEME.primary} />
            <Text style={styles.statusText}>
              근무 중 • {formatTime(workStartTime)}~
            </Text>
          </View>
        )}

        {/* Scan Area */}
        <View style={styles.scanArea}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [{
                    translateY: scanLineAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, SCAN_SIZE - 4],
                    }),
                  }],
                },
              ]}
            />
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>QR 스캔하세요</Text>
          <Text style={styles.instructionSub}>
            {isClockedIn ? '학생 출석 / 퇴근' : '출근 QR을 스캔하세요'}
          </Text>
        </View>

        {/* Bottom Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity style={[styles.tab, styles.tabActive]}>
            <Ionicons name="qr-code" size={24} color={THEME.primary} />
            <Text style={styles.tabTextActive}>스캐너</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Ionicons name="time-outline" size={24} color={THEME.textSecondary} />
            <Text style={styles.tabText}>오늘 근무</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Result Modal */}
      <Modal visible={showResult} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.resultCard,
              { transform: [{ scale: resultAnim }] },
            ]}
          >
            {result?.type === 'clock_in' && (
              <>
                <LinearGradient colors={[THEME.primary, THEME.primaryLight]} style={styles.resultIcon}>
                  <Ionicons name="checkmark" size={40} color={THEME.background} />
                </LinearGradient>
                <Text style={styles.resultTitle}>출근 완료!</Text>
                <Text style={styles.resultSubtitle}>
                  {formatTime(new Date())} • GPS 확인됨
                </Text>

                <View style={styles.todayCard}>
                  <Text style={styles.todayTitle}>
                    <Ionicons name="calendar" size={14} color={THEME.primary} /> 오늘 레슨
                  </Text>
                  {todayLessons.map((lesson, i) => (
                    <View key={i} style={styles.lessonItem}>
                      <Text style={styles.lessonTime}>{lesson.start_time}</Text>
                      <Text style={styles.lessonName}>{lesson.name}</Text>
                      <Text style={styles.lessonCount}>{lesson.max_count}명</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {result?.type === 'clock_out' && (
              <>
                <LinearGradient colors={[THEME.primary, THEME.primaryLight]} style={styles.resultIcon}>
                  <Ionicons name="exit-outline" size={40} color={THEME.background} />
                </LinearGradient>
                <Text style={styles.resultTitle}>퇴근 완료!</Text>
                <Text style={styles.resultSubtitle}>수고하셨습니다 🏀</Text>

                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>{result.data.workHours}h</Text>
                      <Text style={styles.summaryLabel}>근무 시간</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>{result.data.lessonsCompleted}</Text>
                      <Text style={styles.summaryLabel}>레슨 완료</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>{result.data.studentsAttended}</Text>
                      <Text style={styles.summaryLabel}>출석 학생</Text>
                    </View>
                  </View>
                </View>

                <LinearGradient colors={[THEME.gold, '#FFA500']} style={styles.salaryCard}>
                  <Text style={styles.salaryLabel}>💰 오늘 예상 급여</Text>
                  <Text style={styles.salaryAmount}>
                    ₩{result.data.totalSalary.toLocaleString()}
                  </Text>
                  <View style={styles.salaryBreakdown}>
                    <Text style={styles.salaryDetail}>기본 ₩{result.data.baseSalary.toLocaleString()}</Text>
                    <Text style={styles.salaryDetail}>보너스 ₩{result.data.attendanceBonus.toLocaleString()}</Text>
                  </View>
                </LinearGradient>
              </>
            )}

            {result?.type === 'student' && (
              <>
                <LinearGradient colors={[THEME.orange, '#FF8C42']} style={styles.studentAvatar}>
                  <Text style={styles.studentEmoji}>⚽</Text>
                </LinearGradient>
                <Text style={styles.studentName}>{result.data.student?.name}</Text>
                <Text style={styles.studentInfo}>
                  {result.data.lessonName} • 잔여 {result.data.remainingLessons}회
                </Text>
                <View style={styles.attendanceBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={THEME.primary} />
                  <Text style={styles.attendanceText}>출석 완료!</Text>
                </View>

                <View style={styles.feedbackActions}>
                  <TouchableOpacity style={styles.feedbackBtn}>
                    <Ionicons name="mic" size={24} color={THEME.orange} />
                    <Text style={styles.feedbackLabel}>음성</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.feedbackBtn}>
                    <Ionicons name="videocam" size={24} color={THEME.blue} />
                    <Text style={styles.feedbackLabel}>영상</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.feedbackBtn}>
                    <Ionicons name="star" size={24} color={THEME.gold} />
                    <Text style={styles.feedbackLabel}>평가</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {result?.type === 'error' && (
              <>
                <View style={[styles.resultIcon, { backgroundColor: THEME.error }]}>
                  <Ionicons name="close" size={40} color="#fff" />
                </View>
                <Text style={[styles.resultTitle, { color: THEME.error }]}>
                  {result.message}
                </Text>
              </>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={closeResult}>
              <Text style={styles.closeBtnText}>
                {result?.type === 'student' ? '다음 학생' : '확인'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  coachBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(46,213,115,0.2)', padding: 6, paddingRight: 14, borderRadius: 24 },
  coachAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  coachInitial: { fontSize: 14, fontWeight: '700', color: THEME.background },
  coachName: { fontSize: 13, fontWeight: '600', color: THEME.primary },
  locationBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  locationText: { fontSize: 11, color: THEME.textSecondary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', backgroundColor: 'rgba(46,213,115,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  statusText: { fontSize: 12, color: THEME.primary, fontWeight: '600' },
  scanArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: SCAN_SIZE, height: SCAN_SIZE, borderWidth: 3, borderColor: THEME.primary, borderRadius: 20, overflow: 'hidden' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#fff', borderWidth: 4 },
  tl: { top: -3, left: -3, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 10 },
  tr: { top: -3, right: -3, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 10 },
  bl: { bottom: -3, left: -3, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 10 },
  br: { bottom: -3, right: -3, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 10 },
  scanLine: { position: 'absolute', left: '5%', width: '90%', height: 3, backgroundColor: THEME.primary, borderRadius: 2 },
  instructions: { alignItems: 'center', paddingBottom: 20 },
  instructionTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 6 },
  instructionSub: { fontSize: 13, color: THEME.textSecondary },
  tabBar: { flexDirection: 'row', backgroundColor: 'rgba(13,17,23,0.95)', borderTopWidth: 1, borderTopColor: THEME.border, paddingBottom: 20, paddingTop: 12 },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  tabActive: {},
  tabText: { fontSize: 11, color: THEME.textSecondary },
  tabTextActive: { fontSize: 11, color: THEME.primary, fontWeight: '600' },
  permissionText: { color: '#fff', fontSize: 16, textAlign: 'center', marginTop: 100 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  resultCard: { width: '100%', maxWidth: 320, backgroundColor: THEME.background, borderRadius: 24, padding: 24, alignItems: 'center' },
  resultIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  resultTitle: { fontSize: 24, fontWeight: '800', color: THEME.primary, marginBottom: 4 },
  resultSubtitle: { fontSize: 14, color: THEME.textSecondary, marginBottom: 20 },
  todayCard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, marginBottom: 20 },
  todayTitle: { fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 12 },
  lessonItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: THEME.border },
  lessonTime: { fontSize: 13, fontWeight: '700', color: THEME.primary, width: 50 },
  lessonName: { flex: 1, fontSize: 13, color: '#fff' },
  lessonCount: { fontSize: 11, color: THEME.textSecondary },
  summaryCard: { width: '100%', backgroundColor: 'rgba(46,213,115,0.1)', borderWidth: 1, borderColor: THEME.primary, borderRadius: 16, padding: 16, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '800', color: '#fff' },
  summaryLabel: { fontSize: 10, color: THEME.textSecondary, marginTop: 4 },
  salaryCard: { width: '100%', borderRadius: 14, padding: 16, marginBottom: 20 },
  salaryLabel: { fontSize: 12, color: 'rgba(0,0,0,0.6)' },
  salaryAmount: { fontSize: 28, fontWeight: '800', color: THEME.background, marginTop: 4 },
  salaryBreakdown: { flexDirection: 'row', gap: 16, marginTop: 8 },
  salaryDetail: { fontSize: 11, color: 'rgba(0,0,0,0.6)' },
  studentAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  studentEmoji: { fontSize: 36 },
  studentName: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  studentInfo: { fontSize: 13, color: THEME.textSecondary, marginBottom: 12 },
  attendanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(46,213,115,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginBottom: 20 },
  attendanceText: { fontSize: 14, fontWeight: '600', color: THEME.primary },
  feedbackActions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  feedbackBtn: { flex: 1, alignItems: 'center', gap: 6, padding: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14 },
  feedbackLabel: { fontSize: 11, color: THEME.textSecondary },
  closeBtn: { backgroundColor: THEME.primary, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14 },
  closeBtnText: { fontSize: 15, fontWeight: '700', color: THEME.background },
});

export default CoachScannerScreen;
