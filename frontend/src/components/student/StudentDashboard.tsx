/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎒 StudentDashboard - 학생 대시보드
 * 
 * 핵심 질문: "내가 뭘 왜 어떻게 해야 해?"
 * 
 * First View 우선순위:
 * 1️⃣ 레벨 & XP 바
 * 2️⃣ 연속 기록 (Streak)
 * 3️⃣ 오늘의 미션 (What/How/Why)
 * 4️⃣ 꿈 로드맵
 * 
 * AUTUS 연동:
 * - σ 계산 → 학생 성장 지표로 변환
 * - Quick Tag 데이터 → 선생님 메시지로 표시
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { StreakBadge, XPBar, BadgeCollection, PraiseNotification } from '../motivation';
import MissionCard, { type Mission } from './MissionCard';
import DreamRoadmap, { type RoadmapStep } from './DreamRoadmap';
import GrowthStory, { type StoryChapter } from './GrowthStory';
import WeeklyRanking, { type RankingItem } from './WeeklyRanking';
import type { Badge } from '../motivation/BadgeCollection';
import type { PraiseMessage } from '../motivation/PraiseNotification';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════════════════════════

interface StudentData {
  id: string;
  name: string;
  level: number;
  currentXP: number;
  nextLevelXP: number;
  streak: number;
  dream: string;
  dreamIcon?: string;
}

