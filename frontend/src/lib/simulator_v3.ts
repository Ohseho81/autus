/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS Global Simulator v3.0 (48-Node System)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 48노드 = 16 도메인 × 3 노드타입 (본질/흐름/균형)
 * 6 Core + 3 Role = 42가지 인간 유형
 * 
 * 에너지 소비: 0 (물리법칙 기반 계산만)
 * 
 * "이해할 수 없으면 변화할 수 없다" - AUTUS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export interface MetaCategoryInfo {
  name: string;
  emoji: string;
  domains: string[];
}

export interface DomainInfo {
  meta: string;
  name: string;
  nodes: string[];
}

export interface NodeTypeInfo {
  name: string;
  emoji: string;
  indices: number[];
}

export interface CoreArchetype {
  id: string;
  name: string;
  emoji: string;
  ratio: number;
}

export interface RoleModifier {
  id: string;
  name: string;
  emoji: string;
  overlap: number;
}

export interface RegionInfo {
  name: string;
  flag: string;
  population: number;
  tz: number;
}

export interface PressureState {
  state: string;
  label: string;
  color: string;
}

export interface NodeState {
  id: string;
  domain: string;
  domainName: string;
  meta: string;
  type: string;
  typeName: string;
  typeEmoji: string;
  pressure: number;
  state: string;
  stateLabel: string;
  stateColor: string;
}

export interface RegionalStat {
  id: string;
  name: string;
  flag: string;
  population: number;
  synced: number;
  active: number;
  syncRate: number;
  localHour: number;
  isAwake: boolean;
}

export interface ArchetypeDistribution {
  id: string;
  code: string;
  name: string;
  emoji: string;
  ratio: number;
  count: number;
}

export interface GlobalSnapshot {
  timestamp: string;
  global: {
    totalSynced: number;
    activeNow: number;
    resonance: number;
    syncPerSecond: number;
  };
  meta: Record<string, MetaCategoryInfo & { pressure: number }>;
  regions: RegionalStat[];
  archetypes: ArchetypeDistribution[];
}

export interface UserProfile {
  core: {
    id: string;
    code: string;
    name: string;
    emoji: string;
  };
  roles: {
    id: string;
    code: string;
    name: string;
    emoji: string;
  }[];
  displayName: string;
  displayEmoji: string;
  combination: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. 상수 정의
// ═══════════════════════════════════════════════════════════════════════════════

export const META_CATEGORIES: Record<string, MetaCategoryInfo> = {
  MAT: { name: '물질', emoji: '💎', domains: ['CASH', 'ASSET', 'BODY', 'SPACE'] },
  MEN: { name: '정신', emoji: '🧠', domains: ['COGNI', 'EMOTE', 'WILL', 'RELATE'] },
  DYN: { name: '동적', emoji: '⚡', domains: ['TIME', 'WORK', 'GROW', 'CHANGE'] },
  TRS: { name: '초월', emoji: '🌟', domains: ['MEANING', 'LEGACY', 'IMPACT', 'SELF'] },
};

export const DOMAINS: Record<string, DomainInfo> = {
  CASH:    { meta: 'MAT', name: '현금', nodes: ['n01', 'n02', 'n03'] },
  ASSET:   { meta: 'MAT', name: '자산', nodes: ['n04', 'n05', 'n06'] },
  BODY:    { meta: 'MAT', name: '신체', nodes: ['n07', 'n08', 'n09'] },
  SPACE:   { meta: 'MAT', name: '공간', nodes: ['n10', 'n11', 'n12'] },
  COGNI:   { meta: 'MEN', name: '인지', nodes: ['n13', 'n14', 'n15'] },
  EMOTE:   { meta: 'MEN', name: '감정', nodes: ['n16', 'n17', 'n18'] },
  WILL:    { meta: 'MEN', name: '의지', nodes: ['n19', 'n20', 'n21'] },
  RELATE:  { meta: 'MEN', name: '관계', nodes: ['n22', 'n23', 'n24'] },
  TIME:    { meta: 'DYN', name: '시간', nodes: ['n25', 'n26', 'n27'] },
  WORK:    { meta: 'DYN', name: '업무', nodes: ['n28', 'n29', 'n30'] },
  GROW:    { meta: 'DYN', name: '성장', nodes: ['n31', 'n32', 'n33'] },
  CHANGE:  { meta: 'DYN', name: '변화', nodes: ['n34', 'n35', 'n36'] },
  MEANING: { meta: 'TRS', name: '의미', nodes: ['n37', 'n38', 'n39'] },
  LEGACY:  { meta: 'TRS', name: '유산', nodes: ['n40', 'n41', 'n42'] },
  IMPACT:  { meta: 'TRS', name: '영향', nodes: ['n43', 'n44', 'n45'] },
  SELF:    { meta: 'TRS', name: '자아', nodes: ['n46', 'n47', 'n48'] },
};

export const NODE_TYPES: Record<string, NodeTypeInfo> = {
  A: { name: '본질', emoji: '⭐', indices: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46] },
  D: { name: '흐름', emoji: '🔄', indices: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47] },
  E: { name: '균형', emoji: '⚖️', indices: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48] },
};

