/**
 * AUTUS Trinity - Constants & Initial Data
 */

import { NodeData, Task, Role } from './types';

// Role metadata
export const ROLE_SYMBOLS: Record<Role, string> = {
  architect: '👑',
  analyst: '🔧',
  worker: '⛑️'
};

export const ROLE_COLORS: Record<Role, string> = {
  architect: '#fbbf24',
  analyst: '#a78bfa',
  worker: '#4ade80'
};

export const ROLE_LABELS: Record<Role, string> = {
  architect: '지배자',
  analyst: '관리자',
  worker: '일꾼'
};

// Initial nodes data (will be replaced by API)
export const INITIAL_NODES: NodeData[] = [
  {
    id: 'bio',
    name: '생체',
    icon: '❤️',
    angle: 90,
    goal: { v: 95, d: '95점' },
    status: { v: 87, d: '87점' },
    progress: { v: 78, d: '78%' },
    macros: [
      { name: '심박', val: '72bpm', ok: true },
      { name: '혈압', val: '118/76', ok: true },
      { name: '수면', val: '6.2h', ok: false },
      { name: '운동', val: '2회/주', ok: false },
      { name: '영양', val: 'B+', ok: true },
      { name: '체중', val: '74kg', ok: true },
      { name: '스트레스', val: '높음', ok: false },
      { name: '면역', val: '양호', ok: true }
    ],
    action: { title: '삼성서울병원 종합검진', desc: '수면·운동 상담' }
  },
  {
    id: 'capital',
    name: '자본',
    icon: '💰',
    angle: 30,
    goal: { v: 100, d: '₩20M' },
    status: { v: 62, d: '₩12.5M' },
    progress: { v: 45, d: '45%' },
    macros: [
      { name: '현금', val: '₩5.2M', ok: true, detail: { current: '₩5,200,000', target: '₩6M', change: '+₩320K', related: ['월수입', '월지출', '저축률'] } },
      { name: '투자', val: '₩7.3M', ok: true },
      { name: '부채', val: '₩2.1M', ok: false },
      { name: '월수입', val: '₩4.5M', ok: true },
      { name: '월지출', val: '₩3.65M', ok: false },
      { name: '저축률', val: '18.9%', ok: true },
      { name: 'ROI', val: '+8.2%', ok: true },
      { name: '런웨이', val: '14개월', ok: true }
    ],
    action: { title: '강남구청 정부지원금', desc: '₩3M 추가' }
  },
  {
    id: 'cognitive',
    name: '인지',
    icon: '🧠',
    angle: -30,
    goal: { v: 95, d: '95점' },
    status: { v: 92, d: '92점' },
    progress: { v: 88, d: '88%' },
    macros: [
      { name: '집중', val: '4.2h/일', ok: true },
      { name: '학습', val: '진행중', ok: true },
      { name: '딥워크', val: '2.5h', ok: false },
      { name: '번아웃', val: '주의', ok: false },
      { name: '계획', val: '85%', ok: true },
      { name: '실행', val: '72%', ok: true },
      { name: '회고', val: '주1회', ok: true },
      { name: '성장', val: '+12%', ok: true }
    ],
    action: { title: 'Zapier 자동화', desc: '딥워크 +2h' }
  },
  {
    id: 'relation',
    name: '관계',
    icon: '🤝',
    angle: -90,
    goal: { v: 90, d: 'NPS+60' },
    status: { v: 70, d: 'NPS+42' },
    progress: { v: 55, d: '55%' },
    macros: [
      { name: '가족', val: '양호', ok: true },
      { name: '고객', val: '3사', ok: false },
      { name: '파트너', val: '2사', ok: true },
      { name: '갈등', val: 'A사', ok: false },
      { name: 'NPS', val: '+42', ok: true },
      { name: '응답률', val: '89%', ok: true },
      { name: '네트워크', val: '성장', ok: true },
      { name: '신뢰', val: '높음', ok: true }
    ],
    action: { title: 'A사 클레임 해결', desc: 'NPS 개선' }
  },
  {
    id: 'environment',
    name: '환경',
    icon: '🌍',
    angle: -150,
    goal: { v: 80, d: 'B+' },
    status: { v: 42, d: 'C+' },
    progress: { v: 30, d: '30%' },
    macros: [
      { name: '경기', val: '불확실', ok: false },
      { name: '규제', val: '강화', ok: false },
      { name: '경쟁', val: '심화', ok: false },
      { name: '트렌드', val: 'AI', ok: true },
      { name: '환율', val: '₩1,320', ok: true },
      { name: '금리', val: '3.5%', ok: false },
      { name: 'ESG', val: '대응중', ok: true },
      { name: '인재', val: '부족', ok: false }
    ],
    action: { title: 'CB Insights 모니터링', desc: '리스크 경보' }
  },
  {
    id: 'security',
    name: '안전',
    icon: '🛡️',
    angle: 150,
    goal: { v: 95, d: 'A+' },
    status: { v: 78, d: 'A-' },
    progress: { v: 72, d: '72%' },
    macros: [
      { name: '백업', val: '자동', ok: true },
      { name: '보안', val: '2FA', ok: true },
      { name: '법률', val: '검토필요', ok: false },
      { name: '위협', val: '2건', ok: false },
      { name: 'DR', val: 'RTO 4h', ok: true },
      { name: '컴플', val: '준수', ok: true },
      { name: '보험', val: '가입', ok: true },
      { name: '평판', val: '양호', ok: true }
    ],
    action: { title: 'AWS GuardDuty', desc: '위협 분석' }
  }
];

