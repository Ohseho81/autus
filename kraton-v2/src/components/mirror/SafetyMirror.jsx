/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🪞 KRATON Safety Mirror
 * 학부모 앱 사용 패턴을 통한 역방향 관계 데이터 추출
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// MOCK DATA GENERATORS
// ============================================

const generateMockParentData = () => {
  const parents = [
    { id: '1', name: '김철수 어머니', child: '김철수', avatar: '👩', grade: '중2' },
    { id: '2', name: '이영희 아버지', child: '이영희', avatar: '👨', grade: '중3' },
    { id: '3', name: '박민수 어머니', child: '박민수', avatar: '👩', grade: '고1' },
    { id: '4', name: '최수진 어머니', child: '최수진', avatar: '👩', grade: '중1' },
    { id: '5', name: '정다은 아버지', child: '정다은', avatar: '👨', grade: '고2' },
    { id: '6', name: '한지민 어머니', child: '한지민', avatar: '👩', grade: '중3' },
  ];

  return parents.map(p => ({
    ...p,
    // Attention Metrics
    appOpens: Math.floor(Math.random() * 15) + 1,
    totalDwellTime: Math.floor(Math.random() * 1800) + 120, // seconds
    lastActive: Date.now() - Math.floor(Math.random() * 86400000 * 3),
    
    // Page Dwell Times
    pageDwellTimes: {
      report: Math.floor(Math.random() * 300) + 30,
      schedule: Math.floor(Math.random() * 120) + 10,
      message: Math.floor(Math.random() * 180) + 20,
      payment: Math.floor(Math.random() * 60) + 5,
      profile: Math.floor(Math.random() * 30) + 5,
    },
    
    // Response Metrics
    notificationResponseRate: Math.random() * 0.5 + 0.5,
    avgResponseTime: Math.floor(Math.random() * 3600) + 300, // seconds
    
    // Dopamine Loop
    encouragementsSent: Math.floor(Math.random() * 20),
    positiveInteractions: Math.floor(Math.random() * 30),
    
    // Trust & Attention
    trustScore: Math.random() * 0.4 + 0.5,
    attentionMass: Math.random() * 0.5 + 0.3,
    
    // Triangular Bond (학원-학생-부모)
    triangularBond: Math.random() * 0.4 + 0.4,
  }));
};

