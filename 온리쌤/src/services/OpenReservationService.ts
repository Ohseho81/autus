/**
 * OpenReservationService - 베이조스 스타일 재고 관리
 *
 * 핵심 원칙:
 * 1. 실시간 재고: 정원 관리 100% 자동화
 * 2. 대기열 시스템: 취소 시 자동 승격
 * 3. 예측 기반 재고: AI로 수요 예측
 * 4. 노쇼 방지: 자동 패널티 시스템
 * 5. 옵티마이저: 코트/시간 최적 배분
 */

import { supabase } from '../lib/supabase';

// ============================================================
// 1. 타입 정의
// ============================================================

export enum ReservationType {
  OPEN_CLASS = 'open_class',           // 오픈반
  PRIVATE_LESSON = 'private_lesson',   // 개인레슨
  TEAM_PRACTICE = 'team_practice',     // 팀연습
  COURT_RENTAL = 'court_rental',       // 코트대관
  MAKEUP_CLASS = 'makeup_class',       // 보강
}

export enum ReservationStatus {
  PENDING = 'pending',                 // 예약 대기
  CONFIRMED = 'confirmed',             // 확정
  WAITLISTED = 'waitlisted',           // 대기열
  CANCELLED = 'cancelled',             // 취소
  COMPLETED = 'completed',             // 완료
  NO_SHOW = 'no_show',                 // 노쇼
  EXPIRED = 'expired',                 // 만료
}

export enum WaitlistAction {
  AUTO_PROMOTE = 'auto_promote',       // 자동 승격
  MANUAL_CONFIRM = 'manual_confirm',   // 수동 확인 필요
  EXPIRED = 'expired',                 // 대기 만료
}

export enum ReservationError {
  SLOT_FULL = 'E201',                  // 정원 초과
  ALREADY_RESERVED = 'E202',           // 이미 예약됨
  INVALID_TIME = 'E203',               // 유효하지 않은 시간
  SESSION_DEPLETED = 'E204',           // 세션 부족
  BLACKLISTED = 'E205',                // 노쇼 블랙리스트
  COURT_UNAVAILABLE = 'E206',          // 코트 사용 불가
  TOO_LATE_TO_CANCEL = 'E207',         // 취소 시간 초과
  WAITLIST_FULL = 'E208',              // 대기열 가득참
  CONFLICT_DETECTED = 'E209',          // 시간 충돌
  SYSTEM_ERROR = 'E299',               // 시스템 오류
}

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  courtId: string;
  coachId?: string;
  type: ReservationType;
  capacity: number;
  reserved: number;
  waitlisted: number;
  price: number;
}

interface ReservationRequest {
  studentId: string;
  parentId: string;
  slotId: string;
  type: ReservationType;
  useSession?: boolean;        // 세션권 사용 여부
  notes?: string;
}

interface ReservationResult {
  success: boolean;
  reservationId?: string;
  status?: ReservationStatus;
  waitlistPosition?: number;
  error?: ReservationError;
  message?: string;
  metrics?: ReservationMetrics;
}

interface ReservationMetrics {
  totalDurationMs: number;
  steps: { step: number; name: string; durationMs: number; success: boolean }[];
  inventoryCheckMs: number;
  lockAcquireMs: number;
  confirmationMs: number;
}

interface CancellationRequest {
  reservationId: string;
  reason: string;
  requestedBy: string;
}

interface CancellationResult {
  success: boolean;
  refundedSession?: boolean;
  promotedFromWaitlist?: string;
  penaltyApplied?: boolean;
  error?: ReservationError;
  message?: string;
}

interface AvailabilityQuery {
  date: string;
  type?: ReservationType;
  courtId?: string;
  coachId?: string;
}

interface WaitlistEntry {
  id: string;
  reservationId: string;
  studentId: string;
  slotId: string;
  position: number;
  createdAt: string;
  expiresAt: string;
  autoPromote: boolean;
}

// ============================================================
// 2. 재고 설정
// ============================================================

// 코트별 설정
const COURT_CONFIG: Record<string, {
  name: string;
  capacity: { [key in ReservationType]?: number };
  operatingHours: { start: string; end: string };
  maintenanceDay?: number;  // 0-6 (일-토)
}> = {
  'court_a': {
    name: 'A코트',
    capacity: {
      [ReservationType.OPEN_CLASS]: 20,
      [ReservationType.PRIVATE_LESSON]: 4,
      [ReservationType.TEAM_PRACTICE]: 15,
      [ReservationType.COURT_RENTAL]: 30,
    },
    operatingHours: { start: '06:00', end: '23:00' },
    maintenanceDay: 1, // 월요일
  },
  'court_b': {
    name: 'B코트',
    capacity: {
      [ReservationType.OPEN_CLASS]: 16,
      [ReservationType.PRIVATE_LESSON]: 4,
      [ReservationType.TEAM_PRACTICE]: 12,
      [ReservationType.COURT_RENTAL]: 24,
    },
    operatingHours: { start: '06:00', end: '23:00' },
    maintenanceDay: 1,
  },
};

