// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Galactic Command Center Constants
// ═══════════════════════════════════════════════════════════════════════════════

import { Vector3 } from 'three';
import type { GalaxyCluster, GalaxyClusterType } from './types';

// 570개 업무 도메인별 분포 (8개 클러스터)
export const TASK_DISTRIBUTION: Record<GalaxyClusterType, number> = {
  finance: 85,      // 재무/회계
  hr: 70,           // 인사/노무
  sales: 95,        // 영업/마케팅
  operations: 80,   // 운영/물류
  legal: 45,        // 법무/컴플라이언스
  it: 75,           // IT/시스템
  strategy: 50,     // 전략/기획
  service: 70,      // 고객 서비스
};

// 총 570개 확인
export const TOTAL_NODES = Object.values(TASK_DISTRIBUTION).reduce((a, b) => a + b, 0);

// 8개 Galaxy Cluster 정의
export const GALAXY_CLUSTERS: GalaxyCluster[] = [
  {
    id: 'finance',
    name: 'Finance',
    nameKo: '재무/회계',
    color: '#FFD700',      // 금색
    emissiveColor: '#FFD700',
    nodeCount: 85,
    centerPosition: new Vector3(12, 2, 0),
    orbitRadius: 12,
    avgK: 1.8,
    avgI: 0.3,
    avgOmega: 0.25,
    totalNodes: 85,
    activeNodes: 78,
  },
  {
    id: 'hr',
    name: 'Human Resources',
    nameKo: '인사/노무',
    color: '#00AAFF',      // 파랑
    emissiveColor: '#00AAFF',
    nodeCount: 70,
    centerPosition: new Vector3(8, 8, 4),
    orbitRadius: 12,
    avgK: 1.6,
    avgI: 0.5,
    avgOmega: 0.3,
    totalNodes: 70,
    activeNodes: 65,
  },
  {
    id: 'sales',
    name: 'Sales & Marketing',
    nameKo: '영업/마케팅',
    color: '#FF6B35',      // 오렌지
    emissiveColor: '#FF6B35',
    nodeCount: 95,
    centerPosition: new Vector3(-4, 10, 6),
    orbitRadius: 14,
    avgK: 2.1,
    avgI: 0.6,
    avgOmega: 0.2,
    totalNodes: 95,
    activeNodes: 92,
  },
  {
    id: 'operations',
    name: 'Operations',
    nameKo: '운영/물류',
    color: '#10B981',      // 초록
    emissiveColor: '#10B981',
    nodeCount: 80,
    centerPosition: new Vector3(-10, 4, 2),
    orbitRadius: 12,
    avgK: 1.7,
    avgI: 0.4,
    avgOmega: 0.28,
    totalNodes: 80,
    activeNodes: 74,
  },
  {
    id: 'legal',
    name: 'Legal & Compliance',
    nameKo: '법무/컴플라이언스',
    color: '#8B5CF6',      // 보라
    emissiveColor: '#8B5CF6',
    nodeCount: 45,
    centerPosition: new Vector3(-12, -4, 0),
    orbitRadius: 10,
    avgK: 1.9,
    avgI: 0.2,
    avgOmega: 0.15,
    totalNodes: 45,
    activeNodes: 43,
  },
  {
    id: 'it',
    name: 'IT Systems',
    nameKo: 'IT/시스템',
    color: '#06B6D4',      // 시안
    emissiveColor: '#06B6D4',
    nodeCount: 75,
    centerPosition: new Vector3(-6, -10, 4),
    orbitRadius: 12,
    avgK: 2.0,
    avgI: 0.7,
    avgOmega: 0.22,
    totalNodes: 75,
    activeNodes: 72,
  },
  {
    id: 'strategy',
    name: 'Strategy',
    nameKo: '전략/기획',
    color: '#EC4899',      // 핑크
    emissiveColor: '#EC4899',
    nodeCount: 50,
    centerPosition: new Vector3(4, -10, 6),
    orbitRadius: 11,
    avgK: 2.3,
    avgI: 0.5,
    avgOmega: 0.18,
    totalNodes: 50,
    activeNodes: 48,
  },
  {
    id: 'service',
    name: 'Customer Service',
    nameKo: '고객서비스',
    color: '#F59E0B',      // 앰버
    emissiveColor: '#F59E0B',
    nodeCount: 70,
    centerPosition: new Vector3(10, -4, 2),
    orbitRadius: 11,
    avgK: 1.5,
    avgI: 0.8,
    avgOmega: 0.35,
    totalNodes: 70,
    activeNodes: 62,
  },
];

