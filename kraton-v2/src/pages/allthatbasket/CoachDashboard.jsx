/**
 * 🏀 AUTUS 강사 대시보드
 *
 * ═══════════════════════════════════════════════════════════════
 * AUTUS 철학:
 * - 강사는 수업 진행 + 성장 기록(영상)만
 * - 버튼: 시작 / 종료 / 이상보고
 * - 판단은 시스템(Session Engine)이 함
 * - Session 중심 구조
 * ═══════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import sessionService, { SESSION_STATUS } from '../../services/sessionService.js';

// ============================================
// 세션 데이터 변환 (API → UI)
// ============================================
const transformSession = (session) => ({
  id: session.id,
  className: session.class_name || session.className,
  time: session.start_time || session.time,
  duration: session.duration_minutes || session.duration,
  students: session.students || [],
  status: session.status || SESSION_STATUS.SCHEDULED,
  startedAt: session.started_at || session.startedAt,
  endedAt: session.ended_at || session.endedAt,
  flags: session.flags || [],
  presentStudents: session.students?.filter(s => s.attendance_status === 'present').map(s => s.student_id || s.id) || [],
  recording_status: session.recording_status,
});

// ============================================
// 메인 컴포넌트
// ============================================
export default function CoachDashboard() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [toast, setToast] = useState(null);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showVideoPrompt, setShowVideoPrompt] = useState(false);
  const [completedSession, setCompletedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // 세션 데이터 로드
  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await sessionService.getTodaySessions();
      if (error) console.warn('[Coach] 세션 로드 경고:', error);
      setSessions((data || []).map(transformSession));
      
      // 오프라인 큐 상태 확인
      const queueStatus = sessionService.getOfflineQueueStatus();
      setOfflineCount(queueStatus.count);
    } catch (e) {
      console.error('[Coach] 세션 로드 실패:', e);
    }
    setLoading(false);
  }, []);

  // 초기 로드 및 온라인 상태 감지
  useEffect(() => {
    loadSessions();

    // 온라인/오프라인 감지
    const handleOnline = async () => {
      setIsOnline(true);
      showToast('온라인 연결됨', 'success');
      // 오프라인 큐 동기화
      const result = await sessionService.syncOfflineQueue();
      if (result.synced > 0) {
        showToast(`${result.synced}개 이벤트 동기화 완료`);
        loadSessions();
      }
      setOfflineCount(result.pending);
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('오프라인 모드', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadSessions]);

  const today = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ============================================
  // 핵심 액션: 시작
  // ============================================
  const handleStart = async (session) => {
    // Optimistic UI 업데이트
    setSessions(prev => prev.map(s =>
      s.id === session.id
        ? {
            ...s,
            status: SESSION_STATUS.IN_PROGRESS,
            startedAt: new Date().toISOString(),
            presentStudents: s.students.map(st => st.id || st.student_id),
          }
        : s
    ));
    setActiveSession(session.id);
    showToast(`${session.className} 수업 시작! (전원 출석)`);

    // API 호출
    const result = await sessionService.startSession(session.id, '강사');
    if (result.offline) {
      setOfflineCount(prev => prev + 1);
      showToast('오프라인 저장됨', 'warning');
    }
  };

  // ============================================
  // 핵심 액션: 종료
  // ============================================
  const handleEnd = async (session) => {
    // Optimistic UI 업데이트
    setSessions(prev => prev.map(s =>
      s.id === session.id
        ? {
            ...s,
            status: SESSION_STATUS.COMPLETED,
            endedAt: new Date().toISOString(),
          }
        : s
    ));
    setActiveSession(null);
    setCompletedSession(session);
    setShowVideoPrompt(true);
    showToast(`${session.className} 수업 종료!`);

    // API 호출
    const result = await sessionService.endSession(session.id, '강사');
    if (result.offline) {
      setOfflineCount(prev => prev + 1);
      showToast('오프라인 저장됨', 'warning');
    }
  };

  // ============================================
  // 핵심 액션: 이상 보고
  // ============================================
  const handleFlag = (session) => {
    setActiveSession(session.id);
    setShowFlagModal(true);
  };

  const submitFlag = async (session, flagData) => {
    // Optimistic UI 업데이트
    setSessions(prev => prev.map(s =>
      s.id === session.id
        ? {
            ...s,
            status: SESSION_STATUS.FLAGGED,
            flags: [...s.flags, flagData],
            presentStudents: s.presentStudents.filter(id => !flagData.absentIds.includes(id)),
          }
        : s
    ));
    setShowFlagModal(false);

    // API 호출
    const result = await sessionService.reportFlag(session.id, {
      flagType: flagData.type === '결석' ? 'absent' : 
                flagData.type === '조퇴' ? 'early_leave' :
                flagData.type === '지각' ? 'late' :
                flagData.type === '부상' ? 'injury' : 'other',
      studentIds: flagData.affectedIds || flagData.absentIds,
      note: flagData.note,
    }, '강사');

    if (result.offline) {
      setOfflineCount(prev => prev + 1);
      showToast('오프라인 저장됨', 'warning');
    }

    // 결석자 알림톡 발송
    if (flagData.absentIds && flagData.absentIds.length > 0) {
      showToast(`결석 ${flagData.absentIds.length}명 → 학부모 알림 발송`);
    }
  };

  // 진행중인 세션
  const currentSession = sessions.find(s => s.status === SESSION_STATUS.IN_PROGRESS);

  // 통계
  const stats = {
    total: sessions.length,
    completed: sessions.filter(s => s.status === SESSION_STATUS.COMPLETED).length,
    flagged: sessions.filter(s => s.status === SESSION_STATUS.FLAGGED).length,
  };

  // 로딩 화면
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">수업 정보 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-5 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">오늘의 수업</h1>
            <p className="text-sm text-orange-100 mt-0.5">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* 오프라인 상태 표시 */}
            {!isOnline && (
              <span className="px-2 py-1 bg-yellow-500 rounded-full text-xs font-medium">
                오프라인
              </span>
            )}
            {/* 오프라인 큐 카운트 */}
            {offlineCount > 0 && (
              <span className="px-2 py-1 bg-orange-700 rounded-full text-xs font-medium">
                대기 {offlineCount}
              </span>
            )}
            {/* 새로고침 */}
            <button 
              onClick={loadSessions}
              className="p-2 bg-white/20 rounded-lg active:bg-white/30"
            >
              🔄
            </button>
            {/* 완료 통계 */}
            <div className="text-right">
              <p className="text-2xl font-bold">{stats.completed}/{stats.total}</p>
              <p className="text-xs text-orange-100">완료</p>
            </div>
          </div>
        </div>
      </header>

      {/* 진행중인 수업 강조 */}
      {currentSession && (
        <div className="bg-green-500 text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <span className="font-bold">진행중:</span>
              <span>{sessions.find(s => s.id === currentSession)?.className}</span>
            </div>
            <span className="text-sm text-green-100">
              {sessions.find(s => s.id === currentSession)?.students.length}명
            </span>
          </div>
        </div>
      )}

      {/* Session 리스트 */}
      <main className="p-4 space-y-3 pb-24">
        {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <span className="text-5xl block mb-4">📅</span>
            <p className="text-gray-500">오늘은 수업이 없습니다</p>
          </div>
        ) : (
          sessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              isActive={activeSession === session.id}
              onStart={() => handleStart(session)}
              onEnd={() => handleEnd(session)}
              onFlag={() => handleFlag(session)}
            />
          ))
        )}

        {/* AUTUS 철학 안내 */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mt-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-bold text-orange-800">AUTUS 강사 원칙</p>
              <ul className="text-sm text-orange-700 mt-2 space-y-1">
                <li>• <strong>시작</strong> → 수업 시작 + 전원 출석 처리</li>
                <li>• <strong>이상 보고</strong> → 결석/조퇴/사고만 신고</li>
                <li>• <strong>종료</strong> → 수업 종료 + 성장 기록(영상) 촬영</li>
              </ul>
              <p className="text-xs text-orange-600 mt-3">
                판단은 시스템이 합니다. 강사님은 수업에만 집중하세요.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* 이상 보고 모달 */}
      <AnimatePresence>
        {showFlagModal && (
          <FlagModal
            session={sessions.find(s => s.id === activeSession)}
            onClose={() => setShowFlagModal(false)}
            onSubmit={submitFlag}
          />
        )}
      </AnimatePresence>

      {/* 영상 촬영 프롬프트 */}
      <AnimatePresence>
        {showVideoPrompt && completedSession && (
          <VideoPrompt
            session={completedSession}
            onClose={() => {
              setShowVideoPrompt(false);
              setCompletedSession(null);
            }}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 left-4 right-4 px-4 py-3 rounded-xl shadow-lg text-white text-center font-medium z-50 ${
              toast.type === 'error' ? 'bg-red-500' :
              toast.type === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Session 카드
// ============================================
function SessionCard({ session, isActive, onStart, onEnd, onFlag }) {
  const getStatusInfo = () => {
    switch (session.status) {
      case SESSION_STATUS.SCHEDULED:
        return { label: '예정', color: 'bg-gray-100 text-gray-600', icon: '⏰' };
      case SESSION_STATUS.IN_PROGRESS:
        return { label: '진행중', color: 'bg-green-100 text-green-700', icon: '🏀' };
      case SESSION_STATUS.COMPLETED:
        return { label: '완료', color: 'bg-blue-100 text-blue-700', icon: '✅' };
      case SESSION_STATUS.FLAGGED:
        return { label: '이상 보고', color: 'bg-yellow-100 text-yellow-700', icon: '⚠️' };
      default:
        return { label: '알수없음', color: 'bg-gray-100', icon: '❓' };
    }
  };

  const statusInfo = getStatusInfo();
  const absentCount = session.students.length - session.presentStudents.length;

  return (
    <motion.div
      layout
      className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden ${
        session.status === SESSION_STATUS.IN_PROGRESS
          ? 'border-green-400'
          : session.status === SESSION_STATUS.FLAGGED
          ? 'border-yellow-400'
          : 'border-transparent'
      }`}
    >
      {/* 상단 정보 */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{statusInfo.icon}</div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">{session.className}</h3>
              <p className="text-sm text-gray-500">{session.time} · {session.duration}분</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            <p className="text-sm text-gray-400 mt-1">
              {session.presentStudents.length}/{session.students.length}명
            </p>
          </div>
        </div>

        {/* 결석자 표시 (있을 경우) */}
        {session.status !== SESSION_STATUS.SCHEDULED && absentCount > 0 && (
          <div className="bg-red-50 rounded-lg p-2 mb-3">
            <p className="text-sm text-red-600">
              ⚠️ 결석 {absentCount}명 - 학부모 알림 발송됨
            </p>
          </div>
        )}

        {/* 플래그 내용 표시 */}
        {session.flags.length > 0 && (
          <div className="bg-yellow-50 rounded-lg p-2 mb-3">
            {session.flags.map((flag, idx) => (
              <p key={idx} className="text-sm text-yellow-700">
                📋 {flag.type}: {flag.note || `${flag.absentIds.length}명`}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* 액션 버튼 - AUTUS 핵심: 3개만 */}
      <div className="border-t bg-gray-50 p-3">
        {session.status === SESSION_STATUS.SCHEDULED && (
          <button
            onClick={onStart}
            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-lg transition-colors active:scale-[0.98]"
          >
            ▶️ 시작
          </button>
        )}

        {session.status === SESSION_STATUS.IN_PROGRESS && (
          <div className="flex gap-2">
            <button
              onClick={onFlag}
              className="flex-1 py-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold transition-colors active:scale-[0.98]"
            >
              ⚠️ 이상 보고
            </button>
            <button
              onClick={onEnd}
              className="flex-1 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-colors active:scale-[0.98]"
            >
              ⏹️ 종료
            </button>
          </div>
        )}

        {session.status === SESSION_STATUS.FLAGGED && (
          <div className="flex gap-2">
            <button
              onClick={onFlag}
              className="flex-1 py-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold transition-colors active:scale-[0.98]"
            >
              ⚠️ 추가 보고
            </button>
            <button
              onClick={onEnd}
              className="flex-1 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-colors active:scale-[0.98]"
            >
              ⏹️ 종료
            </button>
          </div>
        )}

        {session.status === SESSION_STATUS.COMPLETED && (
          <div className="text-center py-2 text-gray-500">
            ✅ 수업 완료
            {session.endedAt && (
              <span className="text-sm ml-2">
                ({new Date(session.endedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// 이상 보고 모달
// ============================================
function FlagModal({ session, onClose, onSubmit }) {
  const [flagType, setFlagType] = useState('absent');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [note, setNote] = useState('');

  const flagTypes = [
    { id: 'absent', label: '결석', icon: '❌' },
    { id: 'early_leave', label: '조퇴', icon: '🚶' },
    { id: 'late', label: '지각', icon: '⏰' },
    { id: 'injury', label: '부상', icon: '🩹' },
    { id: 'other', label: '기타', icon: '📝' },
  ];

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSubmit = () => {
    if (selectedStudents.length === 0 && flagType !== 'other') {
      return;
    }

    const flagData = {
      type: flagTypes.find(f => f.id === flagType)?.label,
      absentIds: flagType === 'absent' ? selectedStudents : [],
      affectedIds: selectedStudents,
      note,
      timestamp: new Date().toISOString(),
    };

    onSubmit(session, flagData);
  };

  if (!session) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white w-full rounded-t-3xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">⚠️ 이상 보고</h2>
            <button onClick={onClose} className="p-2 text-gray-400">✕</button>
          </div>
          <p className="text-sm text-gray-500 mt-1">{session.className}</p>
        </div>

        <div className="p-4 space-y-4">
          {/* 유형 선택 */}
          <div>
            <p className="font-medium text-gray-700 mb-2">보고 유형</p>
            <div className="flex flex-wrap gap-2">
              {flagTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setFlagType(type.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    flagType === type.id
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {type.icon} {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* 학생 선택 (결석/조퇴/지각/부상) */}
          {flagType !== 'other' && (
            <div>
              <p className="font-medium text-gray-700 mb-2">해당 학생 선택</p>
              <div className="grid grid-cols-3 gap-2">
                {session.students.map(student => (
                  <button
                    key={student.id}
                    onClick={() => toggleStudent(student.id)}
                    className={`p-3 rounded-xl text-sm font-medium transition-colors ${
                      selectedStudents.includes(student.id)
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {student.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 메모 */}
          <div>
            <p className="font-medium text-gray-700 mb-2">메모 (선택)</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="추가 사항이 있으면 입력하세요"
              className="w-full p-3 border rounded-xl resize-none h-20"
            />
          </div>

          {/* 제출 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={selectedStudents.length === 0 && flagType !== 'other'}
            className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            보고하기
          </button>

          {/* 안내 */}
          <p className="text-xs text-gray-400 text-center">
            결석 보고 시 학부모에게 자동으로 알림톡이 발송됩니다
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// 영상 촬영 프롬프트 (수업 종료 후)
// ============================================
function VideoPrompt({ session, onClose, showToast }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    setUploading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    window.open('https://studio.youtube.com/channel/upload', '_blank');
    setUploading(false);
    showToast('YouTube Studio로 이동합니다');
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white w-full max-w-sm rounded-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white text-center">
          <span className="text-5xl block mb-3">🎬</span>
          <h2 className="text-xl font-bold">수업이 끝났습니다!</h2>
          <p className="text-orange-100 mt-1">{session.className}</p>
        </div>

        {/* 내용 */}
        <div className="p-6 text-center">
          <p className="text-gray-700 mb-6">
            오늘 수업의 <strong>성장 기록</strong>을 남겨주세요.<br/>
            학부모님이 아이의 발전을 확인할 수 있습니다.
          </p>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-4 bg-red-500 text-white rounded-xl font-bold mb-3 active:scale-[0.98] transition-transform"
          >
            {uploading ? '이동 중...' : '📹 영상 업로드하기'}
          </button>

          <button
            onClick={handleSkip}
            className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-medium"
          >
            나중에 하기
          </button>
        </div>

        {/* 팁 */}
        <div className="bg-blue-50 px-6 py-4">
          <p className="text-sm text-blue-700">
            💡 <strong>촬영 팁:</strong> 연습 장면, 게임 하이라이트, 기술 향상 모습
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
