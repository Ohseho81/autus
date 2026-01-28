/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔨 TeacherDashboard - 실무자(선생님) 대시보드
 * 
 * 핵심 질문: "지금 뭐 해야 해요?"
 * 
 * First View 우선순위:
 * 1️⃣ 지금 바로 (관심 필요 학생)
 * 2️⃣ 오늘 수업 일정
 * 3️⃣ 바로 기록 버튼
 * 4️⃣ 연속 기록
 * 
 * AUTUS 연동:
 * - Risk Queue → "지금 바로" 섹션
 * - Quick Tag → 플로팅 기록 버튼
 * - σ 데이터 → 학생 온도 표시
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { StreakBadge, ProgressRing } from '../motivation';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════════════════════════

export interface AttentionStudent {
  id: string;
  name: string;
  temperature: number;      // σ 기반 온도
  emoji: string;
  reason: string;
  suggestion: string;
  teacherId?: string;
}

export interface ClassSchedule {
  time: string;
  name: string;
  studentCount: number;
  alerts: string[];
}

interface TeacherDashboardProps {
  teacherName: string;
  streak: number;
  todayCompleted: number;
  todayTotal: number;
  attentionStudents: AttentionStudent[];
  todayClasses: ClassSchedule[];
  onRecordStudent?: (studentId: string) => void;
  onMessageStudent?: (studentId: string) => void;
  onQuickTag?: () => void;
  onCelebrate?: (icon: string, title: string, description: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 샘플 데이터
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_STUDENTS: AttentionStudent[] = [
  { 
    id: '1', 
    name: '김민수', 
    temperature: 36, 
    emoji: '🥶', 
    reason: '어제 어머니가 "학원 그만둘까 고민중"이라고 하셨어요',
    suggestion: '오늘 수업 전에 민수랑 5분 대화해보세요'
  },
  { 
    id: '2', 
    name: '이서연', 
    temperature: 52, 
    emoji: '😰', 
    reason: '3회 연속 지각, 오늘도 아직 출석 전',
    suggestion: '출석하면 "요즘 힘든 일 있어?" 물어봐주세요'
  },
];

const SAMPLE_CLASSES: ClassSchedule[] = [
  { time: '15:00', name: '초등 3반', studentCount: 8, alerts: ['🎂 박지민 오늘 생일', '⚠️ 최유진 숙제 미제출'] },
  { time: '16:30', name: '초등 4반', studentCount: 6, alerts: [] },
  { time: '18:00', name: '중등 1반', studentCount: 7, alerts: ['🥶 김민수 관심 필요'] },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export default function TeacherDashboard({
  teacherName = '김선생님',
  streak = 15,
  todayCompleted = 3,
  todayTotal = 5,
  attentionStudents = SAMPLE_STUDENTS,
  todayClasses = SAMPLE_CLASSES,
  onRecordStudent,
  onMessageStudent,
  onQuickTag,
  onCelebrate,
}: TeacherDashboardProps) {
  const [completed, setCompleted] = useState(todayCompleted);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '좋은 아침이에요';
    if (hour < 18) return '좋은 오후예요';
    return '수고하셨어요';
  };

  const handleComplete = (studentId: string) => {
    setCompleted(prev => Math.min(prev + 1, todayTotal));
    onRecordStudent?.(studentId);
    onCelebrate?.('✅', '기록 완료!', '+50 XP 획득');
  };

  const getTemperatureColor = (temp: number) => {
    if (temp < 40) return 'text-blue-400';
    if (temp < 60) return 'text-yellow-400';
    if (temp < 80) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="p-4 pb-24">
      {/* 헤더 */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">🌅 {getGreeting()}, {teacherName}!</h1>
            <p className="text-slate-400 text-sm">
              {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
          </div>
          
          {/* 연속 기록 */}
          <StreakBadge 
            count={streak} 
            type="days" 
            size="md"
            nextMilestone={Math.ceil(streak / 10) * 10 + 10}
          />
        </div>

        {/* 진행률 */}
        <div className="mt-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">오늘 할 일</span>
            <span>{completed}/{todayTotal} 완료</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${(completed / todayTotal) * 100}%` }}
            />
          </div>
          {completed === todayTotal - 1 && (
            <p className="text-xs text-cyan-400 mt-2">🎉 하나만 더 하면 오늘 완료!</p>
          )}
          {completed === todayTotal && (
            <p className="text-xs text-green-400 mt-2">✅ 오늘 할 일 완료!</p>
          )}
        </div>
      </header>

      {/* 지금 바로 (관심 필요 학생) */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          🚨 지금 바로
          {attentionStudents.length > 0 && (
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-sm rounded-full">
              {attentionStudents.length}
            </span>
          )}
        </h2>

        {attentionStudents.length === 0 ? (
          <div className="p-6 bg-slate-800/50 rounded-xl text-center border border-slate-700/50">
            <span className="text-4xl">😊</span>
            <p className="text-slate-400 mt-2">오늘 케어할 학생이 없어요!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attentionStudents.map(student => (
              <div 
                key={student.id} 
                className="p-4 rounded-xl border border-red-500/30 bg-red-500/5"
              >
                {/* 학생 정보 */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>🎒</span>
                    <span className="font-medium">{student.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{student.emoji}</span>
                    <span className={`text-sm font-medium ${getTemperatureColor(student.temperature)}`}>
                      {student.temperature}°
                    </span>
                  </div>
                </div>

                {/* 이유 */}
                <p className="text-sm text-slate-300 mb-3">{student.reason}</p>

                {/* AI 추천 */}
                <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-3">
                  <div className="text-xs text-blue-400">💡 추천</div>
                  <div className="text-sm text-blue-200">{student.suggestion}</div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => onMessageStudent?.(student.id)}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
                  >
                    💬 메시지
                  </button>
                  <button 
                    onClick={() => handleComplete(student.id)}
                    className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                  >
                    ✏️ 기록
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 오늘 수업 */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">📅 오늘 수업 ({todayClasses.length}개)</h2>
        <div className="space-y-2">
          {todayClasses.map((cls, idx) => (
            <div 
              key={idx} 
              className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-cyan-400 font-medium font-mono">{cls.time}</span>
                  <div>
                    <div className="font-medium">{cls.name}</div>
                    <div className="text-xs text-slate-400">{cls.studentCount}명</div>
                  </div>
                </div>
                {cls.alerts.length > 0 ? (
                  <div className="text-right text-xs text-slate-400 space-y-0.5">
                    {cls.alerts.map((alert, i) => (
                      <div key={i}>{alert}</div>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-green-400">✨ 모두 정상</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 이번 주 효과 (도파민: 내 행동 → 결과 연결) */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">📊 이번 주 나의 효과</h2>
        <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/30">
          <div className="text-center mb-3">
            <span className="text-sm text-slate-400">지난주 챙긴 학생들의 온도 변화</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 bg-slate-800/50 rounded-lg">
              <div className="text-xs text-slate-400">김민수</div>
              <div className="text-sm">🥶 36° → 😐 68°</div>
              <div className="text-xs text-green-400">+32°</div>
            </div>
            <div className="text-center p-2 bg-slate-800/50 rounded-lg">
              <div className="text-xs text-slate-400">이서연</div>
              <div className="text-sm">😰 52° → 😊 75°</div>
              <div className="text-xs text-green-400">+23°</div>
            </div>
            <div className="text-center p-2 bg-slate-800/50 rounded-lg">
              <div className="text-xs text-slate-400">박준혁</div>
              <div className="text-sm">😰 58° → 😊 72°</div>
              <div className="text-xs text-green-400">+14°</div>
            </div>
          </div>
          <div className="text-center text-green-400 text-sm">
            ✨ 선생님 덕분에 3명이 안정됐어요!
          </div>
        </div>
      </section>

      {/* 플로팅 기록 버튼 */}
      <button 
        onClick={() => {
          onQuickTag?.();
          handleComplete('quick');
        }}
        className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-2xl hover:scale-110 transition-transform z-30"
      >
        ✏️
      </button>
    </div>
  );
}