// 클러스터 맵 (빠른 조회용)
export const CLUSTER_MAP = new Map<GalaxyClusterType, GalaxyCluster>(
  GALAXY_CLUSTERS.map(c => [c.id, c])
);

// 시각화 상수
export const VISUAL_CONFIG = {
  // 노드 크기
  nodeMinSize: 0.08,
  nodeMaxSize: 0.35,
  
  // 발광 강도
  emissiveMinIntensity: 2,
  emissiveMaxIntensity: 15,
  
  // Bloom 설정
  bloomIntensity: 1.5,
  bloomLuminanceThreshold: 0.9,
  bloomLuminanceSmoothing: 0.4,
  bloomRadius: 0.8,
  
  // 궤도 설정
  orbitSpeedMin: 0.0005,
  orbitSpeedMax: 0.003,
  
  // 카메라
  cameraDistance: 35,
  cameraNear: 0.1,
  cameraFar: 1000,
  cameraFov: 60,
  
  // 별 배경
  starCount: 5000,
  starSize: 0.02,
  
  // 연결선
  connectionOpacity: 0.3,
  conflictOpacity: 0.8,
};

// 색상 팔레트
export const COLORS = {
  background: '#0a0a0f',
  userNode: '#FFD700',
  userNodeGlow: '#FFA500',
  connection: '#4488ff',
  conflict: '#ff4444',
  text: '#ffffff',
  textMuted: '#94a3b8',
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
};

// 업무 이름 샘플 (도메인별)
export const TASK_NAMES: Record<GalaxyClusterType, string[]> = {
  finance: [
    '월말 결산', '세금 신고', '예산 편성', '비용 분석', '자금 관리',
    '송장 처리', '매출 집계', '재무 리포트', '감사 준비', '원가 계산',
  ],
  hr: [
    '채용 프로세스', '급여 계산', '근태 관리', '인사 평가', '교육 계획',
    '복리후생', '노무 관리', '조직 개편', '인력 계획', '퇴직 처리',
  ],
  sales: [
    '리드 관리', '영업 파이프라인', '계약 체결', '고객 미팅', '제안서 작성',
    '매출 예측', '시장 분석', '경쟁사 분석', '캠페인 관리', '파트너십',
  ],
  operations: [
    '재고 관리', '물류 최적화', '품질 관리', '생산 계획', '공급망 관리',
    '배송 추적', '창고 관리', '주문 처리', '설비 관리', '안전 점검',
  ],
  legal: [
    '계약 검토', '규정 준수', '법적 자문', '분쟁 해결', '지적재산 관리',
    '라이선스 관리', '개인정보 보호', '내부 감사', '위험 평가',
  ],
  it: [
    '시스템 모니터링', '보안 관리', '데이터 백업', '인프라 관리', 'API 개발',
    '사용자 지원', '업데이트 배포', '성능 최적화', '클라우드 관리', '자동화',
  ],
  strategy: [
    '사업 계획', '신사업 기획', '투자 분석', 'M&A 검토', '전략 리뷰',
    'OKR 설정', 'KPI 관리', '경영 진단', '혁신 프로젝트', '리스크 관리',
  ],
  service: [
    '고객 문의 응대', '불만 처리', 'VOC 분석', '서비스 품질 관리', 'FAQ 관리',
    '챗봇 운영', '만족도 조사', '서비스 개선', 'VIP 관리', '이탈 방지',
  ],
};