// Initial tasks data (will be replaced by API)
export const INITIAL_TASKS: Record<Role, Task[]> = {
  architect: [
    { id: 'a1', text: '연간 순자산 ₩20M 목표', icon: '👑', type: '전략', deadline: '1/31' },
    { id: 'a2', text: '분기별 리스크 시나리오', icon: '🌍', type: '전략', deadline: '3/31' },
    { id: 'a3', text: '신규 수익원 3개', icon: '💰', type: '전략', deadline: '6/30' }
  ],
  analyst: [
    { id: 'n1', text: '주간 현금흐름 리포트', icon: '📊', type: '모니터링', deadline: '매주' },
    { id: 'n2', text: '월간 KPI 대시보드', icon: '📊', type: '모니터링', deadline: '매월' },
    { id: 'n3', text: '이상 징후 알림', icon: '🔔', type: '모니터링', deadline: '완료' }
  ],
  worker: [
    { id: 'w1', text: '강남구청 정부지원금', icon: '💰', type: '물리삭제', deadline: '2/18', progress: 65 },
    { id: 'w2', text: '삼성서울병원 검진', icon: '❤️', type: '사람', deadline: '2/20', progress: 30 },
    { id: 'w3', text: 'A사 클레임', icon: '🤝', type: '사람', deadline: '2/15', progress: 45 },
    { id: 'w4', text: 'Zapier 자동화', icon: '🧠', type: '자동화', deadline: '2/15', progress: 100 },
    { id: 'w5', text: 'AWS GuardDuty', icon: '🛡️', type: '자동화', deadline: '2/15', progress: 90 },
    { id: 'w6', text: 'CB Insights', icon: '🌍', type: '물리삭제', deadline: '2/16', progress: 20 }
  ]
};

// SVG gradients config
export const SVG_GRADIENTS = {
  goal: { id: 'gG', colors: ['#fbbf24', '#f59e0b'] },
  status: { id: 'sG', colors: ['#a78bfa', '#8b5cf6'] },
  progress: { id: 'pG', colors: ['#4ade80', '#22c55e'] }
};

// Layer legend config
export const LAYER_LEGEND = [
  { color: '#fbbf24', label: '목표' },
  { color: '#a78bfa', label: '현재' },
  { color: '#4ade80', label: '진행' }
];

// Forecast data (will be replaced by API)
export const FORECAST_DATA = {
  current: '₩12.5M',
  maintain: '₩15M',
  improve: '₩20M',
  challenge: '₩28M'
};

// WebSocket config
export const WS_CONFIG = {
  url: import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/trinity',
  reconnectInterval: 3000,
  maxReconnectAttempts: 5
};

// API config
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  refreshInterval: 30000 // 30 seconds
};

// Breakpoints
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280
};
