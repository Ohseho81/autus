/**
 * 올댓바스켓 Brand OS - 원장 뷰
 *
 * 규칙:
 * - 버튼 ≤ 3
 * - 입력 필드 0
 * - 설정 0
 * - 설명 0
 * - AUTUS 명칭 노출 금지
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Clock } from 'lucide-react';

// ============================================
// 상태 표시 (정상/경고/위험)
// ============================================
const StatusBadge = ({ level }) => {
  const config = {
    normal: { bg: '#10B981', label: '정상' },
    warning: { bg: '#F59E0B', label: '경고' },
    critical: { bg: '#EF4444', label: '위험' }
  }[level] || config.normal;

  return (
    <div
      className="px-4 py-2 rounded-full text-white font-bold text-lg"
      style={{ backgroundColor: config.bg }}
    >
      {config.label}
    </div>
  );
};

// ============================================
// 승인 카드
// ============================================
const ApprovalCard = ({ card, onDecision }) => {
  const typeLabels = {
    discount: '할인',
    refund: '환불',
    instructor_change: '강사 교체',
    policy_exception: '예외',
    rule_promotion: '규칙 승급'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl mb-4"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xl font-bold text-white">
          {typeLabels[card.request_type] || card.request_type}
        </span>
        <span className="text-gray-400 text-sm">
          {card.target_name || card.target_id}
        </span>
      </div>

      {/* 버튼 3개: 승인 / 보류 / 거절 */}
      <div className="flex gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onDecision(card.id, 'approved')}
          className="flex-1 py-4 rounded-xl bg-green-500 text-white font-bold flex items-center justify-center gap-2"
        >
          <Check size={20} />
          승인
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onDecision(card.id, 'pending')}
          className="flex-1 py-4 rounded-xl bg-gray-600 text-white font-bold flex items-center justify-center gap-2"
        >
          <Clock size={20} />
          보류
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onDecision(card.id, 'rejected')}
          className="flex-1 py-4 rounded-xl bg-red-500 text-white font-bold flex items-center justify-center gap-2"
        >
          <X size={20} />
          거절
        </motion.button>
      </div>
    </motion.div>
  );
};

// ============================================
// 원장 메인 뷰
// ============================================
export default function OwnerView({ brand = 'allthatbasket' }) {
  const [status, setStatus] = useState('normal');
  const [approvalCards, setApprovalCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30초마다 갱신
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // 상태 조회
      const stateRes = await fetch(`/api/v1/dashboard/status?brand=${brand}`);
      const stateData = await stateRes.json();
      setStatus(stateData.overall_status || 'normal');

      // 대기 중 승인 카드
      const cardsRes = await fetch(`/api/v1/approval-cards?brand=${brand}&status=pending`);
      const cardsData = await cardsRes.json();
      setApprovalCards(cardsData.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (cardId, decision) => {
    try {
      await fetch(`/api/v1/approval-cards/${cardId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          decided_by: 'owner' // TODO: 실제 사용자 ID
        })
      });
      fetchData(); // 갱신
    } catch (err) {
      console.error('Decision error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F0F1A' }}>
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: '#0F0F1A' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">🏀 올댓바스켓</h1>
        <StatusBadge level={status} />
      </div>

      {/* 승인 카드 섹션 */}
      {approvalCards.length > 0 ? (
        <div>
          <h2 className="text-lg text-gray-400 mb-4">승인 대기 ({approvalCards.length})</h2>
          {approvalCards.map(card => (
            <ApprovalCard
              key={card.id}
              card={card}
              onDecision={handleDecision}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-500 text-xl">승인 대기 없음</p>
        </div>
      )}
    </div>
  );
}

/**
 * 원장 뷰 규칙 준수:
 * - 버튼: 승인, 보류, 거절 (3개)
 * - 입력 필드: 0
 * - 설정: 0
 * - 설명: 0
 * - AUTUS 노출: 없음
 */