export const CORE_ARCHETYPES: Record<string, CoreArchetype> = {
  EMPLOYEE:      { id: 'C01', name: '직장인', emoji: '💼', ratio: 0.50 },
  ENTREPRENEUR:  { id: 'C02', name: '창업가', emoji: '🚀', ratio: 0.03 },
  SELF_EMPLOYED: { id: 'C03', name: '자영업자', emoji: '🏪', ratio: 0.12 },
  STUDENT:       { id: 'C04', name: '학생', emoji: '📚', ratio: 0.15 },
  TRANSITION:    { id: 'C05', name: '전환기', emoji: '🔍', ratio: 0.05 },
  RETIRED:       { id: 'C06', name: '은퇴자', emoji: '🌅', ratio: 0.15 },
};

export const ROLE_MODIFIERS: Record<string, RoleModifier> = {
  CAREGIVER: { id: 'R01', name: '양육자', emoji: '👨‍👩‍👧', overlap: 0.25 },
  INVESTOR:  { id: 'R02', name: '투자자', emoji: '📈', overlap: 0.15 },
  CREATOR:   { id: 'R03', name: '창작자', emoji: '✨', overlap: 0.08 },
};

export const REGIONS: Record<string, RegionInfo> = {
  ASIA:          { name: '아시아', flag: '🌏', population: 4_700_000_000, tz: 8 },
  EUROPE:        { name: '유럽', flag: '🌍', population: 750_000_000, tz: 1 },
  NORTH_AMERICA: { name: '북미', flag: '🌎', population: 580_000_000, tz: -5 },
  SOUTH_AMERICA: { name: '남미', flag: '🌎', population: 430_000_000, tz: -3 },
  AFRICA:        { name: '아프리카', flag: '🌍', population: 1_400_000_000, tz: 2 },
  OCEANIA:       { name: '오세아니아', flag: '🌏', population: 45_000_000, tz: 10 },
};

export const PRESSURE_STATES: Record<string, { range: [number, number]; color: string; label: string }> = {
  STABLE:       { range: [0, 0.3], color: '#22C55E', label: '안정' },
  MONITORING:   { range: [0.3, 0.5], color: '#EAB308', label: '관찰' },
  PRESSURING:   { range: [0.5, 0.78], color: '#F97316', label: '압박' },
  IRREVERSIBLE: { range: [0.78, 0.9], color: '#EF4444', label: '위험' },
  CRITICAL:     { range: [0.9, 1.0], color: '#18181B', label: '위기' },
};

export const GLOBAL_POPULATION = 8_000_000_000;

// ═══════════════════════════════════════════════════════════════════════════════
// 3. 글로벌 시뮬레이터
// ═══════════════════════════════════════════════════════════════════════════════

export class GlobalSimulatorV3 {
  private launchDate: number;
  private startTime: number;

