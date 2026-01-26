/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 👩‍🎓 STUDENT DETAIL PAGE - 학생 상세 정보
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// DESIGN TOKENS
// ============================================
const TOKENS = {
  type: {
    h1: 'text-3xl font-bold tracking-tight',
    h2: 'text-xl font-semibold tracking-tight',
    body: 'text-sm font-medium',
    meta: 'text-xs text-gray-500',
  },
  state: {
    1: { bg: 'bg-emerald-500', text: 'text-emerald-400', label: '최고', color: '#22c55e' },
    2: { bg: 'bg-blue-500', text: 'text-blue-400', label: '양호', color: '#3b82f6' },
    3: { bg: 'bg-yellow-500', text: 'text-yellow-400', label: '주의', color: '#eab308' },
    4: { bg: 'bg-orange-500', text: 'text-orange-400', label: '경고', color: '#f97316' },
    5: { bg: 'bg-red-500', text: 'text-red-400', label: '위험', color: '#ef4444' },
    6: { bg: 'bg-red-700', text: 'text-red-300', label: '긴급', color: '#b91c1c' },
  },
};

// ============================================
// MOCK DATA
// ============================================
const MOCK_STUDENT = {
  id: 'STU001',
  name: '김민수',
  grade: '고2',
  school: '서울고등학교',
  class: 'A반',
  phone: '010-1234-5678',
  parentPhone: '010-8765-4321',
  email: 'minsu.kim@student.com',
  joinDate: '2023-03-15',
  currentState: 3,
  vIndex: 724,
  avatar: '👨‍🎓',
};

const MOCK_STATE_HISTORY = [
  { date: '2024-01-24', state: 3, reason: '연속 결석 2회', note: '학부모 연락 완료' },
  { date: '2024-01-20', state: 2, reason: '성적 향상', note: '수학 20점 상승' },
  { date: '2024-01-15', state: 2, reason: '출석 양호', note: '' },
  { date: '2024-01-10', state: 3, reason: '숙제 미제출', note: '영어 과제' },
  { date: '2024-01-05', state: 4, reason: '연속 지각 3회', note: '상담 예정' },
  { date: '2024-01-01', state: 2, reason: '신규 등록', note: '' },
];

const MOCK_GRADES = [
  { subject: '국어', score: 85, change: 5, grade: 'B+' },
  { subject: '영어', score: 78, change: -3, grade: 'B' },
  { subject: '수학', score: 92, change: 12, grade: 'A' },
  { subject: '과학', score: 88, change: 8, grade: 'B+' },
  { subject: '사회', score: 75, change: 0, grade: 'B-' },
];

const MOCK_ATTENDANCE = [
  { month: '1월', present: 18, absent: 2, late: 1, total: 21 },
  { month: '12월', present: 20, absent: 1, late: 0, total: 21 },
  { month: '11월', present: 19, absent: 0, late: 2, total: 21 },
  { month: '10월', present: 21, absent: 0, late: 0, total: 21 },
];

// ============================================
// TAB NAVIGATION
// ============================================
const TABS = [
  { id: 'overview', label: '개요', icon: '📊' },
  { id: 'state', label: 'State 이력', icon: '📈' },
  { id: 'grades', label: '성적', icon: '📝' },
  { id: 'attendance', label: '출결', icon: '📋' },
  { id: 'activity', label: '활동', icon: '⚡' },
];

// ============================================
// STUDENT HEADER
// ============================================
const StudentHeader = memo(function StudentHeader({ student }) {
  const stateConfig = TOKENS.state[student.currentState];
  
  return (
    <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-3xl p-6 border border-gray-700/50">
      <div className="flex items-center gap-6">
        {/* Avatar */}
        <div className="relative">
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-xl"
            style={{ backgroundColor: `${stateConfig.color}30` }}
          >
            {student.avatar}
          </div>
          <div 
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: stateConfig.color }}
          >
            {student.currentState}
          </div>
        </div>
        
        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{student.name}</h2>
            <span 
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{ 
                backgroundColor: `${stateConfig.color}20`,
                color: stateConfig.color,
              }}
            >
              State {student.currentState} · {stateConfig.label}
            </span>
          </div>
          <p className="text-gray-400 mt-1">{student.school} · {student.grade} · {student.class}</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span>📱 {student.phone}</span>
            <span>📧 {student.email}</span>
            <span>📅 등록일: {student.joinDate}</span>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex gap-4">
          {[
            { label: 'V-Index', value: student.vIndex, color: 'text-purple-400' },
            { label: '출석률', value: '95%', color: 'text-emerald-400' },
            { label: '평균점수', value: '84', color: 'text-cyan-400' },
          ].map((stat, idx) => (
            <div key={idx} className="text-center px-4 py-3 bg-gray-800/50 rounded-xl">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
        
        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-colors">
            📞 상담 연락
          </button>
          <button className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/30 transition-colors">
            📝 메모 추가
          </button>
        </div>
      </div>
    </div>
  );
});

