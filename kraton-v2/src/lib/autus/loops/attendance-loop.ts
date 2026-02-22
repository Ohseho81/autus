/**
 * ============================================================================
 * AUTUS 3 - Attendance Loop (L1)
 *
 * QR scan -> validate -> record -> notify -> log
 *
 * Trigger:  QR scan event (external) or manual check-in
 * Close:    attendance.normal (A-Tier) logged per successful check-in
 * Escalate: attendance.drop  (S-Tier) after 3 consecutive absences
 * ============================================================================
 */

import { getSupabase } from '../../supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AttendanceResult {
  success: boolean;
  studentId: string;
  classId: string;
  status: 'present' | 'late' | 'absent';
  timestamp: string;
  deduplicated: boolean;
  error?: string;
}

export interface Student {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  parent_id: string;
  organization_id: string;
  current_class_id: string;
  enrolled_at: string;
}

export interface QRData {
  studentId: string;
  timestamp: string;
  location?: string;
}

interface EventLedgerEntry {
  event_type: string;
  event_category: string;
  entity_id: string;
  entity_type: string;
  state_from: string | null;
  state_to: string;
  payload: Record<string, unknown>;
  actor_type: 'system';
  source: 'autus_loop';
  occurred_at: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** QR code format: ATB-{studentId}-{timestamp} */
const QR_PREFIX = 'ATB';

/** Minutes after class start before marking as late */
const LATE_THRESHOLD_MINUTES = 15;

/** Consecutive absences before S-Tier escalation */
const ABSENCE_ESCALATION_THRESHOLD = 3;

// ---------------------------------------------------------------------------
// AttendanceLoop
// ---------------------------------------------------------------------------

export class AttendanceLoop {
  // -------------------------------------------------------------------------
  // Public: process a QR attendance scan
  // -------------------------------------------------------------------------