// 예약 정책
const RESERVATION_POLICY = {
  // 예약 가능 기간
  advanceBookingDays: 14,          // 14일 전부터 예약 가능
  lastMinuteBookingMinutes: 30,    // 최소 30분 전 예약

  // 취소 정책
  freeCancellationHours: 24,       // 24시간 전 무료 취소
  lateCancellationHours: 3,        // 3시간 전 취소 (패널티)
  noCancellationHours: 1,          // 1시간 전 취소 불가

  // 대기열 정책
  maxWaitlistSize: 5,              // 대기열 최대 5명
  waitlistExpiryMinutes: 30,       // 승격 후 30분 내 확인
  autoPromoteEnabled: true,        // 자동 승격 활성화

  // 노쇼 정책
  noShowPenaltySessions: 1,        // 노쇼 시 1회 차감
  noShowBlacklistThreshold: 3,     // 3회 노쇼 시 블랙리스트
  blacklistDurationDays: 30,       // 30일 예약 제한

  // 동시 예약 제한
  maxConcurrentReservations: 3,    // 동시 3개까지
  maxDailyReservations: 2,         // 일일 2회까지
};

// 시간대별 가격 배율
const TIME_MULTIPLIERS: Record<string, number> = {
  'early_morning': 0.8,    // 06:00-08:00 (20% 할인)
  'morning': 1.0,          // 08:00-12:00 (정상)
  'afternoon': 1.0,        // 12:00-17:00 (정상)
  'evening': 1.2,          // 17:00-20:00 (20% 할증)
  'night': 1.0,            // 20:00-23:00 (정상)
  'weekend': 1.3,          // 주말 30% 할증
};

// ============================================================
// 3. 예약 서비스 클래스
// ============================================================

export class OpenReservationService {
  private metrics: Record<string, unknown>[] = [];
  private startTime: number = 0;

  /**
   * 예약 생성 - 18단계 프로세스
   */
  async createReservation(request: ReservationRequest): Promise<ReservationResult> {
    this.startTime = Date.now();
    this.metrics = [];

    try {
      // ======== 1단계: 요청 로깅 ========
      await this.recordStep(1, '요청 로깅', async () => {
        await this.logReservationEvent('RESERVATION_INITIATED', request);
      });

      // ======== 2단계: 학생 검증 ========
      const student = await this.recordStep(2, '학생 검증', async () => {
        return await this.validateStudent(request.studentId);
      });
      if (!student) {
        return this.createError(ReservationError.SYSTEM_ERROR, '학생 정보를 찾을 수 없습니다.');
      }

      // ======== 3단계: 노쇼 블랙리스트 확인 ========
      const isBlacklisted = await this.recordStep(3, '블랙리스트 확인', async () => {
        return await this.checkBlacklist(request.studentId);
      });
      if (isBlacklisted) {
        return this.createError(ReservationError.BLACKLISTED, '노쇼로 인해 예약이 제한되었습니다.');
      }

      // ======== 4단계: 슬롯 정보 조회 ========
      const slot = await this.recordStep(4, '슬롯 조회', async () => {
        return await this.getSlotInfo(request.slotId);
      });
      if (!slot) {
        return this.createError(ReservationError.INVALID_TIME, '유효하지 않은 시간대입니다.');
      }

      // ======== 5단계: 시간 유효성 검증 ========
      const timeValid = await this.recordStep(5, '시간 검증', async () => {
        return this.validateReservationTime(slot);
      });
      if (!timeValid.valid) {
        return this.createError(ReservationError.INVALID_TIME, timeValid.message || '유효하지 않은 시간입니다.');
      }

      // ======== 6단계: 중복 예약 검사 ========
      const isDuplicate = await this.recordStep(6, '중복 검사', async () => {
        return await this.checkDuplicateReservation(request.studentId, request.slotId);
      });
      if (isDuplicate) {
        return this.createError(ReservationError.ALREADY_RESERVED, '이미 예약된 시간입니다.');
      }

      // ======== 7단계: 동시 예약 제한 확인 ========
      const concurrentCheck = await this.recordStep(7, '동시 예약 확인', async () => {
        return await this.checkConcurrentLimit(request.studentId);
      });
      if (!concurrentCheck.allowed) {
        return this.createError(ReservationError.SLOT_FULL, concurrentCheck.message || '동시 예약 제한을 초과했습니다.');
      }

      // ======== 8단계: 시간 충돌 확인 ========
      const hasConflict = await this.recordStep(8, '시간 충돌 확인', async () => {
        return await this.checkTimeConflict(request.studentId, slot);
      });
      if (hasConflict) {
        return this.createError(ReservationError.CONFLICT_DETECTED, '다른 예약과 시간이 겹칩니다.');
      }

      // ======== 9단계: 세션 잔여 확인 ========
      if (request.useSession) {
        const hasSession = await this.recordStep(9, '세션 확인', async () => {
          return await this.checkAvailableSession(request.studentId, request.type);
        });
        if (!hasSession) {
          return this.createError(ReservationError.SESSION_DEPLETED, '사용 가능한 세션이 없습니다.');
        }
      } else {
        this.metrics.push({ step: 9, name: '세션 확인', durationMs: 0, success: true });
      }

      // ======== 10단계: 재고 잠금 (동시성 제어) ========
      const lockStart = Date.now();
      const lock = await this.recordStep(10, '재고 잠금', async () => {
        return await this.acquireInventoryLock(request.slotId);
      });
      if (!lock.acquired) {
        return this.createError(ReservationError.SYSTEM_ERROR, '잠시 후 다시 시도해주세요.');
      }
      const lockTime = Date.now() - lockStart;

      try {
        // ======== 11단계: 실시간 재고 확인 ========
        const inventoryStart = Date.now();
        const inventory = await this.recordStep(11, '재고 확인', async () => {
          return await this.checkRealTimeInventory(request.slotId);
        });
        const inventoryTime = Date.now() - inventoryStart;

        let status: ReservationStatus;
        let waitlistPosition: number | undefined;

        if (inventory.available > 0) {
          // ======== 12단계: 정원 내 - 즉시 확정 ========
          status = ReservationStatus.CONFIRMED;
          await this.recordStep(12, '재고 차감', async () => {
            await this.decrementInventory(request.slotId);
          });
        } else if (inventory.waitlistAvailable > 0) {
          // ======== 12단계 (대안): 대기열 등록 ========
          status = ReservationStatus.WAITLISTED;
          waitlistPosition = await this.recordStep(12, '대기열 등록', async () => {
            return await this.addToWaitlist(request.slotId, request.studentId);
          });
        } else {
          await this.releaseInventoryLock(request.slotId);
          return this.createError(ReservationError.WAITLIST_FULL, '정원 및 대기열이 모두 찼습니다.');
        }

        // ======== 13단계: 예약 레코드 생성 ========
        const reservation = await this.recordStep(13, '예약 생성', async () => {
          return await this.createReservationRecord(request, slot, status, waitlistPosition);
        });

        // ======== 14단계: 세션 차감 ========
        if (request.useSession && status === ReservationStatus.CONFIRMED) {
          await this.recordStep(14, '세션 차감', async () => {
            await this.deductSession(request.studentId, request.type);
          });
        } else {
          this.metrics.push({ step: 14, name: '세션 차감', durationMs: 0, success: true });
        }

        // ======== 15단계: 학부모 알림 ========
        const confirmStart = Date.now();
        await this.recordStep(15, '알림 전송', async () => {
          await this.sendReservationNotification(request.parentId, reservation, slot, status, waitlistPosition);
        });

        // ======== 16단계: 코치 알림 ========
        if (slot.coachId) {
          await this.recordStep(16, '코치 알림', async () => {
            await this.notifyCoach(slot.coachId!, reservation, student.name as string);
          });
        } else {
          this.metrics.push({ step: 16, name: '코치 알림', durationMs: 0, success: true });
        }

        const confirmTime = Date.now() - confirmStart;

        // ======== 17단계: 대시보드 업데이트 ========
        await this.recordStep(17, '대시보드 업데이트', async () => {
          await this.updateDashboard(slot, status);
        });

        // ======== 18단계: 감사 로그 ========
        await this.recordStep(18, '감사 로그', async () => {
          await this.createAuditLog({
            action: 'RESERVATION_CREATED',
            reservationId: reservation.id,
            studentId: request.studentId,
            slotId: request.slotId,
            status,
          });
        });

        // 잠금 해제
        await this.releaseInventoryLock(request.slotId);

        return {
          success: true,
          reservationId: reservation.id as string,
          status,
          waitlistPosition,
          metrics: {
            totalDurationMs: Date.now() - this.startTime,
            steps: this.metrics as { step: number; name: string; durationMs: number; success: boolean }[],
            inventoryCheckMs: inventoryTime,
            lockAcquireMs: lockTime,
            confirmationMs: confirmTime,
          },
        };

      } catch (error: unknown) {
        await this.releaseInventoryLock(request.slotId);
        throw error;
      }

    } catch (error: unknown) {
      await this.logReservationEvent('RESERVATION_ERROR', { error: String(error) });
      return this.createError(ReservationError.SYSTEM_ERROR, '예약 처리 중 오류가 발생했습니다.');
    }
  }

