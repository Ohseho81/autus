/**
 * 🏀 올댓바스켓 v2 - AUTUS Brand OS
 *
 * 규칙 준수:
 * - 버튼 ≤ 3
 * - 입력 필드 = 0
 * - 설정 = 0
 * - 설명 = 0
 * - AUTUS 노출 = 금지
 *
 * 최적화:
 * - 애니메이션 최소화 (멈춤 방지)
 * - Lazy loading
 * - 메모이제이션
 */

import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { Home, Users, QrCode, AlertTriangle, Menu, X, Bell } from 'lucide-react';
import useAllThatBasket from './lib/useAllThatBasket';
import { statsAPI } from './lib/supabase';

// Lazy load views (속도 최적화)
const StudentsView = lazy(() => import('./views/StudentsView'));
const QRAttendanceView = lazy(() => import('./views/QRAttendanceView'));
const CoachVideoFlow = lazy(() => import('./components/CoachVideoFlow'));

// ============================================
// 상태 배지 (정상/경고/위험)
// ============================================
const StatusBadge = ({ level }) => {
  const config = {
    normal: { bg: '#10B981', text: '정상' },
    warning: { bg: '#F59E0B', text: '경고' },
    critical: { bg: '#EF4444', text: '위험' }
  }[level] || { bg: '#10B981', text: '정상' };

  return (
    <span
      className="px-3 py-1 rounded-full text-white text-sm font-bold"
      style={{ backgroundColor: config.bg }}
    >
      {config.text}
    </span>
  );
};

// ============================================
// 선수 카드 (간소화)
// ============================================
const StudentCard = React.memo(({ student, onClick }) => {
  const attendance = student.attendance_rate || 0;
  const risk = student.riskResult?.risk_level || 'LOW';

  const riskColor = {
    CRITICAL: '#EF4444',
    HIGH: '#F97316',
    MEDIUM: '#FBBF24',
    LOW: '#10B981'
  }[risk];

  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-xl text-left transition-colors"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${riskColor}33`
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
            style={{ backgroundColor: riskColor }}
          >
            {attendance}
          </div>
          <div>
            <p className="font-semibold text-white">{student.name}</p>
            <p className="text-sm text-gray-400">{student.class_name || student.class}</p>
          </div>
        </div>
        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: `${riskColor}33`, color: riskColor }}>
          {risk}
        </span>
      </div>
    </button>
  );
});

// ============================================
// 통계 카드 (간소화)
// ============================================
const StatCard = React.memo(({ label, value, color = '#FF6B35' }) => (
  <div
    className="p-4 rounded-xl text-center"
    style={{ background: `${color}15`, border: `1px solid ${color}33` }}
  >
    <p className="text-2xl font-bold text-white">{value}</p>
    <p className="text-xs text-gray-400 mt-1">{label}</p>
  </div>
));

