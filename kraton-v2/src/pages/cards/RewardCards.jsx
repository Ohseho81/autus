import React, { useState } from 'react';
import FailSafeOverlay from '../../components/ui/FailSafeOverlay';
import TruthModeToggle from '../../components/ui/TruthModeToggle';

// ============================================
// KRATON REWARD CARDS
// Actuation + FailSafe 오버레이
// ============================================

const TOKENS = {
  type: {
    h2: 'text-xl font-bold tracking-tight',
    body: 'text-sm font-medium',
    meta: 'text-xs text-gray-500',
    number: 'font-mono tabular-nums',
  },
  motion: {
    base: 'transition-all duration-300 ease-out',
  },
};

// ============================================
// REWARD CARD COMPONENT
// ============================================
const RewardCard = ({ card, truthMode, onAction }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const typeConfig = {
    growth: { gradient: 'from-emerald-600 to-cyan-600', icon: '🌟', glow: '#22c55e' },
    care: { gradient: 'from-purple-600 to-pink-600', icon: '💝', glow: '#a855f7' },
    achievement: { gradient: 'from-yellow-500 to-orange-500', icon: '🏆', glow: '#eab308' },
    milestone: { gradient: 'from-blue-600 to-indigo-600', icon: '🎯', glow: '#3b82f6' },
  };

  const config = typeConfig[card.type] || typeConfig.growth;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-6 ${TOKENS.motion.base} bg-gradient-to-br ${config.gradient}
        ${isHovered ? 'scale-105 shadow-2xl' : 'scale-100'}`}
      style={{ boxShadow: isHovered ? `0 0 40px ${config.glow}40` : 'none' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Shimmer effect */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.3) 50%, transparent 75%)',
          backgroundSize: '200% 100%',
          animation: isHovered ? 'shimmer 1.5s infinite' : 'none',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <span className="text-4xl">{config.icon}</span>
          <span className="px-2 py-1 bg-white/20 rounded-lg text-xs font-bold text-white">
            {card.type.toUpperCase()}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
        
        {/* Recipient */}
        <p className="text-white/80 text-sm mb-4">{card.recipient}</p>

        {/* Highlights */}
        <div className="space-y-2 mb-4">
          {card.highlights?.map((highlight, idx) => (
            <div key={idx} className="flex items-center gap-2 text-white/90 text-sm">
              <span>✦</span>
              <span>{highlight}</span>
            </div>
          ))}
        </div>

        {/* Truth Mode Stats */}
        {truthMode && (
          <div className="flex gap-4 mb-4 p-3 bg-black/20 rounded-xl">
            <div className="text-center">
              <p className="text-xs text-white/60">기여도</p>
              <p className={`${TOKENS.type.number} text-white font-bold`}>{card.contribution}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-white/60">V 영향</p>
              <p className={`${TOKENS.type.number} text-white font-bold`}>+{card.vImpact}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-white/60">방지율</p>
              <p className={`${TOKENS.type.number} text-white font-bold`}>{card.preventionRate}%</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onAction?.('send', card)}
            className="flex-1 py-3 bg-white/20 hover:bg-white/30 rounded-xl text-white font-medium text-sm transition-all"
          >
            📱 알림톡 발송
          </button>
          <button
            onClick={() => onAction?.('edit', card)}
            className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white/80 transition-all"
          >
            ✏️
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN REWARD CARDS PAGE
// ============================================
const RewardCardsPage = () => {
  const [truthMode, setTruthMode] = useState(false);
  const [failSafeActive, setFailSafeActive] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);

  const cards = [
    {
      id: 1,
      type: 'growth',
      title: '이번 주 성장 챔피언! 🏆',
      recipient: '김민지 학생',
      highlights: ['7일 연속 출석!', '수학 성적 15점 향상', '숙제 완료율 100%'],
      contribution: 85,
      vImpact: 2.4,
      preventionRate: 92,
    },
    {
      id: 2,
      type: 'care',
      title: '함께 이야기 나눠볼까요?',
      recipient: '박지훈 학생 학부모님',
      highlights: ['최근 출석 패턴 변화 감지', '선생님이 관심을 가지고 있어요'],
      contribution: 0,
      vImpact: 0.8,
      preventionRate: 75,
    },
    {
      id: 3,
      type: 'achievement',
      title: '목표 달성! 축하합니다 🎉',
      recipient: '이서연 학생',
      highlights: ['이번 달 목표 100% 달성', '포인트 1,500점 획득', '다음 레벨 도전 자격 획득'],
      contribution: 92,
      vImpact: 1.5,
      preventionRate: 88,
    },
    {
      id: 4,
      type: 'milestone',
      title: '100일 함께한 날! 🌟',
      recipient: '최준혁 학생',
      highlights: ['100일 연속 학습 달성', '누적 학습 시간 200시간', '특별 뱃지 획득'],
      contribution: 95,
      vImpact: 3.2,
      preventionRate: 96,
    },
  ];

  const criticalRisk = {
    student_name: '김민수',
    state: 6,
    signals: ['연속 결석 5일', '학부모 연락 두절', '미납 2개월'],
    estimated_value: 4500000,
  };

  const handleCardAction = (action, card) => {
    console.log(`Card action: ${action}`, card);
  };

  const handleFailSafeAction = (action) => {
    console.log(`FailSafe action: ${action}`);
    setFailSafeActive(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* FailSafe Overlay */}
      <FailSafeOverlay
        active={failSafeActive}
        risk={selectedRisk || criticalRisk}
        onAction={handleFailSafeAction}
        onDismiss={() => setFailSafeActive(false)}
      />

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">🎴 Reward Cards</h1>
            <p className="text-gray-500 mt-1">성장과 관심을 전하는 카드</p>
          </div>
          <div className="flex items-center gap-4">
            <TruthModeToggle truthMode={truthMode} onToggle={() => setTruthMode(!truthMode)} />
            <button
              onClick={() => {
                setSelectedRisk(criticalRisk);
                setFailSafeActive(true);
              }}
              className="px-4 py-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 text-sm font-medium hover:bg-red-600/30 transition-all"
            >
              🚨 FailSafe 테스트
            </button>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
        {cards.map(card => (
          <RewardCard
            key={card.id}
            card={card}
            truthMode={truthMode}
            onAction={handleCardAction}
          />
        ))}
      </div>

      {/* Shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default RewardCardsPage;
