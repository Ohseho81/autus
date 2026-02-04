/**
 * 🏀 AUTUS 강사 UI - FREEZE 버전
 *
 * ═══════════════════════════════════════════════════════════════
 * FREEZE 가드레일:
 * - 화면 수 = 1 (스크롤 없음, 탭 없음, 메뉴 없음)
 * - 오늘만 표시 (과거/미래 탐색 금지)
 * - 버튼: 시작 OR 종료 (동시에 2개 금지)
 * - 보조: 이상 발생 (상세 입력 금지)
 * - 강사는 입력하지 않는다 = 0
 * ═══════════════════════════════════════════════════════════════
 *
 * "수업 시작할 때 누르고, 끝날 때 누르세요.
 *  나머지는 시스템이 합니다."
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// SESSION 상태 (상태 머신 고정)
// SCHEDULED → IN_PROGRESS → COMPLETED
// ============================================
const STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

// ============================================
// 상태별 스타일 (색상으로 상태 전달 + 텍스트 필수)
// ============================================
const STATUS_STYLE = {
  [STATUS.SCHEDULED]: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    label: '예정',
    border: 'border-gray-200',
  },
  [STATUS.IN_PROGRESS]: {
    bg: 'bg-green-500',
    text: 'text-white',
    label: '진행 중',
    border: 'border-green-500',
  },
  [STATUS.COMPLETED]: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    label: '완료',
    border: 'border-blue-200',
  },
};

// ============================================
// 오늘의 세션 (데모 데이터)
// ============================================
const getTodaySessions = () => {
  const now = new Date();
  const currentHour = now.getHours();

  return [
    {
      id: 's1',
      group: '유아 기초반',
      time: '15:00 - 15:50',
      location: 'A코트',
      status: currentHour >= 16 ? STATUS.COMPLETED : currentHour >= 15 ? STATUS.IN_PROGRESS : STATUS.SCHEDULED,
      recording: currentHour >= 15 && currentHour < 16 ? 'recording' : currentHour >= 16 ? 'saved' : null,
    },
    {
      id: 's2',
      group: '초저 기초반',
      time: '16:00 - 17:00',
      location: 'A코트',
      status: currentHour >= 17 ? STATUS.COMPLETED : currentHour >= 16 ? STATUS.IN_PROGRESS : STATUS.SCHEDULED,
      recording: currentHour >= 16 && currentHour < 17 ? 'recording' : currentHour >= 17 ? 'saved' : null,
    },
    {
      id: 's3',
      group: '초고 심화반',
      time: '17:00 - 18:00',
      location: 'A코트',
      status: currentHour >= 18 ? STATUS.COMPLETED : currentHour >= 17 ? STATUS.IN_PROGRESS : STATUS.SCHEDULED,
      recording: currentHour >= 17 && currentHour < 18 ? 'recording' : currentHour >= 18 ? 'saved' : null,
    },
    {
      id: 's4',
      group: '중등 기초반',
      time: '18:00 - 19:30',
      location: 'A코트',
      status: STATUS.SCHEDULED,
      recording: null,
    },
  ];
};

// ============================================
// 메인 컴포넌트 - FREEZE UI
// ============================================
export default function CoachUI() {
  const [sessions, setSessions] = useState(getTodaySessions);
  const [toast, setToast] = useState(null);

  // 오늘 날짜 (읽기 전용)
  const today = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  });

  // 현재 진행 중인 세션 찾기
  const activeSession = sessions.find(s => s.status === STATUS.IN_PROGRESS);

  // Toast 표시
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  // ============================================
  // 핵심 액션 1: 수업 시작
  // ============================================
  const handleStart = (sessionId) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, status: STATUS.IN_PROGRESS, recording: 'recording' }
        : s
    ));
    showToast('수업 시작');
  };

  // ============================================
  // 핵심 액션 2: 수업 종료
  // ============================================
  const handleEnd = (sessionId) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, status: STATUS.COMPLETED, recording: 'saved' }
        : s
    ));
    showToast('수업 종료');
  };

  // ============================================
  // 보조 액션: 이상 발생 (입력 없이 즉시 관리자 큐로)
  // ============================================
  const handleFlag = (sessionId) => {
    // 즉시 관리자 예외 큐로 전송 (강사는 아무것도 입력하지 않음)
    showToast('이상 발생 → 관리자 전달됨');
    // TODO: API 호출 - POST /api/exception-queue
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* ============================================
          ① 상단 상태 바 (읽기 전용)
          - 날짜만 표시
          - 설정 ❌ 프로필 ❌ 메뉴 ❌
          ============================================ */}
      <header className="px-5 py-4 border-b border-gray-800">
        <p className="text-lg font-medium text-center">
          오늘 | {today}
        </p>
      </header>

      {/* ============================================
          ② 오늘 수업 리스트 (중앙 80%)
          - 스크롤 허용 (세션이 많을 경우)
          - 과거/미래 탐색 금지
          ============================================ */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {sessions.map(session => (
          <SessionCard
            key={session.id}
            session={session}
            isActive={activeSession?.id === session.id}
            onStart={() => handleStart(session.id)}
            onEnd={() => handleEnd(session.id)}
            onFlag={() => handleFlag(session.id)}
          />
        ))}

        {sessions.length === 0 && (
          <div className="text-center text-gray-500 py-20">
            오늘 수업이 없습니다
          </div>
        )}
      </main>

      {/* ============================================
          Toast 알림
          ============================================ */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full font-medium shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// 세션 카드 컴포넌트
// - 정보: 시간/그룹/장소/상태만
// - 버튼: 1개만 노출 (시작 OR 종료)
// ============================================
function SessionCard({ session, isActive, onStart, onEnd, onFlag }) {
  const style = STATUS_STYLE[session.status];

  return (
    <div
      className={`rounded-2xl border-2 overflow-hidden transition-all ${
        isActive ? 'border-green-500 bg-green-500/10' : 'border-gray-800 bg-gray-900'
      }`}
    >
      {/* 카드 상단: 그룹명 + 상태 + 녹화 아이콘 */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">{session.group}</h3>
            <p className="text-gray-400 text-sm mt-1">
              {session.time} · {session.location}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* 영상 상태 아이콘 (강사는 확인만) */}
            {session.recording && (
              <span className="text-lg" title={session.recording === 'recording' ? '녹화 중' : '저장 완료'}>
                {session.recording === 'recording' ? '🔴' : '🟢'}
              </span>
            )}

            {/* 상태 뱃지 */}
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
              {session.status === STATUS.IN_PROGRESS && (
                <span className="inline-block w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
              )}
              {style.label}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================
          ③ 메인 액션 버튼 (상태별 1개만 노출)
          - 수업 전: [수업 시작]
          - 수업 중: [수업 종료]
          - 완료: 버튼 없음
          ============================================ */}
      {session.status !== STATUS.COMPLETED && (
        <div className="p-4 pt-0 space-y-2">
          {/* Primary Button - 화면 하단, 엄지 도달 범위 */}
          {session.status === STATUS.SCHEDULED && (
            <button
              onClick={onStart}
              className="w-full py-5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-xl font-bold rounded-xl transition-colors"
            >
              수업 시작
            </button>
          )}

          {session.status === STATUS.IN_PROGRESS && (
            <>
              <button
                onClick={onEnd}
                className="w-full py-5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-xl font-bold rounded-xl transition-colors"
              >
                수업 종료
              </button>

              {/* ④ 보조 액션: 이상 발생 (우측 하단, 작게) */}
              <button
                onClick={onFlag}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-yellow-400 text-sm font-medium rounded-xl transition-colors"
              >
                ⚠️ 이상 발생
              </button>
            </>
          )}
        </div>
      )}

      {/* 완료 상태 */}
      {session.status === STATUS.COMPLETED && (
        <div className="px-4 pb-4">
          <div className="py-3 text-center text-gray-500 text-sm">
            ✓ 수업 완료
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// 🚫 이 컴포넌트에 없는 것 (의도적)
// ============================================
// - 출석 명단 ❌
// - 학생 이름 ❌
// - 평가/코멘트 ❌
// - 채팅 ❌
// - 알림 ❌
// - 통계 ❌
// - 설정 ❌
// - 프로필 ❌
// - 메뉴 ❌
// - 스케줄 변경 ❌
// - 보충 처리 ❌
// - 수납/결제 정보 ❌
// ============================================

// ============================================
// 🔒 UX 강제 규칙 (FREEZE)
// ============================================
// 1. 한 화면, 세로 스크롤만 허용
// 2. 동시에 두 판단 버튼 금지 (시작/종료 중 1개만)
// 3. 텍스트보다 색/위치 우선
// 4. 강사가 입력하는 데이터 = 0
// ============================================
