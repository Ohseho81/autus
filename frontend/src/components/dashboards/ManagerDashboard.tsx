/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚙️ ManagerDashboard - 관리자(실장) 대시보드
 * 
 * 핵심 질문: "전체 상황이 어때요?"
 * 
 * First View 우선순위:
 * 1️⃣ 핵심 지표 4개 (전체 학생, 관심 필요, 평균 온도, 이탈)
 * 2️⃣ 이번 주 변화량
 * 3️⃣ 관심 필요 학생 목록
 * 4️⃣ 선생님별 현황
 * 
 * AUTUS 연동:
 * - σ 데이터 → KPI 지표
 * - Risk Queue → 관심 필요 학생
 * - Quick Tag 기록 → 선생님별 현황
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { ChangeIndicator } from '../motivation';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════════════════════════

export interface KPIStat {
  icon: string;
  label: string;
  value: string;
  change?: string;
  isGood?: boolean;
  subtext?: string;
  isAlert?: boolean;
}

export interface WeeklyChange {
  metric: string;
  before: number;
  after: number;
  unit: string;
  isGood: boolean;
}

export interface AttentionStudentManager {
  id: string;
  name: string;
  temperature: number;
  emoji: string;
  reason: string;
  teacherName: string;
  status: 'pending' | 'inProgress' | 'resolved';
}

export interface TeacherStatus {
  name: string;
  studentCount: number;
  avgTemperature: number;
  attentionCount: number;
  recordCount: number;
  hasWarning?: boolean;
}

