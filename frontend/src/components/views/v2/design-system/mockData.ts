/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 KRATON Mock Data
 * Sample data for development and demo
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface Student {
  id: number;
  name: string;
  grade: string;
  subject: string;
  temperature: number;
  sigma: number;
  trend: number;
  status: 'safe' | 'caution' | 'danger';
  avatar: string;
}

export interface Alert {
  id: number;
  type: 'danger' | 'caution' | 'success' | 'info';
  title: string;
  time: string;
  student?: string;
  source?: string;
}

export interface TimelineItem {
  id: number;
  time: string;
  type: 'class' | 'call' | 'meeting' | 'report';
  title: string;
  status: 'completed' | 'current' | 'upcoming';
}

export interface Action {
  id: number;
  priority: 'high' | 'medium' | 'low';
  title: string;
  type: 'call' | 'message' | 'report';
  dueTime: string;
  target: string;
}

export interface ForecastDay {
  day: string;
  temp: number;
  sigma: number;
}

export interface Region {
  id: number;
  name: string;
  value: number;
  students: number;
}

export const MOCK_DATA = {
  organization: {
    name: 'KRATON 학원',
    totalStudents: 132,
    trend: '+5%',
    sigma: 0.85,
    temperature: 68.5,
    reportDue: 'D-3',
  },
  
  stats: {
    good: 121,
    caution: 8,
    danger: 3,
  },
  
  alerts: [
    { id: 1, type: 'danger', title: '김민수 38° 이탈 위험', time: '10분 전', student: '김민수' },
    { id: 2, type: 'caution', title: 'D학원 프로모션 감지', time: '1시간 전', source: '외부' },
    { id: 3, type: 'success', title: '이서연 성적 향상', time: '2시간 전', student: '이서연' },
  ] as Alert[],
  
  students: [
    { id: 1, name: '김민수', grade: '중3', subject: '수학', temperature: 82, sigma: 0.45, trend: -12, status: 'danger', avatar: '🧑' },
    { id: 2, name: '이서연', grade: '고1', subject: '영어', temperature: 45, sigma: 0.92, trend: +8, status: 'safe', avatar: '👩' },
    { id: 3, name: '박준혁', grade: '중2', subject: '국어', temperature: 71, sigma: 0.68, trend: -3, status: 'caution', avatar: '👦' },
    { id: 4, name: '최유진', grade: '고2', subject: '수학', temperature: 38, sigma: 0.95, trend: +5, status: 'safe', avatar: '👧' },
    { id: 5, name: '정현우', grade: '중3', subject: '영어', temperature: 78, sigma: 0.52, trend: -8, status: 'caution', avatar: '🧒' },
  ] as Student[],
  
  timeline: [
    { id: 1, time: '09:00', type: 'class', title: '중3 수학 A반', status: 'completed' },
    { id: 2, time: '10:30', type: 'call', title: '김민수 학부모 상담', status: 'completed' },
    { id: 3, time: '13:00', type: 'meeting', title: '강사 주간회의', status: 'current' },
    { id: 4, time: '15:00', type: 'class', title: '고1 영어 B반', status: 'upcoming' },
    { id: 5, time: '17:00', type: 'report', title: '주간 리포트 제출', status: 'upcoming' },
  ] as TimelineItem[],
  
  actions: [
    { id: 1, priority: 'high', title: '김민수 상담 전화', type: 'call', dueTime: '오늘 14:00', target: '김민수 어머니' },
    { id: 2, priority: 'medium', title: '이서연 칭찬 메시지', type: 'message', dueTime: '오늘 18:00', target: '이서연' },
    { id: 3, priority: 'low', title: '주간 리포트 작성', type: 'report', dueTime: '금요일', target: '원장님' },
  ] as Action[],
  
  forecast: [
    { day: '월', temp: 65, sigma: 0.82 },
    { day: '화', temp: 68, sigma: 0.80 },
    { day: '수', temp: 72, sigma: 0.78 },
    { day: '목', temp: 75, sigma: 0.75 },
    { day: '금', temp: 70, sigma: 0.79 },
    { day: '토', temp: 62, sigma: 0.85 },
    { day: '일', temp: 58, sigma: 0.88 },
  ] as ForecastDay[],
  
  ecgData: Array.from({ length: 100 }, (_, i) => {
    const base = Math.sin(i * 0.1) * 20;
    const spike = i % 25 === 12 ? 60 : i % 25 === 13 ? -30 : 0;
    return base + spike + 50;
  }),
  
  heatmapData: [
    { id: 1, name: '강남구', value: 85, students: 45 },
    { id: 2, name: '서초구', value: 72, students: 32 },
    { id: 3, name: '송파구', value: 68, students: 28 },
    { id: 4, name: '강동구', value: 45, students: 15 },
    { id: 5, name: '관악구', value: 38, students: 12 },
  ] as Region[],
};

export default MOCK_DATA;
