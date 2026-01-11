/**
 * AUTUS - 72-Type 인간 온톨로지
 * ==============================
 * 
 * 3대 분류 × 24 세부 타입 = 72 타입
 * 
 * T: 투자자 (Capital) - 자본을 움직이는 자
 * B: 사업가 (Structure) - 구조를 만드는 자  
 * L: 근로자 (Labor) - 실행하는 자
 */

// ═══════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════

export interface NodeType {
  id: string;           // T01, B12, L24 등
  category: 'T' | 'B' | 'L';
  index: number;        // 1-24
  name: string;
  nameEn: string;
  desc: string;
  traits: string[];
  
  // 벡터 특성 (0-100)
  vectors: {
    risk: number;       // 리스크 선호도
    social: number;     // 사회적 연결력
    execution: number;  // 실행력
    creativity: number; // 창의성
    stability: number;  // 안정 추구도
    leadership: number; // 리더십
  };
}

export interface InteractionResult {
  nodeA: string;
  nodeB: string;
  coefficient: number;  // -1.0 ~ +1.0
  type: 'resonance' | 'stable' | 'neutral' | 'friction' | 'conflict';
  outcome: string;
  action: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// T: 투자자 (Capital) - 24타입
// ═══════════════════════════════════════════════════════════════════════════

export const INVESTOR_TYPES: NodeType[] = [
  // 공격적 투자자 그룹 (T01-T06)
  {
    id: 'T01', category: 'T', index: 1,
    name: '공격적 투자자', nameEn: 'Aggressive Investor',
    desc: '고위험 고수익을 추구하는 자본가',
    traits: ['레버리지 선호', '빠른 의사결정', '손실 감내'],
    vectors: { risk: 95, social: 60, execution: 85, creativity: 70, stability: 20, leadership: 75 }
  },
  {
    id: 'T02', category: 'T', index: 2,
    name: '벤처 투자자', nameEn: 'Venture Capitalist',
    desc: '스타트업과 혁신에 베팅하는 자',
    traits: ['성장 중시', '네트워크 활용', '장기 안목'],
    vectors: { risk: 85, social: 90, execution: 70, creativity: 85, stability: 30, leadership: 80 }
  },
  {
    id: 'T03', category: 'T', index: 3,
    name: '투기적 트레이더', nameEn: 'Speculative Trader',
    desc: '단기 변동성으로 수익을 추구',
    traits: ['기술적 분석', '빠른 회전', '감정 통제'],
    vectors: { risk: 98, social: 30, execution: 95, creativity: 40, stability: 10, leadership: 40 }
  },
  {
    id: 'T04', category: 'T', index: 4,
    name: '인수합병 전문가', nameEn: 'M&A Specialist',
    desc: '기업 구조를 재편하는 자본가',
    traits: ['협상력', '구조 분석', '가치 창출'],
    vectors: { risk: 75, social: 85, execution: 80, creativity: 65, stability: 45, leadership: 90 }
  },
  {
    id: 'T05', category: 'T', index: 5,
    name: '보수적 투자자', nameEn: 'Conservative Investor',
    desc: '안정적 수익과 자본 보존을 추구',
    traits: ['분산 투자', '장기 보유', '리스크 관리'],
    vectors: { risk: 25, social: 50, execution: 60, creativity: 30, stability: 95, leadership: 55 }
  },
  {
    id: 'T06', category: 'T', index: 6,
    name: '배당 투자자', nameEn: 'Dividend Investor',
    desc: '꾸준한 현금 흐름을 추구',
    traits: ['현금 중시', '우량주 선호', '복리 효과'],
    vectors: { risk: 20, social: 40, execution: 50, creativity: 20, stability: 98, leadership: 35 }
  },
  
  // 전략적 투자자 그룹 (T07-T12)
  {
    id: 'T07', category: 'T', index: 7,
    name: '부동산 투자자', nameEn: 'Real Estate Investor',
    desc: '실물 자산으로 부를 축적',
    traits: ['레버리지 활용', '현금흐름', '가치 상승'],
    vectors: { risk: 55, social: 65, execution: 70, creativity: 45, stability: 75, leadership: 60 }
  },
  {
    id: 'T08', category: 'T', index: 8,
    name: '엔젤 투자자', nameEn: 'Angel Investor',
    desc: '초기 단계 스타트업에 투자하는 멘토',
    traits: ['멘토링', '네트워크 제공', '리스크 감수'],
    vectors: { risk: 80, social: 95, execution: 55, creativity: 90, stability: 25, leadership: 85 }
  },
  {
    id: 'T09', category: 'T', index: 9,
    name: '기관 투자자', nameEn: 'Institutional Investor',
    desc: '대규모 자본을 운용하는 전문가',
    traits: ['체계적 분석', '리스크 관리', '장기 전략'],
    vectors: { risk: 45, social: 70, execution: 85, creativity: 50, stability: 80, leadership: 75 }
  },
  {
    id: 'T10', category: 'T', index: 10,
    name: '임팩트 투자자', nameEn: 'Impact Investor',
    desc: '사회적 가치와 수익을 동시에 추구',
    traits: ['ESG 중시', '장기 안목', '가치 정렬'],
    vectors: { risk: 50, social: 90, execution: 60, creativity: 75, stability: 60, leadership: 70 }
  },
  {
    id: 'T11', category: 'T', index: 11,
    name: '헤지펀드 매니저', nameEn: 'Hedge Fund Manager',
    desc: '다양한 전략으로 절대 수익 추구',
    traits: ['복잡한 전략', '레버리지', '시장 중립'],
    vectors: { risk: 85, social: 55, execution: 90, creativity: 80, stability: 35, leadership: 70 }
  },
  {
    id: 'T12', category: 'T', index: 12,
    name: '패밀리오피스', nameEn: 'Family Office',
    desc: '가문의 자산을 세대에 걸쳐 관리',
    traits: ['장기 보존', '세대 전승', '프라이버시'],
    vectors: { risk: 35, social: 60, execution: 65, creativity: 40, stability: 90, leadership: 65 }
  },
  
  // 전문 투자자 그룹 (T13-T18)
  {
    id: 'T13', category: 'T', index: 13,
    name: '퀀트 투자자', nameEn: 'Quantitative Investor',
    desc: '알고리즘과 데이터로 투자',
    traits: ['수학적 모델', '자동화', '감정 배제'],
    vectors: { risk: 70, social: 25, execution: 95, creativity: 85, stability: 55, leadership: 45 }
  },
  {
    id: 'T14', category: 'T', index: 14,
    name: '가치 투자자', nameEn: 'Value Investor',
    desc: '내재가치 대비 저평가 자산 발굴',
    traits: ['기본적 분석', '인내심', '역발상'],
    vectors: { risk: 40, social: 45, execution: 65, creativity: 55, stability: 85, leadership: 50 }
  },
  {
    id: 'T15', category: 'T', index: 15,
    name: '성장 투자자', nameEn: 'Growth Investor',
    desc: '빠르게 성장하는 기업에 집중',
    traits: ['트렌드 파악', '높은 밸류에이션 감내', '모멘텀'],
    vectors: { risk: 75, social: 60, execution: 75, creativity: 70, stability: 40, leadership: 60 }
  },
  {
    id: 'T16', category: 'T', index: 16,
    name: '크립토 투자자', nameEn: 'Crypto Investor',
    desc: '디지털 자산과 블록체인에 투자',
    traits: ['기술 이해', '변동성 감내', '탈중앙화'],
    vectors: { risk: 95, social: 70, execution: 80, creativity: 90, stability: 15, leadership: 55 }
  },
  {
    id: 'T17', category: 'T', index: 17,
    name: '상품 투자자', nameEn: 'Commodity Investor',
    desc: '원자재와 실물 자산에 투자',
    traits: ['매크로 분석', '인플레이션 헤지', '사이클'],
    vectors: { risk: 65, social: 40, execution: 70, creativity: 45, stability: 60, leadership: 45 }
  },
  {
    id: 'T18', category: 'T', index: 18,
    name: '채권 투자자', nameEn: 'Bond Investor',
    desc: '고정 수익 자산으로 안정 추구',
    traits: ['금리 분석', '신용 평가', '안정성'],
    vectors: { risk: 20, social: 35, execution: 55, creativity: 25, stability: 95, leadership: 40 }
  },
  
  // 특수 투자자 그룹 (T19-T24)
  {
    id: 'T19', category: 'T', index: 19,
    name: '행동주의 투자자', nameEn: 'Activist Investor',
    desc: '기업 경영에 적극 개입',
    traits: ['지배구조', '가치 실현', '압박 전략'],
    vectors: { risk: 80, social: 85, execution: 90, creativity: 70, stability: 30, leadership: 95 }
  },
  {
    id: 'T20', category: 'T', index: 20,
    name: '시드 투자자', nameEn: 'Seed Investor',
    desc: '아이디어 단계에서 최초 투자',
    traits: ['비전 발굴', '초기 리스크', '높은 수익'],
    vectors: { risk: 90, social: 85, execution: 50, creativity: 95, stability: 15, leadership: 70 }
  },
  {
    id: 'T21', category: 'T', index: 21,
    name: '세컨더리 투자자', nameEn: 'Secondary Investor',
    desc: '기존 지분을 인수하는 전문가',
    traits: ['유동성 제공', '할인 매수', '중간 단계'],
    vectors: { risk: 55, social: 70, execution: 80, creativity: 45, stability: 65, leadership: 55 }
  },
  {
    id: 'T22', category: 'T', index: 22,
    name: '크라우드 투자자', nameEn: 'Crowd Investor',
    desc: '대중과 함께 소액 분산 투자',
    traits: ['집단 지성', '낮은 진입장벽', '분산'],
    vectors: { risk: 50, social: 80, execution: 40, creativity: 60, stability: 50, leadership: 30 }
  },
  {
    id: 'T23', category: 'T', index: 23,
    name: '전환사채 투자자', nameEn: 'Convertible Investor',
    desc: '채권과 주식의 하이브리드 투자',
    traits: ['옵션 가치', '하방 보호', '상방 참여'],
    vectors: { risk: 50, social: 45, execution: 65, creativity: 55, stability: 70, leadership: 45 }
  },
  {
    id: 'T24', category: 'T', index: 24,
    name: '소버린 투자자', nameEn: 'Sovereign Investor',
    desc: '국부펀드 스타일의 초장기 투자',
    traits: ['세대 초월', '다각화', '영향력'],
    vectors: { risk: 35, social: 75, execution: 70, creativity: 50, stability: 85, leadership: 80 }
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// B: 사업가 (Structure) - 24타입
// ═══════════════════════════════════════════════════════════════════════════

export const BUSINESS_TYPES: NodeType[] = [
  // 성장형 사업가 (B01-B06)
  {
    id: 'B01', category: 'B', index: 1,
    name: '총괄형 사업가', nameEn: 'General Manager',
    desc: '전체 조직을 통합 운영하는 리더',
    traits: ['전략 수립', '자원 배분', '의사결정'],
    vectors: { risk: 70, social: 85, execution: 80, creativity: 65, stability: 55, leadership: 98 }
  },
  {
    id: 'B02', category: 'B', index: 2,
    name: '확장형 사업가', nameEn: 'Scale-up Entrepreneur',
    desc: '빠른 성장과 확장을 추구',
    traits: ['속도 중시', '시장 점유', '자금 조달'],
    vectors: { risk: 85, social: 80, execution: 90, creativity: 75, stability: 30, leadership: 85 }
  },
  {
    id: 'B03', category: 'B', index: 3,
    name: '시스템 사업가', nameEn: 'Systems Entrepreneur',
    desc: '반복 가능한 시스템을 구축',
    traits: ['프로세스', '자동화', '표준화'],
    vectors: { risk: 45, social: 55, execution: 95, creativity: 70, stability: 80, leadership: 70 }
  },
  {
    id: 'B04', category: 'B', index: 4,
    name: '플랫폼 사업가', nameEn: 'Platform Builder',
    desc: '양면 시장을 연결하는 플랫폼 구축',
    traits: ['네트워크 효과', '생태계', '중개'],
    vectors: { risk: 75, social: 95, execution: 75, creativity: 90, stability: 40, leadership: 80 }
  },
  {
    id: 'B05', category: 'B', index: 5,
    name: '프랜차이즈 사업가', nameEn: 'Franchise Owner',
    desc: '검증된 모델을 복제 확장',
    traits: ['표준화', '브랜드', '관리 체계'],
    vectors: { risk: 40, social: 65, execution: 85, creativity: 35, stability: 85, leadership: 65 }
  },
  {
    id: 'B06', category: 'B', index: 6,
    name: '글로벌 사업가', nameEn: 'Global Entrepreneur',
    desc: '국경을 넘어 사업을 확장',
    traits: ['문화 이해', '현지화', '글로벌 네트워크'],
    vectors: { risk: 70, social: 90, execution: 75, creativity: 70, stability: 45, leadership: 85 }
  },
  
  // 혁신형 사업가 (B07-B12)
  {
    id: 'B07', category: 'B', index: 7,
    name: '모험적 사업가', nameEn: 'Adventurous Entrepreneur',
    desc: '새로운 시장을 개척하는 개척자',
    traits: ['리스크 감수', '선구자', '실패 학습'],
    vectors: { risk: 95, social: 70, execution: 75, creativity: 95, stability: 15, leadership: 80 }
  },
  {
    id: 'B08', category: 'B', index: 8,
    name: '기술 사업가', nameEn: 'Tech Entrepreneur',
    desc: '기술로 문제를 해결하는 창업가',
    traits: ['기술 이해', '제품 중심', '스케일'],
    vectors: { risk: 80, social: 65, execution: 85, creativity: 95, stability: 35, leadership: 70 }
  },
  {
    id: 'B09', category: 'B', index: 9,
    name: '사회적 사업가', nameEn: 'Social Entrepreneur',
    desc: '사회 문제 해결로 가치 창출',
    traits: ['임팩트', '지속가능', '미션 중심'],
    vectors: { risk: 60, social: 95, execution: 70, creativity: 80, stability: 55, leadership: 75 }
  },
  {
    id: 'B10', category: 'B', index: 10,
    name: '디자인 사업가', nameEn: 'Design Entrepreneur',
    desc: '디자인 씽킹으로 혁신 주도',
    traits: ['사용자 중심', '미학', '경험 설계'],
    vectors: { risk: 55, social: 75, execution: 70, creativity: 98, stability: 45, leadership: 65 }
  },
  {
    id: 'B11', category: 'B', index: 11,
    name: '콘텐츠 사업가', nameEn: 'Content Entrepreneur',
    desc: '미디어와 콘텐츠로 사업 구축',
    traits: ['스토리텔링', '오디언스', '브랜드'],
    vectors: { risk: 65, social: 90, execution: 65, creativity: 95, stability: 40, leadership: 60 }
  },
  {
    id: 'B12', category: 'B', index: 12,
    name: '연쇄 창업가', nameEn: 'Serial Entrepreneur',
    desc: '여러 사업을 연속으로 창업',
    traits: ['경험 축적', '패턴 인식', '빠른 실행'],
    vectors: { risk: 85, social: 85, execution: 90, creativity: 80, stability: 30, leadership: 85 }
  },
  
  // 운영형 사업가 (B13-B18)
  {
    id: 'B13', category: 'B', index: 13,
    name: '운영 전문가', nameEn: 'Operations Expert',
    desc: '효율적 운영으로 가치 창출',
    traits: ['최적화', '비용 절감', '프로세스'],
    vectors: { risk: 30, social: 50, execution: 98, creativity: 40, stability: 90, leadership: 60 }
  },
  {
    id: 'B14', category: 'B', index: 14,
    name: '가족 사업가', nameEn: 'Family Business Owner',
    desc: '가업을 계승하고 발전시키는 자',
    traits: ['전통', '장기 안목', '가치 보존'],
    vectors: { risk: 35, social: 70, execution: 70, creativity: 40, stability: 90, leadership: 65 }
  },
  {
    id: 'B15', category: 'B', index: 15,
    name: '소상공인', nameEn: 'Small Business Owner',
    desc: '지역 기반 소규모 사업 운영',
    traits: ['고객 밀착', '생존력', '다재다능'],
    vectors: { risk: 50, social: 80, execution: 85, creativity: 50, stability: 65, leadership: 55 }
  },
  {
    id: 'B16', category: 'B', index: 16,
    name: '유통 사업가', nameEn: 'Distribution Expert',
    desc: '물류와 유통 채널을 장악',
    traits: ['네트워크', '효율성', '마진 관리'],
    vectors: { risk: 45, social: 75, execution: 90, creativity: 45, stability: 70, leadership: 65 }
  },
  {
    id: 'B17', category: 'B', index: 17,
    name: '서비스 사업가', nameEn: 'Service Business Owner',
    desc: '인적 서비스로 가치 제공',
    traits: ['품질 관리', '고객 만족', '인재 관리'],
    vectors: { risk: 40, social: 90, execution: 80, creativity: 55, stability: 65, leadership: 70 }
  },
  {
    id: 'B18', category: 'B', index: 18,
    name: '제조 사업가', nameEn: 'Manufacturing Entrepreneur',
    desc: '실물 제품을 생산하는 사업가',
    traits: ['품질', '생산성', '공급망'],
    vectors: { risk: 55, social: 55, execution: 95, creativity: 50, stability: 75, leadership: 65 }
  },
  
  // 전략형 사업가 (B19-B24)
  {
    id: 'B19', category: 'B', index: 19,
    name: '컨설턴트 사업가', nameEn: 'Consulting Entrepreneur',
    desc: '전문 지식을 사업화',
    traits: ['전문성', '문제 해결', '네트워크'],
    vectors: { risk: 45, social: 85, execution: 75, creativity: 70, stability: 60, leadership: 70 }
  },
  {
    id: 'B20', category: 'B', index: 20,
    name: '투자 사업가', nameEn: 'Investor-Operator',
    desc: '투자와 운영을 겸하는 하이브리드',
    traits: ['자본 + 운영', '가치 창출', '시너지'],
    vectors: { risk: 65, social: 80, execution: 85, creativity: 65, stability: 50, leadership: 85 }
  },
  {
    id: 'B21', category: 'B', index: 21,
    name: '인수 사업가', nameEn: 'Acquisition Entrepreneur',
    desc: '기존 사업을 인수해 성장',
    traits: ['실사', '통합', '가치 실현'],
    vectors: { risk: 60, social: 70, execution: 85, creativity: 50, stability: 60, leadership: 80 }
  },
  {
    id: 'B22', category: 'B', index: 22,
    name: '라이선스 사업가', nameEn: 'Licensing Entrepreneur',
    desc: 'IP와 라이선스로 수익 창출',
    traits: ['지적재산', '계약', '로열티'],
    vectors: { risk: 40, social: 60, execution: 65, creativity: 75, stability: 75, leadership: 50 }
  },
  {
    id: 'B23', category: 'B', index: 23,
    name: '파트너십 사업가', nameEn: 'Partnership Builder',
    desc: '전략적 제휴로 성장 가속',
    traits: ['협상', 'Win-Win', '네트워크'],
    vectors: { risk: 50, social: 95, execution: 70, creativity: 60, stability: 60, leadership: 75 }
  },
  {
    id: 'B24', category: 'B', index: 24,
    name: '지주회사 사업가', nameEn: 'Holding Company Owner',
    desc: '여러 사업을 포트폴리오로 관리',
    traits: ['다각화', '시너지', '지배구조'],
    vectors: { risk: 50, social: 70, execution: 75, creativity: 55, stability: 75, leadership: 90 }
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// L: 근로자 (Labor) - 24타입
// ═══════════════════════════════════════════════════════════════════════════

export const LABOR_TYPES: NodeType[] = [
  // 창의형 근로자 (L01-L06)
  {
    id: 'L01', category: 'L', index: 1,
    name: '창의적 근로자', nameEn: 'Creative Worker',
    desc: '새로운 아이디어를 만들어내는 자',
    traits: ['발상', '혁신', '자유로움'],
    vectors: { risk: 65, social: 60, execution: 55, creativity: 98, stability: 30, leadership: 45 }
  },
  {
    id: 'L02', category: 'L', index: 2,
    name: '기획자', nameEn: 'Planner',
    desc: '전략과 계획을 수립하는 전문가',
    traits: ['분석', '구조화', '로드맵'],
    vectors: { risk: 40, social: 65, execution: 70, creativity: 75, stability: 65, leadership: 60 }
  },
  {
    id: 'L03', category: 'L', index: 3,
    name: '디자이너', nameEn: 'Designer',
    desc: '시각적 솔루션을 만드는 전문가',
    traits: ['미학', 'UX', '비주얼'],
    vectors: { risk: 50, social: 55, execution: 75, creativity: 95, stability: 50, leadership: 40 }
  },
  {
    id: 'L04', category: 'L', index: 4,
    name: '개발자', nameEn: 'Developer',
    desc: '코드로 시스템을 구축하는 자',
    traits: ['논리', '구현력', '문제해결'],
    vectors: { risk: 45, social: 40, execution: 90, creativity: 80, stability: 60, leadership: 35 }
  },
  {
    id: 'L05', category: 'L', index: 5,
    name: '연구원', nameEn: 'Researcher',
    desc: '깊이 있는 연구로 지식 창출',
    traits: ['탐구', '분석', '전문성'],
    vectors: { risk: 35, social: 35, execution: 65, creativity: 85, stability: 75, leadership: 30 }
  },
  {
    id: 'L06', category: 'L', index: 6,
    name: '작가/크리에이터', nameEn: 'Writer/Creator',
    desc: '콘텐츠를 창작하는 전문가',
    traits: ['스토리텔링', '표현력', '독창성'],
    vectors: { risk: 55, social: 50, execution: 60, creativity: 98, stability: 40, leadership: 35 }
  },
  
  // 관리형 근로자 (L07-L12)
  {
    id: 'L07', category: 'L', index: 7,
    name: '프로젝트 매니저', nameEn: 'Project Manager',
    desc: '프로젝트를 조율하고 완수',
    traits: ['조율', '일정 관리', '리스크 관리'],
    vectors: { risk: 45, social: 80, execution: 85, creativity: 50, stability: 70, leadership: 75 }
  },
  {
    id: 'L08', category: 'L', index: 8,
    name: '팀 리더', nameEn: 'Team Leader',
    desc: '팀을 이끌고 성과를 창출',
    traits: ['리더십', '동기부여', '성과 관리'],
    vectors: { risk: 50, social: 85, execution: 80, creativity: 55, stability: 60, leadership: 85 }
  },
  {
    id: 'L09', category: 'L', index: 9,
    name: '코디네이터', nameEn: 'Coordinator',
    desc: '부서 간 소통을 연결',
    traits: ['커뮤니케이션', '조정', '관계'],
    vectors: { risk: 30, social: 90, execution: 70, creativity: 40, stability: 75, leadership: 55 }
  },
  {
    id: 'L10', category: 'L', index: 10,
    name: '관리자', nameEn: 'Administrator',
    desc: '체계적으로 업무를 관리',
    traits: ['조직력', '문서화', '프로세스'],
    vectors: { risk: 20, social: 55, execution: 85, creativity: 30, stability: 95, leadership: 50 }
  },
  {
    id: 'L11', category: 'L', index: 11,
    name: '애널리스트', nameEn: 'Analyst',
    desc: '데이터를 분석해 인사이트 도출',
    traits: ['데이터', '논리', '리포팅'],
    vectors: { risk: 35, social: 45, execution: 80, creativity: 65, stability: 80, leadership: 40 }
  },
  {
    id: 'L12', category: 'L', index: 12,
    name: '품질 관리자', nameEn: 'QA Specialist',
    desc: '품질 기준을 유지하는 전문가',
    traits: ['꼼꼼함', '기준', '개선'],
    vectors: { risk: 25, social: 40, execution: 90, creativity: 35, stability: 95, leadership: 35 }
  },
  
  // 실행형 근로자 (L13-L18)
  {
    id: 'L13', category: 'L', index: 13,
    name: '영업 전문가', nameEn: 'Sales Professional',
    desc: '고객을 설득하고 매출 창출',
    traits: ['설득력', '관계', '목표 달성'],
    vectors: { risk: 60, social: 95, execution: 85, creativity: 55, stability: 45, leadership: 60 }
  },
  {
    id: 'L14', category: 'L', index: 14,
    name: '마케터', nameEn: 'Marketer',
    desc: '브랜드와 제품을 알리는 전문가',
    traits: ['커뮤니케이션', '트렌드', '캠페인'],
    vectors: { risk: 55, social: 85, execution: 75, creativity: 85, stability: 50, leadership: 50 }
  },
  {
    id: 'L15', category: 'L', index: 15,
    name: '고객 서비스', nameEn: 'Customer Service',
    desc: '고객 문제를 해결하는 최전선',
    traits: ['공감', '문제해결', '인내'],
    vectors: { risk: 25, social: 90, execution: 80, creativity: 40, stability: 70, leadership: 35 }
  },
  {
    id: 'L16', category: 'L', index: 16,
    name: '기술 지원', nameEn: 'Technical Support',
    desc: '기술 문제를 해결하는 전문가',
    traits: ['기술력', '문제해결', '가이드'],
    vectors: { risk: 30, social: 60, execution: 90, creativity: 50, stability: 80, leadership: 40 }
  },
  {
    id: 'L17', category: 'L', index: 17,
    name: '물류 전문가', nameEn: 'Logistics Specialist',
    desc: '물류와 배송을 최적화',
    traits: ['효율성', '네트워크', '시간 관리'],
    vectors: { risk: 35, social: 50, execution: 95, creativity: 35, stability: 85, leadership: 45 }
  },
  {
    id: 'L18', category: 'L', index: 18,
    name: '생산 기술자', nameEn: 'Production Technician',
    desc: '제품을 직접 생산하는 숙련공',
    traits: ['숙련', '품질', '안전'],
    vectors: { risk: 30, social: 45, execution: 95, creativity: 40, stability: 90, leadership: 35 }
  },
  
  // 전문형 근로자 (L19-L24)
  {
    id: 'L19', category: 'L', index: 19,
    name: '법률 전문가', nameEn: 'Legal Professional',
    desc: '법적 문제를 다루는 전문가',
    traits: ['법률 지식', '리스크', '계약'],
    vectors: { risk: 30, social: 60, execution: 80, creativity: 45, stability: 90, leadership: 55 }
  },
  {
    id: 'L20', category: 'L', index: 20,
    name: '회계/재무', nameEn: 'Accountant/Finance',
    desc: '숫자와 재무를 다루는 전문가',
    traits: ['정확성', '분석', '규정 준수'],
    vectors: { risk: 20, social: 45, execution: 90, creativity: 30, stability: 98, leadership: 40 }
  },
  {
    id: 'L21', category: 'L', index: 21,
    name: '반복형 근로자', nameEn: 'Routine Worker',
    desc: '정해진 업무를 꾸준히 수행',
    traits: ['일관성', '안정성', '신뢰'],
    vectors: { risk: 15, social: 40, execution: 85, creativity: 20, stability: 98, leadership: 25 }
  },
  {
    id: 'L22', category: 'L', index: 22,
    name: 'HR 전문가', nameEn: 'HR Professional',
    desc: '인재를 관리하는 전문가',
    traits: ['인재 관리', '문화', '채용'],
    vectors: { risk: 35, social: 95, execution: 70, creativity: 55, stability: 70, leadership: 65 }
  },
  {
    id: 'L23', category: 'L', index: 23,
    name: '교육/트레이너', nameEn: 'Trainer/Educator',
    desc: '지식을 전달하고 성장을 돕는 자',
    traits: ['전달력', '인내', '성장 지원'],
    vectors: { risk: 30, social: 85, execution: 75, creativity: 65, stability: 75, leadership: 70 }
  },
  {
    id: 'L24', category: 'L', index: 24,
    name: '프리랜서', nameEn: 'Freelancer',
    desc: '독립적으로 프로젝트 수행',
    traits: ['자기관리', '다재다능', '유연성'],
    vectors: { risk: 65, social: 60, execution: 80, creativity: 70, stability: 35, leadership: 45 }
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 전체 72타입
// ═══════════════════════════════════════════════════════════════════════════

export const ALL_72_TYPES: NodeType[] = [
  ...INVESTOR_TYPES,
  ...BUSINESS_TYPES,
  ...LABOR_TYPES,
];

// ID로 타입 찾기
export const getTypeById = (id: string): NodeType | undefined => 
  ALL_72_TYPES.find(t => t.id === id);

// 카테고리별 타입 가져오기
export const getTypesByCategory = (category: 'T' | 'B' | 'L'): NodeType[] =>
  ALL_72_TYPES.filter(t => t.category === category);