  /**
   * 예약 취소
   */
  async cancelReservation(request: CancellationRequest): Promise<CancellationResult> {
    try {
      // 1. 예약 조회
      const reservation = await this.getReservationById(request.reservationId);
      if (!reservation) {
        return { success: false, error: ReservationError.SYSTEM_ERROR, message: '예약을 찾을 수 없습니다.' };
      }

      // 2. 취소 가능 여부 확인
      const cancellationCheck = this.checkCancellationEligibility(reservation);
      if (!cancellationCheck.allowed) {
        return {
          success: false,
          error: ReservationError.TOO_LATE_TO_CANCEL,
          message: cancellationCheck.message,
        };
      }

      // 3. 패널티 적용 여부 결정
      const applyPenalty = cancellationCheck.lateCancellation;

      // 4. 예약 상태 업데이트
      await this.updateReservationStatus(request.reservationId, ReservationStatus.CANCELLED, request.reason);

      // 5. 재고 복구
      await this.incrementInventory(reservation.slot_id as string);

      // 6. 세션 환불 (패널티 미적용 시)
      let refundedSession = false;
      if (reservation.used_session && !applyPenalty) {
        await this.refundSession(reservation.student_id as string, reservation.type as ReservationType);
        refundedSession = true;
      }

      // 7. 대기열 처리
      let promotedFromWaitlist: string | undefined;
      if (RESERVATION_POLICY.autoPromoteEnabled) {
        promotedFromWaitlist = await this.promoteFromWaitlist(reservation.slot_id as string);
      }

      // 8. 알림 전송
      await this.sendCancellationNotification(reservation, refundedSession, applyPenalty);

      // 9. 감사 로그
      await this.createAuditLog({
        action: 'RESERVATION_CANCELLED',
        reservationId: request.reservationId,
        reason: request.reason,
        penaltyApplied: applyPenalty,
        refundedSession,
      });

      return {
        success: true,
        refundedSession,
        promotedFromWaitlist,
        penaltyApplied: applyPenalty,
      };

    } catch (error: unknown) {
      return { success: false, error: ReservationError.SYSTEM_ERROR, message: '취소 처리 중 오류' };
    }
  }

