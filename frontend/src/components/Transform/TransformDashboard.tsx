/**
 * AUTUS #transform - Control Deck v5
 * ===================================
 * "You do not need to manage the world.
 *  You need to align your true 12."
 * 
 * Features:
 * - 원형 레이아웃 (12 노드 + 중앙 Core)
 * - 공명 기반 연결선
 * - HE NEEDS / I NEED / ENVIRONMENT
 * - TODO 연동
 * - Direction 설정
 * - #map 환경 데이터 연동
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useEnvironmentStore, selectEnvironmentSummary, selectImpactFactors } from '../../store/useEnvironmentStore';

// ============================================
// TYPES
// ============================================
interface Slot {
  id: number;
  name: string;
  role: string;
  resonance: number;
  noise: number;
  lastContact: number;
  direction: 'closer' | 'maintain' | 'further';
  heNeeds: string[];
  iNeed: string[];
  environment: string[];
  actions: { text: string; impact: string }[];
}

interface Todo {
  id: string;
  text: string;
  source: string;
  impact: string;
  completed: boolean;
}

// ============================================
// COLORS
// ============================================
const COLORS = {
  bgPrimary: '#0a0a0f',
  bgSecondary: '#12121a',
  green: '#00ff87',
  yellow: '#ffcc00',
  red: '#ff4757',
  cyan: '#00d4ff',
  white: '#ffffff',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
};

// ============================================
// INITIAL DATA
// ============================================
const INITIAL_SLOTS: Slot[] = [
  {
    id: 1,
    name: "Alex Kim",
    role: "Lead Investor",
    resonance: 72,
    noise: 0.05,
    lastContact: 3,
    direction: "maintain",
    heNeeds: ["분기별 성과 리포트", "Exit 전략 공유", "이사회 참석"],
    iNeed: ["시리즈B 리드", "LP 네트워크", "전략적 조언"],
    environment: ["$500M 펀드 운용", "핀테크 집중", "분기 리뷰 예정"],
    actions: [
      { text: "Q4 성과 리포트 발송", impact: "+8%" },
      { text: "1:1 미팅 요청", impact: "+5%" }
    ]
  },
  {
    id: 2,
    name: "Sarah Chen",
    role: "Co-founder / CTO",
    resonance: 88,
    noise: 0.0,
    lastContact: 0,
    direction: "closer",
    heNeeds: ["비전 공유", "기술 의사결정 권한", "성장 기회"],
    iNeed: ["시스템 아키텍처", "기술 리더십", "팀 빌딩"],
    environment: ["10년 경력", "스타트업 3회", "장기 비전 공유"],
    actions: [
      { text: "기술 로드맵 논의", impact: "+3%" },
      { text: "팀 회식 기획", impact: "+2%" }
    ]
  },
  {
    id: 3,
    name: "James Park",
    role: "Head of Design",
    resonance: 58,
    noise: 0.15,
    lastContact: 5,
    direction: "closer",
    heNeeds: ["창작 자율성", "명확한 피드백", "성장 예산"],
    iNeed: ["브랜드 아이덴티티", "UI/UX 시스템", "피치덱 디자인"],
    environment: ["프리랜서 출신", "다른 프로젝트 병행", "번아웃 징후"],
    actions: [
      { text: "1:1 커피챗 - 번아웃 체크", impact: "+12%" },
      { text: "디자인 시스템 예산 승인", impact: "+8%" }
    ]
  },
  {
    id: 4,
    name: "Emily Wong",
    role: "Marketing Lead",
    resonance: 42,
    noise: 0.25,
    lastContact: 8,
    direction: "closer",
    heNeeds: ["마케팅 예산", "성과 인정", "명확한 KPI"],
    iNeed: ["사용자 획득", "브랜드 인지도", "콘텐츠 전략"],
    environment: ["대행사 출신", "성과 압박 심함", "이직 고려 중"],
    actions: [
      { text: "마케팅 예산 2배 증액 논의", impact: "+20%" },
      { text: "성과 인정 공개 발표", impact: "+10%" },
      { text: "커리어 개발 계획 상담", impact: "+8%" }
    ]
  },
  {
    id: 5,
    name: "Michael Lee",
    role: "Legal Counsel",
    resonance: 35,
    noise: 0.35,
    lastContact: 21,
    direction: "maintain",
    heNeeds: ["명확한 업무 범위", "정기적 리테이너", "타임라인 존중"],
    iNeed: ["계약서 검토", "투자 계약 자문", "IP 보호"],
    environment: ["대형 로펌 파트너", "스타트업 전문", "업무 과부하"],
    actions: [
      { text: "리테이너 계약 갱신 미팅", impact: "+25%" },
      { text: "시리즈B 계약서 검토 의뢰", impact: "+15%" }
    ]
  },
  {
    id: 6,
    name: "David Choi",
    role: "Mentor",
    resonance: 65,
    noise: 0.05,
    lastContact: 14,
    direction: "maintain",
    heNeeds: ["성장 소식 공유", "가끔 식사", "의미 있는 대화"],
    iNeed: ["경험 조언", "네트워크 연결", "정서적 지지"],
    environment: ["연쇄 창업가", "엔젤 투자 활발", "멘토링 즐김"],
    actions: [
      { text: "월간 업데이트 이메일", impact: "+8%" },
      { text: "점심 식사 약속", impact: "+10%" }
    ]
  },
  {
    id: 7,
    name: "Grace Han",
    role: "Key Customer",
    resonance: 55,
    noise: 0.12,
    lastContact: 6,
    direction: "closer",
    heNeeds: ["안정적 서비스", "빠른 대응", "커스텀 기능"],
    iNeed: ["ARR $200K", "레퍼런스 고객", "제품 피드백"],
    environment: ["대기업 팀장", "예산 결정권", "내부 정치 복잡"],
    actions: [
      { text: "QBR 미팅 스케줄", impact: "+10%" },
      { text: "요청 기능 우선순위 상향", impact: "+8%" }
    ]
  },
  {
    id: 8,
    name: "Ryan Yoo",
    role: "Tech Partner",
    resonance: 78,
    noise: 0.03,
    lastContact: 2,
    direction: "closer",
    heNeeds: ["기술 시너지", "공동 마케팅", "레퍼럴"],
    iNeed: ["API 연동", "공동 GTM", "기술 협력"],
    environment: ["시리즈C 스타트업", "빠른 성장", "협업 적극적"],
    actions: [
      { text: "통합 로드맵 정리", impact: "+5%" },
      { text: "공동 웨비나 기획", impact: "+7%" }
    ]
  },
  {
    id: 9,
    name: "Jennifer Kwon",
    role: "Senior Engineer",
    resonance: 70,
    noise: 0.05,
    lastContact: 1,
    direction: "maintain",
    heNeeds: ["기술 도전", "성장 기회", "합리적 보상"],
    iNeed: ["핵심 기능 구현", "코드 리뷰", "기술 멘토링"],
    environment: ["5년차", "리드 승진 기대", "장기 근속 의향"],
    actions: [
      { text: "테크 리드 역할 논의", impact: "+8%" },
      { text: "컨퍼런스 발표 지원", impact: "+5%" }
    ]
  },
  {
    id: 10,
    name: "Tom Shin",
    role: "Board Advisor",
    resonance: 40,
    noise: 0.20,
    lastContact: 30,
    direction: "further",
    heNeeds: ["의미 있는 기여", "스톡옵션", "인정"],
    iNeed: ["산업 전문성", "인맥 연결", "이사회 조언"],
    environment: ["전직 대기업 임원", "여러 자문 병행", "시간 제한적"],
    actions: [
      { text: "자문 계약 재검토", impact: "+15%" },
      { text: "역할 재정의 미팅", impact: "+10%" }
    ]
  },
  {
    id: 11,
    name: "Linda Moon",
    role: "Data Analyst",
    resonance: 52,
    noise: 0.10,
    lastContact: 4,
    direction: "maintain",
    heNeeds: ["데이터 접근 권한", "분석 자율성", "업무 인정"],
    iNeed: ["인사이트 리포트", "대시보드", "의사결정 근거"],
    environment: ["2년차", "성장 욕구", "데이터팀 리소스 부족"],
    actions: [
      { text: "데이터 파이프라인 예산 승인", impact: "+12%" },
      { text: "분석 결과 경영진 발표 기회", impact: "+8%" }
    ]
  },
  {
    id: 12,
    name: "Chris Lim",
    role: "Operations",
    resonance: 48,
    noise: 0.18,
    lastContact: 7,
    direction: "closer",
    heNeeds: ["프로세스 개선 권한", "팀 리소스", "CEO 신뢰"],
    iNeed: ["운영 효율화", "비용 관리", "팀 조율"],
    environment: ["3년차", "오퍼레이션 팀 리드", "체계화 진행 중"],
    actions: [
      { text: "주간 1:1 정례화", impact: "+10%" },
      { text: "운영팀 채용 승인", impact: "+12%" }
    ]
  }
];

// ============================================
// HELPERS
// ============================================
const getStatus = (resonance: number): 'green' | 'yellow' | 'red' => {
  if (resonance >= 70) return 'green';
  if (resonance >= 45) return 'yellow';
  return 'red';
};

const getStatusColor = (status: 'green' | 'yellow' | 'red') => {
  switch (status) {
    case 'green': return COLORS.green;
    case 'yellow': return COLORS.yellow;
    case 'red': return COLORS.red;
  }
};

const formatTime = (days: number): string => {
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

const getDirectionLabel = (dir: string): string => {
  switch (dir) {
    case 'closer': return '→ closer';
    case 'further': return '← further';
    default: return '• maintain';
  }
};

// ============================================
// STYLES
// ============================================
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    height: '100%',
    width: '100%',
    backgroundColor: COLORS.bgPrimary,
    color: COLORS.white,
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  leftPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '24px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: '14px',
    fontWeight: 600,
    letterSpacing: '3px',
    color: COLORS.cyan,
  },
  statsRow: {
    display: 'flex',
    gap: '20px',
    marginLeft: '32px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: COLORS.gray400,
  },
  statDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  stabilityLabel: {
    fontSize: '10px',
    letterSpacing: '2px',
    color: COLORS.gray600,
  },
  stabilityValue: {
    fontSize: '36px',
    fontWeight: 300,
    color: COLORS.green,
  },
  mapContainer: {
    flex: 1,
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgGrid: {
    position: 'absolute' as const,
    inset: 0,
    backgroundImage: `
      radial-gradient(circle at center, rgba(0, 212, 255, 0.03) 0%, transparent 70%),
      linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
    `,
    backgroundSize: '100% 100%, 60px 60px, 60px 60px',
    pointerEvents: 'none' as const,
  },
  orbitalRing: {
    position: 'absolute' as const,
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '50%',
  },
  connectionsSvg: {
    position: 'absolute' as const,
    width: '500px',
    height: '500px',
    pointerEvents: 'none' as const,
  },
  nodesContainer: {
    position: 'absolute' as const,
    width: '500px',
    height: '500px',
  },
  core: {
    position: 'absolute' as const,
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00d4ff 0%, #0088cc 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 10,
    boxShadow: '0 0 60px rgba(0,212,255,0.4), 0 0 120px rgba(0,212,255,0.2), inset 0 0 30px rgba(255,255,255,0.1)',
    transition: 'transform 0.5s ease',
  },
  coreLabel: {
    fontSize: '16px',
    fontWeight: 600,
    color: COLORS.white,
  },
  rightPanel: {
    width: '380px',
    minWidth: '380px',
    backgroundColor: COLORS.bgSecondary,
    borderLeft: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  panelContent: {
    flex: 1,
    overflowY: 'auto' as const,
  },
  emptyState: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    textAlign: 'center' as const,
  },
  emptyIcon: {
    fontSize: '48px',
    opacity: 0.5,
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 500,
    marginBottom: '8px',
  },
  emptyDesc: {
    fontSize: '14px',
    color: COLORS.gray500,
    lineHeight: 1.6,
  },
  detailHeader: {
    padding: '24px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  detailTitle: {
    fontSize: '10px',
    letterSpacing: '2px',
    color: COLORS.gray600,
    marginBottom: '8px',
  },
  detailName: {
    fontSize: '24px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  detailMeta: {
    fontSize: '14px',
    color: COLORS.gray400,
    marginTop: '4px',
  },
  quickStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  quickStat: {
    padding: '16px',
    textAlign: 'center' as const,
    borderRight: '1px solid rgba(255,255,255,0.05)',
  },
  quickStatValue: {
    fontSize: '24px',
    fontWeight: 600,
  },
  quickStatLabel: {
    fontSize: '10px',
    color: COLORS.gray600,
    letterSpacing: '1px',
  },
  section: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '14px',
  },
  sectionIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '1px',
    color: COLORS.gray400,
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  tag: {
    padding: '8px 14px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    fontSize: '13px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  actionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '12px',
    marginBottom: '10px',
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    transition: 'all 0.3s ease',
  },
  actionCheck: {
    width: '20px',
    height: '20px',
    borderRadius: '6px',
    border: '2px solid rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
  },
  actionText: {
    flex: 1,
    fontSize: '14px',
  },
  actionImpact: {
    fontSize: '14px',
    fontWeight: 500,
    color: COLORS.green,
  },
  directionButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  directionBtn: {
    padding: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'transparent',
    color: COLORS.gray400,
    borderRadius: '10px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  todoSection: {
    backgroundColor: COLORS.bgPrimary,
    borderTop: '1px solid rgba(255,255,255,0.05)',
    padding: '20px 24px',
    maxHeight: '250px',
    overflowY: 'auto' as const,
  },
  todoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  todoTitle: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '1px',
    color: COLORS.cyan,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  todoCount: {
    backgroundColor: COLORS.cyan,
    color: '#000',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 600,
  },
  todoClear: {
    fontSize: '11px',
    color: COLORS.gray600,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  todoList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  todoEmpty: {
    textAlign: 'center' as const,
    padding: '24px',
    color: COLORS.gray600,
    fontSize: '13px',
  },
  todoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    backgroundColor: 'rgba(18,18,26,0.7)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  todoCheckbox: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.2)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    flexShrink: 0,
  },
  todoInfo: {
    flex: 1,
    minWidth: 0,
  },
  todoText: {
    fontSize: '13px',
  },
  todoSource: {
    fontSize: '11px',
    color: COLORS.gray600,
  },
  todoRemove: {
    background: 'none',
    border: 'none',
    color: COLORS.gray600,
    cursor: 'pointer',
    padding: '4px',
    fontSize: '16px',
  },
};

// ============================================
// MAIN COMPONENT
// ============================================
export const TransformDashboard: React.FC = () => {
  const [slots, setSlots] = useState<Slot[]>(INITIAL_SLOTS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);

  // #map 환경 데이터 연동
  const envSummary = useEnvironmentStore(selectEnvironmentSummary);
  const impactFactors = useEnvironmentStore(selectImpactFactors);
  const getImpactOnIdentity = useEnvironmentStore(s => s.getImpactOnIdentity);

  // 환경 변화에 따른 Identity 영향 계산
  const identityImpact = useMemo(() => getImpactOnIdentity(), [getImpactOnIdentity, impactFactors]);

  const stats = useMemo(() => {
    const counts = { green: 0, yellow: 0, red: 0 };
    let totalResonance = 0;
    slots.forEach(s => {
      counts[getStatus(s.resonance)]++;
      totalResonance += s.resonance;
    });
    
    // 기본 안정성 계산
    const baseStability = Math.round(totalResonance / 12 * 0.9 + 10);
    
    // 환경 영향 반영 (±15% 범위)
    const envModifier = (envSummary.stability - 50) / 50 * 15;
    const stability = Math.max(0, Math.min(100, Math.round(baseStability + envModifier)));
    
    return { counts, stability, envImpact: envModifier };
  }, [slots, envSummary.stability]);

  const selectedSlot = useMemo(() => 
    slots.find(s => s.id === selectedId) || null
  , [slots, selectedId]);

  const nodePositions = useMemo(() => {
    const centerX = 250;
    const centerY = 250;
    return slots.map((slot, i) => {
      const baseRadius = 180;
      const radiusOffset = (100 - slot.resonance) * 0.5;
      const radius = baseRadius + radiusOffset;
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      };
    });
  }, [slots]);

  const selectNode = (id: number) => setSelectedId(id);
  const deselectNode = () => setSelectedId(null);

  const setDirection = (dir: 'closer' | 'maintain' | 'further') => {
    if (selectedId) {
      setSlots(prev => prev.map(s => 
        s.id === selectedId ? { ...s, direction: dir } : s
      ));
    }
  };

  const toggleAction = (slotId: number, actionIndex: number) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;
    const action = slot.actions[actionIndex];
    
    const existingIndex = todos.findIndex(t => 
      t.text === action.text && t.source === slot.name
    );
    
    if (existingIndex >= 0) {
      setTodos(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      setTodos(prev => [{
        id: `${Date.now()}`,
        text: action.text,
        source: slot.name,
        impact: action.impact,
        completed: false
      }, ...prev]);
    }
  };

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const removeTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const clearTodos = () => setTodos([]);

  return (
    <div style={styles.container}>
      {/* LEFT: UNIVERSE MAP */}
      <div style={styles.leftPanel}>
        {/* Header */}
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={styles.logo}>AUTUS</span>
            <div style={styles.statsRow}>
              <div style={styles.statItem}>
                <span style={{ ...styles.statDot, backgroundColor: COLORS.green, boxShadow: `0 0 10px ${COLORS.green}` }} />
                <span>{stats.counts.green} stable</span>
              </div>
              <div style={styles.statItem}>
                <span style={{ ...styles.statDot, backgroundColor: COLORS.yellow, boxShadow: `0 0 10px ${COLORS.yellow}` }} />
                <span>{stats.counts.yellow} watch</span>
              </div>
              <div style={styles.statItem}>
                <span style={{ ...styles.statDot, backgroundColor: COLORS.red, boxShadow: `0 0 10px ${COLORS.red}` }} />
                <span>{stats.counts.red} urgent</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* 환경 지표 (#map 연동) */}
            <div style={{ 
              display: 'flex', 
              gap: '16px', 
              padding: '8px 16px', 
              backgroundColor: 'rgba(255,255,255,0.03)', 
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: COLORS.gray600, letterSpacing: '1px' }}>ENV</div>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: envSummary.risk === 'low' ? COLORS.green : 
                         envSummary.risk === 'medium' ? COLORS.yellow : 
                         envSummary.risk === 'high' ? '#ff9500' : COLORS.red
                }}>
                  {envSummary.risk.toUpperCase()}
                </div>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: COLORS.gray600, letterSpacing: '1px' }}>M2C</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.cyan }}>
                  {impactFactors.m2c.toFixed(2)}x
                </div>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: COLORS.gray600, letterSpacing: '1px' }}>OPP</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.green }}>
                  {envSummary.opportunity}
                </div>
              </div>
            </div>
            
            {/* STABILITY 스코어 */}
            <div style={{ textAlign: 'right' }}>
              <div style={styles.stabilityLabel}>STABILITY</div>
              <div style={{
                ...styles.stabilityValue,
                color: stats.stability >= 70 ? COLORS.green : 
                       stats.stability >= 45 ? COLORS.yellow : COLORS.red
              }}>
                {stats.stability}
                {stats.envImpact !== 0 && (
                  <span style={{ 
                    fontSize: '12px', 
                    color: stats.envImpact > 0 ? COLORS.green : COLORS.red,
                    marginLeft: '4px'
                  }}>
                    {stats.envImpact > 0 ? '+' : ''}{Math.round(stats.envImpact)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Map Container */}
        <div 
          style={styles.mapContainer}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.node') && !target.closest('.core')) {
              deselectNode();
            }
          }}
        >
          <div style={styles.bgGrid} />
          
          {/* Orbital Rings */}
          <div style={{ ...styles.orbitalRing, width: '250px', height: '250px' }} />
          <div style={{ ...styles.orbitalRing, width: '450px', height: '450px', borderStyle: 'dashed', opacity: 0.5 }} />

          {/* Connections SVG */}
          <svg style={styles.connectionsSvg} viewBox="0 0 500 500">
            {slots.map((slot, i) => {
              const pos = nodePositions[i];
              const status = getStatus(slot.resonance);
              const isSelected = selectedId === slot.id;
              const isDimmed = selectedId !== null && !isSelected;
              return (
                <line
                  key={slot.id}
                  x1={250}
                  y1={250}
                  x2={pos.x}
                  y2={pos.y}
                  stroke={getStatusColor(status)}
                  strokeWidth={Math.max(1.5, slot.resonance / 40)}
                  opacity={isDimmed ? 0.1 : 0.6}
                  style={{
                    transition: 'all 0.5s ease',
                    filter: isSelected ? `drop-shadow(0 0 8px ${getStatusColor(status)})` : 'none'
                  }}
                />
              );
            })}
          </svg>

          {/* Nodes Container */}
          <div style={styles.nodesContainer}>
            {slots.map((slot, i) => {
              const pos = nodePositions[i];
              const status = getStatus(slot.resonance);
              const isSelected = selectedId === slot.id;
              const isDimmed = selectedId !== null && !isSelected;
              
              return (
                <div
                  key={slot.id}
                  className="node"
                  style={{
                    position: 'absolute',
                    left: pos.x,
                    top: pos.y,
                    transform: `translate(-50%, -50%) ${isDimmed ? 'scale(0.8)' : ''}`,
                    cursor: 'pointer',
                    transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    zIndex: isSelected ? 20 : 10,
                    opacity: isDimmed ? 0.3 : 1,
                    pointerEvents: isDimmed ? 'none' : 'auto',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectNode(slot.id);
                  }}
                >
                  <div 
                    style={{
                      position: 'relative',
                      padding: '14px 18px',
                      backgroundColor: 'rgba(18, 18, 26, 0.7)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '16px',
                      border: isSelected ? `1px solid ${COLORS.cyan}` : '1px solid rgba(255,255,255,0.1)',
                      minWidth: '100px',
                      textAlign: 'center',
                      transition: 'all 0.4s ease',
                      transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: isSelected ? `0 0 30px rgba(0,212,255,0.3)` : 'none',
                    }}
                  >
                    {/* Status Glow */}
                    <div 
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(status),
                        border: '2px solid #12121a',
                        boxShadow: `0 0 12px ${getStatusColor(status)}`,
                        animation: status === 'red' ? 'pulse 2s infinite' : 'none',
                      }}
                    />
                    <div style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap' }}>{slot.name}</div>
                    <div style={{ fontSize: '11px', color: COLORS.gray400, marginTop: '2px' }}>{formatTime(slot.lastContact)}</div>
                    <div style={{
                      fontSize: '10px',
                      marginTop: '6px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      color: slot.direction === 'closer' ? COLORS.green : slot.direction === 'further' ? COLORS.red : COLORS.gray400,
                    }}>
                      {getDirectionLabel(slot.direction)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Core */}
          <div 
            className="core"
            style={styles.core}
            onClick={deselectNode}
          >
            <span style={styles.coreLabel}>나</span>
          </div>
        </div>
      </div>

      {/* RIGHT: PANEL */}
      <div style={styles.rightPanel}>
        <div style={styles.panelContent}>
          {!selectedSlot ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>◎</div>
              <div style={styles.emptyTitle}>관계를 선택하세요</div>
              <div style={styles.emptyDesc}>
                12개의 노드 중 하나를 클릭하면<br />
                관계의 본질과 해야 할 일이 표시됩니다.
              </div>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div style={styles.detailHeader}>
                <div style={styles.detailTitle}>SELECTED RELATIONSHIP</div>
                <div style={styles.detailName}>
                  <span style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: getStatusColor(getStatus(selectedSlot.resonance))
                  }} />
                  {selectedSlot.name}
                </div>
                <div style={styles.detailMeta}>
                  {selectedSlot.role} · {formatTime(selectedSlot.lastContact)}
                </div>
              </div>

              {/* Quick Stats */}
              <div style={styles.quickStats}>
                <div style={styles.quickStat}>
                  <div style={{ ...styles.quickStatValue, color: getStatusColor(getStatus(selectedSlot.resonance)) }}>
                    {selectedSlot.resonance}
                  </div>
                  <div style={styles.quickStatLabel}>RESONANCE</div>
                </div>
                <div style={styles.quickStat}>
                  <div style={{ ...styles.quickStatValue, color: selectedSlot.noise >= 0.2 ? COLORS.red : COLORS.white }}>
                    {Math.round(selectedSlot.noise * 100)}%
                  </div>
                  <div style={styles.quickStatLabel}>NOISE</div>
                </div>
                <div style={{ ...styles.quickStat, borderRight: 'none' }}>
                  <div style={styles.quickStatValue}>
                    {selectedSlot.direction === 'closer' ? '→' : selectedSlot.direction === 'further' ? '←' : '•'}
                  </div>
                  <div style={styles.quickStatLabel}>DIRECTION</div>
                </div>
              </div>

              {/* HE NEEDS */}
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div style={{ ...styles.sectionIcon, backgroundColor: 'rgba(168, 85, 247, 0.2)' }}>🎯</div>
                  <span style={styles.sectionTitle}>HE NEEDS</span>
                </div>
                <div style={styles.tagsContainer}>
                  {selectedSlot.heNeeds.map((item, i) => (
                    <span key={i} style={styles.tag}>{item}</span>
                  ))}
                </div>
              </div>

              {/* I NEED */}
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div style={{ ...styles.sectionIcon, backgroundColor: 'rgba(0, 212, 255, 0.2)' }}>💎</div>
                  <span style={styles.sectionTitle}>I NEED</span>
                </div>
                <div style={styles.tagsContainer}>
                  {selectedSlot.iNeed.map((item, i) => (
                    <span key={i} style={styles.tag}>{item}</span>
                  ))}
                </div>
              </div>

              {/* ENVIRONMENT */}
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div style={{ ...styles.sectionIcon, backgroundColor: 'rgba(255, 204, 0, 0.2)' }}>🌍</div>
                  <span style={styles.sectionTitle}>ENVIRONMENT</span>
                </div>
                <div style={styles.tagsContainer}>
                  {selectedSlot.environment.map((item, i) => (
                    <span key={i} style={styles.tag}>{item}</span>
                  ))}
                </div>
              </div>

              {/* EXTERNAL FORCES (#map 연동) */}
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div style={{ ...styles.sectionIcon, backgroundColor: 'rgba(0, 212, 255, 0.2)' }}>📊</div>
                  <span style={styles.sectionTitle}>EXTERNAL FORCES</span>
                  <span style={{ 
                    fontSize: '9px', 
                    color: COLORS.cyan, 
                    marginLeft: 'auto',
                    padding: '2px 6px',
                    backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    borderRadius: '4px'
                  }}>
                    from #map
                  </span>
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: '8px' 
                }}>
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <div style={{ fontSize: '10px', color: COLORS.gray600, marginBottom: '4px' }}>VOLATILITY</div>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 600,
                      color: impactFactors.volatility < 0.3 ? COLORS.green :
                             impactFactors.volatility < 0.5 ? COLORS.yellow : COLORS.red
                    }}>
                      {Math.round(impactFactors.volatility * 100)}%
                    </div>
                  </div>
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <div style={{ fontSize: '10px', color: COLORS.gray600, marginBottom: '4px' }}>PRESSURE</div>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 600,
                      color: impactFactors.pressure > 0 ? COLORS.green :
                             impactFactors.pressure > -0.3 ? COLORS.yellow : COLORS.red
                    }}>
                      {impactFactors.pressure > 0 ? '+' : ''}{(impactFactors.pressure * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <div style={{ fontSize: '10px', color: COLORS.gray600, marginBottom: '4px' }}>MOMENTUM</div>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 600,
                      color: impactFactors.momentum > 0 ? COLORS.green :
                             impactFactors.momentum > -0.2 ? COLORS.yellow : COLORS.red
                    }}>
                      {impactFactors.momentum > 0 ? '↑' : impactFactors.momentum < 0 ? '↓' : '→'}
                      {Math.abs(impactFactors.momentum * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <div style={{ fontSize: '10px', color: COLORS.gray600, marginBottom: '4px' }}>IDENTITY Δ</div>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: 600,
                      color: identityImpact.entropyDelta < 0 ? COLORS.green : COLORS.yellow
                    }}>
                      E:{identityImpact.entropyDelta > 0 ? '+' : ''}{(identityImpact.entropyDelta * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
                {envSummary.region && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(0, 212, 255, 0.05)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: COLORS.gray400
                  }}>
                    📍 선택된 지역: <span style={{ color: COLORS.cyan, fontWeight: 600 }}>{envSummary.region}</span>
                  </div>
                )}
              </div>

              {/* ACTIONS */}
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <span style={styles.sectionTitle}>⚡ ACTIONS</span>
                </div>
                {selectedSlot.actions.map((action, i) => {
                  const isAdded = todos.some(t => t.text === action.text && t.source === selectedSlot.name);
                  return (
                    <div
                      key={i}
                      style={{
                        ...styles.actionItem,
                        backgroundColor: isAdded ? 'rgba(0, 255, 135, 0.1)' : 'rgba(255,255,255,0.03)',
                        borderColor: isAdded ? 'rgba(0, 255, 135, 0.3)' : 'rgba(255,255,255,0.05)',
                      }}
                      onClick={() => toggleAction(selectedSlot.id, i)}
                    >
                      <div style={{
                        ...styles.actionCheck,
                        backgroundColor: isAdded ? COLORS.green : 'transparent',
                        borderColor: isAdded ? COLORS.green : 'rgba(255,255,255,0.2)',
                        color: isAdded ? '#000' : 'transparent',
                      }}>
                        {isAdded && '✓'}
                      </div>
                      <div style={styles.actionText}>{action.text}</div>
                      <div style={styles.actionImpact}>{action.impact}</div>
                    </div>
                  );
                })}
              </div>

              {/* DIRECTION */}
              <div style={{ ...styles.section, borderBottom: 'none' }}>
                <div style={styles.sectionHeader}>
                  <span style={styles.sectionTitle}>🧭 DIRECTION</span>
                </div>
                <div style={styles.directionButtons}>
                  {(['further', 'maintain', 'closer'] as const).map((dir) => {
                    const isActive = selectedSlot.direction === dir;
                    let bgColor = 'transparent';
                    let borderColor = 'rgba(255,255,255,0.1)';
                    let textColor = COLORS.gray400;
                    
                    if (isActive) {
                      if (dir === 'further') {
                        bgColor = 'rgba(255, 71, 87, 0.1)';
                        borderColor = COLORS.red;
                        textColor = COLORS.red;
                      } else if (dir === 'closer') {
                        bgColor = 'rgba(0, 255, 135, 0.1)';
                        borderColor = COLORS.green;
                        textColor = COLORS.green;
                      } else {
                        bgColor = 'rgba(0, 212, 255, 0.1)';
                        borderColor = COLORS.cyan;
                        textColor = COLORS.cyan;
                      }
                    }
                    
                    return (
                      <button
                        key={dir}
                        style={{
                          ...styles.directionBtn,
                          backgroundColor: bgColor,
                          borderColor: borderColor,
                          color: textColor,
                        }}
                        onClick={() => setDirection(dir)}
                      >
                        {dir === 'further' ? '← 멀어지기' : dir === 'closer' ? '가까워지기 →' : '유지'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* TODO Section */}
        <div style={styles.todoSection}>
          <div style={styles.todoHeader}>
            <div style={styles.todoTitle}>
              📋 TODAY'S TODO
              <span style={styles.todoCount}>
                {todos.filter(t => !t.completed).length}
              </span>
            </div>
            <button style={styles.todoClear} onClick={clearTodos}>
              모두 지우기
            </button>
          </div>
          
          <div style={styles.todoList}>
            {todos.length === 0 ? (
              <div style={styles.todoEmpty}>
                액션을 클릭하면 여기에 추가됩니다
              </div>
            ) : (
              todos.map((todo) => (
                <div 
                  key={todo.id}
                  style={{
                    ...styles.todoItem,
                    opacity: todo.completed ? 0.5 : 1,
                  }}
                >
                  <div 
                    style={{
                      ...styles.todoCheckbox,
                      backgroundColor: todo.completed ? COLORS.green : 'transparent',
                      borderColor: todo.completed ? COLORS.green : 'rgba(255,255,255,0.2)',
                      color: todo.completed ? '#000' : 'transparent',
                    }}
                    onClick={() => toggleTodo(todo.id)}
                  >
                    {todo.completed && '✓'}
                  </div>
                  <div style={styles.todoInfo}>
                    <div style={{
                      ...styles.todoText,
                      textDecoration: todo.completed ? 'line-through' : 'none',
                    }}>{todo.text}</div>
                    <div style={styles.todoSource}>{todo.source} · {todo.impact}</div>
                  </div>
                  <button 
                    style={styles.todoRemove}
                    onClick={() => removeTodo(todo.id)}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Keyframe Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default TransformDashboard;
