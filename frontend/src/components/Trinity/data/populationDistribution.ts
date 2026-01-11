/**
 * AUTUS - 72타입 인구 분포 추정
 * ================================
 * 
 * 80억 세계 인구 기준 각 타입별 추정 비율
 * 
 * 가정:
 * - 투자자(T): 3% (2.4억 명)
 * - 사업가(B): 12% (9.6억 명)
 * - 근로자(L): 85% (68억 명)
 */

export const WORLD_POPULATION = 8_000_000_000; // 80억

// 타입별 비율 (전체 인구 대비 %)
export const TYPE_DISTRIBUTION: Record<string, { percent: number; population: number; rarity: string }> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // T: 투자자 (전체 3% = 2.4억 명)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // 공격적 그룹 (T01-T06)
  T01: { percent: 0.05, population: 4_000_000, rarity: 'Rare' },        // 공격적 투자자 - 400만
  T02: { percent: 0.08, population: 6_400_000, rarity: 'Rare' },        // 벤처 투자자 - 640만
  T03: { percent: 0.15, population: 12_000_000, rarity: 'Uncommon' },   // 투기적 트레이더 - 1,200만
  T04: { percent: 0.02, population: 1_600_000, rarity: 'Epic' },        // 인수합병 전문가 - 160만
  T05: { percent: 0.40, population: 32_000_000, rarity: 'Common' },     // 보수적 투자자 - 3,200만
  T06: { percent: 0.35, population: 28_000_000, rarity: 'Common' },     // 배당 투자자 - 2,800만
  
  // 전략적 그룹 (T07-T12)
  T07: { percent: 0.30, population: 24_000_000, rarity: 'Common' },     // 부동산 투자자 - 2,400만
  T08: { percent: 0.03, population: 2_400_000, rarity: 'Epic' },        // 엔젤 투자자 - 240만
  T09: { percent: 0.10, population: 8_000_000, rarity: 'Uncommon' },    // 기관 투자자 - 800만
  T10: { percent: 0.05, population: 4_000_000, rarity: 'Rare' },        // 임팩트 투자자 - 400만
  T11: { percent: 0.02, population: 1_600_000, rarity: 'Epic' },        // 헤지펀드 매니저 - 160만
  T12: { percent: 0.01, population: 800_000, rarity: 'Legendary' },     // 패밀리오피스 - 80만
  
  // 전문 그룹 (T13-T18)
  T13: { percent: 0.08, population: 6_400_000, rarity: 'Rare' },        // 퀀트 투자자 - 640만
  T14: { percent: 0.20, population: 16_000_000, rarity: 'Uncommon' },   // 가치 투자자 - 1,600만
  T15: { percent: 0.25, population: 20_000_000, rarity: 'Common' },     // 성장 투자자 - 2,000만
  T16: { percent: 0.30, population: 24_000_000, rarity: 'Common' },     // 크립토 투자자 - 2,400만
  T17: { percent: 0.10, population: 8_000_000, rarity: 'Uncommon' },    // 상품 투자자 - 800만
  T18: { percent: 0.15, population: 12_000_000, rarity: 'Uncommon' },   // 채권 투자자 - 1,200만
  
  // 특수 그룹 (T19-T24)
  T19: { percent: 0.01, population: 800_000, rarity: 'Legendary' },     // 행동주의 투자자 - 80만
  T20: { percent: 0.02, population: 1_600_000, rarity: 'Epic' },        // 시드 투자자 - 160만
  T21: { percent: 0.03, population: 2_400_000, rarity: 'Epic' },        // 세컨더리 투자자 - 240만
  T22: { percent: 0.25, population: 20_000_000, rarity: 'Common' },     // 크라우드 투자자 - 2,000만
  T23: { percent: 0.04, population: 3_200_000, rarity: 'Rare' },        // 전환사채 투자자 - 320만
  T24: { percent: 0.01, population: 800_000, rarity: 'Legendary' },     // 소버린 투자자 - 80만
  
  // ═══════════════════════════════════════════════════════════════════════════
  // B: 사업가 (전체 12% = 9.6억 명)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // 성장형 (B01-B06)
  B01: { percent: 0.10, population: 8_000_000, rarity: 'Uncommon' },    // 총괄형 사업가 - 800만
  B02: { percent: 0.15, population: 12_000_000, rarity: 'Uncommon' },   // 확장형 사업가 - 1,200만
  B03: { percent: 0.20, population: 16_000_000, rarity: 'Uncommon' },   // 시스템 사업가 - 1,600만
  B04: { percent: 0.05, population: 4_000_000, rarity: 'Rare' },        // 플랫폼 사업가 - 400만
  B05: { percent: 0.80, population: 64_000_000, rarity: 'Common' },     // 프랜차이즈 사업가 - 6,400만
  B06: { percent: 0.08, population: 6_400_000, rarity: 'Rare' },        // 글로벌 사업가 - 640만
  
  // 혁신형 (B07-B12)
  B07: { percent: 0.12, population: 9_600_000, rarity: 'Uncommon' },    // 모험적 사업가 - 960만
  B08: { percent: 0.15, population: 12_000_000, rarity: 'Uncommon' },   // 기술 사업가 - 1,200만
  B09: { percent: 0.10, population: 8_000_000, rarity: 'Uncommon' },    // 사회적 사업가 - 800만
  B10: { percent: 0.08, population: 6_400_000, rarity: 'Rare' },        // 디자인 사업가 - 640만
  B11: { percent: 0.20, population: 16_000_000, rarity: 'Uncommon' },   // 콘텐츠 사업가 - 1,600만
  B12: { percent: 0.03, population: 2_400_000, rarity: 'Epic' },        // 연쇄 창업가 - 240만
  
  // 운영형 (B13-B18)
  B13: { percent: 0.30, population: 24_000_000, rarity: 'Common' },     // 운영 전문가 - 2,400만
  B14: { percent: 1.50, population: 120_000_000, rarity: 'Common' },    // 가족 사업가 - 1.2억
  B15: { percent: 6.00, population: 480_000_000, rarity: 'Common' },    // 소상공인 - 4.8억 ⭐
  B16: { percent: 0.80, population: 64_000_000, rarity: 'Common' },     // 유통 사업가 - 6,400만
  B17: { percent: 1.00, population: 80_000_000, rarity: 'Common' },     // 서비스 사업가 - 8,000만
  B18: { percent: 0.50, population: 40_000_000, rarity: 'Common' },     // 제조 사업가 - 4,000만
  
  // 전략형 (B19-B24)
  B19: { percent: 0.15, population: 12_000_000, rarity: 'Uncommon' },   // 컨설턴트 사업가 - 1,200만
  B20: { percent: 0.02, population: 1_600_000, rarity: 'Epic' },        // 투자 사업가 - 160만
  B21: { percent: 0.03, population: 2_400_000, rarity: 'Epic' },        // 인수 사업가 - 240만
  B22: { percent: 0.05, population: 4_000_000, rarity: 'Rare' },        // 라이선스 사업가 - 400만
  B23: { percent: 0.08, population: 6_400_000, rarity: 'Rare' },        // 파트너십 사업가 - 640만
  B24: { percent: 0.01, population: 800_000, rarity: 'Legendary' },     // 지주회사 사업가 - 80만
  
  // ═══════════════════════════════════════════════════════════════════════════
  // L: 근로자 (전체 85% = 68억 명)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // 창의형 (L01-L06)
  L01: { percent: 0.80, population: 64_000_000, rarity: 'Common' },     // 창의적 근로자 - 6,400만
  L02: { percent: 1.00, population: 80_000_000, rarity: 'Common' },     // 기획자 - 8,000만
  L03: { percent: 0.50, population: 40_000_000, rarity: 'Common' },     // 디자이너 - 4,000만
  L04: { percent: 0.40, population: 32_000_000, rarity: 'Common' },     // 개발자 - 3,200만
  L05: { percent: 0.30, population: 24_000_000, rarity: 'Common' },     // 연구원 - 2,400만
  L06: { percent: 0.60, population: 48_000_000, rarity: 'Common' },     // 작가/크리에이터 - 4,800만
  
  // 관리형 (L07-L12)
  L07: { percent: 0.80, population: 64_000_000, rarity: 'Common' },     // 프로젝트 매니저 - 6,400만
  L08: { percent: 1.50, population: 120_000_000, rarity: 'Common' },    // 팀 리더 - 1.2억
  L09: { percent: 1.00, population: 80_000_000, rarity: 'Common' },     // 코디네이터 - 8,000만
  L10: { percent: 2.00, population: 160_000_000, rarity: 'Common' },    // 관리자 - 1.6억
  L11: { percent: 0.60, population: 48_000_000, rarity: 'Common' },     // 애널리스트 - 4,800만
  L12: { percent: 0.40, population: 32_000_000, rarity: 'Common' },     // 품질 관리자 - 3,200만
  
  // 실행형 (L13-L18)
  L13: { percent: 3.00, population: 240_000_000, rarity: 'Common' },    // 영업 전문가 - 2.4억
  L14: { percent: 1.50, population: 120_000_000, rarity: 'Common' },    // 마케터 - 1.2억
  L15: { percent: 4.00, population: 320_000_000, rarity: 'Common' },    // 고객 서비스 - 3.2억
  L16: { percent: 1.00, population: 80_000_000, rarity: 'Common' },     // 기술 지원 - 8,000만
  L17: { percent: 3.00, population: 240_000_000, rarity: 'Common' },    // 물류 전문가 - 2.4억
  L18: { percent: 8.00, population: 640_000_000, rarity: 'Common' },    // 생산 기술자 - 6.4억 ⭐
  
  // 전문형 (L19-L24)
  L19: { percent: 0.15, population: 12_000_000, rarity: 'Uncommon' },   // 법률 전문가 - 1,200만
  L20: { percent: 0.50, population: 40_000_000, rarity: 'Common' },     // 회계/재무 - 4,000만
  L21: { percent: 50.00, population: 4_000_000_000, rarity: 'Common' }, // 반복형 근로자 - 40억 ⭐⭐⭐
  L22: { percent: 0.30, population: 24_000_000, rarity: 'Common' },     // HR 전문가 - 2,400만
  L23: { percent: 1.50, population: 120_000_000, rarity: 'Common' },    // 교육/트레이너 - 1.2억
  L24: { percent: 2.00, population: 160_000_000, rarity: 'Common' },    // 프리랜서 - 1.6억
};