  /**
   * Process a QR attendance scan end-to-end.
   *
   * 1. Parse & validate QR data
   * 2. Validate student is active
   * 3. Determine attendance status (present / late)
   * 4. De-duplicate against same-day records
   * 5. Record attendance
   * 6. Check absence threshold for S-Tier escalation
   * 7. Notify parent
   * 8. Log event to ledger
   */
  async processQRScan(qrData: QRData): Promise<AttendanceResult> {
    const { studentId, timestamp, location } = qrData;

    try {
      // 1. Validate student
      const student = await this.validateStudent(studentId);
      if (!student) {
        return {
          success: false,
          studentId,
          classId: '',
          status: 'absent',
          timestamp,
          deduplicated: false,
          error: 'Student not found or inactive',
        };
      }

      const classId = student.current_class_id;

      // 2. Fetch class schedule to determine late status
      const classStartTime = await this.getClassStartTime(classId, timestamp);
      const status: 'present' | 'late' = classStartTime && this.isLate(classStartTime, timestamp)
        ? 'late'
        : 'present';

      // 3. De-duplication: check if already recorded today
      const existingRecord = await this.findTodayRecord(studentId, classId, timestamp);
      const deduplicated = existingRecord !== null;

      if (deduplicated) {
        // Update existing record rather than inserting a duplicate
        await this.updateAttendance(existingRecord.id, status);
      } else {
        await this.recordAttendance(studentId, classId, status, timestamp, location);
      }

      // 4. Check consecutive absence threshold (may have been cleared)
      await this.checkAbsenceThreshold(studentId);

      // 5. Notify parent
      await this.notifyParent(studentId, status);

      // 6. Log A-Tier event: attendance.normal
      await this.logEvent({
        outcome_type: 'attendance.normal',
        entity_id: studentId,
        weight: 1,
        tier: 'A',
        metadata: { classId, status, location, deduplicated },
      });

      return {
        success: true,
        studentId,
        classId,
        status,
        timestamp,
        deduplicated,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[AttendanceLoop] processQRScan failed for student=${studentId}:`, message);

      return {
        success: false,
        studentId,
        classId: '',
        status: 'absent',
        timestamp,
        deduplicated: false,
        error: message,
      };
    }
  }

  // -------------------------------------------------------------------------
  // Public: parse a raw QR string
  // -------------------------------------------------------------------------

  /**
   * Parse raw QR string with format ATB-{studentId}-{timestamp}.
   * Returns null if the format is invalid.
   */
  static parseQRCode(raw: string): QRData | null {
    const parts = raw.split('-');
    if (parts.length < 3 || parts[0] !== QR_PREFIX) {
      return null;
    }

    const studentId = parts[1];
    const timestamp = parts.slice(2).join('-'); // ISO timestamp contains dashes

    if (!studentId || !timestamp || isNaN(Date.parse(timestamp))) {
      return null;
    }

    return { studentId, timestamp };
  }

  // -------------------------------------------------------------------------
  // Public: check consecutive absence threshold
  // -------------------------------------------------------------------------

  /**
   * Check if a student has reached the consecutive-absence threshold.
   * If so, log an S-Tier `attendance.drop` event and return true.
   */
  async checkAbsenceThreshold(studentId: string): Promise<boolean> {
    try {
      const supabase = getSupabase();
      if (!supabase) return false;

      // Fetch most recent attendance records ordered by date descending
      const { data: records, error } = await supabase
        .from('attendance')
        .select('status, recorded_at')
        .eq('student_id', studentId)
        .order('recorded_at', { ascending: false })
        .limit(ABSENCE_ESCALATION_THRESHOLD);

      if (error || !records) return false;

      // All recent records must be 'absent' to trigger
      const consecutiveAbsences = records.filter(
        (r: { status: string }) => r.status === 'absent',
      ).length;

      if (consecutiveAbsences >= ABSENCE_ESCALATION_THRESHOLD) {
        // S-Tier escalation: attendance.drop
        await this.logEvent({
          outcome_type: 'attendance.drop',
          entity_id: studentId,
          weight: 5,
          tier: 'S',
          metadata: {
            consecutive_absences: consecutiveAbsences,
            trigger: 'recovery_process',
          },
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('[AttendanceLoop] checkAbsenceThreshold failed:', error);
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Public: record absence (called by a scheduler when no scan received)
  // -------------------------------------------------------------------------

  /**
   * Mark a student as absent for a given class/date.
   * Triggered by a scheduled job when no QR scan is received by class end.
   */
  async recordAbsence(studentId: string, classId: string, date: string): Promise<void> {
    try {
      await this.recordAttendance(studentId, classId, 'absent', date);

      const escalated = await this.checkAbsenceThreshold(studentId);

      await this.notifyParent(studentId, 'absent');

      await this.logEvent({
        outcome_type: escalated ? 'attendance.drop' : 'attendance.normal',
        entity_id: studentId,
        weight: escalated ? 5 : 2,
        tier: escalated ? 'S' : 'A',
        metadata: { classId, status: 'absent', escalated },
      });
    } catch (error) {
      console.error('[AttendanceLoop] recordAbsence failed:', error);
    }
  }

  // -------------------------------------------------------------------------
  // Private: validate student
  // -------------------------------------------------------------------------

  /**
   * Validate that the student exists and has an active enrollment.
   */
  private async validateStudent(studentId: string): Promise<Student | null> {
    try {
      const supabase = getSupabase();
      if (!supabase) return null;

      const { data, error } = await supabase
        .from('students')
        .select('id, name, status, parent_id, organization_id, current_class_id, enrolled_at')
        .eq('id', studentId)
        .eq('status', 'active')
        .single();

      if (error || !data) return null;

      return data as Student;
    } catch (error) {
      console.error('[AttendanceLoop] validateStudent failed:', error);
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Private: late check
  // -------------------------------------------------------------------------

  /**
   * Determine whether a check-in is late (>15 min after class start).
   */
  private isLate(classStartTime: string, checkInTime: string): boolean {
    const classStart = new Date(classStartTime).getTime();
    const checkIn = new Date(checkInTime).getTime();
    const diffMinutes = (checkIn - classStart) / (1000 * 60);
    return diffMinutes > LATE_THRESHOLD_MINUTES;
  }

  // -------------------------------------------------------------------------
  // Private: get class start time
  // -------------------------------------------------------------------------

  private async getClassStartTime(classId: string, date: string): Promise<string | null> {
    try {
      const supabase = getSupabase();
      if (!supabase) return null;

      const dayOfWeek = new Date(date).getDay(); // 0=Sun ... 6=Sat

      const { data, error } = await supabase
        .from('class_schedules')
        .select('start_time')
        .eq('class_id', classId)
        .eq('day_of_week', dayOfWeek)
        .single();

      if (error || !data) return null;

      // Combine the date with the schedule's start_time
      const dateStr = new Date(date).toISOString().split('T')[0];
      return `${dateStr}T${data.start_time}`;
    } catch (error) {
      console.error('[AttendanceLoop] getClassStartTime failed:', error);
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Private: find today's existing record (deduplication)
  // -------------------------------------------------------------------------

  private async findTodayRecord(
    studentId: string,
    classId: string,
    timestamp: string,
  ): Promise<{ id: string } | null> {
    try {
      const supabase = getSupabase();
      if (!supabase) return null;

      const dayStart = new Date(timestamp);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(timestamp);
      dayEnd.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', studentId)
        .eq('class_id', classId)
        .gte('recorded_at', dayStart.toISOString())
        .lte('recorded_at', dayEnd.toISOString())
        .limit(1)
        .single();

      if (error || !data) return null;

      return { id: data.id };
    } catch (error) {
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Private: record attendance (insert)
  // -------------------------------------------------------------------------

  private async recordAttendance(
    studentId: string,
    classId: string,
    status: 'present' | 'late' | 'absent',
    timestamp?: string,
    location?: string,
  ): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.from('attendance').insert({
      student_id: studentId,
      class_id: classId,
      status,
      recorded_at: timestamp ?? new Date().toISOString(),
      location: location ?? null,
    });

    if (error) {
      throw new Error(`Failed to record attendance: ${error.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // Private: update existing attendance record (deduplication path)
  // -------------------------------------------------------------------------

  private async updateAttendance(recordId: string, status: 'present' | 'late' | 'absent'): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('attendance')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', recordId);

    if (error) {
      throw new Error(`Failed to update attendance: ${error.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // Private: notify parent
  // -------------------------------------------------------------------------

  /**
   * Queue a parent notification via the events table.
   * A downstream notification service picks these up and dispatches
   * via KakaoTalk alimtalk / push / SMS.
   */
  private async notifyParent(studentId: string, status: string): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // Fetch parent_id from student
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('parent_id, name')
        .eq('id', studentId)
        .single();

      if (studentError || !student?.parent_id) return;

      const notificationPayload: Record<string, unknown> = {
        type: 'attendance_notification',
        student_id: studentId,
        student_name: student.name,
        attendance_status: status,
        message: this.buildParentMessage(student.name, status),
        channel: 'kakao_alimtalk',
      };

      await supabase.from('events').insert({
        event_type: 'notification.queued',
        event_category: 'attendance',
        entity_id: student.parent_id,
        entity_type: 'parent',
        state_from: null,
        state_to: 'pending',
        payload: notificationPayload,
        actor_type: 'system',
        source: 'autus_loop',
        occurred_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[AttendanceLoop] notifyParent failed:', error);
    }
  }

  // -------------------------------------------------------------------------
  // Private: build parent notification message
  // -------------------------------------------------------------------------

  private buildParentMessage(studentName: string, status: string): string {
    switch (status) {
      case 'present':
        return `${studentName} 학생이 정상 출석하였습니다.`;
      case 'late':
        return `${studentName} 학생이 지각 처리되었습니다. (수업 시작 15분 초과)`;
      case 'absent':
        return `${studentName} 학생이 결석 처리되었습니다. 사유가 있으시면 학원으로 연락해 주세요.`;
      default:
        return `${studentName} 학생의 출결 상태가 업데이트되었습니다: ${status}`;
    }
  }

  // -------------------------------------------------------------------------
  // Private: log event to ledger (append-only)
  // -------------------------------------------------------------------------

  private async logEvent(fact: {
    outcome_type: string;
    entity_id: string;
    weight: number;
    tier: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const entry: EventLedgerEntry = {
        event_type: fact.outcome_type,
        event_category: 'attendance',
        entity_id: fact.entity_id,
        entity_type: 'student',
        state_from: null,
        state_to: fact.outcome_type,
        payload: {
          weight: fact.weight,
          tier: fact.tier,
          loop: 'L1_attendance',
          ...fact.metadata,
        },
        actor_type: 'system',
        source: 'autus_loop',
        occurred_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('events').insert(entry);

      if (error) {
        console.error('[AttendanceLoop] logEvent insert failed:', error.message);
      }
    } catch (error) {
      console.error('[AttendanceLoop] logEvent failed:', error);
    }
  }
}
