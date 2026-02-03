import React, { useState, useMemo } from 'react';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS MoltBot + Claude 상호작용 시스템
 *
 * 역할 분담:
 * ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
 * │   사용자    │───▶│   MoltBot   │───▶│   Claude    │
 * │  (압력/요청) │    │ (90% 정제)  │    │ (평가/결정)  │
 * └─────────────┘    └─────────────┘    └─────────────┘
 *
 * MoltBot: 사용자 입력 수집 → 정제 → Pain Signal 추출 (90% 버림)
 * Claude: Pain Signal 평가 → K1-K5 검증 → Proposal 생성 → 결과물 V 예측
 *
 * 흐름:
 * 1. 사용자 → Raw Input (불만, 요청, 피드백)
 * 2. MoltBot → Pain Signal 정제 (90% 버림, 10% 통과)
 * 3. Claude → Proposal 평가 (K1-K5 검증)
 * 4. System → 24시간 대기 (K4) → 실행 → V 생성
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTITUTION (K1-K5)
// ═══════════════════════════════════════════════════════════════════════════════

const CONSTITUTION = {
  K1: { id: 'K1', name: '점수로만 승격', check: (score, threshold) => score >= threshold },
  K2: { id: 'K2', name: '의견은 신호', check: () => true },
  K3: { id: 'K3', name: 'Proof 필수', check: (proofs) => proofs.length >= 3 },
  K4: { id: 'K4', name: '24시간 대기', waitMs: 24 * 60 * 60 * 1000 },
  K5: { id: 'K5', name: 'Standard ≤10%', check: (total, std) => std / total <= 0.1 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 산업별 최적화 이벤트 데이터베이스
// ═══════════════════════════════════════════════════════════════════════════════

const INDUSTRY_EVENTS = {
  fitness: {
    name: '피트니스/헬스',
    icon: '🏋️',
    color: '#EF4444',
    events: [
      { id: 'fit_1', name: '휴면 회원 재활성화', roi: 2440, trigger: '30일 미방문', desc: '30일 미방문 회원에게 10% 할인 쿠폰 발송' },
      { id: 'fit_2', name: '3개월 하이라이트 영상', roi: 1850, trigger: '등록 후 90일', desc: '개인 맞춤 훈련 하이라이트 영상 제공' },
      { id: 'fit_3', name: '생일 축하 이벤트', roi: 1650, trigger: '생일 당일', desc: '생일 축하 메시지 + 무료 PT 1회' },
      { id: 'fit_4', name: '재등록 유도', roi: 3200, trigger: '만료 7일 전', desc: '얼리버드 할인으로 재등록 유도' },
      { id: 'fit_5', name: '친구 추천 리워드', roi: 2100, trigger: '상시', desc: '추천인/피추천인 양쪽 혜택 제공' },
    ],
  },
  retail: {
    name: '리테일/유통',
    icon: '🛒',
    color: '#3B82F6',
    events: [
      { id: 'ret_1', name: '장바구니 이탈 복구', roi: 3500, trigger: '장바구니 1시간 방치', desc: '장바구니 상품 할인 쿠폰 발송' },
      { id: 'ret_2', name: '재구매 유도', roi: 2200, trigger: '구매 후 30일', desc: '재구매 고객 전용 할인' },
      { id: 'ret_3', name: '등급 업그레이드 안내', roi: 1900, trigger: '다음 등급 근접', desc: '추가 구매 시 등급 업그레이드 혜택 안내' },
      { id: 'ret_4', name: 'VIP 전용 프리뷰', roi: 2800, trigger: '신상품 출시', desc: 'VIP 고객 24시간 선공개' },
      { id: 'ret_5', name: '시즌 프로모션', roi: 1650, trigger: '시즌 시작', desc: '시즌별 맞춤 프로모션' },
    ],
  },
  fnb: {
    name: 'F&B/외식',
    icon: '🍽️',
    color: '#F59E0B',
    events: [
      { id: 'fnb_1', name: '점심 시간 푸시', roi: 1800, trigger: '11:00-11:30', desc: '점심 시간 전 할인 쿠폰 발송' },
      { id: 'fnb_2', name: '날씨 기반 추천', roi: 2100, trigger: '비/눈 예보', desc: '배달 할인 또는 따뜻한 메뉴 추천' },
      { id: 'fnb_3', name: '단골 고객 리워드', roi: 2400, trigger: '방문 10회', desc: '10회 방문 시 무료 메뉴 제공' },
      { id: 'fnb_4', name: '생일 파티 패키지', roi: 3100, trigger: '생일 1주일 전', desc: '생일 파티 특별 패키지 제안' },
      { id: 'fnb_5', name: '신메뉴 테스터', roi: 1950, trigger: '신메뉴 출시', desc: 'VIP 고객 신메뉴 무료 시식' },
    ],
  },
  beauty: {
    name: '뷰티/미용',
    icon: '💄',
    color: '#EC4899',
    events: [
      { id: 'bty_1', name: '시술 주기 리마인드', roi: 2600, trigger: '마지막 시술 후 N일', desc: '다음 시술 예약 권유 + 할인' },
      { id: 'bty_2', name: '계절 케어 추천', roi: 2100, trigger: '계절 변화', desc: '계절별 맞춤 케어 상품 추천' },
      { id: 'bty_3', name: '생일 뷰티 기프트', roi: 1850, trigger: '생일 당일', desc: '생일 고객 특별 기프트' },
      { id: 'bty_4', name: '리뷰 작성 리워드', roi: 1400, trigger: '시술 완료 후', desc: '리뷰 작성 시 포인트 적립' },
      { id: 'bty_5', name: '프리미엄 업그레이드', roi: 3000, trigger: '방문 5회', desc: '정기 고객 프리미엄 서비스 제안' },
    ],
  },
  education: {
    name: '교육/학원',
    icon: '📚',
    color: '#8B5CF6',
    events: [
      { id: 'edu_1', name: '수강 완료 축하', roi: 1600, trigger: '과정 완료', desc: '수료증 + 다음 과정 할인' },
      { id: 'edu_2', name: '출석 부진 알림', roi: 2200, trigger: '2주 연속 결석', desc: '출석 독려 + 보충 수업 제안' },
      { id: 'edu_3', name: '성적 향상 리포트', roi: 1900, trigger: '시험 후', desc: '성적 분석 리포트 + 맞춤 학습 제안' },
      { id: 'edu_4', name: '얼리버드 등록', roi: 2800, trigger: '다음 학기 2개월 전', desc: '얼리버드 할인 등록 안내' },
      { id: 'edu_5', name: '형제 할인 안내', roi: 2400, trigger: '등록 시', desc: '형제/자매 동시 등록 할인' },
    ],
  },
  healthcare: {
    name: '의료/헬스케어',
    icon: '🏥',
    color: '#06B6D4',
    events: [
      { id: 'hc_1', name: '정기 검진 리마인드', roi: 2100, trigger: '마지막 검진 후 1년', desc: '정기 검진 예약 권유' },
      { id: 'hc_2', name: '약 복용 알림', roi: 1500, trigger: '처방 후', desc: '약 복용 시간 알림 서비스' },
      { id: 'hc_3', name: '건강 팁 뉴스레터', roi: 1200, trigger: '주 1회', desc: '계절별 건강 관리 정보' },
      { id: 'hc_4', name: '예방 접종 안내', roi: 1800, trigger: '접종 시즌', desc: '독감 등 예방 접종 시기 안내' },
      { id: 'hc_5', name: '만성질환 관리', roi: 2500, trigger: '진단 후', desc: '정기 관리 프로그램 제안' },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOLTBOT ENGINE - 압력 정제기 + 산업별 이벤트 검색
// ═══════════════════════════════════════════════════════════════════════════════

const MoltBotEngine = {
  // 입력 유형
  INPUT_TYPES: {
    COMPLAINT: { weight: 0.8, passRate: 0.15 },  // 불만 → 15% 통과
    REQUEST: { weight: 0.6, passRate: 0.20 },    // 요청 → 20% 통과
    FEEDBACK: { weight: 0.4, passRate: 0.10 },   // 피드백 → 10% 통과
    PRAISE: { weight: 0.1, passRate: 0.05 },     // 칭찬 → 5% 통과 (이미 잘 됨)
    NOISE: { weight: 0.0, passRate: 0.01 },      // 노이즈 → 1% 통과
  },

  // Pain Signal 추출 키워드
  PAIN_KEYWORDS: ['안됨', '불편', '왜', '언제', '못', '싫', '힘들', '어려', '문제', '오류'],

  // 입력 분류
  classifyInput: (text) => {
    const lower = text.toLowerCase();
    if (MoltBotEngine.PAIN_KEYWORDS.some(k => lower.includes(k))) return 'COMPLAINT';
    if (lower.includes('해주') || lower.includes('원함') || lower.includes('필요')) return 'REQUEST';
    if (lower.includes('좋') || lower.includes('감사') || lower.includes('최고')) return 'PRAISE';
    if (text.length < 5) return 'NOISE';
    return 'FEEDBACK';
  },

  // 정제 (90% 버림 목표)
  refine: (input) => {
    const type = MoltBotEngine.classifyInput(input.content);
    const typeInfo = MoltBotEngine.INPUT_TYPES[type];
    const random = Math.random();
    const passed = random < typeInfo.passRate;

    return {
      ...input,
      type,
      weight: typeInfo.weight,
      passRate: typeInfo.passRate,
      random,
      passed,
      painScore: passed ? typeInfo.weight * 100 : 0,
      refinedAt: Date.now(),
    };
  },

  // 배치 정제
  refineBatch: (inputs) => {
    const results = inputs.map(input => MoltBotEngine.refine(input));
    const passed = results.filter(r => r.passed);
    const discarded = results.filter(r => !r.passed);

    return {
      total: results.length,
      passed: passed.length,
      discarded: discarded.length,
      discardRate: (discarded.length / results.length * 100).toFixed(1) + '%',
      painSignals: passed,
      discardedInputs: discarded,
    };
  },

  // 산업별 최적 이벤트 검색
  findBestEvents: (industryId, limit = 5) => {
    const industry = INDUSTRY_EVENTS[industryId];
    if (!industry) return [];

    // ROI 기준 정렬
    return [...industry.events]
      .sort((a, b) => b.roi - a.roi)
      .slice(0, limit);
  },

  // 모든 산업에서 TOP 이벤트 검색
  findTopEventsAllIndustries: (limit = 3) => {
    const allEvents = [];
    Object.entries(INDUSTRY_EVENTS).forEach(([industryId, industry]) => {
      industry.events.forEach(event => {
        allEvents.push({
          ...event,
          industryId,
          industryName: industry.name,
          industryIcon: industry.icon,
          industryColor: industry.color,
        });
      });
    });

    return allEvents
      .sort((a, b) => b.roi - a.roi)
      .slice(0, limit);
  },

  // 산업 목록
  getIndustries: () => Object.entries(INDUSTRY_EVENTS).map(([id, data]) => ({
    id,
    name: data.name,
    icon: data.icon,
    color: data.color,
    eventCount: data.events.length,
  })),
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLAUDE ENGINE - 평가/결정
// ═══════════════════════════════════════════════════════════════════════════════

const ClaudeEngine = {
  // Pain Signal → Proposal 변환
  evaluateSignal: (painSignal) => {
    // K1: 점수 계산
    const qualityScore = painSignal.painScore * 0.5 + Math.random() * 50;

    // K3: Proof 생성
    const proofs = [
      { type: 'INPUT_LOG', value: painSignal.content },
      { type: 'TIMESTAMP', value: new Date().toISOString() },
      { type: 'PAIN_SCORE', value: painSignal.painScore },
    ];

    // Proposal 생성
    const proposal = {
      id: `PROP_${Date.now()}`,
      signal: painSignal,
      qualityScore,
      proofs,
      k1Pass: qualityScore >= 60,
      k3Pass: proofs.length >= 3,
      status: 'PENDING',
      createdAt: Date.now(),
      k4ReadyAt: Date.now() + CONSTITUTION.K4.waitMs,
    };

    return proposal;
  },

  // Proposal → Action 결정
  decide: (proposal) => {
    if (!proposal.k1Pass) return { action: 'REJECT', reason: 'K1: Score < 60' };
    if (!proposal.k3Pass) return { action: 'REJECT', reason: 'K3: Proof 부족' };

    // K4: 24시간 체크
    const now = Date.now();
    if (now < proposal.k4ReadyAt) {
      const hoursLeft = Math.ceil((proposal.k4ReadyAt - now) / 3600000);
      return { action: 'WAIT', reason: `K4: ${hoursLeft}시간 대기` };
    }

    // V 예측
    const predictedV = Math.round(proposal.qualityScore * 1000 * (1 + Math.random() * 0.5));

    return {
      action: 'EXECUTE',
      predictedV,
      reason: 'All K1-K5 passed',
    };
  },

  // 제안 생성 (Pain Signal 기반)
  generateSuggestion: (painSignal) => {
    const suggestions = {
      COMPLAINT: [
        '문제 해결을 위한 정책 추가 제안',
        '자동화 규칙 생성 검토',
        '담당자 알림 설정',
      ],
      REQUEST: [
        '기능 추가 검토',
        '프로세스 개선 제안',
        '우선순위 조정',
      ],
      FEEDBACK: [
        '데이터 수집 및 분석',
        '트렌드 모니터링 추가',
      ],
    };

    const type = painSignal.type || 'FEEDBACK';
    const options = suggestions[type] || suggestions.FEEDBACK;
    return options[Math.floor(Math.random() * options.length)];
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AUTUSMoltBot() {
  // 상태
  const [rawInputs, setRawInputs] = useState([]);
  const [newInput, setNewInput] = useState('');
  const [moltBotResult, setMoltBotResult] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [executedActions, setExecutedActions] = useState([]);

  // 산업별 이벤트 상태
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [showIndustryPanel, setShowIndustryPanel] = useState(true);
  const [topEventsAll, setTopEventsAll] = useState(() => MoltBotEngine.findTopEventsAllIndustries(5));

  // 입력 추가
  const handleAddInput = () => {
    if (!newInput.trim()) return;
    setRawInputs([...rawInputs, {
      id: `IN_${Date.now()}`,
      content: newInput,
      createdAt: Date.now(),
    }]);
    setNewInput('');
  };

  // MoltBot 정제 실행
  const handleRefine = () => {
    if (rawInputs.length === 0) return;
    const result = MoltBotEngine.refineBatch(rawInputs);
    setMoltBotResult(result);

    // Pain Signal → Proposal 변환 (Claude)
    const newProposals = result.painSignals.map(signal => ClaudeEngine.evaluateSignal(signal));
    setProposals([...proposals, ...newProposals]);
    setRawInputs([]); // 처리 완료
  };

  // Proposal 결정 (Claude)
  const handleDecide = (proposalId) => {
    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) return;

    const decision = ClaudeEngine.decide(proposal);

    if (decision.action === 'EXECUTE') {
      setExecutedActions([...executedActions, {
        ...decision,
        proposalId,
        executedAt: Date.now(),
        suggestion: ClaudeEngine.generateSuggestion(proposal.signal),
      }]);
      setProposals(proposals.map(p =>
        p.id === proposalId ? { ...p, status: 'EXECUTED', decision } : p
      ));
    } else {
      setProposals(proposals.map(p =>
        p.id === proposalId ? { ...p, status: decision.action, decision } : p
      ));
    }
  };

  // 통계
  const stats = useMemo(() => {
    const totalInputs = rawInputs.length + (moltBotResult?.total || 0);
    const totalPassed = moltBotResult?.passed || 0;
    const totalDiscarded = moltBotResult?.discarded || 0;
    const totalV = executedActions.reduce((sum, a) => sum + (a.predictedV || 0), 0);

    return { totalInputs, totalPassed, totalDiscarded, totalV };
  }, [rawInputs, moltBotResult, executedActions]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0A0A0F 0%, #1A1A2E 100%)',
      color: '#F8FAFC',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid #2E2E3E',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 28 }}>🦎</span>
          <span style={{ fontWeight: 700, fontSize: 18 }}>MoltBot</span>
        </div>
        <div style={{ color: '#6B7280' }}>×</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 28 }}>🤖</span>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Claude</span>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8' }}>
          AUTUS 상호작용 시스템
        </div>
      </header>

      {/* 흐름 시각화 */}
      <div style={{
        padding: '16px 24px',
        background: '#0D0D12',
        borderBottom: '1px solid #2E2E3E',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <FlowStep icon="👤" label="사용자" sub="압력/요청" color="#6B7280" />
          <Arrow />
          <FlowStep icon="🦎" label="MoltBot" sub="90% 정제" color="#F59E0B" active={rawInputs.length > 0} />
          <Arrow />
          <FlowStep icon="🤖" label="Claude" sub="K1-K5 평가" color="#3B82F6" active={proposals.filter(p => p.status === 'PENDING').length > 0} />
          <Arrow />
          <FlowStep icon="⚡" label="실행" sub="V 생성" color="#10B981" active={executedActions.length > 0} />
        </div>
      </div>

      <main style={{ padding: 24 }}>
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* 산업별 최적화 이벤트 섹션 */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {showIndustryPanel && (
          <div style={{
            padding: 20,
            marginBottom: 24,
            background: 'linear-gradient(135deg, #1A1A2E, #0D0D12)',
            borderRadius: 16,
            border: '1px solid #2E2E3E',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24 }}>🏭</span>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  산업별 극대화 이벤트 검색
                </h2>
                <span style={{
                  padding: '4px 10px',
                  background: '#10B98120',
                  borderRadius: 20,
                  fontSize: 11,
                  color: '#10B981',
                }}>
                  MoltBot 명령
                </span>
              </div>
              <button
                onClick={() => setShowIndustryPanel(false)}
                style={{
                  padding: '4px 12px',
                  background: 'transparent',
                  border: '1px solid #2E2E3E',
                  borderRadius: 6,
                  color: '#6B7280',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                접기 ▲
              </button>
            </div>

            {/* 산업 선택 버튼 */}
            <div style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 16,
            }}>
              {MoltBotEngine.getIndustries().map(industry => (
                <button
                  key={industry.id}
                  onClick={() => setSelectedIndustry(industry.id === selectedIndustry ? null : industry.id)}
                  style={{
                    padding: '10px 16px',
                    background: selectedIndustry === industry.id ? `${industry.color}20` : '#0D0D12',
                    border: selectedIndustry === industry.id
                      ? `2px solid ${industry.color}`
                      : '2px solid #2E2E3E',
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{industry.icon}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: selectedIndustry === industry.id ? industry.color : '#F8FAFC',
                      }}>
                        {industry.name}
                      </div>
                      <div style={{ fontSize: 10, color: '#6B7280' }}>
                        {industry.eventCount}개 이벤트
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* 선택된 산업의 이벤트 또는 전체 TOP 이벤트 */}
            <div style={{
              padding: 16,
              background: '#0D0D12',
              borderRadius: 12,
              border: '1px solid #2E2E3E',
            }}>
              <h3 style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 12,
                color: selectedIndustry
                  ? INDUSTRY_EVENTS[selectedIndustry].color
                  : '#F59E0B',
              }}>
                {selectedIndustry
                  ? `🏆 ${INDUSTRY_EVENTS[selectedIndustry].name} TOP 5 이벤트 (ROI 순)`
                  : '🏆 전 산업 TOP 5 이벤트 (ROI 순)'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(selectedIndustry
                  ? MoltBotEngine.findBestEvents(selectedIndustry, 5)
                  : topEventsAll
                ).map((event, idx) => (
                  <div
                    key={event.id}
                    style={{
                      padding: 12,
                      background: idx === 0 ? '#F59E0B10' : '#1A1A2E',
                      borderRadius: 10,
                      border: idx === 0 ? '1px solid #F59E0B40' : '1px solid #2E2E3E',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: idx === 0 ? '#F59E0B' : idx === 1 ? '#94A3B8' : idx === 2 ? '#B45309' : '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'white',
                    }}>
                      {idx + 1}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        {!selectedIndustry && (
                          <span style={{
                            padding: '2px 6px',
                            background: `${event.industryColor}20`,
                            borderRadius: 4,
                            fontSize: 10,
                            color: event.industryColor,
                          }}>
                            {event.industryIcon} {event.industryName}
                          </span>
                        )}
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#F8FAFC' }}>
                          {event.name}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>
                        {event.desc}
                      </div>
                      <div style={{ fontSize: 10, color: '#4B5563', marginTop: 4 }}>
                        🔔 트리거: {event.trigger}
                      </div>
                    </div>

                    <div style={{
                      padding: '8px 12px',
                      background: '#10B98120',
                      borderRadius: 8,
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 10, color: '#6B7280' }}>예상 ROI</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#10B981' }}>
                        {event.roi}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!showIndustryPanel && (
          <button
            onClick={() => setShowIndustryPanel(true)}
            style={{
              width: '100%',
              padding: 12,
              marginBottom: 24,
              background: '#1A1A2E',
              border: '1px solid #2E2E3E',
              borderRadius: 10,
              color: '#6B7280',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            🏭 산업별 극대화 이벤트 검색 펼치기 ▼
          </button>
        )}

        {/* 통계 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <StatCard label="Raw 입력" value={stats.totalInputs} color="#6B7280" />
          <StatCard label="통과 (10%)" value={stats.totalPassed} color="#F59E0B" />
          <StatCard label="버림 (90%)" value={stats.totalDiscarded} color="#EF4444" />
          <StatCard label="생성 V" value={`₩${stats.totalV.toLocaleString()}`} color="#10B981" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          {/* 1. 사용자 입력 (MoltBot 수집) */}
          <section>
            <SectionHeader icon="🦎" title="MoltBot 입력 수집" color="#F59E0B" />

            <div style={{
              padding: 16, borderRadius: 12,
              background: '#1A1A2E', border: '1px solid #F59E0B40',
            }}>
              <textarea
                placeholder="사용자 입력 (불만, 요청, 피드백...)"
                value={newInput}
                onChange={e => setNewInput(e.target.value)}
                style={{
                  width: '100%', height: 80, padding: 12,
                  background: '#0D0D12', border: '1px solid #2E2E3E', borderRadius: 8,
                  color: '#F8FAFC', fontSize: 13, resize: 'none',
                }}
              />
              <button
                onClick={handleAddInput}
                style={{
                  width: '100%', padding: '10px', marginTop: 8, borderRadius: 8,
                  background: '#F59E0B', border: 'none',
                  color: 'black', fontWeight: 600, cursor: 'pointer',
                }}
              >
                입력 추가
              </button>
            </div>

            {/* 대기 중인 입력 */}
            <div style={{ marginTop: 12, maxHeight: 200, overflow: 'auto' }}>
              {rawInputs.map(input => (
                <div key={input.id} style={{
                  padding: 10, borderRadius: 6, marginBottom: 6,
                  background: '#0D0D12', fontSize: 12,
                }}>
                  <div style={{ color: '#F8FAFC' }}>{input.content}</div>
                  <div style={{ fontSize: 10, color: '#6B7280', marginTop: 4 }}>
                    {MoltBotEngine.classifyInput(input.content)}
                  </div>
                </div>
              ))}
            </div>

            {rawInputs.length > 0 && (
              <button
                onClick={handleRefine}
                style={{
                  width: '100%', padding: '12px', marginTop: 12, borderRadius: 8,
                  background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
                  border: 'none',
                  color: 'white', fontWeight: 700, cursor: 'pointer',
                }}
              >
                🦎 MoltBot 정제 실행 ({rawInputs.length}건)
              </button>
            )}

            {/* MoltBot 결과 */}
            {moltBotResult && (
              <div style={{
                marginTop: 12, padding: 12, borderRadius: 8,
                background: '#F59E0B10', border: '1px solid #F59E0B40',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#F59E0B', marginBottom: 8 }}>
                  정제 결과
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>
                  <div>총 입력: {moltBotResult.total}건</div>
                  <div style={{ color: '#10B981' }}>통과: {moltBotResult.passed}건</div>
                  <div style={{ color: '#EF4444' }}>버림: {moltBotResult.discarded}건 ({moltBotResult.discardRate})</div>
                </div>
              </div>
            )}
          </section>

          {/* 2. Claude 평가 */}
          <section>
            <SectionHeader icon="🤖" title="Claude 평가" color="#3B82F6" />

            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {proposals.length === 0 ? (
                <EmptyState text="Pain Signal 대기 중" />
              ) : (
                proposals.map(proposal => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    onDecide={() => handleDecide(proposal.id)}
                  />
                ))
              )}
            </div>

            {/* K1-K5 상태 */}
            <div style={{
              marginTop: 12, padding: 12, borderRadius: 8,
              background: '#3B82F610', border: '1px solid #3B82F640',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6', marginBottom: 8 }}>
                헌법 검증 (K1-K5)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(CONSTITUTION).map(([key, law]) => (
                  <span key={key} style={{
                    padding: '3px 8px', borderRadius: 4, fontSize: 10,
                    background: '#3B82F620', color: '#3B82F6',
                  }}>
                    {law.id}: {law.name}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* 3. 실행 결과 */}
          <section>
            <SectionHeader icon="⚡" title="실행 & V 생성" color="#10B981" />

            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {executedActions.length === 0 ? (
                <EmptyState text="실행 대기 중" />
              ) : (
                executedActions.map((action, i) => (
                  <div key={i} style={{
                    padding: 12, borderRadius: 8, marginBottom: 8,
                    background: '#10B98110', border: '1px solid #10B98140',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, color: '#10B981' }}>✓ EXECUTED</span>
                      <span style={{ fontWeight: 700, color: '#10B981' }}>
                        V: ₩{action.predictedV.toLocaleString()}
                      </span>
                    </div>
                    <div style={{
                      padding: 8, borderRadius: 6,
                      background: '#0D0D12', fontSize: 11, color: '#94A3B8',
                    }}>
                      💡 {action.suggestion}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 총 V */}
            {executedActions.length > 0 && (
              <div style={{
                marginTop: 12, padding: 16, borderRadius: 12,
                background: 'linear-gradient(135deg, #10B98120, #059669)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 11, opacity: 0.8 }}>Total Generated V</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>
                  ₩{stats.totalV.toLocaleString()}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function FlowStep({ icon, label, sub, color, active }) {
  return (
    <div style={{
      padding: '12px 20px', borderRadius: 12, textAlign: 'center',
      background: active ? color + '20' : '#1A1A2E',
      border: `2px solid ${active ? color : '#2E2E3E'}`,
      transition: 'all 0.3s',
    }}>
      <div style={{ fontSize: 24 }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: active ? color : '#F8FAFC' }}>{label}</div>
      <div style={{ fontSize: 10, color: '#6B7280' }}>{sub}</div>
    </div>
  );
}

function Arrow() {
  return <div style={{ color: '#6B7280', fontSize: 20 }}>→</div>;
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      padding: 16, borderRadius: 12, textAlign: 'center',
      background: color + '10', border: `1px solid ${color}30`,
    }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, opacity: 0.6 }}>{label}</div>
    </div>
  );
}

function SectionHeader({ icon, title, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 12, paddingBottom: 8,
      borderBottom: `2px solid ${color}40`,
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontWeight: 700, color }}>{title}</span>
    </div>
  );
}

function ProposalCard({ proposal, onDecide }) {
  const statusColors = {
    PENDING: '#F59E0B',
    WAIT: '#3B82F6',
    REJECT: '#EF4444',
    EXECUTED: '#10B981',
  };

  return (
    <div style={{
      padding: 12, borderRadius: 8, marginBottom: 8,
      background: '#0D0D12', border: `1px solid ${statusColors[proposal.status]}40`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>{proposal.signal.type}</span>
        <span style={{
          padding: '2px 8px', borderRadius: 4, fontSize: 10,
          background: statusColors[proposal.status] + '20',
          color: statusColors[proposal.status],
        }}>
          {proposal.status}
        </span>
      </div>

      <div style={{ fontSize: 12, marginBottom: 8 }}>{proposal.signal.content}</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <span style={{
          padding: '2px 6px', borderRadius: 4, fontSize: 10,
          background: proposal.k1Pass ? '#10B98120' : '#EF444420',
          color: proposal.k1Pass ? '#10B981' : '#EF4444',
        }}>
          K1 {proposal.k1Pass ? '✓' : '✗'}
        </span>
        <span style={{
          padding: '2px 6px', borderRadius: 4, fontSize: 10,
          background: proposal.k3Pass ? '#10B98120' : '#EF444420',
          color: proposal.k3Pass ? '#10B981' : '#EF4444',
        }}>
          K3 {proposal.k3Pass ? '✓' : '✗'}
        </span>
        <span style={{
          padding: '2px 6px', borderRadius: 4, fontSize: 10,
          background: '#3B82F620', color: '#3B82F6',
        }}>
          Q:{proposal.qualityScore.toFixed(0)}
        </span>
      </div>

      {proposal.status === 'PENDING' && (
        <button
          onClick={onDecide}
          style={{
            width: '100%', padding: '8px', borderRadius: 6,
            background: '#3B82F6', border: 'none',
            color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          🤖 Claude 결정
        </button>
      )}

      {proposal.decision && (
        <div style={{
          marginTop: 8, padding: 8, borderRadius: 6,
          background: statusColors[proposal.status] + '10',
          fontSize: 11, color: statusColors[proposal.status],
        }}>
          {proposal.decision.reason}
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{
      padding: 40, textAlign: 'center',
      background: '#1A1A2E', borderRadius: 12,
      border: '1px dashed #2E2E3E', color: '#6B7280',
    }}>
      {text}
    </div>
  );
}
