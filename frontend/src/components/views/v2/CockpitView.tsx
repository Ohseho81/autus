/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎛️ 조종석 뷰 (Cockpit View) - AUTUS 2.0
 * 메인 대시보드 - 스코어 통합
 * "지금 전체 상태는?"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Gauge, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Users, Heart, Cloud, Trophy, ChevronRight, RefreshCw, Settings
} from 'lucide-react';
import { useModal } from './modals';
import { RoleId, hasPermission, getRoleConfig } from './config/roles';

// Kraton이 생성한 컴포넌트
import { CockpitGauge, CustomerStatusCard, AlertStatusCard, KratonButton } from './components';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface CockpitData {
  status: {
    level: 'green' | 'yellow' | 'red';
    label: string;
    temperature: number;
  };
  external: {
    sigma: number;
    weatherIcon: string;
    weatherLabel: string;
    threatCount: number;
    resonanceKeyword?: string;
  };
  internal: {
    totalCustomers: number;
    healthy: number;
    warning: number;
    critical: number;
    tsel: { t: number; s: number; e: number; l: number };
  };
  alerts: Array<{
    id: string;
    level: 'critical' | 'warning' | 'info';
    title: string;
    time: string;
    customerId?: string;
  }>;
  competition: {
    vsCompetitor: string;
    wins: number;
    losses: number;
    goals: Array<{ name: string; current: number; target: number }>;
  };
  actions: Array<{
    id: string;
    priority: number;
    title: string;
    assignee: string;
    customerId?: string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────

const MOCK_DATA: CockpitData = {
  status: { level: 'yellow', label: '주의 필요', temperature: 68.5 },
  external: {
    sigma: 0.85,
    weatherIcon: '⛈️',
    weatherLabel: 'D-3 중간고사',
    threatCount: 2,
    resonanceKeyword: '사교육비',
  },
  internal: {
    totalCustomers: 132,
    healthy: 121,
    warning: 8,
    critical: 3,
    tsel: { t: 72, s: 68, e: 75, l: 65 },
  },
  alerts: [
    { id: 'a1', level: 'critical', title: '김민수 38° 위험', time: '10분 전', customerId: 'c1' },
    { id: 'a2', level: 'warning', title: 'D학원 프로모션 감지', time: '1시간 전' },
  ],
  competition: {
    vsCompetitor: 'D학원',
    wins: 1,
    losses: 2,
    goals: [
      { name: '재원수', current: 132, target: 150 },
      { name: '이탈률', current: 5, target: 3 },
    ],
  },
  actions: [
    { id: 'ac1', priority: 1, title: '김민수 상담', assignee: '박강사', customerId: 'c1' },
    { id: 'ac2', priority: 2, title: 'D학원 대응', assignee: '관리자' },
  ],
};

// ─────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────

const StatusGauge: React.FC<{ temperature: number; level: string; label: string }> = ({ 
  temperature, level, label 
}) => {
  const colors = {
    green: { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.3)' },
    yellow: { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' },
    red: { stroke: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)' },
  };
  const c = colors[level as keyof typeof colors] || colors.yellow;
  const dashArray = (temperature / 100) * 251;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-24 overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 160 80">
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <path d="M 15 75 A 65 65 0 0 1 145 75" fill="none" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
          <path d="M 15 75 A 65 65 0 0 1 145 75" fill="none" stroke="url(#gaugeGrad)" strokeWidth="8" strokeLinecap="round" 
                strokeDasharray={`${dashArray} 251`} filter="url(#glow)" />
        </svg>
        <motion.div 
          className="absolute bottom-0 left-1/2 origin-bottom"
          style={{ transform: `translateX(-50%)` }}
          animate={{ rotate: (temperature / 100) * 180 - 90 }}
          transition={{ type: 'spring', stiffness: 100 }}
        >
          <div className={`w-1 h-14 rounded-full`} style={{ backgroundColor: c.stroke }} />
        </motion.div>
      </div>
      <div className="text-center -mt-2">
        <motion.div 
          className="text-4xl font-bold"
          style={{ color: c.stroke }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {temperature}°
        </motion.div>
        <div className="text-sm" style={{ color: c.stroke }}>{label}</div>
      </div>
    </div>
  );
};

const ExternalPanel: React.FC<{ data: CockpitData['external']; onNavigate: (view: string, params?: any) => void }> = ({ 
  data, onNavigate 
}) => (
  <div className="space-y-3">
    <div className="text-xs text-purple-400 font-medium tracking-wider">EXTERNAL</div>
    
    <motion.div 
      whileHover={{ scale: 1.02 }}
      onClick={() => onNavigate('forecast')}
      className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 cursor-pointer"
    >
      <div className="text-xs text-slate-400">σ 환경</div>
      <div className={`text-2xl font-bold ${data.sigma < 0.7 ? 'text-red-400' : data.sigma < 0.85 ? 'text-amber-400' : 'text-emerald-400'}`}>
        {data.sigma.toFixed(2)}
      </div>
    </motion.div>
    
    <motion.div 
      whileHover={{ scale: 1.02 }}
      onClick={() => onNavigate('forecast')}
      className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 cursor-pointer flex items-center gap-2"
    >
      <span className="text-2xl">{data.weatherIcon}</span>
      <div className="text-xs">{data.weatherLabel}</div>
    </motion.div>
    
    {data.resonanceKeyword && (
      <motion.div 
        whileHover={{ scale: 1.02 }}
        onClick={() => onNavigate('pulse', { keyword: data.resonanceKeyword })}
        className="p-3 bg-red-500/10 rounded-xl border border-red-500/30 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Heart className="text-red-400 animate-pulse" size={14} />
          <div className="text-xs">
            <span className="text-red-400">공명</span> "{data.resonanceKeyword}"
          </div>
        </div>
      </motion.div>
    )}
  </div>
);

const InternalPanel: React.FC<{ 
  data: CockpitData['internal']; 
  onNavigate: (view: string, params?: any) => void;
  onCountClick: (filter: string) => void;
}> = ({ 
  data, onNavigate, onCountClick
}) => (
  <div className="space-y-3">
    <div className="text-xs text-blue-400 font-medium tracking-wider">INTERNAL</div>
    
    {/* 전체 인원수 클릭 → 고객 목록 모달 */}
    <motion.div 
      whileHover={{ scale: 1.02 }}
      onClick={() => onCountClick('all')}
      className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400">전체</div>
          <div className="text-2xl font-bold">{data.totalCustomers}명</div>
        </div>
        <Users className="text-slate-500" size={20} />
      </div>
    </motion.div>
    
    {/* 🟢🟡🔴 숫자 클릭 → 고객 목록 모달 (zone 필터) */}
    <div className="flex gap-2">
      {[
        { count: data.healthy, label: '양호', color: 'emerald', filter: 'healthy' },
        { count: data.warning, label: '주의', color: 'amber', filter: 'warning' },
        { count: data.critical, label: '위험', color: 'red', filter: 'critical' },
      ].map(({ count, label, color, filter }) => (
        <motion.button
          key={filter}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onCountClick(filter)}
          className={`flex-1 p-2 rounded-lg bg-${color}-500/10 border border-${color}-500/30 text-center`}
        >
          <div className={`text-lg font-bold text-${color}-400`}>{count}</div>
          <div className="text-[9px] text-slate-400">{label}</div>
        </motion.button>
      ))}
    </div>
    
    <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
      <div className="text-[9px] text-slate-400 mb-1">TSEL 평균</div>
      <div className="flex justify-between text-xs">
        {['T', 'S', 'E', 'L'].map((key) => (
          <div key={key} className="text-center">
            <span className="text-slate-500">{key}:</span>
            <span className="ml-1 font-medium">{data.tsel[key.toLowerCase() as keyof typeof data.tsel]}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AlertsPanel: React.FC<{ alerts: CockpitData['alerts']; onNavigate: (view: string, params?: any) => void }> = ({ 
  alerts, onNavigate 
}) => (
  <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
    <div className="flex items-center gap-2 mb-3">
      <AlertTriangle className="text-amber-400" size={14} />
      <span className="text-xs font-medium">긴급 알림</span>
      <span className="ml-auto text-xs text-slate-500">{alerts.length}건</span>
    </div>
    <div className="space-y-2">
      {alerts.map((alert) => (
        <motion.div
          key={alert.id}
          whileHover={{ x: 4 }}
          onClick={() => alert.customerId && onNavigate('microscope', { customerId: alert.customerId })}
          className={`p-2 rounded-lg cursor-pointer ${
            alert.level === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${alert.level === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
            <span className="text-xs font-medium flex-1">{alert.title}</span>
            <span className="text-[9px] opacity-70">{alert.time}</span>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

const CompetitionPanel: React.FC<{ data: CockpitData['competition']; onClick: () => void }> = ({ data, onClick }) => (
  <motion.div 
    whileHover={{ scale: 1.01 }}
    onClick={onClick}
    className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 cursor-pointer"
  >
    <div className="flex items-center gap-2 mb-3">
      <Trophy className="text-amber-400" size={14} />
      <span className="text-xs font-medium">경쟁 현황</span>
      <ChevronRight size={12} className="ml-auto text-slate-500" />
    </div>
    
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs text-slate-400">vs {data.vsCompetitor}</span>
      <div className="flex items-center gap-2">
        <span className="text-emerald-400 font-bold">{data.wins}W</span>
        <span className="text-slate-500">/</span>
        <span className="text-red-400 font-bold">{data.losses}L</span>
      </div>
    </div>
    
    <div className="space-y-2">
      {data.goals.map((goal) => {
        const progress = (goal.current / goal.target) * 100;
        const isGood = goal.name === '이탈률' ? goal.current <= goal.target : goal.current >= goal.target;
        return (
          <div key={goal.name}>
            <div className="flex justify-between text-[9px] mb-1">
              <span className="text-slate-400">{goal.name}</span>
              <span className={isGood ? 'text-emerald-400' : 'text-amber-400'}>
                {goal.current}/{goal.target}
              </span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                className={`h-full rounded-full ${isGood ? 'bg-emerald-500' : 'bg-amber-500'}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  </motion.div>
);

const ActionsPanel: React.FC<{ actions: CockpitData['actions']; onNavigate: (view: string, params?: any) => void }> = ({ 
  actions, onNavigate 
}) => (
  <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
    <div className="flex items-center gap-2 mb-3">
      <CheckCircle2 className="text-blue-400" size={14} />
      <span className="text-xs font-medium">오늘의 액션</span>
      <motion.button
        whileHover={{ scale: 1.05 }}
        onClick={() => onNavigate('actions')}
        className="ml-auto text-[9px] text-blue-400 flex items-center gap-1"
      >
        전체 보기 <ChevronRight size={10} />
      </motion.button>
    </div>
    
    <div className="space-y-2">
      {actions.map((action) => (
        <motion.div
          key={action.id}
          whileHover={{ x: 4 }}
          onClick={() => onNavigate('actions', { actionId: action.id })}
          className={`p-2 rounded-lg cursor-pointer ${
            action.priority === 1 ? 'bg-red-500/10 border border-red-500/30' : 'bg-amber-500/10 border border-amber-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center text-white ${
              action.priority === 1 ? 'bg-red-500' : 'bg-amber-500'
            }`}>
              {action.priority}
            </span>
            <div className="flex-1">
              <div className="text-xs font-medium">{action.title}</div>
              <div className="text-[9px] text-slate-400">→ {action.assignee}</div>
            </div>
            <ChevronRight size={12} className="text-slate-500" />
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────

interface CockpitViewProps {
  role?: RoleId;
  onNavigate?: (view: string, params?: any) => void;
}

export function CockpitView({ role = 'owner', onNavigate = () => {} }: CockpitViewProps) {
  const [data, setData] = useState<CockpitData>(MOCK_DATA);
  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const { openModal } = useModal();
  const roleConfig = getRoleConfig(role);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    // TODO: Fetch real data
    await new Promise(r => setTimeout(r, 500));
    setLoading(false);
  };

  // ───────────────────────────────────────────────────────────────────
  // 설계 문서 기반 클릭 핸들러
  // ───────────────────────────────────────────────────────────────────

  // 고객 숫자 클릭 → 고객 목록 모달
  const handleCustomerCountClick = (filter: string) => {
    openModal({
      type: 'customer-list',
      data: { filter, title: `${filter === 'all' ? '전체' : filter} 고객` },
      onConfirm: (customer) => {
        onNavigate('microscope', { customerId: customer.id });
      },
    });
  };

  // 경쟁 현황 클릭 → 스코어 모달
  const handleCompetitionClick = () => {
    openModal({
      type: 'score-detail',
      data: data.competition,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Gauge size={20} />
          </div>
          <div>
            <div className="text-lg font-bold">KRATON</div>
            <div className="text-[10px] text-slate-500">조종석</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </motion.button>
          <div className="text-lg font-mono font-bold">
            {time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* External */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="col-span-3"
        >
          <ExternalPanel data={data.external} onNavigate={onNavigate} />
        </motion.div>

        {/* Center - Status Gauge (Kraton 개선 버전) */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-6"
        >
          {/* Kraton이 생성한 새 게이지 */}
          <CockpitGauge 
            temperature={data.status.temperature}
            label="전체 온도"
            showBar={true}
          />
          
          {/* 고객 현황 그리드 */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-4 gap-2 mt-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50"
          >
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center cursor-pointer p-2 rounded-lg hover:bg-slate-700/30"
              onClick={() => handleCustomerCountClick('all')}
            >
              <div className="text-xl font-bold">{data.internal.totalCustomers}</div>
              <div className="text-[9px] text-slate-400">전체</div>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center cursor-pointer p-2 rounded-lg hover:bg-emerald-500/10"
              onClick={() => handleCustomerCountClick('healthy')}
            >
              <div className="text-xl font-bold text-emerald-400">{data.internal.healthy}</div>
              <div className="text-[9px] text-emerald-400/70">양호</div>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center cursor-pointer p-2 rounded-lg hover:bg-amber-500/10"
              onClick={() => handleCustomerCountClick('warning')}
            >
              <div className="text-xl font-bold text-amber-400">{data.internal.warning}</div>
              <div className="text-[9px] text-amber-400/70">주의</div>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-center cursor-pointer p-2 rounded-lg hover:bg-red-500/10"
              onClick={() => handleCustomerCountClick('critical')}
            >
              <div className="text-xl font-bold text-red-400">{data.internal.critical}</div>
              <div className="text-[9px] text-red-400/70">위험</div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Internal */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-3"
        >
          <InternalPanel data={data.internal} onNavigate={onNavigate} onCountClick={handleCustomerCountClick} />
        </motion.div>
      </div>

      {/* Kraton 생성 StatusCard 섹션 */}
      <div className="grid grid-cols-12 gap-4 mt-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="col-span-6"
        >
          <CustomerStatusCard
            total={data.internal.totalCustomers}
            healthy={data.internal.healthy}
            warning={data.internal.warning}
            critical={data.internal.critical}
            onClick={() => handleCustomerCountClick('all')}
          />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="col-span-6"
        >
          <AlertStatusCard
            criticalCount={data.alerts.filter(a => a.level === 'critical').length}
            warningCount={data.alerts.filter(a => a.level === 'warning').length}
            onClick={() => onNavigate?.('actions')}
          />
        </motion.div>
      </div>

      {/* Kraton 생성 버튼 섹션 */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="flex gap-3 mt-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50"
      >
        <KratonButton variant="primary" onClick={() => onNavigate?.('actions')}>
          오늘의 액션
        </KratonButton>
        <KratonButton variant="secondary" onClick={() => onNavigate?.('forecast')}>
          예보 보기
        </KratonButton>
        <KratonButton variant="danger" onClick={() => handleCustomerCountClick('critical')}>
          위험 고객 확인
        </KratonButton>
      </motion.div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-12 gap-4 mt-4">
        {/* Alerts */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="col-span-4"
        >
          <AlertsPanel alerts={data.alerts} onNavigate={onNavigate} />
        </motion.div>

        {/* Competition */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="col-span-4"
        >
          <CompetitionPanel data={data.competition} onClick={handleCompetitionClick} />
        </motion.div>

        {/* Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="col-span-4"
        >
          <ActionsPanel actions={data.actions} onNavigate={onNavigate} />
        </motion.div>
      </div>
    </div>
  );
}

export default CockpitView;