  /**
   * 가용성 조회 - 실시간 재고
   */
  async getAvailability(query: AvailabilityQuery): Promise<TimeSlot[]> {
    try {
      let queryBuilder = supabase
        .from('atb_time_slots')
        .select(`
          *,
          atb_courts!inner(name),
          atb_coaches(name)
        `)
        .eq('date', query.date)
        .gte('start_time', new Date().toISOString());

      if (query.type) {
        queryBuilder = queryBuilder.eq('type', query.type);
      }
      if (query.courtId) {
        queryBuilder = queryBuilder.eq('court_id', query.courtId);
      }
      if (query.coachId) {
        queryBuilder = queryBuilder.eq('coach_id', query.coachId);
      }

      const { data, error } = await queryBuilder.order('start_time');

      if (error) throw error;

      return (data || []).map((slot: Record<string, unknown>) => ({
        id: slot.id as string,
        date: slot.date as string,
        startTime: slot.start_time as string,
        endTime: slot.end_time as string,
        courtId: slot.court_id as string,
        coachId: slot.coach_id as string | undefined,
        type: slot.type as ReservationType,
        capacity: slot.capacity as number,
        reserved: slot.reserved_count as number,
        waitlisted: slot.waitlist_count as number,
        price: this.calculateSlotPrice(slot),
      }));

    } catch (error: unknown) {
      if (__DEV__) console.error('Availability query error:', error);
      return [];
    }
  }

  /**
   * 노쇼 처리
   */
  async processNoShow(reservationId: string): Promise<void> {
    try {
      const reservation = await this.getReservationById(reservationId);
      if (!reservation) return;

      // 1. 상태 업데이트
      await this.updateReservationStatus(reservationId, ReservationStatus.NO_SHOW);

      // 2. 패널티 세션 차감
      await this.applyNoShowPenalty(reservation.student_id as string);

      // 3. 노쇼 카운트 증가
      const noShowCount = await this.incrementNoShowCount(reservation.student_id as string);

      // 4. 블랙리스트 확인
      if (noShowCount >= RESERVATION_POLICY.noShowBlacklistThreshold) {
        await this.addToBlacklist(reservation.student_id as string);
      }

      // 5. 알림 전송
      await this.sendNoShowNotification(reservation);

      // 6. 감사 로그
      await this.createAuditLog({
        action: 'NO_SHOW_PROCESSED',
        reservationId,
        studentId: reservation.student_id,
        noShowCount,
      });

    } catch (error: unknown) {
      if (__DEV__) console.error('No-show processing error:', error);
    }
  }

  /**
   * 대기열 자동 승격
   */
  async processWaitlistPromotions(): Promise<{ promoted: number }> {
    let promoted = 0;

    try {
      // 승격 대상 조회 (취소로 인해 빈 자리 발생)
      const slotsWithOpenings = await this.getSlotsWithWaitlistOpenings();

      for (const slot of slotsWithOpenings) {
        const promotedStudent = await this.promoteFromWaitlist(slot.id);
        if (promotedStudent) {
          promoted++;
        }
      }

      return { promoted };

    } catch (error: unknown) {
      if (__DEV__) console.error('Waitlist promotion error:', error);
      return { promoted };
    }
  }

  /**
   * 수요 예측 (AI 기반)
   */
  async predictDemand(date: string, type: ReservationType): Promise<{
    predictedDemand: number;
    confidence: number;
    recommendation: string;
  }> {
    try {
      // 과거 데이터 분석
      const historicalData = await this.getHistoricalData(date, type);

      // 요일별 패턴
      const dayOfWeek = new Date(date).getDay();
      const dayMultiplier = this.getDayMultiplier(dayOfWeek);

      // 시즌 패턴 (학기, 방학 등)
      const seasonMultiplier = this.getSeasonMultiplier(date);

      // 예측 계산
      const baseAverage = historicalData.averageReservations;
      const predictedDemand = Math.round(baseAverage * dayMultiplier * seasonMultiplier);

      // 신뢰도 계산
      const confidence = Math.min(historicalData.dataPoints / 30, 1); // 30일 이상 데이터면 100%

      // 추천 생성
      let recommendation = '';
      if (predictedDemand > historicalData.averageCapacity * 0.9) {
        recommendation = '높은 수요 예상: 추가 코트 오픈 권장';
      } else if (predictedDemand < historicalData.averageCapacity * 0.3) {
        recommendation = '낮은 수요 예상: 프로모션 고려';
      } else {
        recommendation = '정상 수요 예상';
      }

      return { predictedDemand, confidence, recommendation };

    } catch (error: unknown) {
      return { predictedDemand: 0, confidence: 0, recommendation: '데이터 부족' };
    }
  }

  /**
   * 슬롯 자동 생성 (스케줄러용)
   */
  async generateDailySlots(date: string): Promise<{ created: number }> {
    let created = 0;

    try {
      const dayOfWeek = new Date(date).getDay();

      for (const [courtId, config] of Object.entries(COURT_CONFIG)) {
        // 정비일 체크
        if (config.maintenanceDay === dayOfWeek) continue;

        // 시간대별 슬롯 생성
        const startHour = parseInt(config.operatingHours.start.split(':')[0]);
        const endHour = parseInt(config.operatingHours.end.split(':')[0]);

        for (let hour = startHour; hour < endHour; hour++) {
          const startTime = `${date}T${hour.toString().padStart(2, '0')}:00:00`;
          const endTime = `${date}T${(hour + 1).toString().padStart(2, '0')}:00:00`;

          // 각 예약 타입별 슬롯 생성
          for (const [type, capacity] of Object.entries(config.capacity)) {
            if (!capacity) continue;

            const { error } = await supabase
              .from('atb_time_slots')
              .upsert({
                court_id: courtId,
                date,
                start_time: startTime,
                end_time: endTime,
                type,
                capacity,
                reserved_count: 0,
                waitlist_count: 0,
                is_active: true,
              }, {
                onConflict: 'court_id,date,start_time,type',
              });

            if (!error) created++;
          }
        }
      }

      return { created };

    } catch (error: unknown) {
      if (__DEV__) console.error('Slot generation error:', error);
      return { created };
    }
  }

