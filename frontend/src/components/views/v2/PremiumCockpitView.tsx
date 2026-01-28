/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌟 Premium Cockpit View - Dribbble + Awwwards 스타일
 * 네온 다크 테마 + 글래스모피즘 + 인터랙티브 애니메이션
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, AlertTriangle, TrendingUp, TrendingDown,
  Cloud, Zap, Activity, ChevronRight, Bell
} from 'lucide-react';
import { PremiumGauge, GlassCard, NeonStat } from './components';

interface PremiumCockpitViewProps {
  role?: string;
  onNavigate?: (view: string, params?: any) => void;
}

// 배경 레이더 효과
const RadarBackground: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* 메인 글로우 */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(20, 184, 166, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: mousePos.x - 400,
          y: mousePos.y - 400,
        }}
        transition={{ type: 'spring', damping: 30, stiffness: 100 }}
      />
      
      {/* 그리드 라인 */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
};

export const PremiumCockpitView: React.FC<PremiumCockpitViewProps> = ({
  role = 'owner',
  onNavigate,
}) => {
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);

  // Mock 데이터
  const data = {
    temperature: 68.5,
    sigma: 0.85,
    customers: { total: 132, healthy: 121, warning: 8, critical: 3 },
    alerts: [
      { id: '1', level: 'critical', title: '김민수 38° 이탈 위험', time: '10분 전' },
      { id: '2', level: 'warning', title: 'D학원 프로모션 감지', time: '1시간 전' },
      { id: '3', level: 'info', title: '이서연 성적 향상', time: '2시간 전' },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <RadarBackground />
      
      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* 헤더 */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            KRATON
          </h1>
          <p className="text-slate-500 text-sm mt-1">관계 유지력 조종석</p>
        </motion.div>

        {/* 메인 그리드 */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* 왼쪽 - 통계 */}
          <div className="col-span-3 space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <NeonStat
                label="전체 재원"
                value={`${data.customers.total}명`}
                trend="up"
                trendValue="+5%"
                icon={Users}
                color="cyan"
                onClick={() => onNavigate?.('microscope')}
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <NeonStat
                label="환경지수 σ"
                value={data.sigma.toFixed(2)}
                subValue="중간고사 D-3"
                icon={Cloud}
                color="purple"
                onClick={() => onNavigate?.('forecast')}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <NeonStat
                label="위험 신호"
                value={`${data.customers.critical}건`}
                trend="down"
                trendValue="-2"
                icon={AlertTriangle}
                color="red"
                onClick={() => onNavigate?.('actions')}
              />
            </motion.div>
          </div>

          {/* 중앙 - 메인 게이지 */}
          <div className="col-span-6 flex flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <PremiumGauge 
                value={data.temperature} 
                label="전체 온도"
                size="lg"
              />
            </motion.div>

            {/* 고객 상태 바 */}
            <motion.div 
              className="mt-8 flex gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {[
                { label: '양호', value: data.customers.healthy, color: '#10b981' },
                { label: '주의', value: data.customers.warning, color: '#f59e0b' },
                { label: '위험', value: data.customers.critical, color: '#ef4444' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  className="text-center px-6 py-3 rounded-xl cursor-pointer"
                  style={{
                    background: `${item.color}15`,
                    border: `1px solid ${item.color}30`,
                  }}
                  whileHover={{ 
                    scale: 1.05, 
                    boxShadow: `0 0 30px ${item.color}30`,
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onNavigate?.('microscope', { filter: item.label })}
                >
                  <div 
                    className="text-2xl font-bold"
                    style={{ color: item.color }}
                  >
                    {item.value}
                  </div>
                  <div className="text-xs text-slate-400">{item.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* 오른쪽 - 알림 */}
          <div className="col-span-3">
            <GlassCard className="h-full">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Bell size={18} className="text-teal-400" />
                  <span className="font-medium">알림</span>
                  <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
                    {data.alerts.length}
                  </span>
                </div>

                <div className="space-y-3">
                  <AnimatePresence>
                    {data.alerts.map((alert, i) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: i * 0.1 }}
                        className={`
                          p-3 rounded-lg cursor-pointer transition-all
                          ${selectedAlert === alert.id ? 'ring-1 ring-teal-500' : ''}
                        `}
                        style={{
                          background: alert.level === 'critical' 
                            ? 'rgba(239, 68, 68, 0.1)' 
                            : alert.level === 'warning'
                            ? 'rgba(245, 158, 11, 0.1)'
                            : 'rgba(16, 185, 129, 0.1)',
                          borderLeft: `3px solid ${
                            alert.level === 'critical' ? '#ef4444' 
                            : alert.level === 'warning' ? '#f59e0b' 
                            : '#10b981'
                          }`,
                        }}
                        onClick={() => setSelectedAlert(alert.id)}
                        whileHover={{ x: 4 }}
                      >
                        <div className="text-sm font-medium">{alert.title}</div>
                        <div className="text-xs text-slate-500 mt-1">{alert.time}</div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <motion.button
                  className="w-full mt-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white flex items-center justify-center gap-1"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                  whileHover={{ background: 'rgba(255,255,255,0.1)' }}
                  onClick={() => onNavigate?.('actions')}
                >
                  전체 보기 <ChevronRight size={14} />
                </motion.button>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* 하단 - 빠른 액션 */}
        <motion.div 
          className="mt-8 grid grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {[
            { label: '오늘의 액션', icon: Zap, color: '#10b981', view: 'actions' },
            { label: '예보 확인', icon: Cloud, color: '#8b5cf6', view: 'forecast' },
            { label: '맥박 분석', icon: Activity, color: '#f59e0b', view: 'pulse' },
            { label: '고객 현미경', icon: Users, color: '#06b6d4', view: 'microscope' },
          ].map((item, i) => (
            <motion.button
              key={item.label}
              className="p-4 rounded-xl flex items-center gap-3 group"
              style={{
                background: `linear-gradient(135deg, ${item.color}10, ${item.color}05)`,
                border: `1px solid ${item.color}20`,
              }}
              whileHover={{ 
                scale: 1.02,
                boxShadow: `0 0 30px ${item.color}20`,
                borderColor: `${item.color}40`,
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate?.(item.view)}
            >
              <div 
                className="p-2 rounded-lg"
                style={{ background: `${item.color}20` }}
              >
                <item.icon size={20} style={{ color: item.color }} />
              </div>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white">
                {item.label}
              </span>
              <ChevronRight 
                size={16} 
                className="ml-auto text-slate-600 group-hover:text-slate-400 transition-transform group-hover:translate-x-1" 
              />
            </motion.button>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default PremiumCockpitView;
