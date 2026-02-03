import React, { useState, useMemo, useCallback, useEffect } from 'react';
import MoltBotChat from '../../components/MoltBotChat';
import { AUTUSRuntime } from '../../core/AUTUSRuntime';
import AUTUSNav from '../../components/AUTUSNav';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS FlowTune - 실시간 플로우 최적화 대시보드
 *
 * Inspired by:
 * - AI Intelligence Network Map (실시간 트래픽 시각화)
 * - Navexa Warehouse (공간 기반 자원 관리)
 * - FlowTune Dashboard (플로우 최적화)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 노드 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

const NODE_TYPES = {
  ENTRY: { type: 'ENTRY', name: '진입점', icon: '🚪', color: '#10B981' },
  ROLE: { type: 'ROLE', name: '역할', icon: '👤', color: '#3B82F6' },
  PROCESS: { type: 'PROCESS', name: '프로세스', icon: '⚙️', color: '#8B5CF6' },
  DECISION: { type: 'DECISION', name: '분기', icon: '◇', color: '#F59E0B' },
  SERVICE: { type: 'SERVICE', name: '서비스', icon: '🔌', color: '#EC4899' },
  EXIT: { type: 'EXIT', name: '완료', icon: '🏁', color: '#6B7280' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 기본 플로우 데이터
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_NODES = [
  { id: 'entry', type: 'ENTRY', x: 80, y: 200, label: '이벤트 수신', throughput: 1250, status: 'active' },
  { id: 'moltbot', type: 'SERVICE', x: 220, y: 200, label: 'MoltBot', throughput: 125, status: 'active', filterRate: 90 },
  { id: 'decision1', type: 'DECISION', x: 380, y: 200, label: 'Pain Signal?', throughput: 125, status: 'active' },
  { id: 'producer', type: 'ROLE', x: 520, y: 120, label: '생산자', throughput: 80, status: 'active', members: 3 },
  { id: 'manager', type: 'ROLE', x: 520, y: 280, label: '관리자', throughput: 45, status: 'active', members: 1 },
  { id: 'unified', type: 'PROCESS', x: 680, y: 120, label: '일체화', throughput: 80, status: 'active' },
  { id: 'automated', type: 'PROCESS', x: 680, y: 280, label: '자동화', throughput: 45, status: 'active' },
  { id: 'decision2', type: 'DECISION', x: 840, y: 200, label: '승인 필요?', throughput: 125, status: 'active' },
  { id: 'owner', type: 'ROLE', x: 980, y: 120, label: '대표', throughput: 30, status: 'warning', members: 1 },
  { id: 'approved', type: 'PROCESS', x: 980, y: 280, label: '승인화', throughput: 95, status: 'active' },
  { id: 'tasked', type: 'PROCESS', x: 1120, y: 200, label: '업무화', throughput: 125, status: 'active' },
  { id: 'exit', type: 'EXIT', x: 1260, y: 200, label: 'V 생성', throughput: 125, status: 'active', totalV: 2450000 },
];

const DEFAULT_CONNECTIONS = [
  { from: 'entry', to: 'moltbot', throughput: 1250, label: '1.25k/h' },
  { from: 'moltbot', to: 'decision1', throughput: 125, label: '125/h' },
  { from: 'decision1', to: 'producer', throughput: 80, label: '80/h', condition: 'Pain' },
  { from: 'decision1', to: 'manager', throughput: 45, label: '45/h', condition: 'Request' },
  { from: 'producer', to: 'unified', throughput: 80, label: '80/h' },
  { from: 'manager', to: 'automated', throughput: 45, label: '45/h' },
  { from: 'unified', to: 'decision2', throughput: 80, label: '80/h' },
  { from: 'automated', to: 'decision2', throughput: 45, label: '45/h' },
  { from: 'decision2', to: 'owner', throughput: 30, label: '30/h', condition: 'Yes' },
  { from: 'decision2', to: 'approved', throughput: 95, label: '95/h', condition: 'No' },
  { from: 'owner', to: 'approved', throughput: 30, label: '30/h' },
  { from: 'approved', to: 'tasked', throughput: 125, label: '125/h' },
  { from: 'tasked', to: 'exit', throughput: 125, label: '125/h' },
];

// 시간대별 데이터 (타임라인용)
const TIMELINE_DATA = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  label: `${String(i).padStart(2, '0')}:00`,
  events: Math.floor(Math.random() * 200) + 50,
  throughput: Math.floor(Math.random() * 150) + 80,
  alerts: Math.floor(Math.random() * 10),
}));

