// ============================================
// TYPES
// ============================================
export interface Slot {
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

export interface Todo {
  id: string;
  text: string;
  source: string;
  impact: string;
  completed: boolean;
}

// ============================================
// COLORS
// ============================================
export const COLORS = {
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
export const INITIAL_SLOTS: Slot[] = [
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
