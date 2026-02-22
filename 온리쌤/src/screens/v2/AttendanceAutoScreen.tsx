/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏀 AttendanceAutoScreen - 베이조스 스타일 16단계 출석 프로세스
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 일론 + 베이조스 원칙 적용:
 * 1. 자동화 99% - 학생이 직접 체크, 코치는 확인만
 * 2. 16단계 프로세스 - 모든 단계 측정 & 기록
 * 3. SLA 기반 - 응답 시간 < 500ms 목표
 * 4. 예측 > 반응 - 결석 예측 알림
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Vibration,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';

// 서비스 임포트
import {
  attendanceService,
  AttendanceError,
  AttendanceResult,
  AttendanceMetrics,
} from '../../services/AttendanceService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface Student {
  id: string;
  name: string;
  studentNumber: string;
  photo_url?: string;
  status: 'pending' | 'present' | 'absent' | 'late';
  checkedAt?: string;
  predictedAbsence?: boolean;
}

interface Session {
  id: string;
  className: string;
  startTime: string;
  endTime: string;
  court: string;
  coachId: string;
  students: Student[];
}

interface DisplayMetrics {
  totalTime?: number;
  lookupTime?: number;
  validationTime?: number;
  saveTime?: number;
  notificationTime?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 베이조스 스타일: 메트릭 표시 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface MetricsDisplayProps {
  metrics: DisplayMetrics | null;
}

const MetricsDisplay: React.FC<MetricsDisplayProps> = ({ metrics }) => {
  if (!metrics) return null;

  const totalTime = metrics.totalTime || 0;
  const isGood = totalTime < 500;
  const isOkay = totalTime < 1000;

  const steps = [
    { name: '학생 조회', time: metrics.lookupTime },
    { name: '유효성 검증', time: metrics.validationTime },
    { name: 'DB 저장', time: metrics.saveTime },
    { name: '알림 발송', time: metrics.notificationTime },
  ].filter(s => s.time !== undefined);

  return (
    <View style={[metricsStyles.container, isGood ? metricsStyles.good : isOkay ? metricsStyles.okay : metricsStyles.slow]}>
      <View style={metricsStyles.header}>
        <Ionicons
          name={isGood ? "checkmark-circle" : isOkay ? "time" : "warning"}
          size={16}
          color={isGood ? "#4CAF50" : isOkay ? "#FF9800" : "#F44336"}
        />
        <Text style={metricsStyles.totalTime}>
          {totalTime}ms
        </Text>
        <Text style={metricsStyles.sla}>
          (SLA: 500ms)
        </Text>
      </View>
      <View style={metricsStyles.steps}>
        {steps.map((step, idx) => (
          <View key={idx} style={metricsStyles.step}>
            <Text style={metricsStyles.stepName}>{step.name}</Text>
            <Text style={metricsStyles.stepTime}>{step.time}ms</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const metricsStyles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  good: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  okay: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  slow: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  totalTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sla: {
    fontSize: 12,
    color: '#888',
  },
  steps: {
    gap: 4,
  },
  step: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepName: {
    fontSize: 11,
    color: '#666',
  },
  stepTime: {
    fontSize: 11,
    color: '#888',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// 숫자패드 자동출석 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface NumberPadProps {
  onSubmit: (number: string) => void;
  maxDigits?: number;
  disabled?: boolean;
}

const NumberPad: React.FC<NumberPadProps> = ({ onSubmit, maxDigits = 4, disabled }) => {
  const [input, setInput] = useState('');

  const handlePress = (digit: string) => {
    if (disabled) return;

    if (input.length < maxDigits) {
      Vibration.vibrate(10);
      const newInput = input + digit;
      setInput(newInput);

      // 자동 제출 (4자리 입력시)
      if (newInput.length === maxDigits) {
        onSubmit(newInput);
        setTimeout(() => setInput(''), 300);
      }
    }
  };

  const handleClear = () => setInput('');
  const handleBackspace = () => setInput(prev => prev.slice(0, -1));

  return (
    <View style={padStyles.container}>
      {/* 입력 표시 */}
      <View style={padStyles.display}>
        <Text style={padStyles.displayText}>
          {input || '출석번호 입력'}
        </Text>
        <View style={padStyles.dots}>
          {[0, 1, 2, 3].map(i => (
            <View
              key={i}
              style={[
                padStyles.dot,
                i < input.length && padStyles.dotFilled
              ]}
            />
          ))}
        </View>
      </View>

      {/* 숫자 패드 */}
      <View style={padStyles.pad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
          <TouchableOpacity
            key={key}
            style={[
              padStyles.key,
              key === 'C' && padStyles.keyAction,
              key === '⌫' && padStyles.keyAction,
              disabled && padStyles.keyDisabled,
            ]}
            onPress={() => {
              if (key === 'C') handleClear();
              else if (key === '⌫') handleBackspace();
              else handlePress(key);
            }}
            activeOpacity={0.7}
            disabled={disabled}
          >
            <Text style={[
              padStyles.keyText,
              (key === 'C' || key === '⌫') && padStyles.keyTextAction
            ]}>
              {key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const padStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  display: {
    alignItems: 'center',
    marginBottom: 24,
  },
  displayText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 8,
    marginBottom: 12,
  },
  dots: {
    flexDirection: 'row',
    gap: 12,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E0E0E0',
  },
  dotFilled: {
    backgroundColor: '#FF9500',
  },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 280,
    gap: 12,
  },
  key: {
    width: 80,
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  keyAction: {
    backgroundColor: '#F5F5F5',
  },
  keyDisabled: {
    opacity: 0.5,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  keyTextAction: {
    fontSize: 20,
    color: '#888',
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export default function AttendanceAutoScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [recentChecks, setRecentChecks] = useState<{
    name: string;
    time: string;
    success: boolean;
    metrics?: DisplayMetrics;
  }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastMetrics, setLastMetrics] = useState<DisplayMetrics | null>(null);
  const [stats, setStats] = useState({ total: 12, present: 0, absent: 0, pending: 12 });

  // 현재 수업 로드
  useEffect(() => {
    loadCurrentSession();
  }, []);

  const loadCurrentSession = async () => {
    // 실제로는 현재 시간 기준으로 수업 조회
    // 지금은 Mock 데이터
    setSession({
      id: 'session_001',
      className: '초5,6부',
      startTime: '17:00',
      endTime: '18:30',
      court: 'A코트',
      coachId: 'coach_001',
      students: [],
    });
  };

  // 🚀 베이조스 16단계 출석체크
  const handleNumberSubmit = async (number: string) => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      // AttendanceService의 16단계 프로세스 호출
      const result = await attendanceService.checkAttendance(number, session?.id);

      const now = new Date();
      const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

      // 메트릭 변환
      const displayMetrics: DisplayMetrics = {
        totalTime: result.metrics.totalTime,
        lookupTime: result.metrics.lookupTime,
        validationTime: result.metrics.validationTime,
        saveTime: result.metrics.saveTime,
        notificationTime: result.metrics.notificationTime,
      };

      if (result.success && result.data) {
        // 성공 피드백
        Vibration.vibrate([0, 100, 50, 100]);
        const studentName = result.data.studentName;

        setRecentChecks(prev => [
          {
            name: studentName,
            time: timeStr,
            success: true,
            metrics: displayMetrics,
          },
          ...prev.slice(0, 4)
        ]);

        // 통계 업데이트
        setStats(prev => ({
          ...prev,
          present: prev.present + 1,
          pending: prev.pending - 1,
        }));

        setLastMetrics(displayMetrics);
      } else {
        // 실패 피드백
        Vibration.vibrate(500);

        const errorMessages: Record<string, string> = {
          [AttendanceError.INVALID_NUMBER]: '등록되지 않은 출석번호입니다.',
          [AttendanceError.NOT_ENROLLED]: '해당 수업에 등록되지 않은 학생입니다.',
          [AttendanceError.ALREADY_CHECKED]: '이미 출석 처리되었습니다.',
          [AttendanceError.SESSION_EXPIRED]: '세션이 만료되었습니다.',
          [AttendanceError.PAYMENT_OVERDUE]: '수강료 미납으로 출석이 제한됩니다.',
          [AttendanceError.SESSIONS_DEPLETED]: '잔여 횟수가 없습니다.',
          [AttendanceError.TOO_EARLY]: '수업 시작 30분 전부터 출석 가능합니다.',
        };

        Alert.alert(
          '출석 실패',
          errorMessages[result.error || ''] || result.errorMessage || '알 수 없는 오류',
        );

        setRecentChecks(prev => [
          { name: number, time: timeStr, success: false },
          ...prev.slice(0, 4)
        ]);
      }
    } catch (error: unknown) {
      if (__DEV__) console.error('Attendance error:', error);
      Alert.alert('오류', '출석 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // AI 결석 예측 확인 요청
  const handlePredictionCheck = async () => {
    Alert.alert(
      '확인 요청 발송',
      '최예린 학생 학부모에게 카카오톡으로 출석 확인 요청을 보냈습니다.',
      [{ text: '확인' }]
    );
  };

  // 전원 출석 완료
  const handleCompleteAll = async () => {
    Alert.alert(
      '전원 출석 처리',
      `대기 중인 ${stats.pending}명의 학생을 모두 출석 처리하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          onPress: async () => {
            // TODO: 실제 전원 출석 처리 로직
            setStats(prev => ({
              ...prev,
              present: prev.total,
              pending: 0,
            }));
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <LinearGradient
        colors={['#FF9500', '#FF7B00']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>자동 출석체크</Text>
            <Text style={styles.headerSubtitle}>
              {session?.className || '수업 로딩중...'} • {session?.startTime}~{session?.endTime}
            </Text>
          </View>

          {/* 모드 전환 */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'auto' && styles.modeBtnActive]}
              onPress={() => setMode('auto')}
            >
              <Ionicons
                name="keypad"
                size={18}
                color={mode === 'auto' ? '#FF9500' : '#fff'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]}
              onPress={() => setMode('manual')}
            >
              <Ionicons
                name="hand-left"
                size={18}
                color={mode === 'manual' ? '#FF9500' : '#fff'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 실시간 통계 */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.present}</Text>
            <Text style={styles.statLabel}>출석</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: '#FFCDD2' }]}>{stats.absent}</Text>
            <Text style={styles.statLabel}>결석</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.pending}</Text>
            <Text style={styles.statLabel}>대기</Text>
          </View>
        </View>
      </LinearGradient>

      {/* 메인 컨텐츠 */}
      <ScrollView style={styles.content}>
        {mode === 'auto' ? (
          <>
            {/* 🚀 베이조스 스타일: 숫자패드 + 메트릭 */}
            <View style={styles.numberPadContainer}>
              <Text style={styles.instructionText}>
                학생이 직접 출석번호를 입력하세요
              </Text>
              {isProcessing && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color="#FF9500" />
                  <Text style={styles.processingText}>16단계 프로세스 실행 중...</Text>
                </View>
              )}
              <NumberPad onSubmit={handleNumberSubmit} disabled={isProcessing} />
            </View>

            {/* 베이조스 스타일: 마지막 처리 메트릭 */}
            {lastMetrics && <MetricsDisplay metrics={lastMetrics} />}

            {/* 최근 출석 기록 */}
            {recentChecks.length > 0 && (
              <View style={styles.recentSection}>
                <Text style={styles.recentTitle}>최근 출석</Text>
                {recentChecks.map((check, idx) => (
                  <View key={idx} style={styles.recentItem}>
                    <View style={styles.recentCheck}>
                      <Ionicons
                        name={check.success ? "checkmark-circle" : "close-circle"}
                        size={20}
                        color={check.success ? "#4CAF50" : "#F44336"}
                      />
                    </View>
                    <Text style={[
                      styles.recentName,
                      !check.success && { color: '#F44336' }
                    ]}>
                      {check.name}
                    </Text>
                    <Text style={styles.recentTime}>{check.time}</Text>
                    {check.metrics && (
                      <Text style={styles.recentMetric}>
                        {check.metrics.totalTime}ms
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          /* 수동 모드 */
          <View style={styles.manualGrid}>
            <Text style={styles.manualText}>
              수동 모드: 학생 사진을 터치하세요
            </Text>
          </View>
        )}

        {/* AI 결석 예측 카드 */}
        <View style={styles.predictionCard}>
          <View style={styles.predictionHeader}>
            <Ionicons name="warning" size={20} color="#FF9800" />
            <Text style={styles.predictionTitle}>AI 결석 예측</Text>
          </View>
          <Text style={styles.predictionText}>
            <Text style={{ fontWeight: '700' }}>최예린</Text> 학생의 결석 가능성이 높습니다.
            {'\n'}(최근 2회 연속 결석, 오늘 학교 조퇴 기록)
          </Text>
          <TouchableOpacity
            style={styles.predictionBtn}
            onPress={handlePredictionCheck}
          >
            <Text style={styles.predictionBtnText}>학부모에게 확인 요청</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 하단 액션 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerBtn, stats.pending === 0 && styles.footerBtnDisabled]}
          onPress={handleCompleteAll}
          disabled={stats.pending === 0}
        >
          <Ionicons name="checkmark-done" size={20} color="#fff" />
          <Text style={styles.footerBtnText}>전원 출석 완료</Text>
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
    backgroundColor: '#F5F6F8',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 4,
  },
  modeBtn: {
    width: 40,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  modeBtnActive: {
    backgroundColor: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNum: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  content: {
    flex: 1,
  },
  numberPadContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  instructionText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    zIndex: 10,
  },
  processingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '600',
  },
  recentSection: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888',
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  recentCheck: {
    marginRight: 12,
  },
  recentName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  recentTime: {
    fontSize: 14,
    color: '#888',
    marginRight: 8,
  },
  recentMetric: {
    fontSize: 11,
    color: '#4CAF50',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  manualGrid: {
    padding: 20,
  },
  manualText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  predictionCard: {
    margin: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  predictionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9800',
  },
  predictionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  predictionBtn: {
    marginTop: 12,
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  predictionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  footerBtn: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  footerBtnDisabled: {
    backgroundColor: '#E0E0E0',
  },
  footerBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