// ============================================
// 홈 뷰 (간소화) - Supabase KPI 연동
// ============================================
const HomeView = React.memo(({ data, onNavigate }) => {
  const { students, getAtRiskStudents } = data;
  const [dashboardStats, setDashboardStats] = useState(null);
  const atRisk = useMemo(() => getAtRiskStudents(), [getAtRiskStudents]);

  useEffect(() => {
    statsAPI.getDashboard().then(({ data: stats }) => {
      if (stats) setDashboardStats(stats);
    });
  }, []);

  const status = useMemo(() => {
    if (atRisk.length >= 3) return 'critical';
    if (atRisk.length >= 1) return 'warning';
    return 'normal';
  }, [atRisk]);

  return (
    <div className="space-y-6">
      {/* 상태 + 통계 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">대시보드</h2>
        <StatusBadge level={status} />
      </div>

      {/* Supabase KPI 카드 */}
      {dashboardStats && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="이번달 매출" value={`${((dashboardStats.monthlyCollected || 0) / 10000).toFixed(0)}만원`} color="#10B981" />
          <StatCard label="미수금" value={`${((dashboardStats.totalOutstanding || 0) / 10000).toFixed(0)}만원`} color="#EF4444" />
          <StatCard label="신규 학생" value={`${dashboardStats.newStudentsThisMonth ?? 0}명`} color="#3B82F6" />
          <StatCard label="오늘 출석율" value={`${dashboardStats.todayAttendanceRate ?? 0}%`} color="#8B5CF6" />
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="재원생" value={students.length} />
        <StatCard label="위험" value={atRisk.length} color="#EF4444" />
        <StatCard label="이탈 위험" value={dashboardStats?.atRiskCount ?? atRisk.length} color="#F59E0B" />
      </div>

      {/* 위험 선수 */}
      {atRisk.length > 0 && (
        <div>
          <h3 className="text-sm text-red-400 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} />
            주의 필요 ({atRisk.length}명)
          </h3>
          <div className="space-y-2">
            {atRisk.slice(0, 3).map(s => (
              <StudentCard key={s.id} student={s} />
            ))}
          </div>
        </div>
      )}

      {/* 빠른 액션 - 버튼 3개 */}
      <div className="grid grid-cols-3 gap-3 pt-4">
        <button
          onClick={() => onNavigate('qr-check')}
          className="p-4 rounded-xl bg-orange-500 text-white font-bold"
        >
          QR 출석
        </button>
        <button
          onClick={() => onNavigate('students')}
          className="p-4 rounded-xl bg-blue-500 text-white font-bold"
        >
          선수 목록
        </button>
        <button
          onClick={() => onNavigate('coach')}
          className="p-4 rounded-xl bg-green-500 text-white font-bold"
        >
          수업 시작
        </button>
      </div>
    </div>
  );
});

// ============================================
// 로딩 스피너
// ============================================
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// ============================================
// 메인 앱
// ============================================
export default function AllThatBasketAppV2() {
  const [view, setView] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);

  const basketData = useAllThatBasket();
  const { loading } = basketData;

  const handleNavigate = useCallback((v) => {
    setView(v);
    setMenuOpen(false);
  }, []);

  const renderView = () => {
    if (loading) return <LoadingSpinner />;

    switch (view) {
      case 'home':
        return <HomeView data={basketData} onNavigate={handleNavigate} />;
      case 'students':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <StudentsView data={basketData} />
          </Suspense>
        );
      case 'qr-check':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <QRAttendanceView data={basketData} />
          </Suspense>
        );
      case 'coach':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <CoachVideoFlow data={basketData} onBack={() => setView('home')} />
          </Suspense>
        );
      default:
        return <HomeView data={basketData} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0F0F1A' }}>
      {/* Header (간소화) */}
      <header className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between bg-[#0F0F1A]/95 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10"
          >
            <Menu size={20} className="text-white" />
          </button>
          <h1 className="text-lg font-bold text-orange-400">🏀 올댓바스켓</h1>
        </div>
        <button className="p-2 rounded-lg hover:bg-white/10 relative">
          <Bell size={20} className="text-white" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </header>

      {/* Sidebar (간소화) */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-64 z-50 p-4 bg-[#1A1A2E]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">메뉴</h2>
              <button onClick={() => setMenuOpen(false)}>
                <X size={20} className="text-white" />
              </button>
            </div>
            <nav className="space-y-1">
              {[
                { id: 'home', icon: Home, label: '홈' },
                { id: 'qr-check', icon: QrCode, label: 'QR 출석' },
                { id: 'students', icon: Users, label: '선수' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg ${
                    view === item.id ? 'bg-orange-500/20 text-orange-300' : 'text-gray-400'
                  }`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="p-4 pb-24">
        {renderView()}
      </main>

      {/* Bottom Nav (3개만) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 px-4 py-3 bg-[#0F0F1A]/95 backdrop-blur border-t border-white/10">
        <div className="flex justify-around">
          {[
            { id: 'home', icon: Home, label: '홈' },
            { id: 'qr-check', icon: QrCode, label: 'QR' },
            { id: 'students', icon: Users, label: '선수' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex flex-col items-center gap-1 p-2 ${
                view === item.id ? 'text-orange-400' : 'text-gray-500'
              }`}
            >
              <item.icon size={22} />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

/**
 * v2 최적화 내역:
 *
 * 1. 속도
 *    - framer-motion 제거 (멈춤 방지)
 *    - React.memo 적용
 *    - Lazy loading (코드 스플리팅)
 *    - useMemo/useCallback 적용
 *
 * 2. 디자인
 *    - 불필요한 요소 제거
 *    - 더 깔끔한 카드 디자인
 *    - 일관된 색상 팔레트
 *
 * 3. AUTUS 규칙 준수
 *    - 버튼 3개 (QR 출석, 선수 목록, 수업 시작)
 *    - 입력 필드 0
 *    - 설정 0
 *    - AUTUS 노출 제거
 *
 * 4. 버그 수정
 *    - motion 애니메이션 제거로 멈춤 현상 해결
 *    - 메모리 누수 방지
 */
