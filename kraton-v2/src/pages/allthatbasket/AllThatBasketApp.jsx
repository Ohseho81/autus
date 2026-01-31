/**
 * 🏀 올댓바스켓 (All That Basket) - AUTUS 엔진 통합 버전
 * V = (M - T) × (1 + s)^t | R(t) = Σ(wᵢ × ΔMᵢ) / s(t)^α
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Users, Calendar, Trophy, MessageCircle,
  Bell, ChevronRight, TrendingUp, TrendingDown,
  User, Menu, X, Zap, Youtube, CreditCard,
  Smartphone, QrCode, AlertTriangle, Shield
} from 'lucide-react';
import ParentAppDaechi from './components/ParentAppDaechi';
import CoachVideoFlow from './components/CoachVideoFlow';
import MoltBotChat from './components/MoltBotChat';
import useAllThatBasket from './lib/useAllThatBasket';

// Views
import StudentsView from './views/StudentsView';
import AttendanceView from './views/AttendanceView';
import PaymentsView from './views/PaymentsView';

// ============================================
// V-Index 게이지 (AUTUS 스타일)
// ============================================
const VIndexGauge = ({ value, size = 'md', showFormula = false }) => {
  const getColor = (v) => {
    if (v >= 85) return '#10B981'; // emerald
    if (v >= 70) return '#3B82F6'; // blue
    if (v >= 50) return '#FBBF24'; // yellow
    if (v >= 30) return '#F97316'; // orange
    return '#EF4444'; // red
  };

  const getState = (v) => {
    if (v >= 85) return { label: 'OPTIMAL', state: 1 };
    if (v >= 70) return { label: 'STABLE', state: 2 };
    if (v >= 50) return { label: 'WATCH', state: 3 };
    if (v >= 30) return { label: 'ALERT', state: 4 };
    return { label: 'RISK', state: 5 };
  };

  const sizes = {
    sm: { width: 60, stroke: 4, fontSize: 14 },
    md: { width: 100, stroke: 6, fontSize: 20 },
    lg: { width: 150, stroke: 8, fontSize: 28 },
  };

  const { width, stroke, fontSize } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedValue = Math.min(100, Math.max(0, value));
  const progress = (normalizedValue / 100) * circumference;
  const color = getColor(normalizedValue);
  const { label } = getState(normalizedValue);

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative" style={{ width, height: width }}>
        <svg width={width} height={width} className="transform -rotate-90">
          <circle cx={width / 2} cy={width / 2} r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="none" />
          <motion.circle
            cx={width / 2} cy={width / 2} r={radius}
            stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
            initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold" style={{ fontSize, color }}>{Math.round(value)}</span>
          {size !== 'sm' && <span className="text-xs text-gray-400">{label}</span>}
        </div>
      </div>
      {showFormula && (
        <p className="text-xs text-gray-500 mt-2">V = (M-T) × (1+s)^t</p>
      )}
    </div>
  );
};

// ============================================
// 위험도 배지
// ============================================
const RiskBadge = ({ level, score }) => {
  const config = {
    CRITICAL: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50', icon: AlertTriangle },
    HIGH: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50', icon: AlertTriangle },
    MEDIUM: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50', icon: Shield },
    LOW: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50', icon: Shield },
  }[level] || config.LOW;

  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.bg} ${config.text} border ${config.border}`}>
      <Icon size={12} />
      <span>{level}</span>
      {score && <span className="opacity-70">({score})</span>}
    </div>
  );
};

// ============================================
// 선수 카드 (V-Index + Risk 통합)
// ============================================
const StudentCard = ({ student, onClick }) => {
  const vIndex = student.vIndexResult?.v_index || 0;
  const normalizedVIndex = Math.min(100, Math.max(0, vIndex / 20)); // 0-2000 → 0-100
  const riskLevel = student.riskResult?.risk_level || 'LOW';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="p-4 rounded-xl cursor-pointer"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div className="flex items-center gap-4">
        <VIndexGauge value={normalizedVIndex} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{student.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">
              {student.position}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
            <span>{student.class}</span>
            <span>•</span>
            <span>출석 {student.attendance_rate}%</span>
          </div>
          <div className="mt-2">
            <RiskBadge level={riskLevel} score={student.riskResult?.risk_score} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">V-Index</p>
          <p className="text-lg font-bold text-cyan-400">{vIndex.toLocaleString()}</p>
        </div>
        <ChevronRight size={18} className="text-gray-500" />
      </div>
    </motion.div>
  );
};

// ============================================
// 통계 카드
// ============================================
const StatCard = ({ title, value, icon, trend, trendValue, subtitle }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="p-5 rounded-xl"
    style={{
      background: 'linear-gradient(135deg, rgba(255,107,53,0.1) 0%, rgba(247,147,30,0.05) 100%)',
      border: '1px solid rgba(255,107,53,0.2)',
    }}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-400 text-sm">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        {trendValue && (
          <div className="flex items-center gap-1 mt-2">
            {trend === 'up' ? (
              <TrendingUp size={14} className="text-green-400" />
            ) : (
              <TrendingDown size={14} className="text-red-400" />
            )}
            <span className={`text-xs ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
              {trendValue}
            </span>
          </div>
        )}
      </div>
      <div className="p-3 rounded-xl" style={{ background: 'rgba(255,107,53,0.2)' }}>
        {icon}
      </div>
    </div>
  </motion.div>
);

// ============================================
// 홈 뷰 (AUTUS 통합)
// ============================================
const HomeView = ({ onNavigate, data }) => {
  const { students, getAtRiskStudents, getAverageVIndex } = data;

  const avgVIndex = getAverageVIndex();
  const normalizedAvgVIndex = Math.min(100, Math.max(0, avgVIndex / 20));
  const atRiskStudents = getAtRiskStudents();
  const atRiskCount = atRiskStudents.length;

  return (
    <div className="space-y-6">
      {/* 역할별 앱 바로가기 */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate?.('parent-app')}
          className="p-5 rounded-2xl text-left"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Smartphone size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">학부모 앱</h3>
              <p className="text-xs text-white/70">대치동 스타일</p>
            </div>
          </div>
          <p className="text-sm text-white/80">일정 · 결제 · 영상 · MoltBot 상담</p>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate?.('coach-video')}
          className="p-5 rounded-2xl text-left"
          style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <QrCode size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">강사 세션</h3>
              <p className="text-xs text-white/70">QR + 영상</p>
            </div>
          </div>
          <p className="text-sm text-white/80">출석체크 · 영상촬영 · Ledger 기록</p>
        </motion.button>
      </div>

      {/* 통계 (AUTUS 공식 기반) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="전체 V-Index"
          value={avgVIndex.toLocaleString()}
          subtitle="V = (M-T) × (1+s)^t"
          icon={<Zap size={24} className="text-orange-400" />}
          trend="up"
          trendValue="+3.2%"
        />
        <StatCard
          title="총 재원생"
          value={students.length}
          icon={<Users size={24} className="text-orange-400" />}
        />
        <StatCard
          title="이탈 위험"
          value={atRiskCount}
          subtitle="R(t) 기반 예측"
          icon={<AlertTriangle size={24} className="text-orange-400" />}
        />
        <StatCard
          title="이번주 수업"
          value={12}
          icon={<Calendar size={24} className="text-orange-400" />}
        />
      </div>

      {/* V-Index 게이지 (AUTUS) */}
      <div
        className="p-6 rounded-2xl text-center"
        style={{
          background: 'linear-gradient(135deg, #1A1A2E 0%, #0F0F1A 100%)',
          border: '1px solid rgba(255,107,53,0.3)',
        }}
      >
        <h2 className="text-gray-400 mb-4">올댓바스켓 전체 V-Index</h2>
        <div className="flex justify-center">
          <VIndexGauge value={normalizedAvgVIndex} size="lg" showFormula />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">3개월 후 예측</p>
            <p className="text-cyan-400 font-bold">{Math.round(avgVIndex * 1.1).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">6개월 후 예측</p>
            <p className="text-cyan-400 font-bold">{Math.round(avgVIndex * 1.25).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">12개월 후 예측</p>
            <p className="text-cyan-400 font-bold">{Math.round(avgVIndex * 1.5).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* 이탈 위험 선수 (Risk Engine) */}
      {atRiskStudents.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-400" />
            이탈 위험 선수 (R(t) 분석)
          </h3>
          <div className="space-y-3">
            {atRiskStudents.map((student) => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
        </div>
      )}

      {/* 전체 선수 목록 */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Users size={18} className="text-cyan-400" />
          전체 선수 ({students.length}명)
        </h3>
        <div className="space-y-3">
          {students.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// 메인 앱
// ============================================
export default function AllThatBasketApp() {
  const [currentView, setCurrentView] = useState('home');
  const [currentRole, setCurrentRole] = useState('owner');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // AUTUS 통합 Hook
  const basketData = useAllThatBasket();
  const { loading, error } = basketData;

  const roles = {
    owner: { icon: '👑', title: '오너' },
    manager: { icon: '📊', title: '관리자' },
    teacher: { icon: '🏀', title: '강사' },
    parent: { icon: '👨‍👩‍👧', title: '학부모' },
  };

  const roleInfo = roles[currentRole];

  const navItems = [
    { id: 'home', icon: Home, label: '홈' },
    { id: 'students', icon: Users, label: '선수' },
    { id: 'attendance', icon: Calendar, label: '출석' },
    { id: 'payments', icon: CreditCard, label: '수납' },
    { id: 'chat', icon: MessageCircle, label: '소통' },
    { id: 'videos', icon: Youtube, label: '영상' },
    { id: 'parent-app', icon: Smartphone, label: '학부모앱' },
    { id: 'coach-video', icon: QrCode, label: '강사세션' },
  ];

  const renderView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <motion.div
              className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <p className="text-gray-400">AUTUS 엔진 로딩 중...</p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'home':
        return <HomeView onNavigate={setCurrentView} data={basketData} />;
      case 'students':
        return <StudentsView data={basketData} />;
      case 'attendance':
        return <AttendanceView data={basketData} />;
      case 'payments':
        return <PaymentsView data={basketData} />;
      case 'chat':
        return <MoltBotChat onBack={() => setCurrentView('home')} />;
      case 'parent-app':
        return <ParentAppDaechi onBack={() => setCurrentView('home')} />;
      case 'coach-video':
        return <CoachVideoFlow onBack={() => setCurrentView('home')} data={basketData} />;
      default:
        return <HomeView onNavigate={setCurrentView} data={basketData} />;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0F0F1A' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(15,15,26,0.9)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,107,53,0.2)',
        }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-white/10">
            <Menu size={20} className="text-white" />
          </button>
          <div>
            <h1
              className="text-lg font-bold"
              style={{
                background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              🏀 올댓바스켓
            </h1>
            <p className="text-xs text-gray-400">
              {roleInfo.icon} {roleInfo.title} | AUTUS Engine
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-white/10 relative">
            <Bell size={20} className="text-white" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <button className="p-2 rounded-lg hover:bg-white/10">
            <User size={20} className="text-white" />
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-50"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed left-0 top-0 bottom-0 w-72 z-50 p-4"
              style={{ background: '#1A1A2E' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">메뉴</h2>
                <button onClick={() => setSidebarOpen(false)}>
                  <X size={24} className="text-white" />
                </button>
              </div>
              <div className="space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                      currentView === item.id
                        ? 'bg-orange-500/20 text-orange-300'
                        : 'text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-8 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                <p className="text-xs text-cyan-400 font-medium">AUTUS Engine</p>
                <p className="text-xs text-gray-500 mt-1">V = (M-T) × (1+s)^t</p>
                <p className="text-xs text-gray-500">R(t) = Σ(wᵢ × ΔMᵢ) / s(t)^α</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="p-4 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 px-2 py-2"
        style={{
          background: 'rgba(15,15,26,0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(255,107,53,0.2)',
        }}
      >
        <div className="flex justify-around">
          {navItems.slice(0, 6).map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                currentView === item.id ? 'text-orange-400' : 'text-gray-500'
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