  /**
   * 최적 시간 추천
   */
  async recommendOptimalSlots(
    studentId: string,
    type: ReservationType,
    preferredDate: string
  ): Promise<TimeSlot[]> {
    try {
      // 1. 학생의 과거 예약 패턴 분석
      const preferences = await this.analyzeStudentPreferences(studentId);

      // 2. 가용 슬롯 조회
      const availableSlots = await this.getAvailability({
        date: preferredDate,
        type,
      });

      // 3. 점수 계산 및 정렬
      const scoredSlots = availableSlots
        .filter(slot => slot.reserved < slot.capacity)
        .map(slot => ({
          ...slot,
          score: this.calculateSlotScore(slot, preferences),
        }))
        .sort((a, b) => b.score - a.score);

      return scoredSlots.slice(0, 5); // 상위 5개 추천

    } catch (error: unknown) {
      if (__DEV__) console.error('Recommendation error:', error);
      return [];
    }
  }

  // ============================================================
  // 4. 내부 헬퍼 메서드
  // ============================================================

  private async recordStep<T>(
    stepNumber: number,
    stepName: string,
    action: () => Promise<T>
  ): Promise<T> {
    const stepStart = Date.now();
    try {
      const result = await action();
      this.metrics.push({
        step: stepNumber,
        name: stepName,
        durationMs: Date.now() - stepStart,
        success: true,
      });
      return result;
    } catch (error: unknown) {
      this.metrics.push({
        step: stepNumber,
        name: stepName,
        durationMs: Date.now() - stepStart,
        success: false,
      });
      throw error;
    }
  }

  private createError(error: ReservationError, message: string): ReservationResult {
    return {
      success: false,
      error,
      message,
      metrics: {
        totalDurationMs: Date.now() - this.startTime,
        steps: this.metrics as { step: number; name: string; durationMs: number; success: boolean }[],
        inventoryCheckMs: 0,
        lockAcquireMs: 0,
        confirmationMs: 0,
      },
    };
  }

  private async validateStudent(studentId: string): Promise<Record<string, unknown> | null> {
    const { data } = await supabase
      .from('atb_students')
      .select('id, name, parent_id')
      .eq('id', studentId)
      .eq('status', 'active')
      .single();
    return data || null;
  }

  private async checkBlacklist(studentId: string): Promise<boolean> {
    const { data } = await supabase
      .from('atb_blacklist')
      .select('id')
      .eq('student_id', studentId)
      .gt('expires_at', new Date().toISOString())
      .single();
    return !!data;
  }

  private async getSlotInfo(slotId: string): Promise<TimeSlot | null> {
    const { data } = await supabase
      .from('atb_time_slots')
      .select('*')
      .eq('id', slotId)
      .eq('is_active', true)
      .single();
    return data;
  }

  private validateReservationTime(slot: TimeSlot): { valid: boolean; message?: string } {
    const now = new Date();
    const slotTime = new Date(slot.startTime);
    const diffMinutes = (slotTime.getTime() - now.getTime()) / (1000 * 60);

    // 너무 늦은 예약
    if (diffMinutes < RESERVATION_POLICY.lastMinuteBookingMinutes) {
      return { valid: false, message: `최소 ${RESERVATION_POLICY.lastMinuteBookingMinutes}분 전에 예약해주세요.` };
    }

    // 너무 이른 예약
    const advanceDays = diffMinutes / (60 * 24);
    if (advanceDays > RESERVATION_POLICY.advanceBookingDays) {
      return { valid: false, message: `${RESERVATION_POLICY.advanceBookingDays}일 전부터 예약 가능합니다.` };
    }

    return { valid: true };
  }

  private async checkDuplicateReservation(studentId: string, slotId: string): Promise<boolean> {
    const { data } = await supabase
      .from('atb_reservations')
      .select('id')
      .eq('student_id', studentId)
      .eq('slot_id', slotId)
      .in('status', [ReservationStatus.CONFIRMED, ReservationStatus.WAITLISTED]);
    return (data?.length || 0) > 0;
  }

  private async checkConcurrentLimit(studentId: string): Promise<{ allowed: boolean; message?: string }> {
    // 동시 예약 수 확인
    const { count } = await supabase
      .from('atb_reservations')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .in('status', [ReservationStatus.CONFIRMED, ReservationStatus.WAITLISTED])
      .gt('slot_start_time', new Date().toISOString());

    if ((count || 0) >= RESERVATION_POLICY.maxConcurrentReservations) {
      return { allowed: false, message: `동시 예약은 최대 ${RESERVATION_POLICY.maxConcurrentReservations}개까지 가능합니다.` };
    }

    return { allowed: true };
  }