const generateRealtimeEvents = () => [
  { id: 1, type: 'open', parent: '김철수 어머니', page: 'report', time: '방금', icon: '📊' },
  { id: 2, type: 'dwell', parent: '이영희 아버지', page: 'schedule', duration: '2분 12초', time: '3분 전', icon: '📅' },
  { id: 3, type: 'encourage', parent: '박민수 어머니', target: '박민수', message: '화이팅!', time: '5분 전', icon: '💬' },
  { id: 4, type: 'response', parent: '최수진 어머니', notification: '성적 리포트', responseTime: '45초', time: '12분 전', icon: '🔔' },
  { id: 5, type: 'open', parent: '정다은 아버지', page: 'payment', time: '15분 전', icon: '💳' },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatTime = (seconds) => {
  if (seconds < 60) return `${seconds}초`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
  return `${Math.floor(seconds / 3600)}시간 ${Math.floor((seconds % 3600) / 60)}분`;
};

const formatLastActive = (timestamp) => {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return '방금 전';
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
};

const getScoreColor = (score) => {
  if (score >= 0.8) return 'text-emerald-400';
  if (score >= 0.6) return 'text-cyan-400';
  if (score >= 0.4) return 'text-yellow-400';
  return 'text-red-400';
};

const getScoreBg = (score) => {
  if (score >= 0.8) return 'bg-emerald-500/20 border-emerald-500/50';
  if (score >= 0.6) return 'bg-cyan-500/20 border-cyan-500/50';
  if (score >= 0.4) return 'bg-yellow-500/20 border-yellow-500/50';
  return 'bg-red-500/20 border-red-500/50';
};

// ============================================
// SUB COMPONENTS
// ============================================

// Attention Mass 게이지
const AttentionGauge = memo(function AttentionGauge({ value, label, icon }) {
  const percentage = (value * 100).toFixed(0);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400 flex items-center gap-1">
          <span>{icon}</span> {label}
        </span>
        <span className={getScoreColor(value)}>{percentage}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full rounded-full ${
            value >= 0.8 ? 'bg-emerald-500' :
            value >= 0.6 ? 'bg-cyan-500' :
            value >= 0.4 ? 'bg-yellow-500' :
            'bg-red-500'
          }`}
        />
      </div>
    </div>
  );
});

// 삼각형 결속력 시각화
const TriangularBond = memo(function TriangularBond({ bond, parentName, childName }) {
  const size = 120;
  const centerX = size / 2;
  const topY = 20;
  const bottomY = size - 20;
  const leftX = 20;
  const rightX = size - 20;

  const bondStrength = bond >= 0.7 ? 'strong' : bond >= 0.5 ? 'normal' : 'weak';
  const strokeColor = bond >= 0.7 ? '#10b981' : bond >= 0.5 ? '#06b6d4' : '#ef4444';
  const strokeWidth = bond >= 0.7 ? 3 : bond >= 0.5 ? 2 : 1;

  return (
    <div className="relative">
      <svg width={size} height={size} className="mx-auto">
        {/* 삼각형 연결선 */}
        <motion.path
          d={`M${centerX},${topY} L${rightX},${bottomY} L${leftX},${bottomY} Z`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={bondStrength === 'weak' ? '5,5' : 'none'}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5 }}
        />
        
        {/* 노드들 */}
        {/* 학원 (상단) */}
        <circle cx={centerX} cy={topY} r={12} fill="#1f2937" stroke={strokeColor} strokeWidth={2} />
        <text x={centerX} y={topY + 4} textAnchor="middle" fill="white" fontSize="10">🏫</text>
        
        {/* 학생 (우하단) */}
        <circle cx={rightX} cy={bottomY} r={12} fill="#1f2937" stroke={strokeColor} strokeWidth={2} />
        <text x={rightX} y={bottomY + 4} textAnchor="middle" fill="white" fontSize="10">👨‍🎓</text>
        
        {/* 부모 (좌하단) */}
        <circle cx={leftX} cy={bottomY} r={12} fill="#1f2937" stroke={strokeColor} strokeWidth={2} />
        <text x={leftX} y={bottomY + 4} textAnchor="middle" fill="white" fontSize="10">👨‍👩‍👧</text>
      </svg>
      
      <div className="text-center mt-2">
        <p className={`text-sm font-medium ${getScoreColor(bond)}`}>
          {(bond * 100).toFixed(0)}% 결속력
        </p>
        <p className="text-xs text-gray-500">
          {bondStrength === 'strong' ? '강한 삼각 관계' :
           bondStrength === 'normal' ? '보통 삼각 관계' : '약한 삼각 관계'}
        </p>
      </div>
    </div>
  );
});

// 페이지별 체류 시간 차트
const DwellTimeChart = memo(function DwellTimeChart({ dwellTimes }) {
  const pages = [
    { key: 'report', label: '성적 리포트', icon: '📊', color: 'bg-purple-500' },
    { key: 'schedule', label: '일정', icon: '📅', color: 'bg-cyan-500' },
    { key: 'message', label: '메시지', icon: '💬', color: 'bg-emerald-500' },
    { key: 'payment', label: '결제', icon: '💳', color: 'bg-yellow-500' },
    { key: 'profile', label: '프로필', icon: '👤', color: 'bg-gray-500' },
  ];

  const maxTime = Math.max(...Object.values(dwellTimes));

  return (
    <div className="space-y-2">
      {pages.map(page => (
        <div key={page.key} className="flex items-center gap-2">
          <span className="text-sm w-6">{page.icon}</span>
          <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(dwellTimes[page.key] / maxTime) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className={`h-full ${page.color} rounded-full`}
            />
          </div>
          <span className="text-xs text-gray-400 w-16 text-right">
            {formatTime(dwellTimes[page.key])}
          </span>
        </div>
      ))}
    </div>
  );
});

// 부모 카드
const ParentCard = memo(function ParentCard({ parent, selected, onClick }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
        ${selected 
          ? 'bg-cyan-500/20 border-cyan-500/50' 
          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{parent.avatar}</span>
          <div>
            <p className="text-white font-medium">{parent.name}</p>
            <p className="text-gray-500 text-xs">{parent.child} ({parent.grade})</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-mono ${getScoreColor(parent.trustScore)}`}>
            {(parent.trustScore * 100).toFixed(0)}%
          </p>
          <p className="text-gray-600 text-xs">Trust</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-gray-900/50 rounded-lg">
          <p className="text-cyan-400 font-mono text-sm">{parent.appOpens}</p>
          <p className="text-gray-600 text-xs">앱 열기</p>
        </div>
        <div className="p-2 bg-gray-900/50 rounded-lg">
          <p className="text-purple-400 font-mono text-sm">{formatTime(parent.totalDwellTime).split(' ')[0]}</p>
          <p className="text-gray-600 text-xs">체류</p>
        </div>
        <div className="p-2 bg-gray-900/50 rounded-lg">
          <p className="text-emerald-400 font-mono text-sm">{parent.encouragementsSent}</p>
          <p className="text-gray-600 text-xs">응원</p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-gray-500">마지막 활동</span>
        <span className="text-gray-400">{formatLastActive(parent.lastActive)}</span>
      </div>
    </motion.div>
  );
});

