/**
 * AUTUS Mobile - Initial Data
 */

import { Connector, Device, WebService, TeamMember, Settings, Mission } from '../types';

export const INITIAL_CONNECTORS: Connector[] = [
  { id: 'bank', name: '오픈뱅킹', icon: '🏦', desc: '현금, 수입, 지출', on: true },
  { id: 'health', name: 'Apple Health', icon: '❤️', desc: '수면, HRV, 활동량', on: true },
  { id: 'calendar', name: 'Google Calendar', icon: '📅', desc: '마감, 일정', on: true },
  { id: 'notion', name: 'Notion', icon: '📋', desc: '태스크, 처리속도', on: false },
  { id: 'slack', name: 'Slack', icon: '💬', desc: '팀 커뮤니케이션', on: false },
];

export const INITIAL_DEVICES: Device[] = [
  { id: 'camera', name: '카메라', icon: '📷', desc: '얼굴 인식, 피로도 감지', on: false },
  { id: 'mic', name: '마이크', icon: '🎤', desc: '음성 명령, 스트레스 분석', on: false },
  { id: 'location', name: '위치', icon: '📍', desc: '이동 패턴, 출퇴근 감지', on: false },
];

export const INITIAL_WEB_SERVICES: WebService[] = [
  { id: 'google', name: 'Google 전체', icon: '🔵', desc: 'Gmail, Drive, Calendar, Sheets', on: false },
  { id: 'microsoft', name: 'Microsoft 전체', icon: '🟦', desc: 'Outlook, OneDrive, Teams', on: false },
  { id: 'notion_web', name: 'Notion', icon: '⬛', desc: '페이지, 데이터베이스, 워크스페이스', on: false },
  { id: 'slack_web', name: 'Slack', icon: '💜', desc: '메시지, 채널, 파일', on: false },
  { id: 'github', name: 'GitHub', icon: '🐙', desc: '레포, 이슈, PR', on: false },
  { id: 'figma', name: 'Figma', icon: '🎨', desc: '디자인, 프로토타입', on: false },
  { id: 'linear', name: 'Linear', icon: '🔷', desc: '이슈, 프로젝트, 사이클', on: false },
  { id: 'bank_web', name: '은행/카드', icon: '💳', desc: '거래내역, 잔액, 청구서', on: false },
];

export const INITIAL_TEAM: TeamMember[] = [
  { id: 1, name: '김철수', role: '개발팀' },
  { id: 2, name: '이영희', role: '마케팅팀' },
];

export const INITIAL_SETTINGS: Settings = {
  goal: '12개월 내 PMF 달성',
  goalMonths: 12,
  identity: {
    type: '창업자',
    stage: '초기',
    industry: '테크',
  },
  values: ['생존', '성장', '건강', '가족', '자유'],
  boundaries: {
    never: ['파산', '건강 붕괴'],
    limits: ['부채 5천만 이하', '수면 5시간 이상', '런웨이 4주 이상'],
  },
  dailyLimit: 3,
  autoLevel: 0,
};

export const INITIAL_MISSIONS: Mission[] = [
  {
    id: 1,
    title: '런웨이 개선',
    type: '자동화',
    icon: '🤖',
    status: 'active',
    progress: 67,
    eta: '1일 후',
    nodeId: 'n05',
    steps: [
      { t: '구독 서비스 분석 완료', s: 'done' },
      { t: '불필요 항목 3개 식별', s: 'done' },
      { t: '취소 요청 처리 중...', s: 'active' },
      { t: '결과 리포트 생성', s: '' },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: '태스크 정리',
    type: '지시',
    icon: '📋',
    status: 'active',
    progress: 33,
    eta: '2일 후',
    nodeId: 'n18',
    steps: [
      { t: '슬랙 메시지 발송됨', s: 'done' },
      { t: '김철수 검토 중...', s: 'active' },
      { t: '결과 보고 대기', s: '' },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    title: '세무 컨설팅',
    type: '외주',
    icon: '👥',
    status: 'active',
    progress: 15,
    eta: '내일 시작',
    nodeId: 'n06',
    steps: [
      { t: '세무사 매칭 완료', s: 'done' },
      { t: '계약서 생성 중...', s: 'active' },
      { t: '데이터 전달', s: '' },
      { t: '분석 진행', s: '' },
    ],
    createdAt: new Date().toISOString(),
  },
];