// 희귀도별 색상
export const RARITY_COLORS = {
  Common: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  Uncommon: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  Rare: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  Epic: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  Legendary: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
};

// 희귀도별 설명
export const RARITY_LABELS = {
  Common: '흔함',
  Uncommon: '약간 드묾',
  Rare: '드묾',
  Epic: '매우 드묾',
  Legendary: '전설적',
};

// 통계 요약
export const CATEGORY_SUMMARY = {
  T: { 
    name: '투자자', 
    totalPercent: 3, 
    totalPopulation: 240_000_000,
    description: '자본을 움직이는 자'
  },
  B: { 
    name: '사업가', 
    totalPercent: 12, 
    totalPopulation: 960_000_000,
    description: '구조를 만드는 자'
  },
  L: { 
    name: '근로자', 
    totalPercent: 85, 
    totalPopulation: 6_800_000_000,
    description: '실행하는 자'
  },
};

// 인구 포맷 함수
export function formatPopulation(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

// Top 10 가장 많은 타입
export const TOP_10_TYPES = Object.entries(TYPE_DISTRIBUTION)
  .sort((a, b) => b[1].population - a[1].population)
  .slice(0, 10)
  .map(([id, data]) => ({ id, ...data }));

// Top 10 가장 희귀한 타입
export const RAREST_10_TYPES = Object.entries(TYPE_DISTRIBUTION)
  .sort((a, b) => a[1].population - b[1].population)
  .slice(0, 10)
  .map(([id, data]) => ({ id, ...data }));