// 서비스 상태 데이터
const SERVICE_STATUS = [
  { id: 1, service: 'MoltBot Filter', from: 'entry', to: 'moltbot', status: 'active', throughput: 1250 },
  { id: 2, service: 'Pain Signal Router', from: 'decision1', to: 'producer', status: 'active', throughput: 80 },
  { id: 3, service: 'Auto Approval', from: 'decision2', to: 'approved', status: 'active', throughput: 95 },
  { id: 4, service: 'Owner Review', from: 'owner', to: 'approved', status: 'warning', throughput: 30 },
  { id: 5, service: 'V Calculator', from: 'tasked', to: 'exit', status: 'active', throughput: 125 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 🦎 이벤트 워크플로우 자동 생성 엔진
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 이벤트/상품 설명을 분석하여 최적의 워크플로우를 생성
 * @param {string} eventDescription - 이벤트 설명 (예: "3개월 훈련 하이라이트 제공")
 * @returns {{ nodes: Array, connections: Array }} - 생성된 워크플로우
 */
function generateEventWorkflow(eventDescription) {
  const timestamp = Date.now();
  const desc = eventDescription.toLowerCase();

  // 키워드 분석으로 이벤트 유형 파악
  const analysis = analyzeEvent(desc);

  // 베이스 좌표 (기존 노드 오른쪽에 배치)
  const baseX = 100;
  const baseY = 80;
  const nodeGapX = 160;
  const nodeGapY = 100;

  const nodes = [];
  const connections = [];
  let nodeIndex = 0;

  // 1. 진입점: 이벤트 트리거
  const entryNode = {
    id: `evt_entry_${timestamp}`,
    type: 'ENTRY',
    x: baseX,
    y: baseY + nodeGapY,
    label: analysis.triggerName,
    throughput: analysis.estimatedVolume,
    status: 'active',
  };
  nodes.push(entryNode);
  nodeIndex++;

  // 2. MoltBot 필터링 (항상 포함)
  const filterNode = {
    id: `evt_filter_${timestamp}`,
    type: 'SERVICE',
    x: baseX + nodeGapX,
    y: baseY + nodeGapY,
    label: 'MoltBot 분석',
    throughput: Math.floor(analysis.estimatedVolume * 0.9),
    status: 'active',
    filterRate: 10,
  };
  nodes.push(filterNode);
  connections.push({
    from: entryNode.id,
    to: filterNode.id,
    throughput: analysis.estimatedVolume,
    label: `${analysis.estimatedVolume}/h`,
  });

  // 3. 대상 분기 (타겟팅이 필요한 경우)
  if (analysis.needsTargeting) {
    const decisionNode = {
      id: `evt_decision_${timestamp}`,
      type: 'DECISION',
      x: baseX + nodeGapX * 2,
      y: baseY + nodeGapY,
      label: '대상 분류',
      throughput: Math.floor(analysis.estimatedVolume * 0.8),
      status: 'active',
    };
    nodes.push(decisionNode);
    connections.push({
      from: filterNode.id,
      to: decisionNode.id,
      throughput: Math.floor(analysis.estimatedVolume * 0.8),
      label: `${Math.floor(analysis.estimatedVolume * 0.8)}/h`,
    });

    // 분기별 역할/프로세스
    analysis.targetGroups.forEach((group, i) => {
      const roleNode = {
        id: `evt_role_${i}_${timestamp}`,
        type: 'ROLE',
        x: baseX + nodeGapX * 3,
        y: baseY + (i * nodeGapY),
        label: group.name,
        throughput: group.volume,
        status: 'active',
        members: group.members || 1,
      };
      nodes.push(roleNode);
      connections.push({
        from: decisionNode.id,
        to: roleNode.id,
        throughput: group.volume,
        label: `${group.volume}/h`,
        condition: group.condition,
      });
    });
  }

  // 4. 콘텐츠/상품 생성 프로세스
  analysis.processes.forEach((process, i) => {
    const xOffset = analysis.needsTargeting ? 4 : 2;
    const processNode = {
      id: `evt_process_${i}_${timestamp}`,
      type: 'PROCESS',
      x: baseX + nodeGapX * (xOffset + i),
      y: baseY + nodeGapY,
      label: process.name,
      throughput: process.volume,
      status: 'active',
    };
    nodes.push(processNode);

    // 이전 노드와 연결
    const prevNode = nodes[nodes.length - 2];
    if (prevNode && prevNode.type !== 'DECISION') {
      connections.push({
        from: prevNode.id,
        to: processNode.id,
        throughput: process.volume,
        label: `${process.volume}/h`,
      });
    }
  });

  // 5. 승인 분기 (고가 상품이거나 승인 필요 시)
  if (analysis.needsApproval) {
    const approvalDecision = {
      id: `evt_approval_${timestamp}`,
      type: 'DECISION',
      x: baseX + nodeGapX * 5,
      y: baseY + nodeGapY,
      label: '승인 필요?',
      throughput: analysis.estimatedVolume * 0.5,
      status: 'active',
    };
    nodes.push(approvalDecision);

    const ownerNode = {
      id: `evt_owner_${timestamp}`,
      type: 'ROLE',
      x: baseX + nodeGapX * 6,
      y: baseY,
      label: '대표 승인',
      throughput: Math.floor(analysis.estimatedVolume * 0.2),
      status: 'warning',
      members: 1,
    };
    nodes.push(ownerNode);

    const autoApprove = {
      id: `evt_auto_${timestamp}`,
      type: 'PROCESS',
      x: baseX + nodeGapX * 6,
      y: baseY + nodeGapY * 2,
      label: '자동 승인',
      throughput: Math.floor(analysis.estimatedVolume * 0.8),
      status: 'active',
    };
    nodes.push(autoApprove);

    connections.push(
      { from: approvalDecision.id, to: ownerNode.id, throughput: analysis.estimatedVolume * 0.2, label: '고가', condition: '고가' },
      { from: approvalDecision.id, to: autoApprove.id, throughput: analysis.estimatedVolume * 0.8, label: '일반', condition: '일반' }
    );
  }

  // 6. 전달/배포 프로세스
  analysis.deliveryMethods.forEach((method, i) => {
    const deliveryNode = {
      id: `evt_delivery_${i}_${timestamp}`,
      type: 'SERVICE',
      x: baseX + nodeGapX * (7 + i),
      y: baseY + nodeGapY,
      label: method.name,
      throughput: method.volume,
      status: 'active',
    };
    nodes.push(deliveryNode);
  });

  // 7. 완료: V 생성
  const exitNode = {
    id: `evt_exit_${timestamp}`,
    type: 'EXIT',
    x: baseX + nodeGapX * 9,
    y: baseY + nodeGapY,
    label: 'V 생성',
    throughput: analysis.estimatedVolume * 0.7,
    status: 'active',
    totalV: analysis.estimatedV,
  };
  nodes.push(exitNode);

  // 마지막 노드들을 exit에 연결
  const lastProcessNode = nodes.find(n => n.id.includes('delivery_0')) || nodes[nodes.length - 2];
  if (lastProcessNode) {
    connections.push({
      from: lastProcessNode.id,
      to: exitNode.id,
      throughput: analysis.estimatedVolume * 0.7,
      label: `${Math.floor(analysis.estimatedVolume * 0.7)}/h`,
    });
  }

  return { nodes, connections, analysis };
}

/**
 * 🦎 확장된 이벤트 분석 엔진 v2.0
 * - 더 많은 키워드 지원
 * - 업종별 템플릿
 * - 복합 이벤트 처리
 */

// 업종별 워크플로우 템플릿
const INDUSTRY_TEMPLATES = {
  education: {
    name: '교육/훈련',
    keywords: ['교육', '훈련', '수업', '강의', '레슨', '클래스', '아카데미', '학원'],
    defaultProcesses: ['커리큘럼 설정', '강사 배정'],
    deliveryMethod: '수업 진행',
    vMultiplier: 1.2,
  },
  ecommerce: {
    name: '이커머스',
    keywords: ['판매', '주문', '배송', '구매', '쇼핑', '장바구니', '결제'],
    defaultProcesses: ['재고 확인', '포장'],
    deliveryMethod: '배송',
    vMultiplier: 1.0,
  },
  content: {
    name: '콘텐츠/미디어',
    keywords: ['영상', '콘텐츠', '미디어', '방송', '라이브', '스트리밍', 'vod'],
    defaultProcesses: ['콘텐츠 제작', '편집'],
    deliveryMethod: '스트리밍',
    vMultiplier: 1.5,
  },
  consulting: {
    name: '컨설팅/서비스',
    keywords: ['컨설팅', '상담', '코칭', '멘토링', '자문', '케어'],
    defaultProcesses: ['일정 조율', '전문가 매칭'],
    deliveryMethod: '세션 진행',
    vMultiplier: 2.0,
  },
  membership: {
    name: '멤버십/구독',
    keywords: ['구독', '멤버십', '회원권', '정기', '월간', '연간'],
    defaultProcesses: ['권한 설정', '혜택 적용'],
    deliveryMethod: '서비스 활성화',
    vMultiplier: 1.8,
  },
  marketing: {
    name: '마케팅/프로모션',
    keywords: ['이벤트', '프로모션', '할인', '쿠폰', '캠페인', '광고', '홍보'],
    defaultProcesses: ['타겟 설정', '메시지 작성'],
    deliveryMethod: '캠페인 발송',
    vMultiplier: 0.8,
  },
};

// 확장된 키워드 사전
const KEYWORD_DICTIONARY = {
  // 콘텐츠 유형
  video: ['영상', '비디오', '하이라이트', 'vod', '클립', '동영상', '촬영', '편집', '라이브', '방송'],
  content: ['콘텐츠', '자료', '정보', '가이드', '매뉴얼', '문서', '리포트', '분석'],
  product: ['상품', '제품', '굿즈', '패키지', '세트', '번들', '키트', '박스'],
  service: ['서비스', '코칭', '멘토링', '컨설팅', '훈련', '교육', '레슨', '케어', '관리'],
  event: ['이벤트', '프로모션', '할인', '특가', '세일', '쿠폰', '캠페인', '기획전'],

  // 대상
  target: ['회원', '고객', '구독자', '신규', '기존', 'vip', '우수', '일반', '잠재', '휴면', '이탈'],
  segment: ['등급', '티어', '레벨', '그룹', '세그먼트'],

  // 가격/가치
  premium: ['프리미엄', '고급', 'vip', '특별', '익스클루시브', '한정', '스페셜'],
  free: ['무료', '공짜', '체험', '샘플', '트라이얼'],

  // 액션
  create: ['생성', '만들기', '제작', '개발', '구축'],
  deliver: ['제공', '전달', '발송', '배포', '공유'],
  manage: ['관리', '운영', '처리', '진행', '실행'],

  // 시간
  urgent: ['긴급', '즉시', '바로', '오늘', '지금'],
  scheduled: ['예약', '예정', '스케줄', '일정'],
};

function analyzeEvent(description) {
  const desc = description.toLowerCase();

  // 1. 키워드 매칭
  const matchedKeywords = {};
  for (const [category, words] of Object.entries(KEYWORD_DICTIONARY)) {
    matchedKeywords[category] = words.filter(w => desc.includes(w));
  }

  // 2. 업종 감지
  let detectedIndustry = null;
  let industryScore = 0;
  for (const [key, template] of Object.entries(INDUSTRY_TEMPLATES)) {
    const score = template.keywords.filter(k => desc.includes(k)).length;
    if (score > industryScore) {
      industryScore = score;
      detectedIndustry = { key, ...template };
    }
  }

  // 3. 기간 파싱
  const durationMatch = desc.match(/(\d+)\s*(개월|주|일|년|시간|분)/);
  const duration = durationMatch ? durationMatch[0] : '1개월';

  // 4. 복잡도 계산 (키워드 수에 따라)
  const totalKeywords = Object.values(matchedKeywords).flat().length;
  const complexity = totalKeywords > 5 ? 'high' : totalKeywords > 2 ? 'medium' : 'low';

  // 5. 예상 처리량 계산
  const hasVideo = matchedKeywords.video.length > 0;
  const hasProduct = matchedKeywords.product.length > 0;
  const hasService = matchedKeywords.service.length > 0;
  const hasEvent = matchedKeywords.event.length > 0;
  const isPremium = matchedKeywords.premium.length > 0;
  const isFree = matchedKeywords.free.length > 0;
  const hasTarget = matchedKeywords.target.length > 0;
  const isUrgent = matchedKeywords.urgent.length > 0;

  let estimatedVolume = 100;
  if (isPremium) estimatedVolume = 50;
  else if (isFree) estimatedVolume = 300;
  else if (hasEvent) estimatedVolume = 200;
  else if (hasService) estimatedVolume = 80;

  // 6. 타겟 그룹 설정 (더 세분화)
  const targetGroups = [];
  if (hasTarget) {
    if (desc.includes('신규')) targetGroups.push({ name: '신규 회원', volume: Math.floor(estimatedVolume * 0.3), condition: '신규', members: 2 });
    if (desc.includes('기존')) targetGroups.push({ name: '기존 회원', volume: Math.floor(estimatedVolume * 0.4), condition: '기존', members: 3 });
    if (desc.includes('vip') || desc.includes('우수')) targetGroups.push({ name: 'VIP 회원', volume: Math.floor(estimatedVolume * 0.1), condition: 'VIP', members: 1 });
    if (desc.includes('휴면') || desc.includes('이탈')) targetGroups.push({ name: '휴면 회원', volume: Math.floor(estimatedVolume * 0.2), condition: '휴면', members: 2 });

    // 기본 타겟이 없으면 신규/기존 추가
    if (targetGroups.length === 0) {
      targetGroups.push(
        { name: '신규 회원', volume: Math.floor(estimatedVolume * 0.4), condition: '신규', members: 2 },
        { name: '기존 회원', volume: Math.floor(estimatedVolume * 0.6), condition: '기존', members: 3 }
      );
    }
  }

  // 7. 프로세스 결정
  const processes = [];

  // 업종별 기본 프로세스
  if (detectedIndustry) {
    detectedIndustry.defaultProcesses.forEach(p => {
      processes.push({ name: p, volume: estimatedVolume });
    });
  }

  // 키워드 기반 추가 프로세스
  if (hasVideo && !processes.some(p => p.name.includes('편집'))) {
    processes.push({ name: '영상 편집', volume: estimatedVolume });
  }
  if (matchedKeywords.content.length > 0 && !processes.some(p => p.name.includes('콘텐츠'))) {
    processes.push({ name: '콘텐츠 제작', volume: estimatedVolume });
  }
  if (hasProduct && !processes.some(p => p.name.includes('상품') || p.name.includes('재고'))) {
    processes.push({ name: '상품 준비', volume: estimatedVolume });
  }
  if (hasService && !processes.some(p => p.name.includes('설정') || p.name.includes('매칭'))) {
    processes.push({ name: '서비스 설정', volume: estimatedVolume });
  }

  // 기본 프로세스
  if (processes.length === 0) {
    processes.push({ name: '일체화', volume: estimatedVolume });
  }

  // 8. 전달 방식
  let deliveryMethod = '알림 발송';
  if (detectedIndustry) {
    deliveryMethod = detectedIndustry.deliveryMethod;
  } else if (hasVideo) {
    deliveryMethod = '스트리밍';
  } else if (hasProduct) {
    deliveryMethod = '배송';
  } else if (hasService) {
    deliveryMethod = '서비스 제공';
  }

  // 9. V 계산
  const vMultiplier = detectedIndustry?.vMultiplier || 1.0;
  const premiumMultiplier = isPremium ? 5 : isFree ? 0.2 : 1;
  const estimatedV = Math.round(estimatedVolume * 30 * 10000 * vMultiplier * premiumMultiplier);

  // 10. 트리거 이름
  let triggerName = '요청 접수';
  if (hasEvent) triggerName = '이벤트 시작';
  else if (hasService) triggerName = '서비스 요청';
  else if (hasProduct) triggerName = '상품 주문';
  else if (detectedIndustry?.key === 'membership') triggerName = '구독 시작';

  return {
    // 기본 정보
    duration,
    complexity,
    triggerName,

    // 업종
    industry: detectedIndustry,

    // 타겟팅
    needsTargeting: hasTarget || targetGroups.length > 0,
    targetGroups,

    // 프로세스
    processes,
    needsApproval: isPremium || hasService || complexity === 'high',

    // 전달
    deliveryMethods: [{ name: deliveryMethod, volume: estimatedVolume }],

    // 수치
    estimatedVolume,
    estimatedV,

    // 플래그
    flags: {
      isPremium,
      isFree,
      isUrgent,
      hasVideo,
      hasProduct,
      hasService,
      hasEvent,
    },

    // 매칭된 키워드 (디버깅용)
    matchedKeywords,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AUTUSFlowTune() {
  // 런타임 연결 상태
  const [isRuntimeConnected, setIsRuntimeConnected] = useState(false);

  // 런타임 연결
  useEffect(() => {
    const connectRuntime = async () => {
      if (!AUTUSRuntime.isRunning) {
        await AUTUSRuntime.init({
          appName: '올댓바스켓',
          industry: 'education',
          vTarget: { monthly: 10000000, margin: 0.3 },
        });
      }
      setIsRuntimeConnected(AUTUSRuntime.isRunning);
    };
    connectRuntime();
  }, []);

  const [nodes, setNodes] = useState(DEFAULT_NODES);
  const [connections, setConnections] = useState(DEFAULT_CONNECTIONS);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedHour, setSelectedHour] = useState(13);
  const [zoom, setZoom] = useState(85);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // 캔버스 이동
  const [viewMode, setViewMode] = useState('flow'); // flow, tree, list
  const [isEditing, setIsEditing] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [lastAnalysis, setLastAnalysis] = useState(null); // 마지막 분석 결과
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false); // 분석 패널 표시

  // 🦎 캔버스 자동 맞춤 (Auto-fit)
  const fitToView = useCallback((nodesToFit = nodes, containerWidth = 800, containerHeight = 400) => {
    if (nodesToFit.length === 0) return;

    // 노드들의 바운딩 박스 계산
    const minX = Math.min(...nodesToFit.map(n => n.x));
    const maxX = Math.max(...nodesToFit.map(n => n.x + 120)); // 노드 너비 고려
    const minY = Math.min(...nodesToFit.map(n => n.y));
    const maxY = Math.max(...nodesToFit.map(n => n.y + 60)); // 노드 높이 고려

    const contentWidth = maxX - minX + 100; // 여백 추가
    const contentHeight = maxY - minY + 100;

    // 최적 줌 레벨 계산
    const zoomX = (containerWidth / contentWidth) * 100;
    const zoomY = (containerHeight / contentHeight) * 100;
    const optimalZoom = Math.min(zoomX, zoomY, 120); // 최대 120%

    // 중앙 정렬을 위한 pan 계산
    const newPan = {
      x: -minX + 50,
      y: -minY + 50,
    };

    setZoom(Math.max(50, Math.floor(optimalZoom)));
    setPan(newPan);
  }, [nodes]);

  // 애니메이션 효과
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // 통계 계산
  const stats = useMemo(() => {
    const totalThroughput = nodes.reduce((sum, n) => sum + (n.throughput || 0), 0);
    const activeNodes = nodes.filter(n => n.status === 'active').length;
    const warningNodes = nodes.filter(n => n.status === 'warning').length;
    const totalV = nodes.find(n => n.id === 'exit')?.totalV || 0;

    return { totalThroughput, activeNodes, warningNodes, totalV };
  }, [nodes]);

  // 노드 드래그
  const handleNodeDrag = useCallback((nodeId, newX, newY) => {
    setNodes(nodes.map(n =>
      n.id === nodeId ? { ...n, x: Math.max(0, newX), y: Math.max(0, newY) } : n
    ));
  }, [nodes]);

  // MoltBot 명령 처리 - 페이지 개선
  const handlePainSignal = async (signal) => {
    // signal 구조: { original, analysis, proposal } 또는 { text, type }
    const text = (signal.original || signal.text || signal.type || '').toLowerCase();
    console.log('🦎 FlowTune Command:', text, signal);

    // 런타임을 통해 처리
    if (isRuntimeConnected && AUTUSRuntime.isRunning) {
      await AUTUSRuntime.processInput(text);
    }

    // === 명령어 파싱 및 페이지 수정 ===

    // 🦎 이벤트/상품 워크플로우 자동 생성
    const eventPatterns = [
      /^이벤트[:\s]+(.+)/i,
      /^상품[:\s]+(.+)/i,
      /^event[:\s]+(.+)/i,
      /^product[:\s]+(.+)/i,
      /^워크플로우[:\s]+(.+)/i,
      /^workflow[:\s]+(.+)/i,
      // 자연어 패턴도 지원
      /(.+)\s*(제공|생성|만들기|시작)/,
    ];

    for (const pattern of eventPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].length > 2) {
        const eventDescription = match[1].trim();
        console.log('🦎 이벤트 감지:', eventDescription);

        // 워크플로우 생성
        const { nodes: newNodes, connections: newConnections, analysis } = generateEventWorkflow(eventDescription);

        // 기존 노드 클리어 옵션 (새 워크플로우로 대체)
        setNodes(newNodes);
        setConnections(newConnections);

        // 분석 결과 저장 및 패널 표시
        setLastAnalysis(analysis);
        setShowAnalysisPanel(true);

        // 캔버스 자동 맞춤 (약간의 딜레이 후)
        setTimeout(() => {
          fitToView(newNodes);
        }, 100);

        console.log('🦎 워크플로우 생성 완료:', {
          노드수: newNodes.length,
          연결수: newConnections.length,
          분석: analysis,
        });
        return;
      }
    }

    // 노드 추가
    if (text.includes('노드 추가') || text.includes('add node')) {
      const newNode = {
        id: `node_${Date.now()}`,
        type: 'PROCESS',
        x: 400 + Math.random() * 200,
        y: 150 + Math.random() * 100,
        label: '새 프로세스',
        throughput: 0,
        status: 'active',
      };
      setNodes(prev => [...prev, newNode]);
      return;
    }

    // 노드 삭제
    if (text.includes('노드 삭제') || text.includes('delete node')) {
      if (selectedNode) {
        setNodes(prev => prev.filter(n => n.id !== selectedNode));
        setConnections(prev => prev.filter(c => c.from !== selectedNode && c.to !== selectedNode));
        setSelectedNode(null);
      }
      return;
    }

    // 줌 조절
    if (text.includes('확대') || text.includes('zoom in')) {
      setZoom(prev => Math.min(prev + 15, 150));
      return;
    }
    if (text.includes('축소') || text.includes('zoom out')) {
      setZoom(prev => Math.max(prev - 15, 50));
      return;
    }

    // 편집 모드 토글
    if (text.includes('편집') || text.includes('edit')) {
      setIsEditing(prev => !prev);
      return;
    }

    // 노드 상태 변경
    if (text.includes('경고') || text.includes('warning')) {
      if (selectedNode) {
        setNodes(prev => prev.map(n =>
          n.id === selectedNode ? { ...n, status: 'warning' } : n
        ));
      }
      return;
    }
    if (text.includes('정상') || text.includes('active')) {
      if (selectedNode) {
        setNodes(prev => prev.map(n =>
          n.id === selectedNode ? { ...n, status: 'active' } : n
        ));
      }
      return;
    }

    // throughput 증가/감소
    if (text.includes('처리량 증가') || text.includes('increase')) {
      setNodes(prev => prev.map(n =>
        n.id === (selectedNode || 'moltbot')
          ? { ...n, throughput: (n.throughput || 0) + 50 }
          : n
      ));
      return;
    }
    if (text.includes('처리량 감소') || text.includes('decrease')) {
      setNodes(prev => prev.map(n =>
        n.id === (selectedNode || 'moltbot')
          ? { ...n, throughput: Math.max(0, (n.throughput || 0) - 50) }
          : n
      ));
      return;
    }

    // 리셋
    if (text.includes('리셋') || text.includes('reset')) {
      setNodes(DEFAULT_NODES);
      setConnections(DEFAULT_CONNECTIONS);
      setSelectedNode(null);
      setZoom(85);
      return;
    }

    // 기본: MoltBot throughput 증가
    setNodes(prev => prev.map(n =>
      n.id === 'moltbot'
        ? { ...n, throughput: (n.throughput || 0) + 1 }
        : n
    ));
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #E8EDF5 0%, #F0F4F8 50%, #E8EDF5 100%)',
      color: '#1E293B',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* AUTUS Navigation */}
      <AUTUSNav currentHash="#flowtune" />

      {/* Header */}
      <header style={{
        padding: '12px 24px',
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 14,
            }}>
              A
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>AUTUS</span>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 8,
            background: '#F1F5F9', fontSize: 12,
          }}>
            <span style={{ opacity: 0.5 }}>Interval</span>
            <span style={{ fontWeight: 600 }}>last 5 min</span>
            <span style={{ opacity: 0.3 }}>|</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FilterDropdown label="Service" value="Zone..." />
          <FilterDropdown label="Filter" value="3" />
          <FilterDropdown label="Zone in" value="2" />
          <FilterDropdown label="IP in" value="1" />

          <button style={{
            padding: '8px 16px', borderRadius: 8,
            background: '#F1F5F9', border: '1px solid #E2E8F0',
            fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            📥 Load
          </button>
          <button style={{
            padding: '8px 16px', borderRadius: 8,
            background: '#3B82F6', border: 'none', color: 'white',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            💾 Save
          </button>
        </div>
      </header>

      {/* Timeline Scrubber */}
      <div style={{
        padding: '12px 24px',
        background: 'rgba(255,255,255,0.6)',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={zoomBtnStyle}>+</button>
          <button style={zoomBtnStyle}>−</button>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative' }}>
          {TIMELINE_DATA.slice(8, 20).map((data, i) => (
            <div
              key={i}
              onClick={() => setSelectedHour(data.hour)}
              style={{
                flex: 1, textAlign: 'center', padding: '8px 0',
                cursor: 'pointer', position: 'relative',
              }}
            >
              <div style={{
                fontSize: 10, color: selectedHour === data.hour ? '#3B82F6' : '#94A3B8',
                fontWeight: selectedHour === data.hour ? 600 : 400,
              }}>
                {data.label}
              </div>
              {data.alerts > 5 && (
                <div style={{
                  position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)',
                  width: 16, height: 16, borderRadius: 8,
                  background: '#EF4444', color: 'white',
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {data.alerts}
                </div>
              )}
              {selectedHour === data.hour && (
                <div style={{
                  position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
                  width: 8, height: 8, borderRadius: 4, background: '#3B82F6',
                }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...viewBtnStyle, background: viewMode === 'flow' ? '#3B82F6' : '#F1F5F9', color: viewMode === 'flow' ? 'white' : '#64748B' }}>
            ⊞
          </button>
          <button style={{ ...viewBtnStyle, background: viewMode === 'list' ? '#3B82F6' : '#F1F5F9', color: viewMode === 'list' ? 'white' : '#64748B' }}>
            ☰
          </button>
        </div>
      </div>

      {/* 🦎 이벤트 입력 바 - 눈에 잘 띄게 */}
      <div style={{
        padding: '16px 24px',
        background: 'linear-gradient(135deg, #3B82F610, #8B5CF610)',
        borderBottom: '2px solid #3B82F630',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          maxWidth: 1200,
          margin: '0 auto',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            background: '#3B82F6',
            borderRadius: 12,
            color: 'white',
          }}>
            <span style={{ fontSize: 20 }}>🦎</span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>이벤트 입력</span>
          </div>

          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 20px',
            background: 'white',
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.15)',
            border: '2px solid #3B82F630',
          }}>
            <input
              id="eventInput"
              placeholder="예: 이벤트: 3개월 훈련 하이라이트 제공 / 상품: VIP 멤버십 패키지"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: 15,
                color: '#1E293B',
                background: 'transparent',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  handlePainSignal({ original: e.target.value, text: e.target.value, type: 'event' });
                  e.target.value = '';
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.getElementById('eventInput');
                if (input?.value.trim()) {
                  handlePainSignal({ original: input.value, text: input.value, type: 'event' });
                  input.value = '';
                }
              }}
              style={{
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                border: 'none',
                borderRadius: 10,
                color: 'white',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              ⚡ 워크플로우 생성
            </button>
          </div>

          {/* V 요약 카드 */}
          {lastAnalysis && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              borderRadius: 12,
              color: 'white',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, opacity: 0.8 }}>예상 월간</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>
                  ₩{(lastAnalysis.estimatedV / 1000000).toFixed(1)}M
                </div>
              </div>
              <div style={{
                width: 1,
                height: 40,
                background: 'rgba(255,255,255,0.3)',
              }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, opacity: 0.8 }}>처리량</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {lastAnalysis.estimatedVolume}/h
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', height: 'calc(100vh - 220px)' }}>
        {/* Left Sidebar - 축소 */}
        <div style={{
          width: 48, background: 'rgba(255,255,255,0.9)',
          borderRight: '1px solid #E2E8F0',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '12px 0', gap: 6,
        }}>
          {[
            { icon: '🏠', active: true },
            { icon: '📊', active: false },
            { icon: '⚙️', active: false },
          ].map((item, i) => (
            <div key={i} style={{
              width: 36, height: 36, borderRadius: 8,
              background: item.active ? '#3B82F6' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 16,
              filter: item.active ? 'none' : 'grayscale(0.5)',
            }}>
              {item.icon}
            </div>
          ))}

          <div style={{ flex: 1 }} />

          {/* Zoom Control */}
          <div style={{
            padding: '8px', borderRadius: 10,
            background: '#F1F5F9', fontSize: 11, textAlign: 'center',
          }}>
            <div style={{ marginBottom: 4 }}>🔍</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => setZoom(z => Math.max(50, z - 10))} style={zoomSmallBtn}>−</button>
              <span style={{ fontSize: 10, width: 30 }}>{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(150, z + 10))} style={zoomSmallBtn}>+</button>
            </div>
          </div>
        </div>

        {/* Flow Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Search & Controls */}
          <div style={{
            position: 'absolute', top: 16, left: 16, zIndex: 10,
            display: 'flex', gap: 8,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8,
              background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
              <span style={{ opacity: 0.5 }}>🔍</span>
              <input
                placeholder="Quick search"
                style={{
                  border: 'none', outline: 'none', fontSize: 13, width: 120,
                  background: 'transparent',
                }}
              />
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                padding: '8px 16px', borderRadius: 8,
                background: isEditing ? '#3B82F6' : 'white',
                color: isEditing ? 'white' : '#64748B',
                border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: 4,
                background: isEditing ? 'white' : '#3B82F6',
              }} />
              Edit
            </button>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8,
              background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
              <span style={{ fontSize: 12 }}>Metric</span>
              <span style={{ opacity: 0.3 }}>▼</span>
            </div>

            <button style={{
              padding: '8px 12px', borderRadius: 8,
              background: 'white', border: 'none', fontSize: 12, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
              ↻ Reset
            </button>
          </div>

          {/* Canvas */}
          <svg
            style={{
              width: '100%', height: '100%',
              transform: `scale(${zoom / 100}) translate(${pan.x}px, ${pan.y}px)`,
              transformOrigin: '0 0',
              transition: 'transform 0.3s ease-out',
            }}
          >
            {/* Background Grid */}
            <defs>
              <pattern id="flowGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="0.5" />
              </pattern>

              {/* 글로우 효과 */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>

              {/* 강한 글로우 (선택된 노드용) */}
              <filter id="glowStrong" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur"/>
                <feFlood floodColor="#3B82F6" floodOpacity="0.5" result="color"/>
                <feComposite in="color" in2="blur" operator="in" result="glow"/>
                <feMerge>
                  <feMergeNode in="glow"/>
                  <feMergeNode in="glow"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>

              {/* 경고 글로우 */}
              <filter id="glowWarning" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feFlood floodColor="#F59E0B" floodOpacity="0.6" result="color"/>
                <feComposite in="color" in2="blur" operator="in" result="glow"/>
                <feMerge>
                  <feMergeNode in="glow"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>

              {/* 성공 그라디언트 */}
              <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.2"/>
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.2"/>
              </linearGradient>

              {/* 플로우 애니메이션용 그라디언트 */}
              <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2"/>
                <stop offset="50%" stopColor="#3B82F6" stopOpacity="1"/>
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.2"/>
              </linearGradient>

              {/* 펄스 애니메이션 */}
              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 1; transform: scale(1); }
                  50% { opacity: 0.7; transform: scale(1.05); }
                }
                @keyframes flowPulse {
                  0% { stroke-dashoffset: 20; }
                  100% { stroke-dashoffset: 0; }
                }
                .node-new { animation: pulse 2s ease-in-out infinite; }
                .connection-active { animation: flowPulse 1s linear infinite; }
              `}</style>
            </defs>
            <rect width="100%" height="100%" fill="url(#flowGrid)" />

            {/* Connections with animated flow */}
            {connections.map((conn, i) => {
              const fromNode = nodes.find(n => n.id === conn.from);
              const toNode = nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;

              const fromX = fromNode.x + 60;
              const fromY = fromNode.y + 30;
              const toX = toNode.x;
              const toY = toNode.y + 30;

              const midX = (fromX + toX) / 2;
              const controlOffset = Math.abs(toY - fromY) > 50 ? 80 : 50;

              // 두께는 throughput에 비례
              const strokeWidth = Math.max(2, Math.min(8, conn.throughput / 150));

              return (
                <g key={i}>
                  {/* Connection path */}
                  <path
                    d={`M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`}
                    fill="none"
                    stroke="#CBD5E1"
                    strokeWidth={strokeWidth + 4}
                    opacity="0.3"
                  />
                  <path
                    d={`M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`}
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth={strokeWidth}
                    opacity="0.6"
                  />

                  {/* Animated dots */}
                  <circle r="4" fill="#3B82F6" filter="url(#glow)">
                    <animateMotion
                      dur={`${3 - strokeWidth * 0.2}s`}
                      repeatCount="indefinite"
                      path={`M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`}
                    />
                  </circle>

                  {/* Throughput label */}
                  <g transform={`translate(${midX}, ${(fromY + toY) / 2 - 10})`}>
                    <rect x="-25" y="-10" width="50" height="20" rx="4" fill="white" opacity="0.9" />
                    <text textAnchor="middle" dy="4" fontSize="10" fill="#64748B" fontWeight="500">
                      {conn.label}
                    </text>
                  </g>

                  {/* Condition label */}
                  {conn.condition && (
                    <text
                      x={fromX + 30}
                      y={fromY + (toY > fromY ? 15 : -10)}
                      fontSize="9"
                      fill="#8B5CF6"
                      fontWeight="600"
                    >
                      {conn.condition}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const nodeType = NODE_TYPES[node.type];
              const isSelected = selectedNode === node.id;
              const isDecision = node.type === 'DECISION';

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedNode(isSelected ? null : node.id)}
                  style={{ cursor: 'pointer' }}
                  onMouseDown={(e) => {
                    if (!isEditing) return;
                    const startX = e.clientX - node.x * (zoom / 100);
                    const startY = e.clientY - node.y * (zoom / 100);

                    const handleMove = (moveEvent) => {
                      handleNodeDrag(
                        node.id,
                        (moveEvent.clientX - startX) / (zoom / 100),
                        (moveEvent.clientY - startY) / (zoom / 100)
                      );
                    };

                    const handleUp = () => {
                      document.removeEventListener('mousemove', handleMove);
                      document.removeEventListener('mouseup', handleUp);
                    };

                    document.addEventListener('mousemove', handleMove);
                    document.addEventListener('mouseup', handleUp);
                  }}
                >
                  {/* Node shape */}
                  {isDecision ? (
                    <rect
                      x="0" y="0" width="60" height="60"
                      rx="4"
                      transform="rotate(45, 30, 30)"
                      fill="white"
                      stroke={isSelected ? '#3B82F6' : nodeType.color}
                      strokeWidth={isSelected ? 3 : 2}
                      filter={isSelected ? 'url(#glow)' : 'none'}
                    />
                  ) : (
                    <rect
                      x="0" y="0" width="120" height="60"
                      rx="12"
                      fill="white"
                      stroke={isSelected ? '#3B82F6' : nodeType.color}
                      strokeWidth={isSelected ? 3 : 2}
                      filter={isSelected ? 'url(#glow)' : 'none'}
                    />
                  )}

                  {/* Status indicator */}
                  <circle
                    cx={isDecision ? 30 : 110}
                    cy="10"
                    r="5"
                    fill={node.status === 'active' ? '#10B981' : node.status === 'warning' ? '#F59E0B' : '#EF4444'}
                  />

                  {/* Node content */}
                  <text
                    x={isDecision ? 30 : 60}
                    y="25"
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill="#1E293B"
                  >
                    {node.label}
                  </text>

                  {!isDecision && (
                    <>
                      <text
                        x="60" y="42"
                        textAnchor="middle"
                        fontSize="10"
                        fill={nodeType.color}
                        fontWeight="500"
                      >
                        {node.throughput}/h ↗
                      </text>

                      {/* Additional info */}
                      {node.filterRate && (
                        <g transform="translate(10, 50)">
                          <rect x="0" y="0" width="40" height="14" rx="3" fill={nodeType.color + '20'} />
                          <text x="20" y="10" textAnchor="middle" fontSize="8" fill={nodeType.color}>
                            -{node.filterRate}%
                          </text>
                        </g>
                      )}

                      {node.members && (
                        <g transform="translate(70, 50)">
                          <rect x="0" y="0" width="40" height="14" rx="3" fill={nodeType.color + '20'} />
                          <text x="20" y="10" textAnchor="middle" fontSize="8" fill={nodeType.color}>
                            👤 {node.members}
                          </text>
                        </g>
                      )}

                      {node.totalV && (
                        <g transform="translate(10, 50)">
                          <rect x="0" y="0" width="100" height="14" rx="3" fill="#10B98120" />
                          <text x="50" y="10" textAnchor="middle" fontSize="8" fill="#10B981" fontWeight="600">
                            V: ₩{(node.totalV / 1000000).toFixed(1)}M
                          </text>
                        </g>
                      )}
                    </>
                  )}

                  {/* Connection points */}
                  <circle cx="0" cy="30" r="6" fill={nodeType.color} stroke="white" strokeWidth="2" />
                  <circle cx={isDecision ? 60 : 120} cy="30" r="6" fill={nodeType.color} stroke="white" strokeWidth="2" />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right Panel - Node Details */}
        {selectedNode && (
          <NodeDetailPanel
            node={nodes.find(n => n.id === selectedNode)}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>

      {/* 🦎 분석 결과 패널 */}
      {showAnalysisPanel && lastAnalysis && (
        <div style={{
          position: 'fixed',
          top: 140,
          right: 24,
          width: 320,
          background: 'white',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          zIndex: 100,
          overflow: 'hidden',
        }}>
          {/* 패널 헤더 */}
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #3B82F620, #8B5CF620)',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🦎</span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>워크플로우 분석</span>
            </div>
            <button
              onClick={() => setShowAnalysisPanel(false)}
              style={{
                background: 'none', border: 'none', fontSize: 18,
                cursor: 'pointer', opacity: 0.5,
              }}
            >×</button>
          </div>

          {/* 분석 내용 */}
          <div style={{ padding: 16, fontSize: 12 }}>
            {/* 업종 */}
            {lastAnalysis.industry && (
              <div style={{
                padding: '8px 12px', borderRadius: 8,
                background: '#3B82F610', marginBottom: 12,
              }}>
                <div style={{ color: '#64748B', fontSize: 10, marginBottom: 4 }}>감지된 업종</div>
                <div style={{ fontWeight: 600, color: '#3B82F6' }}>
                  {lastAnalysis.industry.name}
                </div>
              </div>
            )}

            {/* 플래그 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {lastAnalysis.flags?.isPremium && (
                <span style={{ padding: '4px 8px', borderRadius: 6, background: '#F59E0B20', color: '#F59E0B', fontSize: 10, fontWeight: 600 }}>
                  ⭐ 프리미엄
                </span>
              )}
              {lastAnalysis.flags?.isFree && (
                <span style={{ padding: '4px 8px', borderRadius: 6, background: '#10B98120', color: '#10B981', fontSize: 10, fontWeight: 600 }}>
                  🎁 무료
                </span>
              )}
              {lastAnalysis.flags?.isUrgent && (
                <span style={{ padding: '4px 8px', borderRadius: 6, background: '#EF444420', color: '#EF4444', fontSize: 10, fontWeight: 600 }}>
                  ⚡ 긴급
                </span>
              )}
              {lastAnalysis.flags?.hasVideo && (
                <span style={{ padding: '4px 8px', borderRadius: 6, background: '#8B5CF620', color: '#8B5CF6', fontSize: 10, fontWeight: 600 }}>
                  🎬 영상
                </span>
              )}
              {lastAnalysis.flags?.hasProduct && (
                <span style={{ padding: '4px 8px', borderRadius: 6, background: '#EC489920', color: '#EC4899', fontSize: 10, fontWeight: 600 }}>
                  📦 상품
                </span>
              )}
              {lastAnalysis.flags?.hasService && (
                <span style={{ padding: '4px 8px', borderRadius: 6, background: '#06B6D420', color: '#06B6D4', fontSize: 10, fontWeight: 600 }}>
                  🛠 서비스
                </span>
              )}
            </div>

            {/* 수치 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div style={{ padding: 12, borderRadius: 8, background: '#F1F5F9', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1E293B' }}>
                  {lastAnalysis.estimatedVolume}
                </div>
                <div style={{ fontSize: 10, color: '#64748B' }}>예상 처리량/h</div>
              </div>
              <div style={{ padding: 12, borderRadius: 8, background: '#10B98110', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#10B981' }}>
                  ₩{(lastAnalysis.estimatedV / 1000000).toFixed(1)}M
                </div>
                <div style={{ fontSize: 10, color: '#10B981' }}>예상 월간 V</div>
              </div>
            </div>

            {/* 프로세스 */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#64748B', fontSize: 10, marginBottom: 6 }}>생성된 프로세스</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {lastAnalysis.processes.map((p, i) => (
                  <span key={i} style={{
                    padding: '4px 8px', borderRadius: 4,
                    background: '#E2E8F0', fontSize: 10,
                  }}>
                    {p.name}
                  </span>
                ))}
              </div>
            </div>

            {/* 타겟 그룹 */}
            {lastAnalysis.targetGroups.length > 0 && (
              <div>
                <div style={{ color: '#64748B', fontSize: 10, marginBottom: 6 }}>타겟 그룹</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {lastAnalysis.targetGroups.map((g, i) => (
                    <span key={i} style={{
                      padding: '4px 8px', borderRadius: 4,
                      background: '#3B82F610', color: '#3B82F6', fontSize: 10,
                    }}>
                      {g.name} ({g.volume}/h)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex', gap: 8,
          }}>
            <button
              onClick={() => fitToView(nodes)}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8,
                background: '#3B82F6', border: 'none', color: 'white',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              🎯 화면 맞춤
            </button>
            <button
              onClick={() => {
                setNodes(DEFAULT_NODES);
                setConnections(DEFAULT_CONNECTIONS);
                setShowAnalysisPanel(false);
                setLastAnalysis(null);
                setPan({ x: 0, y: 0 });
                setZoom(85);
              }}
              style={{
                padding: '8px 12px', borderRadius: 8,
                background: '#F1F5F9', border: 'none', color: '#64748B',
                fontSize: 12, cursor: 'pointer',
              }}
            >
              ↻ 초기화
            </button>
          </div>
        </div>
      )}

      {/* 🦎 V 흐름 요약 바 - 워크플로우가 있을 때만 표시 */}
      {lastAnalysis && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 48,
          right: 0,
          padding: '12px 24px',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 32,
          zIndex: 50,
        }}>
          {/* V 흐름 시각화 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            color: 'white',
          }}>
            {/* 입력 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, opacity: 0.8 }}>입력 이벤트</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{lastAnalysis.estimatedVolume * 10}/일</div>
            </div>

            <div style={{ fontSize: 24, opacity: 0.5 }}>→</div>

            {/* MoltBot 필터 */}
            <div style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 8,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, opacity: 0.8 }}>🦎 MoltBot 필터</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>-90%</div>
            </div>

            <div style={{ fontSize: 24, opacity: 0.5 }}>→</div>

            {/* 프로세스 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, opacity: 0.8 }}>처리량</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{lastAnalysis.estimatedVolume}/h</div>
            </div>

            <div style={{ fontSize: 24, opacity: 0.5 }}>→</div>

            {/* V 생성 */}
            <div style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.95)',
              borderRadius: 12,
              textAlign: 'center',
              color: '#10B981',
            }}>
              <div style={{ fontSize: 10, color: '#64748B' }}>💰 월간 V 창출</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>
                ₩{(lastAnalysis.estimatedV / 1000000).toFixed(1)}M
              </div>
            </div>
          </div>

          {/* 닫기 버튼 */}
          <button
            onClick={() => setShowAnalysisPanel(false)}
            style={{
              position: 'absolute',
              right: 16,
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 6,
              padding: '4px 12px',
              color: 'white',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ✕ 닫기
          </button>
        </div>
      )}

      {/* MoltBot 플로팅 챗봇 */}
      <MoltBotChat onPainSignal={handlePainSignal} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function FilterDropdown({ label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 6,
      background: '#F1F5F9', fontSize: 12,
    }}>
      <span style={{ opacity: 0.5 }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
      <span style={{ opacity: 0.3, fontSize: 10 }}>▼</span>
    </div>
  );
}

function NodeDetailPanel({ node, onClose }) {
  if (!node) return null;
  const nodeType = NODE_TYPES[node.type];

  return (
    <div style={{
      width: 320,
      background: 'white',
      borderLeft: '1px solid #E2E8F0',
      padding: 20,
      overflow: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 20 }}>
        <div>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: nodeType.color + '20',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, marginBottom: 12,
          }}>
            {nodeType.icon}
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{node.label}</h3>
          <p style={{ fontSize: 12, color: '#64748B' }}>{nodeType.name}</p>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', opacity: 0.5,
        }}>×</button>
      </div>

      {/* Status */}
      <div style={{
        padding: 16, borderRadius: 12, marginBottom: 16,
        background: node.status === 'active' ? '#10B98110' : '#F59E0B10',
        border: `1px solid ${node.status === 'active' ? '#10B98130' : '#F59E0B30'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: 4,
            background: node.status === 'active' ? '#10B981' : '#F59E0B',
          }} />
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: node.status === 'active' ? '#10B981' : '#F59E0B',
          }}>
            {node.status === 'active' ? 'Active' : 'Warning'}
          </span>
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#1E293B' }}>
          {node.throughput}/h
        </div>
        <div style={{ fontSize: 11, color: '#64748B' }}>Current throughput</div>
      </div>

      {/* Settings */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 6 }}>
          HTTP Method
        </label>
        <select style={{
          width: '100%', padding: '10px 12px', borderRadius: 8,
          border: '1px solid #E2E8F0', fontSize: 13,
        }}>
          <option>POST</option>
          <option>GET</option>
          <option>PUT</option>
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 6 }}>
          URL
        </label>
        <input
          defaultValue="https://api.autus.com/"
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid #E2E8F0', fontSize: 13,
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 6 }}>
          Query
        </label>
        <div style={{
          padding: 12, borderRadius: 8, border: '1px solid #E2E8F0',
          background: '#F8FAFC', minHeight: 60,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12 }}>📎</span>
            <span style={{ fontSize: 12, color: '#64748B' }}>Insert data</span>
          </div>
          <button style={{
            fontSize: 11, color: '#3B82F6', background: 'none',
            border: 'none', cursor: 'pointer',
          }}>
            + Add value
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 6 }}>
          Description
        </label>
        <textarea
          placeholder="Input description here..."
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid #E2E8F0', fontSize: 13, minHeight: 80,
            resize: 'vertical',
          }}
        />
      </div>

      <button style={{
        width: '100%', padding: '12px', borderRadius: 8,
        background: '#3B82F6', border: 'none', color: 'white',
        fontWeight: 600, fontSize: 13, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        Continue →
      </button>
    </div>
  );
}

// Styles
const zoomBtnStyle = {
  width: 32, height: 32, borderRadius: 8,
  background: 'white', border: '1px solid #E2E8F0',
  fontSize: 16, cursor: 'pointer',
};

const zoomSmallBtn = {
  width: 20, height: 20, borderRadius: 4,
  background: 'white', border: '1px solid #E2E8F0',
  fontSize: 12, cursor: 'pointer',
};

const viewBtnStyle = {
  width: 36, height: 36, borderRadius: 8,
  border: '1px solid #E2E8F0',
  fontSize: 14, cursor: 'pointer',
};