  private async checkTimeConflict(studentId: string, slot: TimeSlot): Promise<boolean> {
    const { data } = await supabase
      .from('atb_reservations')
      .select('slot_start_time, slot_end_time')
      .eq('student_id', studentId)
      .eq('status', ReservationStatus.CONFIRMED)
      .or(`and(slot_start_time.lt.${slot.endTime},slot_end_time.gt.${slot.startTime})`);

    return (data?.length || 0) > 0;
  }

  private async checkAvailableSession(studentId: string, type: ReservationType): Promise<boolean> {
    const { data } = await supabase
      .from('atb_enrollments')
      .select('remaining_sessions')
      .eq('student_id', studentId)
      .eq('type', type)
      .single();

    return (data?.remaining_sessions || 0) > 0;
  }

  private async acquireInventoryLock(slotId: string): Promise<{ acquired: boolean }> {
    // PostgreSQL Advisory Lock 사용
    const { data, error } = await supabase.rpc('acquire_slot_lock', { p_slot_id: slotId });
    return { acquired: !error && data };
  }

  private async releaseInventoryLock(slotId: string): Promise<void> {
    await supabase.rpc('release_slot_lock', { p_slot_id: slotId });
  }

  private async checkRealTimeInventory(slotId: string): Promise<{
    available: number;
    waitlistAvailable: number;
  }> {
    const { data } = await supabase
      .from('atb_time_slots')
      .select('capacity, reserved_count, waitlist_count')
      .eq('id', slotId)
      .single();

    if (!data) return { available: 0, waitlistAvailable: 0 };

    return {
      available: data.capacity - data.reserved_count,
      waitlistAvailable: RESERVATION_POLICY.maxWaitlistSize - data.waitlist_count,
    };
  }

  private async decrementInventory(slotId: string): Promise<void> {
    await supabase.rpc('increment_slot_reserved', { p_slot_id: slotId });
  }

  private async incrementInventory(slotId: string): Promise<void> {
    await supabase.rpc('decrement_slot_reserved', { p_slot_id: slotId });
  }

  private async addToWaitlist(slotId: string, studentId: string): Promise<number> {
    // 현재 대기열 위치
    const { data: currentList } = await supabase
      .from('atb_waitlist')
      .select('position')
      .eq('slot_id', slotId)
      .order('position', { ascending: false })
      .limit(1);

    const position = (currentList?.[0]?.position || 0) + 1;

    // 대기열 등록
    await supabase
      .from('atb_waitlist')
      .insert({
        slot_id: slotId,
        student_id: studentId,
        position,
        auto_promote: RESERVATION_POLICY.autoPromoteEnabled,
        expires_at: new Date(Date.now() + RESERVATION_POLICY.waitlistExpiryMinutes * 60 * 1000).toISOString(),
      });

    // 카운트 증가
    await supabase.rpc('increment_slot_waitlist', { p_slot_id: slotId });

    return position;
  }