interface StudentDashboardProps {
  student: StudentData;
  todayMission?: Mission;
  badges?: Badge[];
  storyChapters?: StoryChapter[];
  dreamRoadmap?: RoadmapStep[];
  weeklyRanking?: RankingItem[];
  teacherMessage?: PraiseMessage;
  onMissionStart?: (missionId: string) => void;
  onMissionComplete?: (missionId: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 샘플 데이터 (실제로는 API에서 가져옴)
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_MISSION: Mission = {
  id: 'mission-001',
  title: '오늘의 미션',
  what: '분수 나눗셈 문제 10개 풀기',
  how: [
    '먼저 역수로 바꾸기',
    '그다음 곱하기로 계산',
    '약분해서 정리',
  ],
  why: '이거 마스터하면 중학교 수학 50%는 끝난 거야! 목표로 한 "중등 선행" 시작할 수 있어 💪',
  estimatedTime: '30분',
  xpReward: 50,
  badgeReward: '분수 마스터',
  dreamConnection: '게임 개발할 때 이런 계산 엄청 많이 해!',
};

const SAMPLE_ROADMAP: RoadmapStep[] = [
  { id: '1', title: '수학 기초', timeline: '지금', isCompleted: false, isCurrent: true, relatedSkills: ['분수', '소수'] },
  { id: '2', title: '중학교 수학', timeline: '6개월 후', isCompleted: false, isCurrent: false },
  { id: '3', title: '코딩 기초', timeline: '1년 후', isCompleted: false, isCurrent: false },
  { id: '4', title: '게임 엔진', timeline: '2년 후', isCompleted: false, isCurrent: false },
];

const SAMPLE_STORY: StoryChapter[] = [
  { chapter: 1, title: '시작', description: '분수가 너무 어려웠어...', date: '9월', mood: 'struggle', isCurrent: false },
  { chapter: 2, title: '고비', description: '포기하고 싶었지만, 선생님이 도와줬어', date: '10월', mood: 'struggle', isCurrent: false },
  { chapter: 3, title: '성장', description: '어? 이제 좀 알겠다!', date: '11월', mood: 'growth', isCurrent: false },
  { chapter: 4, title: '지금', description: '분수? 이제 쉬워! 🎉', date: '1월', mood: 'victory', isCurrent: true },
];

const SAMPLE_BADGES: Badge[] = [
  { id: '1', name: '연속출석왕', description: '30일 연속 출석 달성!', icon: '🏅', rarity: 'rare', earnedAt: new Date() },
  { id: '2', name: '숙제완료', description: '이번 주 숙제 모두 완료!', icon: '📝', rarity: 'common', earnedAt: new Date() },
  { id: '3', name: '덧셈마스터', description: '덧셈 문제 100개 완료!', icon: '➕', rarity: 'common', earnedAt: new Date() },
  { id: '4', name: '뺄셈마스터', description: '뺄셈 문제 100개 완료!', icon: '➖', rarity: 'common', earnedAt: new Date() },
  { id: '5', name: '곱셈마스터', description: '곱셈 문제 100개 완료!', icon: '✖️', rarity: 'rare', earnedAt: new Date() },
  { id: '6', name: '분수마스터', description: '분수의 달인이 되어보세요!', icon: '➗', rarity: 'epic', isLocked: true, unlockCondition: '분수 문제 100개 풀기' },
];

const SAMPLE_RANKING: RankingItem[] = [
  { rank: 1, name: '박지민', xp: 320, isMe: false },
  { rank: 2, name: '김민수', xp: 280, isMe: true },
  { rank: 3, name: '이서연', xp: 250, isMe: false },
  { rank: 4, name: '최유진', xp: 220, isMe: false },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export default function StudentDashboard({
  student,
  todayMission = SAMPLE_MISSION,
  badges = SAMPLE_BADGES,
  storyChapters = SAMPLE_STORY,
  dreamRoadmap = SAMPLE_ROADMAP,
  weeklyRanking = SAMPLE_RANKING,
  teacherMessage,
  onMissionStart,
  onMissionComplete,
}: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'homework' | 'goals' | 'badges' | 'chat'>('home');
  const [showLevelUp, setShowLevelUp] = useState(false);

  const handleMissionComplete = () => {
    onMissionComplete?.(todayMission.id);
    
    // 레벨업 체크
    if (student.currentXP + todayMission.xpReward >= student.nextLevelXP) {
      setShowLevelUp(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900/20 to-slate-900 text-white">
      {/* 헤더 */}
      <header className="p-4 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">👋</span>
            <div>
              <h1 className="text-xl font-bold">안녕 {student.name}야!</h1>
              <div className="text-sm text-slate-400">오늘도 파이팅!</div>
            </div>
          </div>
          
          {/* 레벨 배지 */}
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <span className="text-white font-bold text-xl">{student.level}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-black text-xs px-1.5 py-0.5 rounded-full font-bold">
              LV
            </div>
          </div>
        </div>

        {/* XP 바 */}
        <div className="mb-4">
          <XPBar
            currentXP={student.currentXP}
            maxXP={student.nextLevelXP}
            level={student.level}
            showLevelUp={showLevelUp}
          />
        </div>

        {/* 연속 기록 */}
        <div className="flex justify-center mb-4">
          <StreakBadge 
            count={student.streak} 
            type="days"
            nextMilestone={30}
            milestoneReward="🏆 한 달의 기적 뱃지"
            size="md"
          />
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="p-4 space-y-6 pb-24">
        {/* 선생님 메시지 (있으면 상단에) */}
        {teacherMessage && (
          <PraiseNotification 
            message={teacherMessage}
            autoHide={false}
          />
        )}

        {/* 오늘의 미션 */}
        <section>
          <MissionCard
            mission={todayMission}
            onStart={() => onMissionStart?.(todayMission.id)}
            onComplete={handleMissionComplete}
          />
        </section>

        {/* 나의 성장 요약 */}
        <section>
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span>📊</span>
            <span>나의 성장</span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-slate-800/50 rounded-xl text-center border border-slate-700/50">
              <div className="text-sm text-slate-400 mb-1">이번 주</div>
              <div className="text-2xl">⭐⭐⭐⭐☆</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl text-center border border-orange-500/30">
              <div className="text-sm text-slate-400 mb-1">연속 출석</div>
              <div className="text-2xl text-orange-400 font-bold">🔥 {student.streak}일</div>
            </div>
          </div>
        </section>

        {/* 꿈 로드맵 */}
        <section>
          <DreamRoadmap
            studentName={student.name}
            dream={student.dream}
            dreamIcon={student.dreamIcon || '🎮'}
            steps={dreamRoadmap}
            motivationMessage="이 속도면 고등학교 때 첫 게임 만들 수 있어!"
            currentSkillConnection="지금 하는 분수가 코딩의 기초야!"
          />
        </section>

        {/* 성장 스토리 */}
        <section>
          <GrowthStory
            studentName={student.name}
            chapters={storyChapters}
            nextChapter={{
              title: '방정식의 세계로...',
              hint: '분수 마스터하면 시작!',
            }}
          />
        </section>

        {/* 주간 순위 */}
        <section>
          <WeeklyRanking rankings={weeklyRanking} />
        </section>

        {/* 내 뱃지 */}
        <section>
          <BadgeCollection badges={badges} showLocked={true} />
        </section>
      </main>

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 border-t border-slate-800 backdrop-blur-sm">
        <div className="flex justify-around max-w-md mx-auto">
          {[
            { id: 'home', icon: '🏠', label: '홈' },
            { id: 'homework', icon: '📚', label: '숙제' },
            { id: 'goals', icon: '🎯', label: '내 목표' },
            { id: 'badges', icon: '🏆', label: '뱃지' },
            { id: 'chat', icon: '💬', label: '질문' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors
                ${activeTab === tab.id 
                  ? 'text-purple-400' 
                  : 'text-slate-400 hover:text-white'
                }
              `}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* 레벨업 팝업 */}
      {showLevelUp && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80">
          <div className="relative bg-gradient-to-br from-purple-900 to-pink-900 p-8 rounded-2xl border border-purple-500/50 max-w-sm mx-4 animate-bounce-in">
            <div className="text-6xl text-center mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-center mb-2">레벨 업!</h2>
            <div className="text-center">
              <span className="text-4xl font-bold text-purple-300">Level {student.level + 1}</span>
            </div>
            <p className="text-center text-purple-200 mt-4 mb-6">
              축하해! 한 단계 더 성장했어! 🚀
            </p>
            <button 
              onClick={() => setShowLevelUp(false)}
              className="w-full py-3 bg-white text-purple-900 font-bold rounded-xl hover:bg-purple-100 transition-colors"
            >
              멋져! 😎
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
