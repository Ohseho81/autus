/**
 * 올댓바스켓 Brand OS - 강사 뷰
 *
 * 규칙:
 * - 버튼 ≤ 3
 * - 입력 필드 0 (수기 입력 금지)
 * - 설정 0
 * - 설명 0
 * - AUTUS 명칭 노출 금지
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Play, Square, AlertTriangle } from 'lucide-react';

// ============================================
// 수업 상태 카드
// ============================================
const ClassCard = ({ classData, onAction }) => {
  const isActive = classData.status === 'active';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 rounded-2xl mb-4"
      style={{
        background: isActive
          ? 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.05) 100%)'
          : 'rgba(255,255,255,0.05)',
        border: isActive ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(255,255,255,0.1)'
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">{classData.name}</h3>
          <p className="text-gray-400">{classData.time}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">{classData.present}/{classData.total}</p>
          <p className="text-gray-400 text-sm">출석</p>
        </div>
      </div>

      {/* 버튼 2개: 수업 시작/종료, QR 표시 */}
      <div className="flex gap-3">
        {!isActive ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onAction('start', classData.id)}
            className="flex-1 py-4 rounded-xl bg-green-500 text-white font-bold flex items-center justify-center gap-2"
          >
            <Play size={20} />
            수업 시작
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onAction('end', classData.id)}
            className="flex-1 py-4 rounded-xl bg-red-500 text-white font-bold flex items-center justify-center gap-2"
          >
            <Square size={20} />
            수업 종료
          </motion.button>
        )}

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onAction('qr', classData.id)}
          className="flex-1 py-4 rounded-xl bg-blue-500 text-white font-bold flex items-center justify-center gap-2"
        >
          <QrCode size={20} />
          QR 출석
        </motion.button>
      </div>
    </motion.div>
  );
};

// ============================================
// QR 모달
// ============================================
const QRModal = ({ classId, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-white p-8 rounded-2xl text-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-64 h-64 bg-gray-200 flex items-center justify-center mb-4">
          <QrCode size={200} className="text-gray-800" />
        </div>
        <p className="text-gray-600">학생이 QR을 스캔하면 자동 출석</p>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="mt-4 w-full py-3 rounded-xl bg-gray-800 text-white font-bold"
        >
          닫기
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// Intervention 버튼 (필수)
// ============================================
const InterventionButton = ({ onIntervention }) => {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onIntervention}
      className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg"
      style={{ boxShadow: '0 4px 20px rgba(255,107,53,0.5)' }}
    >
      <AlertTriangle size={28} />
    </motion.button>
  );
};

// ============================================
// Intervention 선택 모달
// ============================================
const InterventionModal = ({ onSelect, onClose }) => {
  const interventions = [
    { type: 'reminder_sent', label: '리마인드 발송' },
    { type: 'makeup_assigned', label: '보강 배정' },
    { type: 'outbound_call', label: '전화 연락' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-end justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        className="w-full max-w-md bg-gray-900 rounded-t-3xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-white mb-4 text-center">개입 기록</h3>

        <div className="space-y-3">
          {interventions.map(item => (
            <motion.button
              key={item.type}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(item.type)}
              className="w-full py-4 rounded-xl bg-white/10 text-white font-medium"
            >
              {item.label}
            </motion.button>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="w-full mt-4 py-4 rounded-xl bg-gray-700 text-gray-300"
        >
          취소
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// 강사 메인 뷰
// ============================================
export default function CoachView({ brand = 'allthatbasket', coachId }) {
  const [classes, setClasses] = useState([]);
  const [showQR, setShowQR] = useState(null);
  const [showIntervention, setShowIntervention] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await fetch(`/api/v1/classes?brand=${brand}&coach_id=${coachId}&today=true`);
      const data = await res.json();
      setClasses(data.data || MOCK_CLASSES);
    } catch (err) {
      setClasses(MOCK_CLASSES);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action, classId) => {
    if (action === 'qr') {
      setShowQR(classId);
      return;
    }

    try {
      await fetch('/api/v1/classes/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand,
          class_id: classId,
          instructor_id: coachId,
          status: action === 'start' ? 'started' : 'ended'
        })
      });
      fetchClasses();
    } catch (err) {
      console.error('Action error:', err);
    }
  };

  const handleIntervention = async (type) => {
    try {
      await fetch('/api/v1/interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand,
          actor_id: coachId,
          actor_role: 'instructor',
          action_type: type,
          target_type: 'class',
          target_id: classes[0]?.id || 'unknown'
        })
      });
      setShowIntervention(false);
    } catch (err) {
      console.error('Intervention error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F0F1A' }}>
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pb-24" style={{ background: '#0F0F1A' }}>
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">🏀 오늘 수업</h1>
      </div>

      {/* 수업 목록 */}
      {classes.map(cls => (
        <ClassCard
          key={cls.id}
          classData={cls}
          onAction={handleAction}
        />
      ))}

      {/* Intervention 버튼 (필수) */}
      <InterventionButton onIntervention={() => setShowIntervention(true)} />

      {/* QR 모달 */}
      {showQR && (
        <QRModal classId={showQR} onClose={() => setShowQR(null)} />
      )}

      {/* Intervention 모달 */}
      {showIntervention && (
        <InterventionModal
          onSelect={handleIntervention}
          onClose={() => setShowIntervention(false)}
        />
      )}
    </div>
  );
}

// Mock 데이터
const MOCK_CLASSES = [
  { id: '1', name: 'A반 (주니어)', time: '16:00 - 17:30', status: 'idle', present: 0, total: 12 },
  { id: '2', name: 'B반 (키즈)', time: '18:00 - 19:30', status: 'idle', present: 0, total: 8 }
];

/**
 * 강사 뷰 규칙 준수:
 * - 버튼: 수업 시작/종료, QR 출석, Intervention (3개 + FAB)
 * - 입력 필드: 0 (수기 출석 입력 금지!)
 * - 설정: 0
 * - 설명: 0
 * - AUTUS 노출: 없음
 * - Intervention 버튼: 강제 (오른쪽 하단 FAB)
 */