  private async createReservationRecord(
    request: ReservationRequest,
    slot: TimeSlot,
    status: ReservationStatus,
    waitlistPosition?: number
  ): Promise<Record<string, unknown>> {
    const { data, error } = await supabase
      .from('atb_reservations')
      .insert({
        student_id: request.studentId,
        parent_id: request.parentId,
        slot_id: request.slotId,
        type: request.type,
        status,
        used_session: request.useSession,
        waitlist_position: waitlistPosition,
        slot_start_time: slot.startTime,
        slot_end_time: slot.endTime,
        court_id: slot.courtId,
        coach_id: slot.coachId,
        notes: request.notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data || {};
  }

  private async deductSession(studentId: string, type: ReservationType): Promise<void> {
    await supabase.rpc('deduct_session', {
      p_student_id: studentId,
      p_type: type,
    });
  }

  private async sendReservationNotification(
    parentId: string,
    reservation: Record<string, unknown>,
    slot: TimeSlot,
    status: ReservationStatus,
    waitlistPosition?: number
  ): Promise<void> {
    const slotDate = new Date(slot.startTime);
    const dateStr = slotDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
    const timeStr = slotDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    let message = '';
    if (status === ReservationStatus.CONFIRMED) {
      message = `[온리쌤] 예약이 확정되었습니다.\n\n📅 ${dateStr} ${timeStr}\n🏀 ${slot.type}\n\n당일 10분 전까지 도착해주세요!`;
    } else {
      message = `[온리쌤] 대기열 ${waitlistPosition}번으로 등록되었습니다.\n\n📅 ${dateStr} ${timeStr}\n\n취소 발생 시 자동으로 알려드립니다.`;
    }

    await supabase
      .from('atb_notifications')
      .insert({
        user_id: parentId,
        type: 'reservation',
        title: status === ReservationStatus.CONFIRMED ? '예약 확정' : '대기열 등록',
        message,
        channel: 'kakao',
      });
  }

  private async notifyCoach(coachId: string, reservation: Record<string, unknown>, studentName: string): Promise<void> {
    await supabase
      .from('atb_notifications')
      .insert({
        user_id: coachId,
        type: 'reservation',
        title: '새 예약',
        message: `${studentName} 학생이 예약했습니다.`,
        channel: 'push',
      });
  }

  private async updateDashboard(slot: TimeSlot, status: ReservationStatus): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await supabase.rpc('increment_reservation_stats', {
      stat_date: today,
      reservation_type: slot.type,
      reservation_status: status,
    });
  }

  private async createAuditLog(data: Record<string, unknown>): Promise<void> {
    await supabase
      .from('atb_audit_logs')
      .insert({
        action: data.action,
        entity_type: 'reservation',
        entity_id: data.reservationId,
        details: data,
        created_at: new Date().toISOString(),
      });
  }

  private async logReservationEvent(event: string, data: unknown): Promise<void> {
    if (__DEV__) console.log(`[ReservationService] ${event}:`, JSON.stringify(data));
    await supabase
      .from('atb_reservation_events')
      .insert({
        event_type: event,
        event_data: data as Record<string, unknown>,
        timestamp: new Date().toISOString(),
      });
  }

  // 취소 관련 메서드
  private async getReservationById(reservationId: string): Promise<Record<string, unknown> | null> {
    const { data } = await supabase
      .from('atb_reservations')
      .select('*')
      .eq('id', reservationId)
      .single();
    return data || null;
  }

  private checkCancellationEligibility(reservation: Record<string, unknown>): {
    allowed: boolean;
    lateCancellation: boolean;
    message?: string;
  } {
    const now = new Date();
    const slotTime = new Date(reservation.slot_start_time as string);
    const hoursUntilSlot = (slotTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilSlot < RESERVATION_POLICY.noCancellationHours) {
      return { allowed: false, lateCancellation: true, message: '1시간 전에는 취소할 수 없습니다.' };
    }

    if (hoursUntilSlot < RESERVATION_POLICY.lateCancellationHours) {
      return { allowed: true, lateCancellation: true };
    }

    return { allowed: true, lateCancellation: false };
  }

  private async updateReservationStatus(
    reservationId: string,
    status: ReservationStatus,
    reason?: string
  ): Promise<void> {
    await supabase
      .from('atb_reservations')
      .update({
        status,
        cancelled_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservationId);
  }

  private async refundSession(studentId: string, type: ReservationType): Promise<void> {
    await supabase.rpc('add_session', {
      p_student_id: studentId,
      p_type: type,
    });
  }

  private async promoteFromWaitlist(slotId: string): Promise<string | undefined> {
    // 대기열 1번 조회
    const { data: waitlistEntry } = await supabase
      .from('atb_waitlist')
      .select('id, student_id, reservation_id')
      .eq('slot_id', slotId)
      .eq('position', 1)
      .single();

    if (!waitlistEntry) return undefined;

    // 예약 상태 승격
    await this.updateReservationStatus(waitlistEntry.reservation_id, ReservationStatus.CONFIRMED);

    // 대기열 제거 및 순번 조정
    await supabase.from('atb_waitlist').delete().eq('id', waitlistEntry.id);
    await supabase.rpc('adjust_waitlist_positions', { p_slot_id: slotId });

    // 승격 알림
    await this.sendPromotionNotification(waitlistEntry.student_id);

    return waitlistEntry.student_id;
  }

  private async sendPromotionNotification(studentId: string): Promise<void> {
    const { data: student } = await supabase
      .from('atb_students')
      .select('parent_id')
      .eq('id', studentId)
      .single();

    if (student) {
      await supabase
        .from('atb_notifications')
        .insert({
          user_id: student.parent_id,
          type: 'waitlist_promotion',
          title: '대기열 승격!',
          message: '[온리쌤] 취소로 인해 예약이 확정되었습니다! 🎉',
          channel: 'kakao',
        });
    }
  }

  private async sendCancellationNotification(
    reservation: Record<string, unknown>,
    refunded: boolean,
    penalty: boolean
  ): Promise<void> {
    let message = '[온리쌤] 예약이 취소되었습니다.';
    if (refunded) {
      message += '\n\n세션이 복구되었습니다.';
    }
    if (penalty) {
      message += '\n\n⚠️ 늦은 취소로 세션이 차감됩니다.';
    }

    await supabase
      .from('atb_notifications')
      .insert({
        user_id: reservation.parent_id,
        type: 'cancellation',
        title: '예약 취소',
        message,
        channel: 'kakao',
      });
  }

  // 노쇼 관련 메서드
  private async applyNoShowPenalty(studentId: string): Promise<void> {
    await supabase.rpc('deduct_penalty_session', {
      p_student_id: studentId,
      p_sessions: RESERVATION_POLICY.noShowPenaltySessions,
      p_reason: 'no_show',
    });
  }

  private async incrementNoShowCount(studentId: string): Promise<number> {
    const { data } = await supabase.rpc('increment_no_show_count', {
      p_student_id: studentId,
    });
    return data || 0;
  }

  private async addToBlacklist(studentId: string): Promise<void> {
    const expiresAt = new Date(
      Date.now() + RESERVATION_POLICY.blacklistDurationDays * 24 * 60 * 60 * 1000
    ).toISOString();

    await supabase
      .from('atb_blacklist')
      .insert({
        student_id: studentId,
        reason: 'repeated_no_show',
        expires_at: expiresAt,
      });

    // 학부모 알림
    const { data: student } = await supabase
      .from('atb_students')
      .select('parent_id, name')
      .eq('id', studentId)
      .single();

    if (student) {
      await supabase
        .from('atb_notifications')
        .insert({
          user_id: student.parent_id,
          type: 'blacklist',
          title: '예약 제한 안내',
          message: `[온리쌤] ${student.name} 학생이 연속 노쇼로 인해 ${RESERVATION_POLICY.blacklistDurationDays}일간 예약이 제한됩니다.`,
          channel: 'kakao',
        });
    }
  }

  private async sendNoShowNotification(reservation: Record<string, unknown>): Promise<void> {
    await supabase
      .from('atb_notifications')
      .insert({
        user_id: reservation.parent_id,
        type: 'no_show',
        title: '노쇼 안내',
        message: `[온리쌤] 예약하신 수업에 불참하셨습니다. 패널티로 ${RESERVATION_POLICY.noShowPenaltySessions}회가 차감됩니다.`,
        channel: 'kakao',
      });
  }

  // 예측 관련 메서드
  private async getHistoricalData(date: string, type: ReservationType): Promise<{
    averageReservations: number;
    averageCapacity: number;
    dataPoints: number;
  }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data } = await supabase
      .from('atb_reservation_stats')
      .select('total_reservations, total_capacity')
      .eq('type', type)
      .gte('date', thirtyDaysAgo);

    if (!data || data.length === 0) {
      return { averageReservations: 10, averageCapacity: 20, dataPoints: 0 };
    }

    const avgRes = data.reduce((sum: number, d: { total_reservations?: number }) => sum + (d.total_reservations || 0), 0) / data.length;
    const avgCap = data.reduce((sum: number, d: { total_capacity?: number }) => sum + (d.total_capacity || 0), 0) / data.length;

    return {
      averageReservations: avgRes,
      averageCapacity: avgCap,
      dataPoints: data.length,
    };
  }