interface ManagerDashboardProps {
  stats?: KPIStat[];
  weeklyChanges?: WeeklyChange[];
  attentionStudents?: AttentionStudentManager[];
  teachers?: TeacherStatus[];
  onStudentAction?: (studentId: string, action: 'shield' | 'resolve' | 'escalate' | 'dismiss') => void;
  onTeacherMessage?: (teacherName: string) => void;
  onCelebrate?: (icon: string, title: string, description: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 샘플 데이터
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_STATS: KPIStat[] = [
  { icon: '🎒', label: '전체 학생', value: '132명', change: '+3', isGood: true },
  { icon: '🚨', label: '관심 필요', value: '5명', change: '+2', isGood: false, isAlert: true },
  { icon: '🌡️', label: '평균 온도', value: '78°', change: '-3', isGood: false },
  { icon: '📉', label: '이번 달 이탈', value: '2명', subtext: '목표 5명' },
];

const SAMPLE_WEEKLY: WeeklyChange[] = [
  { metric: '관심필요', before: 5, after: 3, unit: '명', isGood: true },
  { metric: '평균 온도', before: 74, after: 78, unit: '°', isGood: true },
  { metric: '기록률', before: 65, after: 82, unit: '%', isGood: true },
  { metric: '미조치', before: 8, after: 2, unit: '건', isGood: true },
];

const SAMPLE_STUDENTS: AttentionStudentManager[] = [
  { id: '1', name: '김민수', temperature: 36, emoji: '🥶', reason: '비용 고민', teacherName: '김선생님', status: 'inProgress' },
  { id: '2', name: '이서연', temperature: 52, emoji: '😰', reason: '3회 지각', teacherName: '이선생님', status: 'pending' },
  { id: '3', name: '박준혁', temperature: 58, emoji: '😰', reason: '소통 없음', teacherName: '김선생님', status: 'pending' },
];

const SAMPLE_TEACHERS: TeacherStatus[] = [
  { name: '김선생님', studentCount: 35, avgTemperature: 82, attentionCount: 2, recordCount: 3 },
  { name: '이선생님', studentCount: 42, avgTemperature: 76, attentionCount: 2, recordCount: 1, hasWarning: true },
  { name: '박선생님', studentCount: 28, avgTemperature: 85, attentionCount: 1, recordCount: 5 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export default function ManagerDashboard({
  stats = SAMPLE_STATS,
  weeklyChanges = SAMPLE_WEEKLY,
  attentionStudents = SAMPLE_STUDENTS,
  teachers = SAMPLE_TEACHERS,
  onStudentAction,
  onTeacherMessage,
  onCelebrate,
}: ManagerDashboardProps) {

  const getStatusBadge = (status: AttentionStudentManager['status']) => {
    const badges = {
      pending: { bg: 'bg-red-500/20', text: 'text-red-400', label: '🔴 미조치' },
      inProgress: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '⏳ 진행중' },
      resolved: { bg: 'bg-green-500/20', text: 'text-green-400', label: '✅ 완료' },
    };
    const b = badges[status];
    return <span className={`px-2 py-0.5 ${b.bg} ${b.text} text-xs rounded-full`}>{b.label}</span>;
  };

  const handleResolve = (studentId: string) => {
    onStudentAction?.(studentId, 'resolve');
    onCelebrate?.('✅', '해결 완료!', '해결률이 올라갔어요');
  };

  return (
    <div className="p-4 pb-24">
      {/* 헤더 */}
      <header className="mb-6">
        <h1 className="text-xl font-bold">📊 한눈에 보기</h1>
        <p className="text-slate-400 text-sm">
          {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
      </header>

      {/* 핵심 지표 4개 */}
      <section className="grid grid-cols-2 gap-3 mb-6">
        {stats.map((stat, idx) => (
          <div 
            key={idx} 
            className={`p-3 bg-slate-800/50 rounded-xl border ${
              stat.isAlert ? 'border-red-500/30' : 'border-slate-700/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{stat.icon}</span>
              <span className="text-xs text-slate-400">{stat.label}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className={`text-xl font-bold ${stat.isAlert ? 'text-red-400' : ''}`}>
                {stat.value}
              </span>
              {stat.change && (
                <span className={`text-xs ${stat.isGood ? 'text-green-400' : 'text-red-400'}`}>
                  {stat.isGood ? '↑' : '↓'}{stat.change.replace(/[+-]/, '')}
                </span>
              )}
              {stat.subtext && (
                <span className="text-xs text-slate-500">{stat.subtext}</span>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* 이번 주 변화 */}
      <section className="mb-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/30">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          📈 이번 주 변화
          <span className="text-xs text-green-400 font-normal">지난주보다 좋아졌어요!</span>
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {weeklyChanges.map((change, idx) => (
            <div key={idx} className="text-center">
              <div className="text-xs text-slate-400 mb-1">{change.metric}</div>
              <div className="flex items-center justify-center gap-1 text-sm">
                <span className="text-slate-500">{change.before}</span>
                <span className={change.isGood ? 'text-green-400' : 'text-red-400'}>→</span>
                <span className="font-bold">{change.after}{change.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 관심 필요 학생 */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          🚨 관심 필요
          <span className="text-sm text-slate-400">({attentionStudents.length}명)</span>
        </h2>
        <div className="space-y-2">
          {attentionStudents.map((student) => (
            <div 
              key={student.id} 
              className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span>🎒</span>
                  <div>
                    <div className="font-medium">{student.name}</div>
                    <div className="text-xs text-slate-400">
                      {student.reason} • {student.teacherName}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {student.emoji} {student.temperature}°
                  </span>
                  {getStatusBadge(student.status)}
                </div>
              </div>
              
              {/* 액션 버튼 (미조치일 때만) */}
              {student.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => onStudentAction?.(student.id, 'shield')}
                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium transition-colors"
                  >
                    🛡️ 먼저 챙기기
                  </button>
                  <button 
                    onClick={() => handleResolve(student.id)}
                    className="flex-1 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-medium transition-colors"
                  >
                    ✅ 해결됨
                  </button>
                  <button 
                    onClick={() => onStudentAction?.(student.id, 'escalate')}
                    className="py-1.5 px-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium transition-colors"
                  >
                    ⬆️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 선생님별 현황 */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">👨‍🏫 선생님별 현황</h2>
        <div className="space-y-2">
          {teachers.map((teacher, idx) => (
            <div 
              key={idx} 
              className={`p-3 rounded-xl border ${
                teacher.hasWarning 
                  ? 'bg-yellow-500/5 border-yellow-500/30' 
                  : 'bg-slate-800/50 border-slate-700/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>🧑‍🏫</span>
                  <span className="font-medium">{teacher.name}</span>
                  {teacher.hasWarning && <span className="text-yellow-500">⚠️</span>}
                  <span className="text-xs text-slate-400">({teacher.studentCount}명)</span>
                </div>
                <div className="flex gap-4 text-xs">
                  <span>온도 <span className="text-white font-medium">{teacher.avgTemperature}°</span></span>
                  <span>관심 <span className={teacher.attentionCount > 0 ? 'text-red-400' : 'text-green-400'}>{teacher.attentionCount}</span></span>
                  <span>기록 <span className={teacher.recordCount < 2 ? 'text-yellow-400' : 'text-white'}>{teacher.recordCount}</span></span>
                </div>
              </div>
              
              {teacher.hasWarning && (
                <div className="mt-2 flex justify-end">
                  <button 
                    onClick={() => onTeacherMessage?.(teacher.name)}
                    className="text-xs text-yellow-400 hover:text-yellow-300"
                  >
                    💬 메시지 보내기
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 내가 막은 이탈 (도파민: 구체적 가치 확인) */}
      <section className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/30">
        <h3 className="text-sm font-semibold mb-2">🛡️ 이번 주 방어 성공</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">3명</div>
            <div className="text-xs text-slate-400">이탈 방지</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">₩1,200,000</div>
            <div className="text-xs text-slate-400">손실 방지</div>
          </div>
        </div>
        <div className="text-center text-purple-300 text-xs mt-3">
          ✨ 실장님 덕분에 이번 주도 안전해요!
        </div>
      </section>
    </div>
  );
}
