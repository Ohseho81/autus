/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Parent Growth Page
 * 학부모 - 자녀 성장 기록 페이지
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useAccessibility';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface GrowthData {
  month: string;
  score: number;
  attendance: number;
  homework: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
  category: 'attendance' | 'academic' | 'effort' | 'special';
}

interface TeacherComment {
  id: string;
  teacher: string;
  date: string;
  content: string;
  category: 'praise' | 'progress' | 'suggestion';
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const GROWTH_DATA: GrowthData[] = [
  { month: '9월', score: 72, attendance: 90, homework: 75 },
  { month: '10월', score: 75, attendance: 92, homework: 80 },
  { month: '11월', score: 78, attendance: 95, homework: 85 },
  { month: '12월', score: 82, attendance: 98, homework: 90 },
  { month: '1월', score: 85, attendance: 96, homework: 88 },
];

const ACHIEVEMENTS: Achievement[] = [
  {
    id: '1',
    title: '출석왕 🏆',
    description: '한 달 동안 개근했어요!',
    icon: '🏆',
    earnedAt: '2024-01-15',
    category: 'attendance',
  },
  {
    id: '2',
    title: '성적 UP ⭐',
    description: '시험 점수가 10점 올랐어요!',
    icon: '⭐',
    earnedAt: '2024-01-10',
    category: 'academic',
  },
  {
    id: '3',
    title: '숙제왕 📝',
    description: '2주 연속 숙제를 모두 완료했어요!',
    icon: '📝',
    earnedAt: '2024-01-05',
    category: 'effort',
  },
  {
    id: '4',
    title: '질문왕 ❓',
    description: '수업 중 적극적으로 질문했어요!',
    icon: '❓',
    earnedAt: '2023-12-20',
    category: 'effort',
  },
];

const TEACHER_COMMENTS: TeacherComment[] = [
  {
    id: '1',
    teacher: '김선생님',
    date: '2024-01-20',
    content: '민수가 최근 수학 문제 풀이에 자신감이 붙었어요. 특히 방정식 파트에서 눈에 띄는 성장을 보여주고 있습니다. 집에서도 칭찬 많이 해주세요! 😊',
    category: 'praise',
  },
  {
    id: '2',
    teacher: '박선생님',
    date: '2024-01-15',
    content: '영어 단어 암기량이 꾸준히 늘고 있어요. 지난 달 대비 테스트 점수가 15점 향상되었습니다.',
    category: 'progress',
  },
  {
    id: '3',
    teacher: '김선생님',
    date: '2024-01-10',
    content: '가끔 집중력이 흐트러질 때가 있지만, 전체적으로 학습 태도가 많이 좋아졌어요. 조금만 더 힘내면 좋은 결과가 있을 거예요!',
    category: 'suggestion',
  },
];

const CHILD_INFO = {
  name: '김민수',
  grade: '중학교 2학년',
  subjects: ['수학', '영어'],
  enrolledSince: '2023년 9월',
};

// ─────────────────────────────────────────────────────────────────────────────
// Simple Chart Component
// ─────────────────────────────────────────────────────────────────────────────

function GrowthChart({ data }: { data: GrowthData[] }) {
  const reducedMotion = useReducedMotion();
  const maxScore = 100;
  
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h3 className="font-bold text-slate-700 mb-4">📈 성장 그래프</h3>
      
      {/* Chart */}
      <div className="h-48 flex items-end gap-2">
        {data.map((item, idx) => (
          <div key={item.month} className="flex-1 flex flex-col items-center">
            {/* Bar */}
            <motion.div
              className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg relative"
              initial={reducedMotion ? { height: `${(item.score / maxScore) * 100}%` } : { height: 0 }}
              animate={{ height: `${(item.score / maxScore) * 100}%` }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
            >
              {/* Score Label */}
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-bold text-slate-600">
                {item.score}
              </span>
            </motion.div>
            {/* Month Label */}
            <span className="text-xs text-slate-500 mt-2">{item.month}</span>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex justify-center gap-4 text-xs text-slate-500">
        <span>📊 월별 종합 점수</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Achievement Badge Component
// ─────────────────────────────────────────────────────────────────────────────

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const reducedMotion = useReducedMotion();
  
  const categoryColors = {
    attendance: 'bg-green-100 border-green-300',
    academic: 'bg-amber-100 border-amber-300',
    effort: 'bg-blue-100 border-blue-300',
    special: 'bg-purple-100 border-purple-300',
  };
  
  return (
    <motion.div
      className={`
        p-4 rounded-2xl border-2 text-center
        ${categoryColors[achievement.category]}
      `}
      whileHover={reducedMotion ? {} : { scale: 1.05, rotate: 2 }}
      whileTap={reducedMotion ? {} : { scale: 0.95 }}
    >
      <div className="text-4xl mb-2">{achievement.icon}</div>
      <div className="font-bold text-slate-700 text-sm">{achievement.title}</div>
      <div className="text-xs text-slate-500 mt-1">{achievement.description}</div>
      <div className="text-xs text-slate-400 mt-2">
        {new Date(achievement.earnedAt).toLocaleDateString('ko-KR')}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Teacher Comment Card
// ─────────────────────────────────────────────────────────────────────────────

function CommentCard({ comment }: { comment: TeacherComment }) {
  const categoryStyles = {
    praise: { icon: '😊', bg: 'bg-green-50 border-green-200' },
    progress: { icon: '📈', bg: 'bg-blue-50 border-blue-200' },
    suggestion: { icon: '💡', bg: 'bg-amber-50 border-amber-200' },
  };
  
  const style = categoryStyles[comment.category];
  
  return (
    <div className={`p-4 rounded-2xl border ${style.bg}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{style.icon}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-slate-700">{comment.teacher}</span>
            <span className="text-xs text-slate-400">
              {new Date(comment.date).toLocaleDateString('ko-KR')}
            </span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{comment.content}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats Card
// ─────────────────────────────────────────────────────────────────────────────

function StatsCard({ 
  icon, 
  label, 
  value, 
  change, 
  changeLabel 
}: { 
  icon: string;
  label: string;
  value: string;
  change: number;
  changeLabel: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
        {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% {changeLabel}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function ParentGrowthPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'comments'>('overview');
  const latestData = GROWTH_DATA[GROWTH_DATA.length - 1];
  const previousData = GROWTH_DATA[GROWTH_DATA.length - 2];
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto p-4">
          <h1 className="text-xl font-bold text-slate-800">📊 {CHILD_INFO.name}의 성장 기록</h1>
          <p className="text-sm text-slate-500">
            {CHILD_INFO.grade} · {CHILD_INFO.subjects.join(', ')}
          </p>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex">
          {[
            { id: 'overview', label: '📈 종합', icon: '📈' },
            { id: 'achievements', label: '🏆 성취', icon: '🏆' },
            { id: 'comments', label: '💬 선생님', icon: '💬' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`
                flex-1 py-3 text-sm font-medium transition-colors
                ${activeTab === tab.id
                  ? 'text-orange-600 border-b-2 border-orange-500'
                  : 'text-slate-500 hover:text-slate-700'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {activeTab === 'overview' && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatsCard
                icon="📚"
                label="출석률"
                value={`${latestData.attendance}%`}
                change={latestData.attendance - previousData.attendance}
                changeLabel="지난달 대비"
              />
              <StatsCard
                icon="📝"
                label="숙제 완료"
                value={`${latestData.homework}%`}
                change={latestData.homework - previousData.homework}
                changeLabel="지난달 대비"
              />
            </div>
            
            {/* Growth Chart */}
            <GrowthChart data={GROWTH_DATA} />
            
            {/* Monthly Summary */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-slate-700 mb-3">📋 이번 달 요약</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                  <span className="text-sm">🎯 종합 점수</span>
                  <span className="font-bold text-green-600">{latestData.score}점</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                  <span className="text-sm">📈 성장률</span>
                  <span className="font-bold text-blue-600">
                    +{latestData.score - previousData.score}점 ↑
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                  <span className="text-sm">🏅 획득 배지</span>
                  <span className="font-bold text-purple-600">
                    {ACHIEVEMENTS.filter(a => 
                      new Date(a.earnedAt).getMonth() === new Date().getMonth()
                    ).length}개
                  </span>
                </div>
              </div>
            </div>
            
            {/* Encouragement */}
            <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-4 text-white">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🌟</span>
                <div>
                  <div className="font-bold">잘 하고 있어요!</div>
                  <div className="text-sm text-white/90">
                    {CHILD_INFO.name}(이)가 꾸준히 성장하고 있어요. 집에서도 응원해주세요!
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'achievements' && (
          <>
            {/* Achievement Count */}
            <div className="text-center py-4">
              <div className="text-4xl font-bold text-amber-500">{ACHIEVEMENTS.length}</div>
              <div className="text-slate-500">획득한 배지</div>
            </div>
            
            {/* Badge Grid */}
            <div className="grid grid-cols-2 gap-3">
              {ACHIEVEMENTS.map(achievement => (
                <AchievementBadge key={achievement.id} achievement={achievement} />
              ))}
            </div>
            
            {/* Next Achievement Preview */}
            <div className="bg-slate-100 rounded-2xl p-4 border-2 border-dashed border-slate-300">
              <div className="text-center text-slate-500">
                <div className="text-3xl mb-2 opacity-50">🔒</div>
                <div className="font-medium">다음 목표</div>
                <div className="text-sm">3주 연속 출석하면 특별 배지 획득!</div>
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'comments' && (
          <>
            {/* Comment List */}
            <div className="space-y-3">
              {TEACHER_COMMENTS.map(comment => (
                <CommentCard key={comment.id} comment={comment} />
              ))}
            </div>
            
            {/* Ask Teacher */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-slate-700 mb-3">💬 선생님께 질문하기</h3>
              <textarea
                className="w-full p-3 border rounded-xl resize-none h-24 text-sm"
                placeholder="궁금한 점을 입력하세요..."
              />
              <button className="w-full mt-2 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors">
                보내기
              </button>
            </div>
          </>
        )}
      </div>
      
      {/* Download Report Button */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-amber-50">
        <div className="max-w-lg mx-auto">
          <button className="w-full py-3 bg-white border-2 border-orange-300 text-orange-600 rounded-xl font-medium shadow-lg hover:bg-orange-50 transition-colors">
            📄 월간 리포트 다운로드
          </button>
        </div>
      </div>
    </div>
  );
}

export default ParentGrowthPage;