  private getDayMultiplier(dayOfWeek: number): number {
    // 주말 더 높은 수요
    return dayOfWeek === 0 || dayOfWeek === 6 ? 1.3 : 1.0;
  }

  private getSeasonMultiplier(date: string): number {
    const month = new Date(date).getMonth();
    // 방학 시즌 (7-8월, 12-2월) 더 높은 수요
    if ([6, 7, 11, 0, 1].includes(month)) return 1.2;
    return 1.0;
  }

  private async getSlotsWithWaitlistOpenings(): Promise<Record<string, unknown>[]> {
    const { data } = await supabase
      .from('atb_time_slots')
      .select('id, capacity, reserved_count, waitlist_count')
      .gt('waitlist_count', 0);

    // Filter where capacity > reserved_count (has openings)
    return (data || []).filter((slot: Record<string, unknown>) => (slot.capacity as number) > (slot.reserved_count as number));
  }

  private calculateSlotPrice(slot: Record<string, unknown>): number {
    const hour = new Date(slot.start_time as string).getHours();
    let period = 'morning';

    if (hour < 8) period = 'early_morning';
    else if (hour < 12) period = 'morning';
    else if (hour < 17) period = 'afternoon';
    else if (hour < 20) period = 'evening';
    else period = 'night';

    const dayOfWeek = new Date(slot.start_time as string).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const basePrice = (slot.base_price as number | undefined) || 15000;
    const multiplier = TIME_MULTIPLIERS[period] * (isWeekend ? TIME_MULTIPLIERS.weekend : 1);

    return Math.round(basePrice * multiplier);
  }

  private async analyzeStudentPreferences(studentId: string): Promise<{
    preferredTime: string;
    preferredCourt: string;
    preferredCoach: string;
  }> {
    const { data } = await supabase
      .from('atb_reservations')
      .select('slot_start_time, court_id, coach_id')
      .eq('student_id', studentId)
      .eq('status', ReservationStatus.COMPLETED)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!data || data.length === 0) {
      return { preferredTime: '18:00', preferredCourt: 'court_a', preferredCoach: '' };
    }

    // 가장 자주 예약한 시간/코트/코치 계산
    const timeCounts: Record<string, number> = {};
    const courtCounts: Record<string, number> = {};
    const coachCounts: Record<string, number> = {};

    data.forEach((r: Record<string, unknown>) => {
      const hour = new Date(r.slot_start_time as string).getHours().toString();
      timeCounts[hour] = (timeCounts[hour] || 0) + 1;
      const courtId = r.court_id as string | undefined;
      if (courtId) courtCounts[courtId] = (courtCounts[courtId] || 0) + 1;
      const coachId = r.coach_id as string | undefined;
      if (coachId) coachCounts[coachId] = (coachCounts[coachId] || 0) + 1;
    });

    const maxEntry = (obj: Record<string, number>) =>
      Object.entries(obj).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    return {
      preferredTime: maxEntry(timeCounts) + ':00',
      preferredCourt: maxEntry(courtCounts),
      preferredCoach: maxEntry(coachCounts),
    };
  }

  private calculateSlotScore(slot: TimeSlot, preferences: Record<string, unknown>): number {
    let score = 100;

    // 선호 시간 매칭
    const slotHour = new Date(slot.startTime).getHours();
    const prefHour = parseInt(preferences.preferredTime as string);
    score -= Math.abs(slotHour - prefHour) * 5;

    // 선호 코트 매칭
    if (slot.courtId === preferences.preferredCourt) score += 20;

    // 선호 코치 매칭
    if (slot.coachId === preferences.preferredCoach) score += 30;

    // 가용성 (여유 있을수록 좋음)
    const availability = (slot.capacity - slot.reserved) / slot.capacity;
    score += availability * 20;

    // 가격 (저렴할수록 좋음)
    const priceScore = Math.max(0, 20 - (slot.price - 15000) / 1000);
    score += priceScore;

    return score;
  }
}

// ============================================================
// 5. 싱글톤 인스턴스 & 내보내기
// ============================================================

export const reservationService = new OpenReservationService();

// 스케줄러용 함수들
export const generateDailySlots = (date: string) => reservationService.generateDailySlots(date);
export const processWaitlistPromotions = () => reservationService.processWaitlistPromotions();
export const predictDemand = (date: string, type: ReservationType) =>
  reservationService.predictDemand(date, type);
