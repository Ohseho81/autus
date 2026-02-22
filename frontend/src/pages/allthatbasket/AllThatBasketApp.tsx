/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 온리쌤 - 메인 앱
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Users, Calendar, Trophy, MessageCircle,
  Settings, Bell, ChevronRight, TrendingUp, TrendingDown,
  User, LogOut, Menu, X, Target, Award, Zap, Youtube,
  Video, Smartphone, QrCode
} from 'lucide-react';
import { ALL_THAT_BASKET_CONFIG } from '../../config/allthatbasket';
import YouTubeView from './YouTubeView';
import { ParentAppDaechi, CoachVideoFlow } from './components';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type RoleType = 'owner' | 'manager' | 'teacher' | 'parent' | 'student';
type ViewType = 'home' | 'students' | 'classes' | 'missions' | 'videos' | 'chat' | 'settings' | 'parent-app' | 'coach-video';

interface Student {
  id: string;
  name: string;
  class: string;
  vIndex: number;
  trend: 'up' | 'down' | 'stable';
  position: string;
  attendance: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_STUDENTS: Student[] = [
  { id: '1', name: '김민준', class: 'A반', vIndex: 85, trend: 'up', position: 'PG', attendance: 95 },
  { id: '2', name: '이서연', class: 'A반', vIndex: 78, trend: 'stable', position: 'SG', attendance: 90 },
  { id: '3', name: '박지훈', class: 'B반', vIndex: 72, trend: 'down', position: 'SF', attendance: 85 },
  { id: '4', name: '최예린', class: 'B반', vIndex: 88, trend: 'up', position: 'PF', attendance: 100 },
  { id: '5', name: '정우성', class: 'A반', vIndex: 65, trend: 'down', position: 'C', attendance: 75 },
];

const MOCK_CLASSES = [
  { id: 'a', name: 'A반 (주니어)', students: 3, schedule: '월/수/금 16:00', avgVIndex: 76 },
  { id: 'b', name: 'B반 (키즈)', students: 2, schedule: '화/목 16:00', avgVIndex: 80 },
  { id: 'elite', name: '엘리트반', students: 0, schedule: '토/일 10:00', avgVIndex: 0 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════════════════════

// V-Index Gauge Component
const VIndexGauge: React.FC<{ value: number; size?: 'sm' | 'md' | 'lg' }> = ({ value, size = 'md' }) => {
  const getColor = (v: number) => {
    if (v >= 85) return '#10B981';
    if (v >= 70) return '#3B82F6';
    if (v >= 50) return '#FBBF24';
    if (v >= 30) return '#F97316';
    return '#EF4444';
  };

  const sizes = {
    sm: { width: 60, stroke: 4, fontSize: 14 },
    md: { width: 100, stroke: 6, fontSize: 20 },
    lg: { width: 150, stroke: 8, fontSize: 28 },
  };

  const { width, stroke, fontSize } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;

  return (
    <div className="relative" style={{ width, height: width }}>
      <svg width={width} height={width} className="transform -rotate-90">
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          stroke={getColor(value)}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 8px ${getColor(value)})` }}
        />
      </svg>
      <div 
        className="absolute inset-0 flex items-center justify-center font-bold"
        style={{ fontSize, color: getColor(value) }}
      >
        {value}
      </div>
    </div>
  );
};

// Student Card Component
const StudentCard: React.FC<{ student: Student; onClick?: () => void }> = ({ student, onClick }) => {
  const getTrendIcon = () => {
    if (student.trend === 'up') return <TrendingUp size={16} className="text-green-400" />;
    if (student.trend === 'down') return <TrendingDown size={16} className="text-red-400" />;
    return <div className="w-4 h-0.5 bg-gray-400 rounded" />;
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="p-4 rounded-xl cursor-pointer transition-all"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div className="flex items-center gap-4">
        <VIndexGauge value={student.vIndex} size="sm" />
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
            <span>출석 {student.attendance}%</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {getTrendIcon()}
          <ChevronRight size={18} className="text-gray-500" />
        </div>
      </div>
    </motion.div>
  );
};

// Stat Card Component
const StatCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  trendValue?: string;
}> = ({ title, value, icon, trend, trendValue }) => (
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

// ═══════════════════════════════════════════════════════════════════════════════
// Views
// ═══════════════════════════════════════════════════════════════════════════════

// Home View (Owner/Manager)
interface HomeViewProps {
  onNavigate?: (view: ViewType) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const avgVIndex = Math.round(MOCK_STUDENTS.reduce((sum, s) => sum + s.vIndex, 0) / MOCK_STUDENTS.length);
  const atRiskCount = MOCK_STUDENTS.filter(s => s.vIndex < 70).length;

  return (
    <div className="space-y-6">
      {/* 🆕 역할별 앱 바로가기 */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate?.('parent-app')}
          className="p-5 rounded-2xl text-left"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
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
          <p className="text-sm text-white/80">일정 · 결제 · 영상 · 상담</p>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate?.('coach-video')}
          className="p-5 rounded-2xl text-left"
          style={{
            background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
          }}
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
          <p className="text-sm text-white/80">출석체크 · 영상촬영 · 전송</p>
        </motion.button>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="전체 V-Index"
          value={avgVIndex}
          icon={<Zap size={24} className="text-orange-400" />}
          trend="up"
          trendValue="+3.2%"
        />
        <StatCard
          title="총 재원생"
          value={MOCK_STUDENTS.length}
          icon={<Users size={24} className="text-orange-400" />}
        />
        <StatCard
          title="주의 필요"
          value={atRiskCount}
          icon={<Bell size={24} className="text-orange-400" />}
        />
        <StatCard
          title="이번주 수업"
          value={12}
          icon={<Calendar size={24} className="text-orange-400" />}
        />
      </div>

      {/* Main V-Index Display */}
      <div
        className="p-6 rounded-2xl text-center"
        style={{
          background: 'linear-gradient(135deg, #1A1A2E 0%, #0F0F1A 100%)',
          border: '1px solid rgba(255,107,53,0.3)',
        }}
      >
        <h2 className="text-gray-400 mb-4">온리쌤 전체 V-Index</h2>
        <div className="flex justify-center">
          <VIndexGauge value={avgVIndex} size="lg" />
        </div>
        <p className="text-gray-500 mt-4 text-sm">
          V = (Motions - Threats) × (1 + Relations)^t
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Target size={20} />, label: '미션 생성', color: '#FF6B35' },
          { icon: <MessageCircle size={20} />, label: '전체 알림', color: '#3B82F6' },
          { icon: <Award size={20} />, label: '뱃지 수여', color: '#8B5CF6' },
        ].map((action, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-4 rounded-xl flex flex-col items-center gap-2"
            style={{
              background: `${action.color}20`,
              border: `1px solid ${action.color}40`,
            }}
          >
            <div style={{ color: action.color }}>{action.icon}</div>
            <span className="text-sm text-white">{action.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Students at Risk */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Bell size={18} className="text-orange-400" />
          주의가 필요한 선수
        </h3>
        <div className="space-y-3">
          {MOCK_STUDENTS.filter(s => s.vIndex < 75).map(student => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      </div>
    </div>
  );
};

// Students View
const StudentsView: React.FC = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold text-white">전체 선수</h2>
      <span className="text-gray-400">{MOCK_STUDENTS.length}명</span>
    </div>
    <div className="space-y-3">
      {MOCK_STUDENTS.map(student => (
        <StudentCard key={student.id} student={student} />
      ))}
    </div>
  </div>
);

// Classes View
const ClassesView: React.FC = () => (
  <div className="space-y-4">
    <h2 className="text-xl font-bold text-white">수업 관리</h2>
    <div className="space-y-3">
      {MOCK_CLASSES.map(cls => (
        <motion.div
          key={cls.id}
          whileHover={{ scale: 1.02 }}
          className="p-4 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">{cls.name}</h3>
              <p className="text-sm text-gray-400">{cls.schedule}</p>
            </div>
            <div className="text-right">
              <p className="text-orange-400 font-bold">{cls.students}명</p>
              {cls.avgVIndex > 0 && (
                <p className="text-xs text-gray-500">평균 V: {cls.avgVIndex}</p>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

// Missions View
const MissionsView: React.FC = () => {
  const missions = ALL_THAT_BASKET_CONFIG.gamification.missions.categories;
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">미션 & 뱃지</h2>
      <div className="grid grid-cols-2 gap-3">
        {missions.map(mission => (
          <motion.div
            key={mission.id}
            whileHover={{ scale: 1.05 }}
            className="p-4 rounded-xl text-center"
            style={{
              background: `${mission.color}15`,
              border: `1px solid ${mission.color}40`,
            }}
          >
            <span className="text-2xl">{mission.icon}</span>
            <p className="text-white mt-2 font-medium">{mission.name}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main App
// ═══════════════════════════════════════════════════════════════════════════════

const AllThatBasketApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [currentRole, setCurrentRole] = useState<RoleType>('owner');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { branding, roles } = ALL_THAT_BASKET_CONFIG;
  const roleInfo = roles[currentRole];

  const navItems = [
    { id: 'home' as ViewType, icon: Home, label: '홈' },
    { id: 'students' as ViewType, icon: Users, label: '선수' },
    { id: 'classes' as ViewType, icon: Calendar, label: '수업' },
    { id: 'missions' as ViewType, icon: Trophy, label: '미션' },
    { id: 'videos' as ViewType, icon: Youtube, label: '영상' },
    { id: 'chat' as ViewType, icon: MessageCircle, label: '소통' },
    { id: 'settings' as ViewType, icon: Settings, label: '설정' },
    // 새로운 뷰 (역할별 앱)
    { id: 'parent-app' as ViewType, icon: Smartphone, label: '학부모앱' },
    { id: 'coach-video' as ViewType, icon: QrCode, label: '강사세션' },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'home': return <HomeView onNavigate={setCurrentView} />;
      case 'students': return <StudentsView />;
      case 'classes': return <ClassesView />;
      case 'missions': return <MissionsView />;
      case 'videos': return <YouTubeView />;
      case 'parent-app': return <ParentAppDaechi onBack={() => setCurrentView('home')} />;
      case 'coach-video': return <CoachVideoFlow onBack={() => setCurrentView('home')} />;
      default: return <HomeView onNavigate={setCurrentView} />;
    }
  };

  return (
    <div 
      className="min-h-screen"
      style={{ background: branding.colors.background }}
    >
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
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10"
          >
            <Menu size={20} className="text-white" />
          </button>
          <div>
            <h1 
              className="text-lg font-bold"
              style={{ 
                background: branding.gradients.primary,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              온리쌤
            </h1>
            <p className="text-xs text-gray-400">
              {roleInfo.icon} {roleInfo.title}
              {'name' in roleInfo && currentRole === 'owner' && ` • ${roleInfo.name}`}
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
              style={{ background: branding.colors.surface }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">메뉴</h2>
                <button onClick={() => setSidebarOpen(false)}>
                  <X size={24} className="text-white" />
                </button>
              </div>

              {/* Role Switcher */}
              <div className="mb-6">
                <p className="text-xs text-gray-500 mb-2">역할 전환</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(roles) as RoleType[]).map(role => (
                    <button
                      key={role}
                      onClick={() => {
                        setCurrentRole(role);
                        setSidebarOpen(false);
                      }}
                      className={`p-2 rounded-lg text-sm transition-all ${
                        currentRole === role 
                          ? 'bg-orange-500/30 text-orange-300' 
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {roles[role].icon} {roles[role].title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                {navItems.map(item => (
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

              <button className="absolute bottom-4 left-4 right-4 flex items-center gap-3 p-3 rounded-lg text-red-400 hover:bg-red-500/10">
                <LogOut size={20} />
                <span>로그아웃</span>
              </button>
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
          {navItems.slice(0, 6).map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                currentView === item.id ? 'text-orange-400' : 'text-gray-500'
              }`}
            >
              <item.icon size={22} />
              <span className="text-xs">{item.label}</span>
              {currentView === item.id && (
                <motion.div
                  layoutId="navIndicator"
                  className="absolute bottom-1 w-1 h-1 rounded-full bg-orange-400"
                />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default AllThatBasketApp;