// ============================================
// OVERVIEW TAB
// ============================================
const OverviewTab = memo(function OverviewTab({ student }) {
  const stateConfig = TOKENS.state[student.currentState];
  
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* State Summary */}
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <h3 className={`${TOKENS.type.h2} text-white mb-4`}>현재 상태</h3>
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white"
            style={{ backgroundColor: stateConfig.color }}
          >
            {student.currentState}
          </div>
          <div>
            <p className="text-white text-lg font-medium">{stateConfig.label}</p>
            <p className="text-gray-500 text-sm">연속 결석 2회로 상태 하락</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">V-Index</span>
            <span className="text-purple-400 font-medium">{student.vIndex}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">30일 변화</span>
            <span className="text-red-400 font-medium">-52 ↓</span>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <h3 className={`${TOKENS.type.h2} text-white mb-4`}>빠른 액션</h3>
        <div className="space-y-2">
          {[
            { label: '학부모 연락', icon: '📱', color: 'cyan' },
            { label: '보상 카드 발급', icon: '🎁', color: 'purple' },
            { label: '상담 예약', icon: '📅', color: 'blue' },
            { label: '성적 입력', icon: '📝', color: 'emerald' },
          ].map((action, idx) => (
            <button
              key={idx}
              className={`w-full flex items-center gap-3 p-3 rounded-xl bg-${action.color}-500/10 text-${action.color}-400 hover:bg-${action.color}-500/20 transition-colors`}
            >
              <span className="text-xl">{action.icon}</span>
              <span className="font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <h3 className={`${TOKENS.type.h2} text-white mb-4`}>최근 활동</h3>
        <div className="space-y-3">
          {[
            { time: '오늘', action: '결석', icon: '❌', color: 'red' },
            { time: '어제', action: '출석', icon: '✅', color: 'emerald' },
            { time: '2일 전', action: '숙제 제출', icon: '📄', color: 'blue' },
            { time: '3일 전', action: '테스트 응시', icon: '📝', color: 'purple' },
          ].map((act, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2">
              <span className={`w-8 h-8 rounded-lg bg-${act.color}-500/20 flex items-center justify-center`}>
                {act.icon}
              </span>
              <div className="flex-1">
                <p className="text-white text-sm">{act.action}</p>
              </div>
              <span className="text-gray-500 text-xs">{act.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ============================================
// STATE HISTORY TAB
// ============================================
const StateHistoryTab = memo(function StateHistoryTab({ history }) {
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <h3 className={`${TOKENS.type.h2} text-white mb-6`}>State 변경 이력</h3>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-700" />
        
        <div className="space-y-6">
          {history.map((item, idx) => {
            const stateConfig = TOKENS.state[item.state];
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative flex gap-4"
              >
                {/* State circle */}
                <div 
                  className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
                  style={{ backgroundColor: stateConfig.color }}
                >
                  {item.state}
                </div>
                
                {/* Content */}
                <div className="flex-1 bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${stateConfig.text}`}>
                      State {item.state} · {stateConfig.label}
                    </span>
                    <span className="text-gray-500 text-xs">{item.date}</span>
                  </div>
                  <p className="text-white">{item.reason}</p>
                  {item.note && (
                    <p className="text-gray-400 text-sm mt-1">📝 {item.note}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

// ============================================
// GRADES TAB
// ============================================
const GradesTab = memo(function GradesTab({ grades }) {
  const avgScore = useMemo(() => {
    return Math.round(grades.reduce((sum, g) => sum + g.score, 0) / grades.length);
  }, [grades]);
  
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '평균 점수', value: avgScore, suffix: '점', color: 'cyan' },
          { label: '최고 과목', value: '수학', suffix: '', color: 'emerald' },
          { label: '개선 필요', value: '사회', suffix: '', color: 'orange' },
          { label: '30일 변화', value: '+22', suffix: '점', color: 'purple' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold text-${stat.color}-400`}>
              {stat.value}{stat.suffix}
            </p>
          </div>
        ))}
      </div>
      
      {/* Grade List */}
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <h3 className={`${TOKENS.type.h2} text-white mb-4`}>과목별 성적</h3>
        
        <div className="space-y-4">
          {grades.map((grade, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <div className="w-20 text-gray-400">{grade.subject}</div>
              <div className="flex-1">
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${grade.score}%` }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                  />
                </div>
              </div>
              <div className="w-16 text-right">
                <span className="text-white font-medium">{grade.score}</span>
                <span className="text-gray-500 text-sm ml-1">점</span>
              </div>
              <div className="w-12 text-right">
                <span className={grade.change > 0 ? 'text-emerald-400' : grade.change < 0 ? 'text-red-400' : 'text-gray-500'}>
                  {grade.change > 0 ? '+' : ''}{grade.change}
                </span>
              </div>
              <div className="w-10 text-center">
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm font-medium">
                  {grade.grade}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ============================================
// ATTENDANCE TAB
// ============================================
const AttendanceTab = memo(function AttendanceTab({ attendance }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '출석', value: 78, total: 84, color: 'emerald', icon: '✅' },
          { label: '결석', value: 3, total: 84, color: 'red', icon: '❌' },
          { label: '지각', value: 3, total: 84, color: 'yellow', icon: '⏰' },
          { label: '출석률', value: '92.9%', color: 'cyan', icon: '📊' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-2">
              <span>{stat.icon}</span>
              <span className="text-gray-400 text-sm">{stat.label}</span>
            </div>
            <p className={`text-2xl font-bold text-${stat.color}-400`}>
              {stat.value}
              {stat.total && <span className="text-gray-500 text-sm">/{stat.total}</span>}
            </p>
          </div>
        ))}
      </div>
      
      {/* Monthly Breakdown */}
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <h3 className={`${TOKENS.type.h2} text-white mb-4`}>월별 출결 현황</h3>
        
        <div className="space-y-4">
          {attendance.map((month, idx) => (
            <div key={idx} className="p-4 bg-gray-900/50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-medium">{month.month}</span>
                <span className="text-gray-400 text-sm">
                  총 {month.total}일
                </span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="h-8 bg-gray-700 rounded-lg overflow-hidden flex">
                    <div 
                      className="bg-emerald-500 transition-all"
                      style={{ width: `${(month.present / month.total) * 100}%` }}
                    />
                    <div 
                      className="bg-red-500 transition-all"
                      style={{ width: `${(month.absent / month.total) * 100}%` }}
                    />
                    <div 
                      className="bg-yellow-500 transition-all"
                      style={{ width: `${(month.late / month.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-emerald-400">✅ 출석 {month.present}</span>
                <span className="text-red-400">❌ 결석 {month.absent}</span>
                <span className="text-yellow-400">⏰ 지각 {month.late}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ============================================
// ACTIVITY TAB
// ============================================
const ActivityTab = memo(function ActivityTab() {
  const activities = [
    { date: '2024-01-24', type: 'attendance', action: '결석', detail: '무단 결석', icon: '❌' },
    { date: '2024-01-23', type: 'attendance', action: '출석', detail: '정상 출석', icon: '✅' },
    { date: '2024-01-22', type: 'homework', action: '숙제 제출', detail: '영어 과제 완료', icon: '📄' },
    { date: '2024-01-21', type: 'test', action: '테스트', detail: '수학 92점', icon: '📝' },
    { date: '2024-01-20', type: 'reward', action: '카드 획득', detail: '출석왕 카드', icon: '🎁' },
    { date: '2024-01-19', type: 'attendance', action: '출석', detail: '정상 출석', icon: '✅' },
    { date: '2024-01-18', type: 'message', action: '메시지', detail: '학부모 상담 완료', icon: '💬' },
  ];
  
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <h3 className={`${TOKENS.type.h2} text-white mb-4`}>활동 기록</h3>
      
      <div className="space-y-2">
        {activities.map((act, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-xl hover:bg-gray-900 transition-colors"
          >
            <span className="text-2xl">{act.icon}</span>
            <div className="flex-1">
              <p className="text-white font-medium">{act.action}</p>
              <p className="text-gray-500 text-sm">{act.detail}</p>
            </div>
            <span className="text-gray-500 text-xs">{act.date}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

// ============================================
// MAIN STUDENT DETAIL PAGE
// ============================================
export default function StudentDetailPage({ studentId }) {
  const [activeTab, setActiveTab] = useState('overview');
  
  // In real app, fetch student data by ID
  const student = MOCK_STUDENT;
  const stateHistory = MOCK_STATE_HISTORY;
  const grades = MOCK_GRADES;
  const attendance = MOCK_ATTENDANCE;
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab student={student} />;
      case 'state':
        return <StateHistoryTab history={stateHistory} />;
      case 'grades':
        return <GradesTab grades={grades} />;
      case 'attendance':
        return <AttendanceTab attendance={attendance} />;
      case 'activity':
        return <ActivityTab />;
      default:
        return null;
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Back Button */}
      <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
        <span>←</span>
        <span>학생 목록으로</span>
      </button>
      
      {/* Student Header */}
      <StudentHeader student={student} />
      
      {/* Tab Navigation */}
      <div className="flex gap-2 bg-gray-800/50 p-2 rounded-xl border border-gray-700/50">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
