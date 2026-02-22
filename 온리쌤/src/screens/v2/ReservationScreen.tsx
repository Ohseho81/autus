/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏀 ReservationScreen - 베이조스 스타일 실시간 재고 관리
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 핵심 원칙:
 * 1. 실시간 재고: 정원 100% 자동 관리
 * 2. 대기열 시스템: 자동 승격
 * 3. 노쇼 방지: 패널티 시스템
 * 4. AI 추천: 최적 시간대 제안
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// 서비스 임포트
import {
  reservationService,
  ReservationType,
  ReservationStatus,
  ReservationError,
} from '../../services/OpenReservationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface TimeSlot {
  id: string;
  time: string;
  court: string;
  coach?: string;
  capacity: number;
  reserved: number;
  price: number;
  recommended?: boolean;
}

interface DateOption {
  date: string;
  dayLabel: string;
  dayName: string;
  isToday?: boolean;
  isWeekend?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 날짜 선택 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface DateSelectorProps {
  dates: DateOption[];
  selected: string;
  onSelect: (date: string) => void;
}

const DateSelector: React.FC<DateSelectorProps> = React.memo(function DateSelector({ dates, selected, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.dateList}
    >
      {dates.map((date) => (
        <TouchableOpacity
          key={date.date}
          style={[
            styles.dateCard,
            selected === date.date && styles.dateCardSelected,
            date.isWeekend && styles.dateCardWeekend,
          ]}
          onPress={() => onSelect(date.date)}
        >
          <Text style={[
            styles.dayName,
            selected === date.date && styles.dayNameSelected,
            date.isWeekend && styles.dayNameWeekend,
          ]}>
            {date.dayName}
          </Text>
          <Text style={[
            styles.dayLabel,
            selected === date.date && styles.dayLabelSelected,
          ]}>
            {date.dayLabel}
          </Text>
          {date.isToday && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayText}>오늘</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// 시간 슬롯 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface TimeSlotCardProps {
  slot: TimeSlot;
  selected: boolean;
  onSelect: () => void;
}

const TimeSlotCard: React.FC<TimeSlotCardProps> = React.memo(function TimeSlotCard({ slot, selected, onSelect }) {
  const available = useMemo(() => slot.capacity - slot.reserved, [slot.capacity, slot.reserved]);
  const isFull = useMemo(() => available === 0, [available]);
  const isLow = useMemo(() => available <= 3 && !isFull, [available, isFull]);

  return (
    <TouchableOpacity
      style={[
        styles.slotCard,
        selected && styles.slotCardSelected,
        isFull && styles.slotCardFull,
        slot.recommended && styles.slotCardRecommended,
      ]}
      onPress={onSelect}
      disabled={isFull}
      activeOpacity={0.8}
    >
      {slot.recommended && (
        <View style={styles.aiRecommendBadge}>
          <Ionicons name="bulb" size={12} color="#fff" />
          <Text style={styles.aiRecommendText}>AI 추천</Text>
        </View>
      )}

      <View style={styles.slotHeader}>
        <Text style={[
          styles.slotTime,
          selected && styles.slotTimeSelected,
          isFull && styles.slotTimeFull,
        ]}>
          {slot.time}
        </Text>
        <View style={[
          styles.availabilityBadge,
          isFull && styles.availabilityFull,
          isLow && styles.availabilityLow,
        ]}>
          <Text style={styles.availabilityText}>
            {isFull ? '마감' : `${available}/${slot.capacity}`}
          </Text>
        </View>
      </View>

      <View style={styles.slotInfo}>
        <View style={styles.slotDetail}>
          <Ionicons name="location" size={14} color="#888" />
          <Text style={styles.slotDetailText}>{slot.court}</Text>
        </View>
        {slot.coach && (
          <View style={styles.slotDetail}>
            <Ionicons name="person" size={14} color="#888" />
            <Text style={styles.slotDetailText}>{slot.coach} 코치</Text>
          </View>
        )}
      </View>

      <View style={styles.slotFooter}>
        <Text style={[
          styles.slotPrice,
          isFull && styles.slotPriceFull,
        ]}>
          {slot.price.toLocaleString()}원
        </Text>
        {selected && !isFull && (
          <Ionicons name="checkmark-circle" size={20} color="#FF9500" />
        )}
      </View>

      {/* 잔여석 게이지 */}
      {!isFull && (
        <View style={styles.capacityBar}>
          <View
            style={[
              styles.capacityFill,
              { width: `${slot.capacity > 0 ? (slot.reserved / slot.capacity) * 100 : 0}%` },
              isLow && styles.capacityFillLow,
            ]}
          />
        </View>
      )}
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export default function ReservationScreen() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reservationType, setReservationType] = useState<ReservationType>(ReservationType.OPEN_CLASS);

  // 학생 정보 - Memoized
  const studentInfo = useMemo(() => ({
    id: 'student_001',
    name: '김민준',
    remainingSessions: 8,
    parentId: 'parent_001',
  }), []);

  // 날짜 목록 생성 (오늘부터 14일) - Memoized
  const dates: DateOption[] = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    return {
      date: date.toISOString().split('T')[0],
      dayLabel: `${date.getMonth() + 1}/${date.getDate()}`,
      dayName: dayNames[date.getDay()],
      isToday: i === 0,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    };
  }), []);

  // 초기화
  useEffect(() => {
    if (dates.length > 0 && !selectedDate) {
      setSelectedDate(dates[0].date);
    }
  }, [dates, selectedDate]);

  // 날짜 변경 시 슬롯 로드
  useEffect(() => {
    if (selectedDate) {
      loadSlots(selectedDate);
    }
  }, [selectedDate, reservationType]);

  const loadSlots = useCallback(async (date: string) => {
    setIsLoading(true);
    try {
      const availability = await reservationService.getAvailability({
        date,
        type: reservationType,
      });

      // 실제 데이터가 없으면 Mock 데이터
      if (availability.length === 0) {
        const mockSlots: TimeSlot[] = [
          { id: '1', time: '09:00', court: 'A코트', coach: '박코치', capacity: 20, reserved: 18, price: 12000, recommended: true },
          { id: '2', time: '10:00', court: 'A코트', coach: '김코치', capacity: 20, reserved: 15, price: 15000 },
          { id: '3', time: '11:00', court: 'B코트', coach: '이코치', capacity: 16, reserved: 10, price: 15000 },
          { id: '4', time: '14:00', court: 'A코트', coach: '박코치', capacity: 20, reserved: 20, price: 15000 },
          { id: '5', time: '15:00', court: 'A코트', coach: '김코치', capacity: 20, reserved: 12, price: 15000 },
          { id: '6', time: '17:00', court: 'A코트', coach: '이코치', capacity: 20, reserved: 19, price: 18000 },
          { id: '7', time: '18:00', court: 'B코트', coach: '박코치', capacity: 16, reserved: 8, price: 18000 },
          { id: '8', time: '19:00', court: 'A코트', coach: '김코치', capacity: 20, reserved: 17, price: 18000 },
          { id: '9', time: '20:00', court: 'A코트', coach: '이코치', capacity: 20, reserved: 5, price: 15000 },
        ];
        setSlots(mockSlots);
      } else {
        setSlots(availability.map(a => ({
          id: a.id,
          time: new Date(a.startTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          court: a.courtId === 'court_a' ? 'A코트' : 'B코트',
          coach: a.coachId,
          capacity: a.capacity,
          reserved: a.reserved,
          price: a.price,
        })));
      }
    } catch (error: unknown) {
      if (__DEV__) console.error('Load slots error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [reservationType]);

  // 예약 처리
  const handleReservation = useCallback(async () => {
    if (!selectedSlot) {
      Alert.alert('알림', '시간대를 선택해주세요.');
      return;
    }

    const slot = slots.find(s => s.id === selectedSlot);
    if (!slot) return;

    setIsProcessing(true);

    try {
      const result = await reservationService.createReservation({
        studentId: studentInfo.id,
        parentId: studentInfo.parentId,
        slotId: selectedSlot,
        type: reservationType,
        useSession: true,
      });

      if (result.success) {
        if (result.status === ReservationStatus.CONFIRMED) {
          Alert.alert(
            '예약 완료! 🎉',
            `${slot.time} ${slot.court} 예약이 확정되었습니다.\n\n` +
            `처리 시간: ${result.metrics?.totalDurationMs}ms`,
            [{ text: '확인', onPress: () => loadSlots(selectedDate) }]
          );
        } else if (result.status === ReservationStatus.WAITLISTED) {
          Alert.alert(
            '대기열 등록',
            `현재 정원이 찼습니다.\n대기열 ${result.waitlistPosition}번으로 등록되었습니다.\n\n취소 발생 시 자동으로 알려드립니다.`,
            [{ text: '확인' }]
          );
        }

        setSelectedSlot(null);
      } else {
        const errorMessages: Record<string, string> = {
          [ReservationError.SLOT_FULL]: '정원이 가득 찼습니다.',
          [ReservationError.ALREADY_RESERVED]: '이미 예약하셨습니다.',
          [ReservationError.SESSION_DEPLETED]: '잔여 회차가 없습니다.',
          [ReservationError.BLACKLISTED]: '노쇼로 인해 예약이 제한되었습니다.',
          [ReservationError.CONFLICT_DETECTED]: '다른 예약과 시간이 겹칩니다.',
        };

        Alert.alert(
          '예약 실패',
          errorMessages[result.error || ''] || result.message || '예약 처리 중 오류가 발생했습니다.'
        );
      }
    } catch (error: unknown) {
      if (__DEV__) console.error('Reservation error:', error);
      Alert.alert('오류', '예약 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedSlot, slots, studentInfo, reservationType, selectedDate, loadSlots]);

  const selectedSlotInfo = useMemo(() => slots.find(s => s.id === selectedSlot), [slots, selectedSlot]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <LinearGradient
        colors={['#2196F3', '#1976D2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>오픈반 예약</Text>
          <Text style={styles.headerSubtitle}>
            {studentInfo.name} • 잔여 {studentInfo.remainingSessions}회
          </Text>
        </View>

        {/* 예약 타입 선택 */}
        <View style={styles.typeSelector}>
          {[
            { type: ReservationType.OPEN_CLASS, label: '오픈반' },
            { type: ReservationType.MAKEUP_CLASS, label: '보강' },
            { type: ReservationType.PRIVATE_LESSON, label: '개인레슨' },
          ].map((item) => (
            <TouchableOpacity
              key={item.type}
              style={[
                styles.typeBtn,
                reservationType === item.type && styles.typeBtnActive,
              ]}
              onPress={() => setReservationType(item.type)}
            >
              <Text style={[
                styles.typeBtnText,
                reservationType === item.type && styles.typeBtnTextActive,
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* 날짜 선택 */}
      <View style={styles.dateSection}>
        <DateSelector
          dates={dates}
          selected={selectedDate}
          onSelect={setSelectedDate}
        />
      </View>

      {/* 시간 슬롯 목록 */}
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>
          {selectedDate && new Date(selectedDate).toLocaleDateString('ko-KR', {
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>시간대 로딩 중...</Text>
          </View>
        ) : (
          <View style={styles.slotGrid}>
            {slots.map((slot) => (
              <TimeSlotCard
                key={slot.id}
                slot={slot}
                selected={selectedSlot === slot.id}
                onSelect={() => setSelectedSlot(slot.id)}
              />
            ))}
          </View>
        )}

        {/* 예약 정책 안내 */}
        <View style={styles.policyCard}>
          <View style={styles.policyHeader}>
            <Ionicons name="information-circle" size={20} color="#2196F3" />
            <Text style={styles.policyTitle}>예약 정책</Text>
          </View>
          <Text style={styles.policyText}>
            • 예약 변경/취소는 24시간 전까지 무료{'\n'}
            • 3시간 전 취소 시 패널티 적용{'\n'}
            • 노쇼 3회 시 30일간 예약 제한{'\n'}
            • 대기열 등록 시 자동 승격 알림
          </Text>
        </View>
      </ScrollView>

      {/* 예약 버튼 */}
      <View style={styles.footer}>
        {selectedSlotInfo && (
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedTime}>{selectedSlotInfo.time}</Text>
            <Text style={styles.selectedCourt}>{selectedSlotInfo.court}</Text>
            <Text style={styles.selectedPrice}>
              {selectedSlotInfo.price.toLocaleString()}원
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[
            styles.reserveButton,
            !selectedSlot && styles.reserveButtonDisabled,
            isProcessing && styles.reserveButtonProcessing,
          ]}
          onPress={handleReservation}
          disabled={!selectedSlot || isProcessing}
        >
          {isProcessing ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.reserveButtonText}>18단계 처리 중...</Text>
            </>
          ) : (
            <>
              <Ionicons name="calendar-outline" size={20} color="#fff" />
              <Text style={styles.reserveButtonText}>예약하기</Text>
            </>
          )}
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
    paddingBottom: 16,
  },
  headerContent: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeBtnActive: {
    backgroundColor: '#fff',
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  typeBtnTextActive: {
    color: '#2196F3',
  },
  dateSection: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dateList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  dateCard: {
    width: 60,
    height: 70,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dateCardSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  dateCardWeekend: {
    backgroundColor: '#FFEBEE',
  },
  dayName: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  dayNameSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },
  dayNameWeekend: {
    color: '#F44336',
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  dayLabelSelected: {
    color: '#2196F3',
  },
  todayBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#2196F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  todayText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888',
  },
  slotGrid: {
    gap: 12,
    marginBottom: 16,
  },
  slotCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    position: 'relative',
  },
  slotCardSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#F0F7FF',
  },
  slotCardFull: {
    backgroundColor: '#FAFAFA',
    borderColor: '#E0E0E0',
    opacity: 0.7,
  },
  slotCardRecommended: {
    borderColor: '#FF9500',
  },
  aiRecommendBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  aiRecommendText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  slotTime: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  slotTimeSelected: {
    color: '#2196F3',
  },
  slotTimeFull: {
    color: '#999',
  },
  availabilityBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availabilityFull: {
    backgroundColor: '#FFEBEE',
  },
  availabilityLow: {
    backgroundColor: '#FFF3E0',
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  slotInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  slotDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slotDetailText: {
    fontSize: 13,
    color: '#666',
  },
  slotFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2196F3',
  },
  slotPriceFull: {
    color: '#999',
  },
  capacityBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  capacityFillLow: {
    backgroundColor: '#FF9800',
  },
  policyCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    marginBottom: 100,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  policyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2196F3',
  },
  policyText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedTime: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  selectedCourt: {
    fontSize: 14,
    color: '#666',
  },
  selectedPrice: {
    flex: 1,
    textAlign: 'right',
    fontSize: 16,
    fontWeight: '700',
    color: '#2196F3',
  },
  reserveButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  reserveButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  reserveButtonProcessing: {
    backgroundColor: '#64B5F6',
  },
  reserveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
