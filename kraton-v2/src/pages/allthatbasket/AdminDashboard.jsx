/**
 * 🏀 올댓바스켓 관리자 대시보드
 *
 * 관리자 핵심 업무: 상담 → 스케줄 → 수납
 *
 * 스케줄 구조:
 * - 오픈팀: 학년별 × 수준별 정기 수업
 * - 모집팀: 대회 준비, 엘리트 과정
 * - 개인수업: 1:1 집중 훈련
 *
 * 성장 스토리라인:
 * 입문 → 기초 → 향상 → 팀활동 → 도전
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import outstandingAPI, { RISK_LEVELS, runAutoReminders } from '../../services/outstandingManager.js';
import { googleCalendarService } from '../../services/googleCalendar.js';

// ============================================
// 메인 대시보드
// ============================================
export default function AdminDashboard() {
  const [currentTab, setCurrentTab] = useState('consult');
  const [loading, setLoading] = useState(true);
  const [outstanding, setOutstanding] = useState({ data: [], summary: {} });
  const [calendarStatus, setCalendarStatus] = useState({ connected: false, loading: true });
  const [consultations, setConsultations] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [outstandingResult, calendarResult] = await Promise.all([
        outstandingAPI.getAll(),
        googleCalendarService.checkConnection(),
      ]);

      setOutstanding(outstandingResult);
      setCalendarStatus({
        connected: calendarResult.connected,
        calendarId: calendarResult.calendarId,
        loading: false
      });
      setConsultations(DEMO_CONSULTATIONS);
    } catch (e) {
      console.error('Load error:', e);
      setCalendarStatus({ connected: false, loading: false });
    }
    setLoading(false);
  };

  const tabs = [
    { id: 'consult', label: '상담', icon: '💬', badge: consultations.filter(c => c.status === 'pending').length },
    { id: 'schedule', label: '스케줄', icon: '📅' },
    { id: 'payment', label: '수납', icon: '💰', badge: outstanding.summary?.count },
  ];

  const today = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-xl">🏀</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">올댓바스켓</h1>
              <p className="text-xs text-orange-100">관리자 · {today}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              calendarStatus.connected ? 'bg-green-600' : 'bg-orange-400'
            }`}>
              <span>📅</span>
              <span className={`w-2 h-2 rounded-full ${calendarStatus.connected ? 'bg-green-300 animate-pulse' : 'bg-orange-200'}`} />
            </div>
            <button onClick={loadData} className="p-2 bg-white/20 rounded-lg">🔄</button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b sticky top-[72px] z-40">
        <div className="max-w-4xl mx-auto flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex-1 py-4 text-center font-medium transition-colors relative ${
                currentTab === tab.id ? 'text-orange-600' : 'text-gray-500'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {tab.badge > 0 && (
                <span className="absolute top-2 right-4 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
              {currentTab === tab.id && (
                <motion.div layoutId="admin-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-4 pb-24">
        <AnimatePresence mode="wait">
          {currentTab === 'consult' && (
            <ConsultTab key="consult" consultations={consultations} setConsultations={setConsultations} />
          )}
          {currentTab === 'schedule' && (
            <ScheduleTab key="schedule" calendarStatus={calendarStatus} />
          )}
          {currentTab === 'payment' && (
            <PaymentTab key="payment" outstanding={outstanding} onRefresh={loadData} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ============================================
// 데모 데이터
// ============================================
const DEMO_CONSULTATIONS = [
  { id: 1, name: '김민준', phone: '010-1234-5678', age: 8, birthYear: 2016, status: 'pending', note: '초등 2학년, 농구 처음', gender: 'M' },
  { id: 2, name: '이서연', phone: '010-2345-6789', age: 10, birthYear: 2014, status: 'pending', note: '초등 4학년, 경험 있음', gender: 'F' },
  { id: 3, name: '박지호', phone: '010-3456-7890', age: 7, birthYear: 2017, status: 'scheduled', note: '유아부, 운동신경 좋음', gender: 'M' },
  { id: 4, name: '최서준', phone: '010-4567-8901', age: 12, birthYear: 2012, status: 'completed', note: '중등부, 학교 농구부', gender: 'M' },
];

// 스케줄 구조 - 오픈팀 / 모집팀 / 개인수업
const SCHEDULE_DATA = {
  openTeams: [
    // 유아부 (2018-2019년생)
    { id: 'open_1', type: 'open', name: '유아 기초반', grade: '유아', level: '기초', gender: 'mixed', time: '15:00', days: '월수금', coach: '김코치', students: 8, capacity: 10, birthYears: [2018, 2019] },
    { id: 'open_2', type: 'open', name: '유아 심화반', grade: '유아', level: '심화', gender: 'mixed', time: '15:00', days: '화목', coach: '박코치', students: 6, capacity: 8, birthYears: [2018, 2019] },

    // 초등 저학년 (2015-2017년생)
    { id: 'open_3', type: 'open', name: '초저 기초반', grade: '초저', level: '기초', gender: 'mixed', time: '16:00', days: '월수금', coach: '김코치', students: 10, capacity: 12, birthYears: [2015, 2016, 2017] },
    { id: 'open_4', type: 'open', name: '초저 심화반', grade: '초저', level: '심화', gender: 'mixed', time: '16:00', days: '화목', coach: '박코치', students: 8, capacity: 10, birthYears: [2015, 2016, 2017] },
    { id: 'open_5', type: 'open', name: '초저 남아반', grade: '초저', level: '심화', gender: 'M', time: '16:00', days: '토', coach: '이코치', students: 10, capacity: 12, birthYears: [2015, 2016, 2017] },

    // 초등 고학년 (2012-2014년생)
    { id: 'open_6', type: 'open', name: '초고 기초반', grade: '초고', level: '기초', gender: 'mixed', time: '17:00', days: '월수금', coach: '이코치', students: 8, capacity: 12, birthYears: [2012, 2013, 2014] },
    { id: 'open_7', type: 'open', name: '초고 심화반', grade: '초고', level: '심화', gender: 'mixed', time: '17:00', days: '화목', coach: '이코치', students: 10, capacity: 12, birthYears: [2012, 2013, 2014] },
    { id: 'open_8', type: 'open', name: '초고 여아반', grade: '초고', level: '심화', gender: 'F', time: '17:00', days: '토', coach: '박코치', students: 6, capacity: 8, birthYears: [2012, 2013, 2014] },

    // 중등부 (2009-2011년생)
    { id: 'open_9', type: 'open', name: '중등 기초반', grade: '중등', level: '기초', gender: 'mixed', time: '18:00', days: '월수금', coach: '이코치', students: 6, capacity: 10, birthYears: [2009, 2010, 2011] },
    { id: 'open_10', type: 'open', name: '중등 심화반', grade: '중등', level: '심화', gender: 'mixed', time: '18:00', days: '화목토', coach: '이코치', students: 8, capacity: 10, birthYears: [2009, 2010, 2011] },
  ],
  recruitTeams: [
    { id: 'recruit_1', type: 'recruit', name: '주니어 엘리트', purpose: '대회 준비', grade: '초고', time: '토일 10:00', coach: '이코치', students: 8, capacity: 10, status: 'active', deadline: '2024-02-15' },
    { id: 'recruit_2', type: 'recruit', name: '유스 선발팀', purpose: '리그 참가', grade: '중등', time: '토일 14:00', coach: '이코치', students: 10, capacity: 12, status: 'active', deadline: '2024-02-20' },
    { id: 'recruit_3', type: 'recruit', name: '걸스 클럽', purpose: '여아 전용', grade: '초등', time: '토 13:00', coach: '박코치', students: 6, capacity: 10, status: 'recruiting', deadline: '2024-02-28' },
  ],
  privateLessons: [
    { id: 'private_1', type: 'private', name: '1:1 개인 레슨', duration: '50분', price: 80000, availableSlots: 15, bookedSlots: 10 },
    { id: 'private_2', type: 'private', name: '2:1 소그룹', duration: '60분', price: 50000, availableSlots: 10, bookedSlots: 6 },
    { id: 'private_3', type: 'private', name: '슈팅 특화', duration: '40분', price: 60000, availableSlots: 8, bookedSlots: 5 },
  ],
};

// 성장 로드맵
const GROWTH_ROADMAP = [
  { stage: 1, name: '입문', icon: '🌱', desc: '농구 첫걸음', duration: '1-2개월', goals: ['공 다루기', '기본 자세', '즐거움 발견'], class: '기초반' },
  { stage: 2, name: '기초', icon: '🌿', desc: '기본기 완성', duration: '3-6개월', goals: ['드리블 숙달', '패스 연습', '기초 체력'], class: '기초반 → 심화반' },
  { stage: 3, name: '향상', icon: '🌳', desc: '기술 향상', duration: '6-12개월', goals: ['슈팅 훈련', '1:1 기술', '전술 이해'], class: '심화반' },
  { stage: 4, name: '팀활동', icon: '🏀', desc: '팀 플레이', duration: '1년+', goals: ['팀워크', '포지션 역할', '경기 경험'], class: '심화반 + 모집팀' },
  { stage: 5, name: '도전', icon: '🏆', desc: '대회 도전', duration: '지속', goals: ['대회 참가', '기록 갱신', '리더십'], class: '엘리트 과정' },
];

// ============================================
// 상담 탭
// ============================================
function ConsultTab({ consultations, setConsultations }) {
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedConsult, setSelectedConsult] = useState(null);
  const [newConsult, setNewConsult] = useState({ name: '', phone: '', age: '', birthYear: '', note: '', gender: 'M' });

  const filteredConsults = filter === 'all' ? consultations : consultations.filter(c => c.status === filter);

  const handleStatusChange = (id, newStatus) => {
    setConsultations(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const recommendClass = (consult) => {
    const { birthYear, gender } = consult;
    const year = parseInt(birthYear);

    let gradeClasses = SCHEDULE_DATA.openTeams.filter(t => t.birthYears?.includes(year));

    // 성별 맞는 반 우선
    const genderMatch = gradeClasses.filter(t => t.gender === gender || t.gender === 'mixed');
    if (genderMatch.length > 0) gradeClasses = genderMatch;

    // 여유 있는 반 우선
    return gradeClasses.filter(t => t.students < t.capacity).slice(0, 2);
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return { label: '대기', color: 'bg-yellow-100 text-yellow-700' };
      case 'scheduled': return { label: '예약', color: 'bg-blue-100 text-blue-700' };
      case 'completed': return { label: '완료', color: 'bg-green-100 text-green-700' };
      case 'enrolled': return { label: '등록', color: 'bg-orange-100 text-orange-700' };
      default: return { label: status, color: 'bg-gray-100 text-gray-700' };
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
      {/* 성장 로드맵 미리보기 */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-4 text-white">
        <h3 className="font-bold mb-3">🌱 성장 로드맵 (학부모님께 안내)</h3>
        <div className="flex items-center justify-between text-xs">
          {GROWTH_ROADMAP.map((stage, idx) => (
            <div key={stage.stage} className="flex items-center">
              <div className="text-center">
                <div className="text-2xl mb-1">{stage.icon}</div>
                <div className="font-medium">{stage.name}</div>
                <div className="text-green-100 text-[10px]">{stage.duration}</div>
              </div>
              {idx < GROWTH_ROADMAP.length - 1 && <span className="mx-2 text-green-200">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">💬 상담 관리</h3>
            <p className="text-sm text-blue-100 mt-1">상담 → 수준 테스트 → 반 추천 → 등록</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{consultations.filter(c => c.status === 'pending').length}</p>
            <p className="text-sm text-blue-100">대기 중</p>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[{ id: 'all', label: '전체' }, { id: 'pending', label: '대기' }, { id: 'scheduled', label: '예약' }, { id: 'completed', label: '완료' }].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${filter === f.id ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-orange-500 text-white rounded-xl font-medium text-sm">
          + 새 상담
        </button>
      </div>

      {/* 상담 목록 */}
      <div className="space-y-3">
        {filteredConsults.map(consult => {
          const statusInfo = getStatusLabel(consult.status);
          const recommended = recommendClass(consult);

          return (
            <div key={consult.id} className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${consult.gender === 'F' ? 'bg-pink-100' : 'bg-blue-100'}`}>
                    <span className="text-xl">{consult.gender === 'F' ? '👧' : '👦'}</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{consult.name}</p>
                    <p className="text-sm text-gray-500">{consult.birthYear}년생 ({consult.age}세) · {consult.phone}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
              </div>

              {consult.note && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2 mb-3">📝 {consult.note}</p>
              )}

              {/* 추천 반 */}
              {consult.status !== 'enrolled' && recommended.length > 0 && (
                <div className="mb-3 p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs font-medium text-orange-700 mb-2">🏀 추천 반</p>
                  <div className="flex gap-2 flex-wrap">
                    {recommended.map(cls => (
                      <span key={cls.id} className="px-2 py-1 bg-white text-orange-700 rounded text-xs border border-orange-200">
                        {cls.name} ({cls.days} {cls.time}) - {cls.students}/{cls.capacity}명
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 액션 */}
              <div className="flex gap-2">
                {consult.status === 'pending' && (
                  <>
                    <button onClick={() => handleStatusChange(consult.id, 'scheduled')} className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium">
                      📅 상담 예약
                    </button>
                    <button onClick={() => handleStatusChange(consult.id, 'completed')} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium">
                      ✓ 상담 완료
                    </button>
                  </>
                )}
                {consult.status === 'scheduled' && (
                  <button onClick={() => handleStatusChange(consult.id, 'completed')} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium">
                    ✓ 상담 완료
                  </button>
                )}
                {consult.status === 'completed' && (
                  <button onClick={() => handleStatusChange(consult.id, 'enrolled')} className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium">
                    🏀 등록 → 스케줄 배정
                  </button>
                )}
                {consult.status === 'enrolled' && (
                  <div className="flex-1 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium text-center">
                    ✓ 등록 완료
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ============================================
// 스케줄 탭 (핵심 개선)
// ============================================
function ScheduleTab({ calendarStatus }) {
  const [viewType, setViewType] = useState('open'); // open, recruit, private
  const [gradeFilter, setGradeFilter] = useState('all');

  const grades = ['all', '유아', '초저', '초고', '중등'];

  const filteredOpenTeams = gradeFilter === 'all'
    ? SCHEDULE_DATA.openTeams
    : SCHEDULE_DATA.openTeams.filter(t => t.grade === gradeFilter);

  // 통계
  const stats = {
    totalStudents: SCHEDULE_DATA.openTeams.reduce((sum, t) => sum + t.students, 0),
    totalCapacity: SCHEDULE_DATA.openTeams.reduce((sum, t) => sum + t.capacity, 0),
    recruitActive: SCHEDULE_DATA.recruitTeams.filter(t => t.status === 'active').length,
    privateFilled: SCHEDULE_DATA.privateLessons.reduce((sum, t) => sum + t.bookedSlots, 0),
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
      {/* 전체 현황 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 text-white text-center">
          <p className="text-2xl font-bold">{stats.totalStudents}</p>
          <p className="text-xs text-blue-100">오픈팀 수강생</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 text-white text-center">
          <p className="text-2xl font-bold">{SCHEDULE_DATA.recruitTeams.length}</p>
          <p className="text-xs text-purple-100">모집팀 운영</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 text-white text-center">
          <p className="text-2xl font-bold">{stats.privateFilled}</p>
          <p className="text-xs text-green-100">개인레슨 예약</p>
        </div>
      </div>

      {/* 캘린더 상태 */}
      <div className={`rounded-xl p-3 flex items-center justify-between ${calendarStatus.connected ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span className="text-sm font-medium text-gray-700">
            {calendarStatus.connected ? `Google Calendar 연결됨` : '캘린더 데모 모드'}
          </span>
        </div>
        <div className={`w-2 h-2 rounded-full ${calendarStatus.connected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
      </div>

      {/* 뷰 타입 선택 */}
      <div className="flex gap-2">
        {[
          { id: 'open', label: '🏀 오픈팀', count: SCHEDULE_DATA.openTeams.length },
          { id: 'recruit', label: '🏆 모집팀', count: SCHEDULE_DATA.recruitTeams.length },
          { id: 'private', label: '👤 개인수업', count: SCHEDULE_DATA.privateLessons.length },
        ].map(v => (
          <button key={v.id} onClick={() => setViewType(v.id)}
            className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors ${viewType === v.id ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border'}`}>
            {v.label} ({v.count})
          </button>
        ))}
      </div>

      {/* 오픈팀 뷰 */}
      {viewType === 'open' && (
        <>
          {/* 학년 필터 */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {grades.map(g => (
              <button key={g} onClick={() => setGradeFilter(g)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${gradeFilter === g ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border'}`}>
                {g === 'all' ? '전체' : g}
              </button>
            ))}
          </div>

          {/* 오픈팀 목록 */}
          <div className="space-y-3">
            {filteredOpenTeams.map(team => {
              const fillRate = (team.students / team.capacity) * 100;
              const isFull = team.students >= team.capacity;

              return (
                <div key={team.id} className="bg-white rounded-xl p-4 shadow-sm border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        team.level === '심화' ? 'bg-purple-100' : 'bg-blue-100'
                      }`}>
                        <span className="text-lg">{team.gender === 'F' ? '👧' : team.gender === 'M' ? '👦' : '🏀'}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900">{team.name}</p>
                          <span className={`px-2 py-0.5 rounded text-xs ${team.level === '심화' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {team.level}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{team.coach} · {team.days} {team.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${isFull ? 'text-red-600' : 'text-gray-900'}`}>
                        {team.students}/{team.capacity}명
                      </p>
                      <p className="text-xs text-gray-400">
                        {team.birthYears?.[0]}~{team.birthYears?.[team.birthYears.length - 1]}년생
                      </p>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isFull ? 'bg-red-500' : fillRate > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${fillRate}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 모집팀 뷰 */}
      {viewType === 'recruit' && (
        <div className="space-y-3">
          {SCHEDULE_DATA.recruitTeams.map(team => (
            <div key={team.id} className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🏆</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{team.name}</p>
                    <p className="text-sm text-gray-500">{team.purpose} · {team.grade}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  team.status === 'recruiting' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {team.status === 'recruiting' ? '모집 중' : '운영 중'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{team.time} · {team.coach}</span>
                <span className="font-medium">{team.students}/{team.capacity}명</span>
              </div>
              {team.status === 'recruiting' && (
                <div className="mt-2 text-xs text-orange-600">
                  📅 모집 마감: {team.deadline}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 개인수업 뷰 */}
      {viewType === 'private' && (
        <div className="space-y-3">
          {SCHEDULE_DATA.privateLessons.map(lesson => (
            <div key={lesson.id} className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">👤</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{lesson.name}</p>
                    <p className="text-sm text-gray-500">{lesson.duration}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">₩{lesson.price.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">{lesson.bookedSlots}/{lesson.availableSlots} 예약</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 주간 시간표 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <h4 className="font-semibold text-gray-900 mb-3">📆 주간 시간표</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-2 px-1 text-left">시간</th>
                {['월', '화', '수', '목', '금', '토'].map(d => (
                  <th key={d} className="py-2 px-1 text-center">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['15:00', '16:00', '17:00', '18:00'].map(time => (
                <tr key={time} className="border-t">
                  <td className="py-2 px-1 font-medium text-gray-500">{time}</td>
                  {['월', '화', '수', '목', '금', '토'].map(day => {
                    const dayMap = { '월': '월', '화': '화', '수': '수', '목': '목', '금': '금', '토': '토' };
                    const classes = SCHEDULE_DATA.openTeams.filter(t =>
                      t.time.startsWith(time.split(':')[0]) && t.days.includes(dayMap[day])
                    );
                    return (
                      <td key={day} className="py-2 px-1 text-center">
                        {classes.map(c => (
                          <div key={c.id} className={`text-[10px] rounded px-1 py-0.5 mb-0.5 ${
                            c.grade === '유아' ? 'bg-blue-100 text-blue-700' :
                            c.grade === '초저' ? 'bg-green-100 text-green-700' :
                            c.grade === '초고' ? 'bg-orange-100 text-orange-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {c.name.replace(' 기초반', '').replace(' 심화반', '')}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// 수납 탭
// ============================================
function PaymentTab({ outstanding, onRefresh }) {
  const [filter, setFilter] = useState('ALL');
  const [sending, setSending] = useState(false);
  const [reminderResult, setReminderResult] = useState(null);

  const filteredData = filter === 'ALL' ? outstanding.data : outstanding.data.filter(r => r.risk_level === filter);

  const handleSendReminders = async () => {
    setSending(true);
    try {
      const result = await runAutoReminders();
      setReminderResult(result);
      setTimeout(() => setReminderResult(null), 5000);
    } catch (e) {
      console.error('Reminder error:', e);
    }
    setSending(false);
  };

  const handleMarkPaid = async (id) => {
    await outstandingAPI.markPaid(id);
    onRefresh();
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">💰 수납 관리</h3>
            <p className="text-sm text-green-100 mt-1">결제 · 미수금 · 알림</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">₩{(outstanding.summary?.totalAmount || 0).toLocaleString()}</p>
            <p className="text-sm text-green-100">{outstanding.summary?.count || 0}건 미수금</p>
          </div>
        </div>
      </div>

      {/* 알림 발송 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900">자동 알림 발송</p>
          <button onClick={handleSendReminders} disabled={sending}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm disabled:opacity-50">
            {sending ? '발송 중...' : '📢 미수금 알림'}
          </button>
        </div>
        {reminderResult && (
          <div className="mt-3 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            ✅ 알림 발송 완료: {reminderResult.sent}건
          </div>
        )}
      </div>

      {/* 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${filter === 'ALL' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border'}`}>
          전체
        </button>
        {Object.entries(RISK_LEVELS).map(([key, { label, color }]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${filter === key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border'}`}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />{label}
          </button>
        ))}
      </div>

      {/* 미수금 목록 */}
      <div className="space-y-3">
        {filteredData.map((record, idx) => (
          <div key={idx} className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: RISK_LEVELS[record.risk_level]?.color }}>
                  {RISK_LEVELS[record.risk_level]?.label}
                </span>
                <p className="font-bold text-gray-900">{record.student_name}</p>
              </div>
              <p className="font-bold text-lg">₩{record.amount?.toLocaleString()}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{record.days_overdue}일 경과</p>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-lg text-xs font-medium">📢 알림</button>
                <button onClick={() => handleMarkPaid(record.id)} className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium">✓ 수납완료</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm border">
          <span className="text-5xl block mb-4">🎉</span>
          <p className="text-gray-500 font-medium">미수금이 없습니다!</p>
        </div>
      )}
    </motion.div>
  );
}