// 실시간 이벤트 로그
const EventLog = memo(function EventLog({ events }) {
  const getEventText = (event) => {
    switch (event.type) {
      case 'open':
        return `${event.parent}님이 ${event.page} 페이지를 열었습니다`;
      case 'dwell':
        return `${event.parent}님이 ${event.page}에서 ${event.duration} 머물렀습니다`;
      case 'encourage':
        return `${event.parent}님이 ${event.target}에게 응원 메시지를 보냈습니다`;
      case 'response':
        return `${event.parent}님이 "${event.notification}" 알림에 ${event.responseTime}만에 반응했습니다`;
      default:
        return '';
    }
  };

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {events.map((event, idx) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="p-2 bg-gray-800/50 rounded-lg border border-gray-700/50 flex items-start gap-2"
        >
          <span className="text-lg">{event.icon}</span>
          <div className="flex-1">
            <p className="text-white text-sm">{getEventText(event)}</p>
            <p className="text-gray-500 text-xs">{event.time}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
});

// 상세 패널
const DetailPanel = memo(function DetailPanel({ parent }) {
  if (!parent) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <span className="text-4xl">🪞</span>
          <p className="mt-2">학부모를 선택하면 상세 정보가 표시됩니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${getScoreBg(parent.trustScore)} border-2`}>
          {parent.avatar}
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">{parent.name}</h3>
          <p className="text-gray-400">{parent.child} ({parent.grade}) 학부모</p>
        </div>
      </div>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-4 rounded-xl border ${getScoreBg(parent.trustScore)}`}>
          <p className="text-gray-400 text-sm mb-1">🛡️ Trust Score</p>
          <p className={`text-3xl font-bold ${getScoreColor(parent.trustScore)}`}>
            {(parent.trustScore * 100).toFixed(0)}%
          </p>
          <p className="text-gray-500 text-xs mt-1">
            알림 반응 속도 기반 신뢰도
          </p>
        </div>
        <div className={`p-4 rounded-xl border ${getScoreBg(parent.attentionMass)}`}>
          <p className="text-gray-400 text-sm mb-1">🧠 Attention Mass</p>
          <p className={`text-3xl font-bold ${getScoreColor(parent.attentionMass)}`}>
            {(parent.attentionMass * 100).toFixed(0)}%
          </p>
          <p className="text-gray-500 text-xs mt-1">
            서비스에 대한 정신적 점유율
          </p>
        </div>
      </div>

      {/* 삼각형 결속력 */}
      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <h4 className="text-white font-medium mb-4 flex items-center gap-2">
          <span className="text-purple-400">🔺</span>
          삼각형 결속력 (Triangular Bond)
        </h4>
        <TriangularBond 
          bond={parent.triangularBond} 
          parentName={parent.name}
          childName={parent.child}
        />
      </div>

      {/* 상세 지표 */}
      <div className="space-y-4">
        <AttentionGauge 
          value={parent.notificationResponseRate} 
          label="알림 반응률" 
          icon="🔔"
        />
        <AttentionGauge 
          value={parent.encouragementsSent / 20} 
          label="응원 활동 (Dopamine Loop)" 
          icon="💬"
        />
        <AttentionGauge 
          value={parent.positiveInteractions / 30} 
          label="긍정적 상호작용" 
          icon="✨"
        />
      </div>

      {/* 페이지별 체류 시간 */}
      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <h4 className="text-white font-medium mb-4 flex items-center gap-2">
          <span className="text-cyan-400">⏱️</span>
          페이지별 체류 시간
        </h4>
        <DwellTimeChart dwellTimes={parent.pageDwellTimes} />
      </div>

      {/* 반응 통계 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700/50 text-center">
          <p className="text-2xl font-mono text-cyan-400">{parent.appOpens}</p>
          <p className="text-gray-500 text-xs">오늘 앱 열기</p>
        </div>
        <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700/50 text-center">
          <p className="text-2xl font-mono text-purple-400">{formatTime(parent.avgResponseTime)}</p>
          <p className="text-gray-500 text-xs">평균 반응 시간</p>
        </div>
      </div>
    </div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function SafetyMirror() {
  const [parents, setParents] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [events, setEvents] = useState([]);
  const [isLive, setIsLive] = useState(true);
  const [sortBy, setSortBy] = useState('trustScore');

  // 초기 데이터 로드
  useEffect(() => {
    setParents(generateMockParentData());
    setEvents(generateRealtimeEvents());
  }, []);

  // 실시간 업데이트 시뮬레이션
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      // 랜덤 이벤트 추가
      const eventTypes = ['open', 'dwell', 'encourage', 'response'];
      const randomParent = parents[Math.floor(Math.random() * parents.length)];
      const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      
      if (randomParent) {
        const newEvent = {
          id: Date.now(),
          type: randomType,
          parent: randomParent.name,
          page: ['report', 'schedule', 'message'][Math.floor(Math.random() * 3)],
          time: '방금',
          icon: randomType === 'open' ? '📱' : 
                randomType === 'dwell' ? '⏱️' :
                randomType === 'encourage' ? '💬' : '🔔',
          target: randomParent.child,
          duration: `${Math.floor(Math.random() * 3) + 1}분`,
          responseTime: `${Math.floor(Math.random() * 60) + 10}초`,
          notification: '새 알림',
        };
        
        setEvents(prev => [newEvent, ...prev].slice(0, 10));
        
        // 부모 데이터 업데이트
        setParents(prev => prev.map(p => 
          p.id === randomParent.id 
            ? { 
                ...p, 
                appOpens: p.appOpens + (randomType === 'open' ? 1 : 0),
                encouragementsSent: p.encouragementsSent + (randomType === 'encourage' ? 1 : 0),
                lastActive: Date.now(),
              }
            : p
        ));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isLive, parents]);

  // 정렬된 부모 목록
  const sortedParents = [...parents].sort((a, b) => {
    switch (sortBy) {
      case 'trustScore': return b.trustScore - a.trustScore;
      case 'attentionMass': return b.attentionMass - a.attentionMass;
      case 'activity': return b.appOpens - a.appOpens;
      case 'lastActive': return b.lastActive - a.lastActive;
      default: return 0;
    }
  });

  // 전체 통계
  const stats = {
    avgTrust: parents.reduce((acc, p) => acc + p.trustScore, 0) / parents.length || 0,
    avgAttention: parents.reduce((acc, p) => acc + p.attentionMass, 0) / parents.length || 0,
    totalOpens: parents.reduce((acc, p) => acc + p.appOpens, 0),
    totalEncouragements: parents.reduce((acc, p) => acc + p.encouragementsSent, 0),
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">🪞</span>
              Safety Mirror
            </h1>
            <p className="text-gray-400 mt-1">
              학부모 앱 사용 패턴 · 역방향 관계 데이터 추출
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsLive(!isLive)}
              className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
                isLive 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              {isLive ? '● Live' : '○ Paused'}
            </button>
          </div>
        </div>

        {/* 전체 통계 */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <span>🛡️</span> 평균 Trust Score
            </div>
            <p className={`text-3xl font-bold ${getScoreColor(stats.avgTrust)}`}>
              {(stats.avgTrust * 100).toFixed(0)}%
            </p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <span>🧠</span> 평균 Attention Mass
            </div>
            <p className={`text-3xl font-bold ${getScoreColor(stats.avgAttention)}`}>
              {(stats.avgAttention * 100).toFixed(0)}%
            </p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <span>📱</span> 오늘 총 앱 열기
            </div>
            <p className="text-3xl font-bold text-cyan-400">{stats.totalOpens}</p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <span>💬</span> 총 응원 메시지
            </div>
            <p className="text-3xl font-bold text-purple-400">{stats.totalEncouragements}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left: 부모 목록 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">학부모 목록</h3>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="trustScore">Trust Score</option>
                <option value="attentionMass">Attention Mass</option>
                <option value="activity">활동량</option>
                <option value="lastActive">최근 활동</option>
              </select>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {sortedParents.map(parent => (
                <ParentCard
                  key={parent.id}
                  parent={parent}
                  selected={selectedParent?.id === parent.id}
                  onClick={() => setSelectedParent(parent)}
                />
              ))}
            </div>
          </div>

          {/* Middle: 상세 정보 */}
          <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
            <DetailPanel parent={selectedParent} />
          </div>

          {/* Right: 실시간 이벤트 */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span className="text-emerald-400">⚡</span>
              실시간 이벤트
            </h3>
            <EventLog events={events} />

            {/* 인사이트 */}
            <div className="p-4 bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-purple-500/10 rounded-xl border border-purple-500/30">
              <h4 className="text-white font-medium flex items-center gap-2 mb-3">
                <span className="text-purple-400">💡</span>
                AI 인사이트
              </h4>
              <div className="space-y-2 text-sm">
                <p className="text-cyan-400">
                  → 박민수 어머니의 Trust Score가 임계치 이하입니다
                </p>
                <p className="text-yellow-400">
                  → 결제 페이지 체류 시간이 급증한 학부모 2명 감지
                </p>
                <p className="text-emerald-400">
                  → 응원 메시지 활성화로 삼각 결속력 12% 상승
                </p>
              </div>
            </div>

            {/* Dopamine Loop 시각화 */}
            <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <h4 className="text-white font-medium flex items-center gap-2 mb-3">
                <span className="text-pink-400">🎯</span>
                Dopamine Loop 현황
              </h4>
              <div className="flex items-center justify-between text-center">
                <div>
                  <p className="text-2xl">💌</p>
                  <p className="text-xs text-gray-500 mt-1">응원 발송</p>
                  <p className="text-pink-400 font-mono">{stats.totalEncouragements}</p>
                </div>
                <div className="text-gray-600">→</div>
                <div>
                  <p className="text-2xl">😊</p>
                  <p className="text-xs text-gray-500 mt-1">긍정 반응</p>
                  <p className="text-emerald-400 font-mono">{Math.floor(stats.totalEncouragements * 0.7)}</p>
                </div>
                <div className="text-gray-600">→</div>
                <div>
                  <p className="text-2xl">🔄</p>
                  <p className="text-xs text-gray-500 mt-1">재방문</p>
                  <p className="text-cyan-400 font-mono">{Math.floor(stats.totalEncouragements * 0.5)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
