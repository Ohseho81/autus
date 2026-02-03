/**
 * 🎨 Brand OS UI Template
 *
 * AUTUS가 새 Brand OS를 만들 때 사용하는 템플릿
 *
 * 규칙:
 * - 버튼 ≤ 3
 * - 입력 필드 0
 * - 설정 0
 * - AUTUS 노출 금지
 */

import React, { useState, useCallback, useMemo } from 'react';

// ============================================
// Brand OS 설정 (Config로 주입)
// ============================================
const DEFAULT_CONFIG = {
  id: 'default',
  name: '브랜드명',
  primaryColor: '#3B82F6',
  language: {
    member: '회원',
    attendance: '출석',
    payment: '결제',
    class: '수업',
    coach: '담당자',
    owner: '관리자'
  }
};

// ============================================
// 상태 카드 컴포넌트
// ============================================
function StatusCard({ status, count, label, color }) {
  const colors = {
    normal: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    danger: 'bg-red-50 border-red-200 text-red-700'
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[status] || colors.normal}`}>
      <div className="text-3xl font-bold">{count}</div>
      <div className="text-sm mt-1">{label}</div>
    </div>
  );
}

// ============================================
// 승인 카드 컴포넌트 (3버튼 규칙)
// ============================================
function ApprovalCard({ card, onDecision, language }) {
  const { id, title, description, memberName, amount } = card;

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-3">
      <div className="font-medium text-gray-900">{title}</div>
      {memberName && (
        <div className="text-sm text-gray-600 mt-1">
          {language.member}: {memberName}
        </div>
      )}
      {amount && (
        <div className="text-sm text-gray-600">
          금액: {amount.toLocaleString()}원
        </div>
      )}

      {/* 3버튼 규칙 */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onDecision(id, 'approve')}
          className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium"
        >
          승인
        </button>
        <button
          onClick={() => onDecision(id, 'hold')}
          className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
        >
          보류
        </button>
        <button
          onClick={() => onDecision(id, 'reject')}
          className="flex-1 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium"
        >
          거절
        </button>
      </div>
    </div>
  );
}

// ============================================
// 원장/센터장 뷰
// ============================================
export function OwnerView({ config = DEFAULT_CONFIG, data = {} }) {
  const { language } = config;
  const { stats = {}, approvalCards = [] } = data;

  const [cards, setCards] = useState(approvalCards);

  const handleDecision = useCallback((cardId, decision) => {
    // Intervention 기록 → AUTUS Core로 전송
    console.log(`[Intervention] Card ${cardId}: ${decision}`);
    setCards(prev => prev.filter(c => c.id !== cardId));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 - 브랜드명만 표시 (AUTUS 노출 금지) */}
      <header className="bg-white shadow-sm px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900">{config.name}</h1>
        <p className="text-sm text-gray-500">{language.owner} 화면</p>
      </header>

      <main className="p-4">
        {/* 상태 요약 (3개) */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatusCard
            status="normal"
            count={stats.normal || 0}
            label="정상"
          />
          <StatusCard
            status="warning"
            count={stats.warning || 0}
            label="경고"
          />
          <StatusCard
            status="danger"
            count={stats.danger || 0}
            label="위험"
          />
        </div>

        {/* 승인 카드 */}
        {cards.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-gray-500 mb-3">
              승인 대기 ({cards.length})
            </h2>
            {cards.map(card => (
              <ApprovalCard
                key={card.id}
                card={card}
                onDecision={handleDecision}
                language={language}
              />
            ))}
          </section>
        )}

        {cards.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            처리할 항목이 없습니다
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================
// 코치/트레이너 뷰
// ============================================
export function CoachView({ config = DEFAULT_CONFIG, data = {} }) {
  const { language } = config;
  const { currentClass = null, students = [] } = data;

  const [classStarted, setClassStarted] = useState(false);

  // Intervention FAB (필수)
  const handleIntervention = useCallback(() => {
    // 개입 기록 → AUTUS Core
    console.log('[Intervention] Coach action triggered');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900">{config.name}</h1>
        <p className="text-sm text-gray-500">{language.coach} 화면</p>
      </header>

      <main className="p-4">
        {/* 수업 상태 */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="text-sm text-gray-500">{language.class}</div>
          <div className="text-lg font-bold mt-1">
            {currentClass?.name || '수업 없음'}
          </div>

          {/* 수업 시작/종료 버튼 (2버튼) */}
          <div className="flex gap-2 mt-4">
            {!classStarted ? (
              <button
                onClick={() => setClassStarted(true)}
                className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium"
              >
                {language.class} 시작
              </button>
            ) : (
              <button
                onClick={() => setClassStarted(false)}
                className="flex-1 py-3 bg-gray-700 text-white rounded-lg font-medium"
              >
                {language.class} 종료
              </button>
            )}
          </div>
        </div>

        {/* 출석 현황 */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500 mb-3">
            {language.attendance} 현황
          </div>
          <div className="text-2xl font-bold">
            {students.filter(s => s.present).length} / {students.length}
          </div>
        </div>
      </main>

      {/* Intervention FAB (필수) */}
      <button
        onClick={handleIntervention}
        className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg flex items-center justify-center text-2xl"
      >
        !
      </button>
    </div>
  );
}

// ============================================
// Brand OS 생성 함수
// ============================================
export function createBrandOS(config) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  return {
    config: mergedConfig,
    OwnerView: (props) => <OwnerView config={mergedConfig} {...props} />,
    CoachView: (props) => <CoachView config={mergedConfig} {...props} />
  };
}

// ============================================
// 사전 정의된 Brand OS
// ============================================

// 올댓바스켓
export const AllThatBasket = createBrandOS({
  id: 'allthatbasket',
  name: '올댓바스켓',
  primaryColor: '#F97316',
  language: {
    member: '선수',
    attendance: '출석',
    payment: '수강료',
    class: '수업',
    coach: '코치',
    owner: '원장'
  }
});

// 그로튼
export const Groton = createBrandOS({
  id: 'groton',
  name: '그로튼',
  primaryColor: '#10B981',
  language: {
    member: '회원',
    attendance: '방문',
    payment: '회비',
    class: '세션',
    coach: '트레이너',
    owner: '센터장'
  }
});

export default { createBrandOS, AllThatBasket, Groton };