  constructor() {
    this.launchDate = new Date('2025-01-01').getTime();
    this.startTime = Date.now();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 총 동기화 사용자 수
  // ─────────────────────────────────────────────────────────────────────────
  getTotalSynced(): number {
    const daysSinceLaunch = (Date.now() - this.launchDate) / (1000 * 60 * 60 * 24);
    const base = 10000;
    const growth = Math.log10(daysSinceLaunch + 1) * 1_000_000;
    const elapsed = (Date.now() - this.startTime) / 1000;
    const realtime = elapsed * 0.5;
    
    return Math.floor(base + growth + realtime);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 현재 활성 사용자
  // ─────────────────────────────────────────────────────────────────────────
  getActiveUsers(): number {
    const total = this.getTotalSynced();
    const hour = new Date().getHours();
    const activityMultiplier = hour >= 9 && hour <= 22 ? 0.12 : 0.05;
    return Math.floor(total * activityMultiplier);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 메타별 글로벌 압력
  // ─────────────────────────────────────────────────────────────────────────
  getMetaPressure(meta: string): number {
    const hour = new Date().getHours();
    const basePressure: Record<string, number> = {
      MAT: 0.5 + (hour >= 9 && hour <= 18 ? 0.15 : -0.1),
      MEN: 0.45 + (hour >= 18 || hour < 6 ? 0.2 : 0),
      DYN: 0.55 + (hour >= 9 && hour <= 17 ? 0.2 : -0.15),
      TRS: 0.4 + (hour >= 20 || hour < 8 ? 0.15 : 0),
    };
    const noise = (Math.random() - 0.5) * 0.1;
    return Math.max(0, Math.min(1, (basePressure[meta] || 0.5) + noise));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 도메인별 압력
  // ─────────────────────────────────────────────────────────────────────────
  getDomainPressure(domain: string): number {
    const meta = DOMAINS[domain]?.meta;
    const base = this.getMetaPressure(meta);
    const noise = (Math.random() - 0.5) * 0.15;
    return Math.max(0, Math.min(1, base + noise));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 개별 노드 압력
  // ─────────────────────────────────────────────────────────────────────────
  getNodePressure(nodeId: string): number {
    const nodeNum = parseInt(nodeId.replace('n', ''));
    const domainIndex = Math.floor((nodeNum - 1) / 3);
    const domainKeys = Object.keys(DOMAINS);
    const domain = domainKeys[domainIndex];
    
    const base = this.getDomainPressure(domain);
    const typeNoise = (Math.random() - 0.5) * 0.1;
    return Math.max(0, Math.min(1, base + typeNoise));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 압력 상태 조회
  // ─────────────────────────────────────────────────────────────────────────
  getPressureState(pressure: number): PressureState {
    for (const [state, data] of Object.entries(PRESSURE_STATES)) {
      const [min, max] = data.range;
      if (pressure >= min && pressure < max) {
        return { state, label: data.label, color: data.color };
      }
    }
    return { state: 'CRITICAL', label: '위기', color: '#18181B' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 글로벌 공명 지수 (0-100)
  // ─────────────────────────────────────────────────────────────────────────
  getResonanceIndex(): number {
    let totalDissonance = 0;
    for (let i = 1; i <= 48; i++) {
      const pressure = this.getNodePressure(`n${i.toString().padStart(2, '0')}`);
      totalDissonance += Math.abs(pressure - 0.5);
    }
    return Math.floor((1 - totalDissonance / 48) * 100);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 지역별 통계
  // ─────────────────────────────────────────────────────────────────────────
  getRegionalStats(): RegionalStat[] {
    const total = this.getTotalSynced();
    return Object.entries(REGIONS).map(([key, region]) => {
      const ratio = region.population / GLOBAL_POPULATION;
      const synced = Math.floor(total * ratio);
      const utcHour = new Date().getUTCHours();
      const localHour = (utcHour + region.tz + 24) % 24;
      const isAwake = localHour >= 7 && localHour <= 23;
      const active = Math.floor(synced * (isAwake ? 0.1 : 0.02));
      
      return {
        id: key,
        ...region,
        synced,
        active,
        syncRate: parseFloat((synced / region.population * 100).toFixed(4)),
        localHour,
        isAwake,
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 아키타입별 분포
  // ─────────────────────────────────────────────────────────────────────────
  getArchetypeDistribution(): ArchetypeDistribution[] {
    const total = this.getTotalSynced();
    return Object.entries(CORE_ARCHETYPES).map(([key, arch]) => ({
      id: key,
      code: arch.id,
      name: arch.name,
      emoji: arch.emoji,
      ratio: arch.ratio,
      count: Math.floor(total * arch.ratio),
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 48노드 상태
  // ─────────────────────────────────────────────────────────────────────────
  getAllNodesState(): NodeState[] {
    const nodes: NodeState[] = [];
    const domainKeys = Object.keys(DOMAINS);
    const types = ['A', 'D', 'E'];

    for (let i = 1; i <= 48; i++) {
      const domainIndex = Math.floor((i - 1) / 3);
      const typeIndex = (i - 1) % 3;
      const domain = domainKeys[domainIndex];
      const type = types[typeIndex];
      const nodeId = `n${i.toString().padStart(2, '0')}`;
      
      const pressure = this.getNodePressure(nodeId);
      const state = this.getPressureState(pressure);

      nodes.push({
        id: nodeId,
        domain,
        domainName: DOMAINS[domain].name,
        meta: DOMAINS[domain].meta,
        type,
        typeName: NODE_TYPES[type].name,
        typeEmoji: NODE_TYPES[type].emoji,
        pressure,
        state: state.state,
        stateLabel: state.label,
        stateColor: state.color,
      });
    }

    return nodes;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 전체 스냅샷
  // ─────────────────────────────────────────────────────────────────────────
  getSnapshot(): GlobalSnapshot {
    return {
      timestamp: new Date().toISOString(),
      global: {
        totalSynced: this.getTotalSynced(),
        activeNow: this.getActiveUsers(),
        resonance: this.getResonanceIndex(),
        syncPerSecond: parseFloat((0.5 + Math.random() * 0.5).toFixed(2)),
      },
      meta: Object.entries(META_CATEGORIES).reduce((acc, [key, data]) => {
        acc[key] = {
          ...data,
          pressure: this.getMetaPressure(key),
        };
        return acc;
      }, {} as Record<string, MetaCategoryInfo & { pressure: number }>),
      regions: this.getRegionalStats(),
      archetypes: this.getArchetypeDistribution(),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. 아키타입 매칭
// ═══════════════════════════════════════════════════════════════════════════════

export class ArchetypeMatcherV3 {
  // ─────────────────────────────────────────────────────────────────────────
  // 온보딩 플로우
  // ─────────────────────────────────────────────────────────────────────────
  static getOnboardingFlow() {
    return {
      step1: {
        question: "지금 당신의 주된 상태는?",
        type: "single" as const,
        options: [
          { id: 'EMPLOYEE', label: '💼 조직에서 일하고 있다' },
          { id: 'ENTREPRENEUR', label: '🚀 사업을 키우고 있다' },
          { id: 'SELF_EMPLOYED', label: '🏪 혼자/작은 규모로 일한다' },
          { id: 'STUDENT', label: '📚 배우는 중이다' },
          { id: 'TRANSITION', label: '🔍 전환기다 (구직/이직/휴식)' },
          { id: 'RETIRED', label: '🌅 은퇴했다' },
        ],
      },
      step2: {
        question: "추가로 해당되는 역할이 있나요?",
        type: "multi" as const,
        maxSelect: 2,
        options: [
          { id: 'CAREGIVER', label: '👨‍👩‍👧 돌봄 책임이 있다' },
          { id: 'INVESTOR', label: '📈 투자/자산 운용을 한다' },
          { id: 'CREATOR', label: '✨ 콘텐츠/작품을 만든다' },
          { id: null, label: '⬜ 해당 없음' },
        ],
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 프로필 생성
  // ─────────────────────────────────────────────────────────────────────────
  static generateProfile(core: string, roles: string[]): UserProfile {
    const coreData = CORE_ARCHETYPES[core];
    const rolesData = roles.filter(Boolean).map(r => ROLE_MODIFIERS[r]).filter(Boolean);
    
    const name = rolesData.length > 0
      ? `${coreData.name} + ${rolesData.map(r => r.name).join(' + ')}`
      : coreData.name;
    
    const emoji = rolesData.length > 0
      ? `${coreData.emoji}${rolesData.map(r => r.emoji).join('')}`
      : coreData.emoji;

    return {
      core: {
        id: core,
        code: coreData.id,
        name: coreData.name,
        emoji: coreData.emoji,
      },
      roles: rolesData.map((r, i) => ({
        id: roles[i],
        code: r.id,
        name: r.name,
        emoji: r.emoji,
      })),
      displayName: name,
      displayEmoji: emoji,
      combination: `${core}${roles.length > 0 ? '+' + roles.join('+') : ''}`,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 동기화 번호 생성
  // ─────────────────────────────────────────────────────────────────────────
  static generateSyncNumber(simulator: GlobalSimulatorV3): number {
    return simulator.getTotalSynced() + 1;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 조합 경우의 수
  // ─────────────────────────────────────────────────────────────────────────
  static getCombinationCount(): number {
    return 42; // 6 Core × 7 Role 조합
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. 유틸리티
// ═══════════════════════════════════════════════════════════════════════════════

export const formatNumber = (num: number): string => {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString();
};

export const getNodeInfo = (nodeId: string) => {
  const num = parseInt(nodeId.replace('n', ''));
  const domainIndex = Math.floor((num - 1) / 3);
  const typeIndex = (num - 1) % 3;
  const domainKeys = Object.keys(DOMAINS);
  const domain = domainKeys[domainIndex];
  const types = ['A', 'D', 'E'];
  const type = types[typeIndex];
  
  return {
    id: nodeId,
    domain,
    domainName: DOMAINS[domain]?.name,
    type,
    typeName: NODE_TYPES[type]?.name,
    meta: DOMAINS[domain]?.meta,
    metaName: META_CATEGORIES[DOMAINS[domain]?.meta]?.name,
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. 기본 내보내기
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  GlobalSimulatorV3,
  ArchetypeMatcherV3,
  META_CATEGORIES,
  DOMAINS,
  NODE_TYPES,
  CORE_ARCHETYPES,
  ROLE_MODIFIERS,
  REGIONS,
  PRESSURE_STATES,
  formatNumber,
  getNodeInfo,
};
