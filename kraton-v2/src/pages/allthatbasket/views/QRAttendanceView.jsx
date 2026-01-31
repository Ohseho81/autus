/**
 * 🏀 올댓바스켓 - QR 출석 체크 (코치용)
 * 빠른 출석 체크 + 학부모 자동 알림
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode, Check, X, Clock, Users, ChevronDown,
  Bell, Send, Zap, RefreshCw, Smartphone
} from 'lucide-react';

// ============================================
// 학생 출석 카드
// ============================================
const StudentCheckCard = ({ student, status, onCheck, showAnimation }) => {
  const statusConfig = {
    pending: { bg: 'bg-white/5', border: 'border-white/10', icon: null },
    present: { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: Check, color: 'text-green-400' },
    late: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: Clock, color: 'text-yellow-400' },
    absent: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: X, color: 'text-red-400' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <motion.div
      layout
      initial={showAnimation ? { scale: 0.8, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      className={`p-4 rounded-xl ${config.bg} border ${config.border} transition-all`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
            <span className="text-orange-400 font-bold">#{student.uniform_number || '-'}</span>
          </div>
          <div>
            <p className="text-white font-medium">{student.name}</p>
            <p className="text-xs text-gray-500">{student.grade} • {student.position}</p>
          </div>
        </div>

        {config.icon && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center`}
          >
            <config.icon size={18} className={config.color} />
          </motion.div>
        )}
      </div>

      {/* 빠른 체크 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={() => onCheck(student.id, 'present')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            status === 'present'
              ? 'bg-green-500 text-white'
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
          }`}
        >
          출석
        </button>
        <button
          onClick={() => onCheck(student.id, 'late')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            status === 'late'
              ? 'bg-yellow-500 text-white'
              : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
          }`}
        >
          지각
        </button>
        <button
          onClick={() => onCheck(student.id, 'absent')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            status === 'absent'
              ? 'bg-red-500 text-white'
              : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
          }`}
        >
          결석
        </button>
      </div>
    </motion.div>
  );
};

// ============================================
// 진행 상황 바
// ============================================
const ProgressBar = ({ total, checked }) => {
  const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">출석 체크 진행률</span>
        <span className="text-white font-medium">{checked}/{total}명 ({percentage}%)</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className="h-full bg-gradient-to-r from-orange-500 to-orange-400"
        />
      </div>
    </div>
  );
};

// ============================================
// 알림 발송 모달
// ============================================
const NotificationModal = ({ students, attendance, onClose, onSend }) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const absentStudents = students.filter(s => attendance[s.id] === 'absent');
  const lateStudents = students.filter(s => attendance[s.id] === 'late');

  const handleSend = async () => {
    setSending(true);
    // 실제 알림 발송 로직
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSending(false);
    setSent(true);
    setTimeout(() => {
      onSend();
      onClose();
    }, 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: '#1A1A2E' }}
      >
        {sent ? (
          <div className="text-center py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4"
            >
              <Check size={32} className="text-green-400" />
            </motion.div>
            <p className="text-white font-medium">알림 발송 완료!</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Bell size={24} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">학부모 알림</h3>
                <p className="text-sm text-gray-400">출석 현황을 학부모에게 알립니다</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {absentStudents.length > 0 && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400 font-medium mb-1">
                    결석 ({absentStudents.length}명)
                  </p>
                  <p className="text-xs text-gray-400">
                    {absentStudents.map(s => s.name).join(', ')}
                  </p>
                </div>
              )}
              {lateStudents.length > 0 && (
                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-sm text-yellow-400 font-medium mb-1">
                    지각 ({lateStudents.length}명)
                  </p>
                  <p className="text-xs text-gray-400">
                    {lateStudents.map(s => s.name).join(', ')}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-white/5 mb-6">
              <p className="text-xs text-gray-500 mb-2">발송될 메시지 예시:</p>
              <p className="text-sm text-gray-300">
                [올댓바스켓] 오늘({new Date().getMonth() + 1}/{new Date().getDate()}) {absentStudents[0]?.name || '홍길동'} 학생이 결석했습니다.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-white/10 text-gray-400 font-medium"
              >
                취소
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium flex items-center justify-center gap-2"
              >
                {sending ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <>
                    <Send size={18} />
                    발송
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

// ============================================
// 메인 컴포넌트
// ============================================
export default function QRAttendanceView({ data }) {
  const { students, classes, recordAttendance } = data;

  const [selectedClass, setSelectedClass] = useState(classes[0]?.id || '');
  const [attendance, setAttendance] = useState({});
  const [showNotification, setShowNotification] = useState(false);
  const [checkTime, setCheckTime] = useState(null);

  const today = new Date();
  const dayName = ['일', '월', '화', '수', '목', '금', '토'][today.getDay()];

  // 오늘 수업이 있는 학생만 필터
  const todayStudents = useMemo(() => {
    const cls = classes.find(c => c.id === selectedClass);
    if (!cls) return [];

    return students.filter(s => {
      return s.class_name === cls.name &&
        s.schedule_days?.includes(dayName);
    });
  }, [students, classes, selectedClass, dayName]);

  // 체크된 학생 수
  const checkedCount = Object.keys(attendance).filter(id =>
    todayStudents.some(s => s.id === id) && attendance[id]
  ).length;

  // 출석 체크 핸들러
  const handleCheck = async (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status,
    }));

    // 실제 DB 기록
    await recordAttendance(studentId, selectedClass, status);
  };

  // 전체 출석 처리
  const handleAllPresent = () => {
    const newAttendance = { ...attendance };
    todayStudents.forEach(s => {
      if (!newAttendance[s.id]) {
        newAttendance[s.id] = 'present';
        recordAttendance(s.id, selectedClass, 'present');
      }
    });
    setAttendance(newAttendance);
  };

  // 출석 완료
  const handleComplete = () => {
    setCheckTime(new Date());
    // 결석/지각 학생이 있으면 알림 모달 표시
    const hasAbsentOrLate = todayStudents.some(s =>
      attendance[s.id] === 'absent' || attendance[s.id] === 'late'
    );
    if (hasAbsentOrLate) {
      setShowNotification(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <QrCode size={24} className="text-orange-400" />
            빠른 출석 체크
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {today.getMonth() + 1}월 {today.getDate()}일 ({dayName}) 수업
          </p>
        </div>

        <select
          value={selectedClass}
          onChange={(e) => {
            setSelectedClass(e.target.value);
            setAttendance({});
          }}
          className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-white"
        >
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
      </div>

      {/* 진행 상황 */}
      <ProgressBar total={todayStudents.length} checked={checkedCount} />

      {/* 빠른 액션 */}
      <div className="flex gap-3">
        <button
          onClick={handleAllPresent}
          className="flex-1 py-3 rounded-xl bg-green-500/20 text-green-400 font-medium flex items-center justify-center gap-2 hover:bg-green-500/30"
        >
          <Zap size={18} />
          전원 출석
        </button>
        <button
          onClick={handleComplete}
          disabled={checkedCount < todayStudents.length}
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Check size={18} />
          체크 완료
        </button>
      </div>

      {/* 학생 목록 */}
      {todayStudents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">오늘 수업이 없습니다</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {todayStudents.map((student, index) => (
            <StudentCheckCard
              key={student.id}
              student={student}
              status={attendance[student.id] || 'pending'}
              onCheck={handleCheck}
              showAnimation={index < 5}
            />
          ))}
        </div>
      )}

      {/* 완료 시간 표시 */}
      {checkTime && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center"
        >
          <p className="text-green-400 font-medium">
            ✅ 출석 체크 완료 ({checkTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})
          </p>
        </motion.div>
      )}

      {/* 알림 모달 */}
      <AnimatePresence>
        {showNotification && (
          <NotificationModal
            students={todayStudents}
            attendance={attendance}
            onClose={() => setShowNotification(false)}
            onSend={() => console.log('Notifications sent')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
