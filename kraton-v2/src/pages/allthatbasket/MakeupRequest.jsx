/**
 * 📅 보충 수업 신청 페이지 (학부모용)
 *
 * URL: /makeup?token=xxx
 * - 결석 알림톡의 버튼 클릭 시 이동
 * - 가능한 보충 일정 3개 표시
 * - 선택 후 신청
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { makeupRequestService } from '../../services/makeupRequest.js';
import { googleCalendarService } from '../../services/googleCalendar.js';

// ============================================
// 스타일
// ============================================
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '24px',
    maxWidth: '400px',
    margin: '0 auto',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  },
  logo: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  logoSub: {
    fontSize: '12px',
    color: '#888',
    marginTop: '4px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
    marginBottom: '12px',
  },
  infoBox: {
    background: '#f8f9fa',
    borderRadius: '12px',
    padding: '16px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  infoLabel: {
    color: '#888',
    fontSize: '14px',
  },
  infoValue: {
    color: '#333',
    fontSize: '14px',
    fontWeight: '500',
  },
  slotList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  slotCard: {
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  slotCardSelected: {
    border: '2px solid #667eea',
    background: 'linear-gradient(135deg, #f5f7ff 0%, #e8ecff 100%)',
  },
  slotDate: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
  },
  slotTime: {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px',
  },
  slotClass: {
    fontSize: '12px',
    color: '#888',
    marginTop: '4px',
  },
  radioCircle: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid #ccc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    border: '2px solid #667eea',
  },
  radioInner: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#667eea',
  },
  button: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '20px',
  },
  buttonDisabled: {
    background: '#ccc',
    cursor: 'not-allowed',
  },
  successBox: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  successIcon: {
    fontSize: '60px',
    marginBottom: '20px',
  },
  successTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '12px',
  },
  successDesc: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.6',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  error: {
    background: '#fff5f5',
    border: '1px solid #ffcccc',
    borderRadius: '12px',
    padding: '16px',
    color: '#cc0000',
    textAlign: 'center',
  },
};

// ============================================
// 요일 한글 변환
// ============================================
const DAY_NAMES = {
  sun: '일', mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토',
};

function formatDateKorean(dateStr) {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  return `${month}/${day}(${dayOfWeek})`;
}

// ============================================
// URL 파라미터 파싱
// ============================================
function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    studentId: params.get('sid') || 'demo_student',
    studentName: params.get('name') || '홍길동',
    studentBirthYear: parseInt(params.get('birth') || '2016'),
    parentPhone: params.get('phone') || '010-1234-5678',
    classId: params.get('cid') || 'class_3',
    className: params.get('cname') || '초등저 A',
    date: params.get('date') || new Date().toISOString().split('T')[0],
    time: params.get('time') || '16:00',
    coachId: params.get('coach') || 'coach_1',
    classType: params.get('type') || 'team', // team | private
  };
}

// ============================================
// 메인 컴포넌트
// ============================================
export default function MakeupRequest() {
  const [params, setParams] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // 초기화
  useEffect(() => {
    const urlParams = parseUrlParams();
    setParams(urlParams);
    loadAvailableSlots(urlParams);
  }, []);

  // 가능한 일정 로드
  async function loadAvailableSlots(urlParams) {
    setLoading(true);
    setError(null);

    try {
      const result = await makeupRequestService.getAvailableSlots({
        studentBirthYear: urlParams.studentBirthYear,
        originalDate: urlParams.date,
        classType: urlParams.classType,
        coachId: urlParams.coachId,
      });

      if (result.success) {
        setSlots(result.data);
      } else {
        setError('가능한 보충 일정을 찾을 수 없습니다.');
      }
    } catch (err) {
      setError('일정을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  // 신청 제출
  async function handleSubmit() {
    if (!selectedSlot || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await makeupRequestService.createRequest({
        studentId: params.studentId,
        studentName: params.studentName,
        studentBirthYear: params.studentBirthYear,
        parentPhone: params.parentPhone,
        originalClassId: params.classId,
        originalClassName: params.className,
        originalDate: params.date,
        originalTime: params.time,
        originalCoachId: params.coachId,
        targetSlot: selectedSlot,
      });

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || '신청 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('신청 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  // 로딩 화면
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.loading}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
            <p>가능한 일정을 확인하고 있습니다...</p>
          </div>
        </div>
      </div>
    );
  }

  // 성공 화면
  if (success) {
    return (
      <div style={styles.container}>
        <motion.div
          style={styles.card}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div style={styles.successBox}>
            <div style={styles.successIcon}>✅</div>
            <div style={styles.successTitle}>보충 신청 완료!</div>
            <div style={styles.successDesc}>
              코치 선생님 확인 후<br />
              카카오톡으로 결과를 알려드릴게요.
              <br /><br />
              <strong>{formatDateKorean(selectedSlot.date)} {selectedSlot.time}</strong>
              <br />
              {selectedSlot.className || '개인훈련'}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <motion.div
        style={styles.card}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {/* 로고 */}
        <div style={styles.logo}>
          <div style={styles.logoText}>🏀 올댓바스켓</div>
          <div style={styles.logoSub}>보충 수업 신청</div>
        </div>

        {/* 결석 정보 */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>결석 정보</div>
          <div style={styles.infoBox}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>학생</span>
              <span style={styles.infoValue}>{params?.studentName}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>수업</span>
              <span style={styles.infoValue}>{params?.className}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>결석일</span>
              <span style={styles.infoValue}>
                {params && formatDateKorean(params.date)} {params?.time}
              </span>
            </div>
          </div>
        </div>

        {/* 에러 표시 */}
        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {/* 보충 가능 일정 */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            보충 가능 일정 선택 ({slots.length}개)
          </div>

          {slots.length === 0 ? (
            <div style={styles.error}>
              현재 가능한 보충 일정이 없습니다.<br />
              카카오톡으로 문의해주세요.
            </div>
          ) : (
            <div style={styles.slotList}>
              <AnimatePresence>
                {slots.map((slot, index) => (
                  <motion.div
                    key={`${slot.date}-${slot.time}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    style={{
                      ...styles.slotCard,
                      ...(selectedSlot === slot ? styles.slotCardSelected : {}),
                    }}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={styles.slotDate}>
                          {formatDateKorean(slot.date)}
                        </div>
                        <div style={styles.slotTime}>
                          {slot.time} ({slot.coachName} 코치)
                        </div>
                        {slot.className && (
                          <div style={styles.slotClass}>
                            {slot.className}
                          </div>
                        )}
                      </div>
                      <div style={{
                        ...styles.radioCircle,
                        ...(selectedSlot === slot ? styles.radioCircleSelected : {}),
                      }}>
                        {selectedSlot === slot && <div style={styles.radioInner} />}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* 신청 버튼 */}
        <motion.button
          style={{
            ...styles.button,
            ...(!selectedSlot || submitting ? styles.buttonDisabled : {}),
          }}
          disabled={!selectedSlot || submitting}
          onClick={handleSubmit}
          whileTap={{ scale: 0.98 }}
        >
          {submitting ? '신청 중...' : '보충 신청하기'}
        </motion.button>

        {/* 안내 문구 */}
        <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginTop: '16px' }}>
          신청 후 코치 확인 → 원장 승인 후 확정됩니다.<br />
          결과는 카카오톡으로 안내드립니다.
        </p>
      </motion.div>
    </div>
  );
}
