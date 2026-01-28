/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 👨‍👩‍👧 ParentDashboard - 학부모 대시보드
 * 
 * 핵심 질문: "우리 아이가 얼마나 성장했나요?"
 * 
 * First View 우선순위:
 * 1️⃣ 성장 곡선 (과거 → 현재 → 미래)
 * 2️⃣ 현재 상태 (별점)
 * 3️⃣ 이번 주 리포트
 * 4️⃣ 선생님 칭찬 메시지
 * 
 * AUTUS 연동:
 * - σ 히스토리 → 성장 곡선
 * - Quick Tag 데이터 → 선생님 메시지
 * - 현재 σ → 별점 변환
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════════════════════════

export interface GrowthData {
  month: string;
  score: number;
}

export interface StatusItem {
  label: string;
  stars: number;
  description: string;
}

export interface WeeklyReport {
  attendance: { current: number; total: number };
  homework: { current: number; total: number };
  testScore: { score: number; change: number };
}

export interface TeacherMessage {
  teacherName: string;
  message: string;
  time: string;
}

interface ParentDashboardProps {
  childName: string;
  childGrade: string;
  subject: string;
  growthData?: GrowthData[];
  predictedScore?: number;
  statusItems?: StatusItem[];
  weeklyReport?: WeeklyReport;
  teacherMessage?: TeacherMessage;
  stabilityStatus?: 'stable' | 'attention' | 'risk';
  onMessageReply?: (teacherName: string) => void;
  onCelebrate?: (icon: string, title: string, description: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 샘플 데이터
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_GROWTH: GrowthData[] = [
  { month: '9월', score: 65 },
  { month: '10월', score: 72 },
  { month: '11월', score: 78 },
  { month: '12월', score: 83 },
  { month: '1월', score: 88 },
];

const SAMPLE_STATUS: StatusItem[] = [
  { label: '수학 실력', stars: 4, description: '상위 25%' },
  { label: '학습 태도', stars: 5, description: '매우 좋음' },
  { label: '자신감', stars: 3, description: '성장 중' },
];

const SAMPLE_WEEKLY: WeeklyReport = {
  attendance: { current: 5, total: 5 },
  homework: { current: 4, total: 5 },
  testScore: { score: 88, change: 5 },
};

const SAMPLE_MESSAGE: TeacherMessage = {
  teacherName: '김선생님',
  message: '어머니, 민수가 오늘 수업에서 정말 잘했어요! 스스로 문제 풀이 방법을 찾아내더라고요. 😊',
  time: '오늘 5:30 PM',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export default function ParentDashboard({
  childName = '민수',
  childGrade = '초등 5학년',
  subject = '수학',
  growthData = SAMPLE_GROWTH,
  predictedScore = 95,
  statusItems = SAMPLE_STATUS,
  weeklyReport = SAMPLE_WEEKLY,
  teacherMessage = SAMPLE_MESSAGE,
  stabilityStatus = 'stable',
  onMessageReply,
  onCelebrate,
}: ParentDashboardProps) {

  const renderStars = (count: number) => {
    return Array(5).fill(0).map((_, i) => (
      <span key={i} className={i < count ? 'text-yellow-400' : 'text-slate-600'}>⭐</span>
    ));
  };

  const getStabilityDisplay = () => {
    switch (stabilityStatus) {
      case 'stable':
        return { color: 'green', emoji: '🟢', text: '안정적', message: '😌 걱정하지 않으셔도 돼요!' };
      case 'attention':
        return { color: 'yellow', emoji: '🟡', text: '관심 필요', message: '💪 조금만 관심 가져주세요' };
      case 'risk':
        return { color: 'red', emoji: '🔴', text: '주의', message: '📞 상담이 필요해요' };
    }
  };

  const stability = getStabilityDisplay();
  const totalGrowth = growthData.length > 1 
    ? growthData[growthData.length - 1].score - growthData[0].score 
    : 0;

  return (
    <div className="p-4 pb-24">
      {/* 헤더 */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🌱</span>
          <div>
            <h1 className="text-xl font-bold">{childName}의 성장 이야기</h1>
            <p className="text-slate-400 text-sm">{childGrade} • {subject}</p>
          </div>
        </div>
      </header>

      {/* 칭찬 메시지 */}
      {teacherMessage && (
        <section className="mb-6 p-4 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-xl border border-pink-500/30">
          <div className="flex items-center gap-2 mb-2">
            <span>🧑‍🏫</span>
            <span className="text-sm text-pink-300">{teacherMessage.teacherName}</span>
            <span className="text-xs text-slate-500 ml-auto">{teacherMessage.time}</span>
          </div>
          <p className="text-sm leading-relaxed">{teacherMessage.message}</p>
          <div className="flex gap-3 mt-3 text-sm">
            <button className="text-pink-400 hover:text-pink-300 transition-colors">
              ❤️ 좋아요
            </button>
            <button 
              onClick={() => onMessageReply?.(teacherMessage.teacherName)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              💬 답장
            </button>
          </div>
        </section>
      )}

      {/* 성장 곡선 */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">📈 성장 곡선</h2>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          {/* 차트 */}
          <div className="h-32 flex items-end justify-between gap-2 mb-3">
            {growthData.map((data, idx) => {
              const height = ((data.score - 50) / 50) * 100;
              const isLatest = idx === growthData.length - 1;
              return (
                <div key={data.month} className="flex-1 flex flex-col items-center">
                  <span className="text-xs mb-1">{data.score}</span>
                  <div 
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      isLatest ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-slate-400 mt-1">{data.month}</span>
                </div>
              );
            })}
            
            {/* 예상 점수 */}
            <div className="flex-1 flex flex-col items-center">
              <span className="text-xs text-cyan-400 mb-1">{predictedScore}</span>
              <div 
                className="w-full rounded-t-lg bg-cyan-400/30 border-2 border-dashed border-cyan-400"
                style={{ height: `${((predictedScore - 50) / 50) * 100}%` }}
              />
              <span className="text-xs text-cyan-400 mt-1">예상</span>
            </div>
          </div>
          
          {/* 성장 요약 */}
          <div className="text-center p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
            <span className="text-green-400">
              🎉 {growthData.length - 1}개월간 +{totalGrowth}점 성장!
            </span>
          </div>
        </div>
      </section>

      {/* 현재 상태 */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">📍 지금 {childName}는</h2>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {statusItems.map((item, idx) => (
            <div key={idx} className="p-3 bg-slate-800/50 rounded-xl text-center border border-slate-700/50">
              <div className="text-xs text-slate-400 mb-1">{item.label}</div>
              <div className="text-sm mb-1">{renderStars(item.stars)}</div>
              <div className="text-xs text-slate-300">{item.description}</div>
            </div>
          ))}
        </div>
        
        {/* 안정 상태 */}
        <div className={`p-3 bg-${stability.color}-500/10 border border-${stability.color}-500/30 rounded-xl`}
          style={{
            backgroundColor: `rgba(${stability.color === 'green' ? '34, 197, 94' : stability.color === 'yellow' ? '234, 179, 8' : '239, 68, 68'}, 0.1)`,
            borderColor: `rgba(${stability.color === 'green' ? '34, 197, 94' : stability.color === 'yellow' ? '234, 179, 8' : '239, 68, 68'}, 0.3)`,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{stability.emoji}</span>
            <span className={`font-medium ${
              stability.color === 'green' ? 'text-green-400' : 
              stability.color === 'yellow' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {stability.text}
            </span>
          </div>
          <p className={`text-sm mt-1 ${
            stability.color === 'green' ? 'text-green-200' : 
            stability.color === 'yellow' ? 'text-yellow-200' : 'text-red-200'
          }`}>
            {stability.message}
          </p>
        </div>
      </section>

      {/* 이번 주 */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">📋 이번 주</h2>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-slate-400 mb-1">출석</div>
              <div className={`text-xl font-bold ${
                weeklyReport.attendance.current === weeklyReport.attendance.total 
                  ? 'text-green-400' 
                  : 'text-yellow-400'
              }`}>
                {weeklyReport.attendance.current}/{weeklyReport.attendance.total}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">숙제</div>
              <div className={`text-xl font-bold ${
                weeklyReport.homework.current === weeklyReport.homework.total 
                  ? 'text-green-400' 
                  : 'text-yellow-400'
              }`}>
                {weeklyReport.homework.current}/{weeklyReport.homework.total}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">테스트</div>
              <div className="text-xl font-bold text-blue-400">
                {weeklyReport.testScore.score}점
              </div>
              {weeklyReport.testScore.change !== 0 && (
                <div className={`text-xs ${weeklyReport.testScore.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {weeklyReport.testScore.change > 0 ? '+' : ''}{weeklyReport.testScore.change}↑
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 또래 비교 */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">👥 또래 비교</h2>
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">수학 실력</span>
            <div className="text-sm">
              <span className="text-white font-medium">{childName} {weeklyReport.testScore.score}점</span>
              <span className="text-slate-500 mx-2">|</span>
              <span className="text-slate-400">평균 75점</span>
              <span className="text-green-400 ml-2">+{weeklyReport.testScore.score - 75}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">출석률</span>
            <div className="text-sm">
              <span className="text-white font-medium">{childName} 98%</span>
              <span className="text-slate-500 mx-2">|</span>
              <span className="text-slate-400">평균 92%</span>
              <span className="text-green-400 ml-2">+6%</span>
            </div>
          </div>
        </div>
        <div className="mt-2 text-center text-sm text-cyan-400">
          ✨ {childName}는 또래보다 앞서가고 있어요!
        </div>
      </section>

      {/* 좋은 부모 (도파민: 의미 부여) */}
      <section className="p-4 bg-gradient-to-br from-pink-900/30 to-purple-900/30 rounded-xl border border-pink-500/30 text-center">
        <div className="text-3xl mb-2">💝</div>
        <h3 className="font-medium mb-1">부모님의 선택이 만든 변화</h3>
        <p className="text-sm text-slate-300">
          {growthData.length - 1}개월 전 {growthData[0]?.score}점이었던 {childName}가 지금은 {growthData[growthData.length - 1]?.score}점!
        </p>
        <p className="text-pink-300 mt-2 text-sm">좋은 선택이 {childName}를 바꿨습니다 ✨</p>
      </section>
    </div>
  );
}
