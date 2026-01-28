import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, TrendingUp, TrendingDown, Users, 
  Clock, MessageSquare, CheckCircle2, ChevronRight,
  Zap, Target, Activity, Radio, Map, Cloud, BarChart3,
  Waves, Heart, Globe, Gauge, ArrowLeft, Phone, Send,
  Brain, Calendar, BookOpen, Play, RotateCcw,
  MapPin, Building, Sparkles, RefreshCw, Loader2,
  Wifi, WifiOff
} from 'lucide-react';
import { useDemoData, type DemoData, type Customer } from '../hooks/useDemoData';

// ═══════════════════════════════════════════════════════════════════════════
// AUTUS 2.0 DEMO - 11개 뷰 전체 확인용
// Supabase 실데이터 연동 지원
// ═══════════════════════════════════════════════════════════════════════════

// 기본 조직 ID (KRATON 영어학원)
const DEFAULT_ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// 색상 및 아이콘 상수는 훅 데이터와 함께 사용

const weatherIcons: Record<string, string> = { sunny: '☀️', cloudy: '⛅', rainy: '🌧️', storm: '⛈️' };
const colors: Record<string, { bg: string; text: string }> = { 
  green: { bg: 'bg-emerald-500', text: 'text-emerald-400' }, 
  yellow: { bg: 'bg-amber-500', text: 'text-amber-400' }, 
  red: { bg: 'bg-red-500', text: 'text-red-400' } 
};

// === COMMON COMPONENTS ===
interface NavBtnProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavBtn: React.FC<NavBtnProps> = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center p-1.5 rounded-lg transition-all ${active ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500 hover:text-white hover:bg-slate-800/50'}`}>
    <Icon size={16} /><span className="text-[8px] mt-0.5">{label}</span>
  </button>
);

interface HeaderProps {
  icon: React.ElementType;
  title: string;
  sub: string;
  color?: string;
}

const Header: React.FC<HeaderProps> = ({ icon: Icon, title, sub, color = 'blue' }) => {
  const bg: Record<string, string> = { 
    blue: 'from-blue-500 to-cyan-500', 
    purple: 'from-purple-500 to-pink-500', 
    amber: 'from-amber-500 to-orange-500', 
    red: 'from-red-500 to-rose-500', 
    green: 'from-emerald-500 to-teal-500' 
  };
  return (
    <div className="flex items-center gap-2 mb-3 animate-fadeIn">
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${bg[color]} flex items-center justify-center shadow-lg transition-transform hover:scale-110`}>
        <Icon size={16} className="text-white" />
      </div>
      <div>
        <div className="text-sm font-bold">{title}</div>
        <div className="text-[9px] text-slate-500">{sub}</div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION STYLES (글로벌 CSS 애니메이션)
// ═══════════════════════════════════════════════════════════════════════════
const AnimationStyles = () => (
  <style>{`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 5px currentColor; }
      50% { box-shadow: 0 0 20px currentColor, 0 0 30px currentColor; }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
    .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
    .animate-slideInLeft { animation: slideInLeft 0.4s ease-out; }
    .animate-slideInRight { animation: slideInRight 0.4s ease-out; }
    .animate-scaleIn { animation: scaleIn 0.3s ease-out; }
    .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
    .animate-float { animation: float 3s ease-in-out infinite; }
    .card-hover { transition: all 0.2s ease; }
    .card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
  `}</style>
);

// ═══════════════════════════════════════════════════════════════════════════
// 1. COCKPIT (조종석)
// ═══════════════════════════════════════════════════════════════════════════
interface CockpitProps {
  data: DemoData;
  onStudent: (id: string) => void;
}

const Cockpit: React.FC<CockpitProps> = ({ data, onStudent }) => {
  const d = data.cockpit;
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  const c = colors[d.status.level] || colors.yellow;

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"><Gauge size={16} className="text-white" /></div>
          <div><div className="text-sm font-bold">KRATON</div><div className="text-[9px] text-slate-500">조종석</div></div>
        </div>
        <div className="text-base font-mono font-bold">{time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
      </div>

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-3 space-y-1.5 animate-slideInLeft">
          <div className="text-[9px] text-purple-400 font-medium">EXTERNAL</div>
          <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/50 card-hover">
            <div className="text-[9px] text-slate-400">σ 환경</div>
            <div className={`text-lg font-bold ${d.external.sigma < 0.9 ? 'text-amber-400' : 'text-emerald-400'}`}>{d.external.sigma}</div>
          </div>
          <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/50 flex items-center gap-1 card-hover">
            <span className="text-lg animate-float">⛈️</span>
            <div className="text-[9px]">{d.external.weatherLabel}</div>
          </div>
          <div className="p-1.5 bg-red-500/10 rounded border border-red-500/30 flex items-center gap-1 card-hover">
            <Heart className="text-red-400 animate-pulse" size={12} />
            <div className="text-[9px]"><span className="text-red-400">공명</span> "{d.external.heartbeatKeyword}"</div>
          </div>
        </div>

        <div className="col-span-6 animate-scaleIn">
          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 card-hover">
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-16 overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 128 64">
                  <defs><linearGradient id="g1"><stop offset="0%" stopColor="#ef4444" /><stop offset="50%" stopColor="#10b981" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
                  <path d="M 12 56 A 52 52 0 0 1 116 56" fill="none" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
                  <path d="M 12 56 A 52 52 0 0 1 116 56" fill="none" stroke="url(#g1)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(d.internal.avgTemperature / 100) * 163} 163`} />
                </svg>
                <div className="absolute bottom-0 left-1/2 origin-bottom" style={{ transform: `translateX(-50%) rotate(${(d.internal.avgTemperature / 100) * 180 - 90}deg)` }}>
                  <div className={`w-0.5 h-10 ${c.bg} rounded-full`} />
                </div>
              </div>
              <div className={`text-2xl font-bold ${c.text}`}>{d.internal.avgTemperature}°</div>
              <div className={`text-[10px] ${c.text}`}>{d.status.label}</div>
            </div>
            <div className="grid grid-cols-4 gap-1 mt-2 pt-2 border-t border-slate-700/50 text-center">
              <div><div className="text-sm font-bold">{d.internal.customerCount}</div><div className="text-[8px] text-slate-400">전체</div></div>
              <div><div className="text-sm font-bold text-emerald-400">{d.internal.healthyCount}</div><div className="text-[8px] text-slate-400">양호</div></div>
              <div><div className="text-sm font-bold text-amber-400">{d.internal.warningCount}</div><div className="text-[8px] text-slate-400">주의</div></div>
              <div><div className="text-sm font-bold text-red-400">{d.internal.riskCount}</div><div className="text-[8px] text-slate-400">위험</div></div>
            </div>
          </div>
          <div className="mt-2 p-2 bg-slate-800/40 rounded-lg border border-slate-700/50">
            <div className="text-[9px] text-amber-400 mb-1 flex items-center gap-1"><AlertTriangle size={10} />긴급 알림</div>
            {d.alerts.map(a => (
              <div key={a.id} className={`p-1.5 rounded mb-1 last:mb-0 ${a.level === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                <div className="text-[10px] font-medium">{a.title}</div>
                <div className="text-[8px] opacity-70">{a.time}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-3 space-y-1.5 animate-slideInRight">
          <div className="text-[9px] text-blue-400 font-medium">우선 액션</div>
          {d.actions.map((a, i) => (
            <div 
              key={a.id} 
              onClick={() => a.customerId && onStudent(a.customerId)} 
              className={`p-2 rounded-lg border cursor-pointer card-hover ${a.priority === 1 ? 'bg-red-500/10 border-red-500/50' : 'bg-amber-500/10 border-amber-500/50'}`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-1">
                <span className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center text-white ${a.priority === 1 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}>{a.priority}</span>
                <span className="text-[10px] font-medium">{a.title}</span>
              </div>
              <div className="text-[8px] text-slate-400 ml-5">{a.context}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. MAP (지도)
// ═══════════════════════════════════════════════════════════════════════════
interface MapViewProps {
  data: DemoData;
}

const MapView: React.FC<MapViewProps> = ({ data }) => (
  <div className="p-3">
    <Header icon={Map} title="지도" sub="공간 분석 · 고객 분포" color="green" />
    <div className="relative h-48 bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-blue-900/20" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-40 h-40">
          {[1, 2, 3].map(i => <div key={i} className="absolute border border-dashed border-slate-600/40 rounded-full" style={{ inset: `${i * 12}%` }} />)}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 flex items-center justify-center text-[8px] font-bold">학원</div>
          {data.mapCustomers.map((c, i) => (
            <div key={c.id} className={`absolute w-3 h-3 rounded-full ${c.zone === 'critical' ? 'bg-red-500' : c.zone === 'warning' ? 'bg-amber-500' : c.zone === 'excellent' ? 'bg-purple-500' : 'bg-emerald-500'}`} 
                 style={{ top: `${15 + i * 18}%`, left: `${20 + i * 15}%` }} title={c.name} />
          ))}
          {data.mapCompetitors.map((c, i) => (
            <div key={c.id} className="absolute w-3 h-3 bg-red-500/40 border border-red-500 rounded-sm rotate-45" 
                 style={{ top: `${30 + i * 25}%`, right: `${15 + i * 10}%` }} title={c.name} />
          ))}
        </div>
      </div>
      <div className="absolute bottom-2 left-2 flex gap-2 text-[8px]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full" />우리</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full" />양호</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full" />위험</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500/50 border border-red-500" />경쟁사</span>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 mt-2">
      <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/50">
        <div className="text-[9px] text-slate-400 mb-1">고객 분포 ({data.mapCustomers.length}명)</div>
        {data.mapCustomers.map(c => (
          <div key={c.id} className="flex justify-between text-[10px] py-0.5">
            <span className="flex items-center gap-1"><MapPin size={10} className={c.zone === 'critical' ? 'text-red-400' : c.zone === 'warning' ? 'text-amber-400' : 'text-emerald-400'} />{c.name}</span>
            <span className={c.zone === 'critical' ? 'text-red-400' : c.zone === 'warning' ? 'text-amber-400' : 'text-emerald-400'}>{c.temp}°</span>
          </div>
        ))}
      </div>
      <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/50">
        <div className="text-[9px] text-slate-400 mb-1">경쟁사 ({data.mapCompetitors.length}개)</div>
        {data.mapCompetitors.map(c => (
          <div key={c.id} className="flex justify-between text-[10px] py-0.5">
            <span className="flex items-center gap-1"><Building size={10} className="text-red-400" />{c.name}</span>
            <span className={c.threat === 'high' ? 'text-red-400' : 'text-amber-400'}>{c.threat === 'high' ? '위협 높음' : '위협 중간'}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// 3. WEATHER (날씨)
// ═══════════════════════════════════════════════════════════════════════════
interface WeatherProps {
  data: DemoData;
}

const Weather: React.FC<WeatherProps> = ({ data }) => (
  <div className="p-3">
    <Header icon={Cloud} title="날씨" sub="시간 예측 · σ 영향" color="blue" />
    <div className="grid grid-cols-7 gap-1">
      {data.weather.map((d, i) => (
        <div key={i} className={`p-1.5 rounded-lg border text-center transition-transform hover:scale-105 ${d.sigma < 0.7 ? 'bg-red-500/10 border-red-500/50' : d.sigma < 0.85 ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-800/40 border-slate-700/50'}`}>
          <div className="text-[9px] text-slate-400">{d.date}</div>
          <div className="text-[8px] text-slate-500">{d.day}</div>
          <div className="text-xl my-0.5">{weatherIcons[d.weather]}</div>
          <div className={`text-xs font-bold ${d.sigma < 0.7 ? 'text-red-400' : d.sigma < 0.85 ? 'text-amber-400' : 'text-emerald-400'}`}>{d.sigma}</div>
          {d.event && <div className="text-[7px] text-red-400 truncate">{d.event}</div>}
        </div>
      ))}
    </div>
    <div className="mt-2 p-2 bg-slate-800/40 rounded-lg border border-slate-700/50 grid grid-cols-3 gap-2 text-center">
      <div><div className="text-lg font-bold text-amber-400">0.83</div><div className="text-[8px] text-slate-400">평균 σ</div></div>
      <div><div className="text-lg font-bold text-red-400">2/1</div><div className="text-[8px] text-slate-400">최악의 날</div></div>
      <div><div className="text-lg font-bold text-white">2</div><div className="text-[8px] text-slate-400">이벤트</div></div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// 4. RADAR (레이더) - 강화된 위협 감지
// ═══════════════════════════════════════════════════════════════════════════
interface RadarProps {
  data: DemoData;
}

const Radar: React.FC<RadarProps> = ({ data }) => {
  // 위협 레벨 계산
  const threatLevel = data.threats.filter(t => t.severity === 'high').length > 0 ? 'high' 
    : data.threats.length > 0 ? 'medium' : 'low';
  
  // 동적 위협 점 위치 계산
  const threatPoints = data.threats.map((t, i) => {
    const angle = (i / Math.max(data.threats.length, 1)) * Math.PI * 0.8 - Math.PI * 0.4;
    const distance = t.severity === 'high' ? 25 : t.severity === 'medium' ? 40 : 55;
    return {
      ...t,
      x: 50 + distance * Math.cos(angle),
      y: 50 - distance * Math.sin(angle),
    };
  });
  
  const opportunityPoints = data.opportunities.map((o, i) => {
    const angle = Math.PI + (i / Math.max(data.opportunities.length, 1)) * Math.PI * 0.6 - Math.PI * 0.3;
    const distance = o.potential === 'high' ? 30 : 45;
    return {
      ...o,
      x: 50 + distance * Math.cos(angle),
      y: 50 - distance * Math.sin(angle),
    };
  });

  // 위기 고객 기반 추가 위협 감지
  const riskCustomerCount = data.mapCustomers.filter(c => c.zone === 'critical').length;
  const warningCustomerCount = data.mapCustomers.filter(c => c.zone === 'warning').length;
  
  return (
    <div className="p-3">
      <Header icon={Radio} title="레이더" sub="위협/기회 감지 · AI 분석" color="red" />
      
      {/* 위협 레벨 인디케이터 */}
      <div className={`mb-2 p-2 rounded-lg border flex items-center justify-between ${
        threatLevel === 'high' ? 'bg-red-500/20 border-red-500/50' :
        threatLevel === 'medium' ? 'bg-amber-500/20 border-amber-500/50' :
        'bg-emerald-500/20 border-emerald-500/50'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full animate-pulse ${
            threatLevel === 'high' ? 'bg-red-500' :
            threatLevel === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
          }`} />
          <span className="text-[10px] font-medium">
            {threatLevel === 'high' ? '🚨 고위험 상태' :
             threatLevel === 'medium' ? '⚠️ 주의 필요' : '✅ 안정'}
          </span>
        </div>
        <span className="text-[9px] text-slate-400">
          위험고객 {riskCustomerCount}명 · 주의 {warningCustomerCount}명
        </span>
      </div>
      
      {/* 레이더 화면 */}
      <div className="relative h-40 bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-32 h-32">
            {/* 동심원 */}
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`absolute border rounded-full ${
                i === 1 ? 'border-red-500/30' : 'border-green-500/20'
              }`} style={{ inset: `${i * 12}%` }} />
            ))}
            {/* 스캔 라인 */}
            <div className="absolute inset-0 border-t-2 border-green-500/50 rounded-full animate-spin" style={{ animationDuration: '4s' }} />
            {/* 중심점 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-green-500 rounded-full shadow-lg shadow-green-500/50" />
            {/* 위협 점 (동적) */}
            {threatPoints.map((t, i) => (
              <div 
                key={t.id} 
                className={`absolute rounded-full animate-pulse ${
                  t.severity === 'high' ? 'w-3 h-3 bg-red-500' :
                  t.severity === 'medium' ? 'w-2.5 h-2.5 bg-amber-500' : 'w-2 h-2 bg-yellow-500'
                }`}
                style={{ left: `${t.x}%`, top: `${t.y}%`, transform: 'translate(-50%, -50%)' }}
                title={`${t.name} (ETA: ${t.eta}일)`}
              />
            ))}
            {/* 기회 점 (동적) */}
            {opportunityPoints.map((o, i) => (
              <div 
                key={o.id} 
                className={`absolute rounded-full ${
                  o.potential === 'high' ? 'w-2.5 h-2.5 bg-emerald-500' : 'w-2 h-2 bg-teal-500'
                }`}
                style={{ left: `${o.x}%`, top: `${o.y}%`, transform: 'translate(-50%, -50%)' }}
                title={`${o.name} (ETA: ${o.eta}일)`}
              />
            ))}
          </div>
        </div>
        {/* 범례 */}
        <div className="absolute bottom-1 left-1 flex gap-2 text-[7px]">
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-red-500 rounded-full" />고위험</span>
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />중위험</span>
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />기회</span>
        </div>
      </div>
      
      {/* 위협/기회 상세 */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/30">
          <div className="text-[9px] text-red-400 mb-1 flex items-center justify-between">
            <span>⚠️ 위협 {data.threats.length}건</span>
            <span className="text-[8px] text-slate-500">
              영향 {data.threats.reduce((sum, t) => sum + Math.abs(t.impact), 0)}%
            </span>
          </div>
          {data.threats.length === 0 ? (
            <div className="text-[9px] text-slate-500 py-2 text-center">감지된 위협 없음</div>
          ) : (
            data.threats.map(t => (
              <div key={t.id} className="py-1 border-b border-red-500/20 last:border-0">
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    t.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  <span className="text-[10px]">{t.name}</span>
                </div>
                <div className="text-[8px] text-slate-400 ml-2.5">
                  ETA {t.eta}일 · 영향 {t.impact}%
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
          <div className="text-[9px] text-emerald-400 mb-1 flex items-center justify-between">
            <span>✨ 기회 {data.opportunities.length}건</span>
            <span className="text-[8px] text-slate-500">
              잠재 +{data.opportunities.reduce((sum, o) => sum + o.impact, 0)}%
            </span>
          </div>
          {data.opportunities.length === 0 ? (
            <div className="text-[9px] text-slate-500 py-2 text-center">감지된 기회 없음</div>
          ) : (
            data.opportunities.map(o => (
              <div key={o.id} className="py-1 border-b border-emerald-500/20 last:border-0">
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    o.potential === 'high' ? 'bg-emerald-500' : 'bg-teal-500'
                  }`} />
                  <span className="text-[10px]">{o.name}</span>
                </div>
                <div className="text-[8px] text-slate-400 ml-2.5">
                  ETA {o.eta}일 · 잠재 +{o.impact}%
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* AI 분석 요약 */}
      {threatLevel !== 'low' && (
        <div className="mt-2 p-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/30">
          <div className="flex items-center gap-1 mb-1">
            <Brain size={10} className="text-blue-400" />
            <span className="text-[9px] text-blue-400 font-medium">AI 분석</span>
          </div>
          <div className="text-[9px] text-slate-300">
            {threatLevel === 'high' 
              ? `긴급 대응 필요: ${data.threats.filter(t => t.severity === 'high')[0]?.name || '고위험 요소'} 감지. 즉시 방어 전략 수립 권장.`
              : `주의 관찰 중: ${data.threats.length}개 위협 요소 모니터링. 선제 대응으로 위험 완화 가능.`
            }
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 5. SCOREBOARD (스코어보드)
// ═══════════════════════════════════════════════════════════════════════════
interface ScoreProps {
  data: DemoData;
}

const Score: React.FC<ScoreProps> = ({ data }) => (
  <div className="p-3">
    <Header icon={BarChart3} title="스코어보드" sub="경쟁 비교 · 목표 대비" color="amber" />
    <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/50 mb-2">
      <div className="text-[9px] text-slate-400 mb-2">경쟁사 대비</div>
      {data.scoreCompetitors.map((c, i) => (
        <div key={i} className="flex items-center gap-2 py-1">
          <span className="w-14 text-[10px] text-slate-400">{c.name}</span>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-emerald-400 text-xs font-bold">{c.win} WIN</span>
            <span className="text-slate-500">vs</span>
            <span className="text-red-400 text-xs font-bold">{c.lose} LOSE</span>
          </div>
        </div>
      ))}
    </div>
    <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/50">
      <div className="text-[9px] text-slate-400 mb-2">목표 달성률</div>
      {data.scoreGoals.map((g, i) => (
        <div key={i} className="mb-2 last:mb-0">
          <div className="flex justify-between text-[9px] mb-0.5">
            <span className="text-slate-400">{g.name}</span>
            <span className={g.progress >= 80 ? 'text-emerald-400' : 'text-amber-400'}>{g.current}/{g.target}</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full transition-all ${g.progress >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${g.progress}%` }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// 6. TIDE (조류)
// ═══════════════════════════════════════════════════════════════════════════
interface TideProps {
  data: DemoData;
}

const Tide: React.FC<TideProps> = ({ data }) => (
  <div className="p-3">
    <Header icon={Waves} title="조류" sub="트렌드 · 시장 vs 우리" color="blue" />
    <div className="grid grid-cols-2 gap-2 mb-2">
      <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30 text-center">
        <div className="text-2xl mb-1">🌊</div>
        <div className="text-lg font-bold text-red-400">{data.tide.market.trend}</div>
        <div className="text-[9px] text-slate-400">시장</div>
        <div className="text-xs text-red-400">{data.tide.market.change}%</div>
      </div>
      <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30 text-center">
        <div className="text-2xl mb-1">🚀</div>
        <div className="text-lg font-bold text-emerald-400">{data.tide.ours.trend}</div>
        <div className="text-[9px] text-slate-400">우리</div>
        <div className="text-xs text-emerald-400">+{data.tide.ours.change}%</div>
      </div>
    </div>
    <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/50">
      <div className="text-[9px] text-slate-400 mb-2">4개월 추이</div>
      <div className="flex items-end justify-around h-20">
        {[{ m: '10월', mk: 100, us: 100 }, { m: '11월', mk: 98, us: 103 }, { m: '12월', mk: 95, us: 106 }, { m: '1월', mk: 92, us: 108 }].map((d, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="flex gap-0.5 items-end h-14">
              <div className="w-3 bg-red-500/50 rounded-t transition-all" style={{ height: `${d.mk * 0.5}%` }} />
              <div className="w-3 bg-emerald-500 rounded-t transition-all" style={{ height: `${d.us * 0.5}%` }} />
            </div>
            <div className="text-[8px] text-slate-500 mt-1">{d.m}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// 7. HEARTBEAT (심전도)
// ═══════════════════════════════════════════════════════════════════════════
interface HeartbeatProps {
  data: DemoData;
}

const Heartbeat: React.FC<HeartbeatProps> = ({ data }) => (
  <div className="p-3">
    <Header icon={Heart} title="심전도" sub="여론/Voice 리듬" color="red" />
    <div className="relative h-24 bg-slate-800/40 rounded-lg border border-slate-700/50 overflow-hidden mb-2">
      <svg className="w-full h-full" viewBox="0 0 400 80" preserveAspectRatio="none">
        <path d="M0,40 L50,40 L60,15 L70,65 L80,40 L150,40 L160,10 L170,70 L180,40 L250,40 L260,20 L270,60 L280,40 L400,40" fill="none" stroke="#ef4444" strokeWidth="2" className="animate-pulse" />
      </svg>
      <div className="absolute top-2 left-2 text-[9px] text-red-400 flex items-center gap-1"><Heart size={10} className="animate-pulse" />실시간 모니터링</div>
    </div>
    <div className="grid grid-cols-2 gap-2 mb-2">
      <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/50">
        <div className="text-[9px] text-purple-400 mb-1">외부 여론</div>
        {data.heartbeat.external.map((k, i) => (
          <div key={i} className="flex justify-between text-[10px] py-0.5">
            <span>{k.word}</span>
            <span className="text-slate-400">{k.count}건 {k.trend === 'rising' && <TrendingUp size={10} className="inline text-red-400" />}</span>
          </div>
        ))}
      </div>
      <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/50">
        <div className="text-[9px] text-blue-400 mb-1">내부 Voice</div>
        {data.heartbeat.internal.map((k, i) => (
          <div key={i} className="flex justify-between text-[10px] py-0.5">
            <span>{k.word}</span>
            <span className="text-slate-400">{k.count}건 {k.trend === 'rising' && <TrendingUp size={10} className="inline text-red-400" />}</span>
          </div>
        ))}
      </div>
    </div>
    {data.heartbeat.resonance.detected && (
      <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/30 animate-pulse">
        <div className="text-[9px] text-red-400 font-medium">⚡ 공명 감지!</div>
        <div className="text-[10px]">외부 "{data.heartbeat.resonance.external}" ↔ 내부 "{data.heartbeat.resonance.internal}"</div>
        <div className="text-[8px] text-slate-400">상관계수: {data.heartbeat.resonance.correlation}</div>
      </div>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// 8. MICROSCOPE (현미경)
// ═══════════════════════════════════════════════════════════════════════════
interface MicroscopeProps {
  customer?: Customer;
  onBack: () => void;
}

const Microscope: React.FC<MicroscopeProps> = ({ customer, onBack }) => {
  // 기본 고객 데이터 (customer가 없을 경우)
  const defaultCustomer: Customer = {
    id: 'default', name: '선택된 학생 없음', grade: '-', class: '-', tenure: 0,
    executor: { id: '', name: '-' }, payer: { id: '', name: '-' },
    temperature: { current: 50, zone: 'normal', trend: 'stable', trendValue: 0 },
    tsel: { trust: { score: 50 }, satisfaction: { score: 50 }, engagement: { score: 50 }, loyalty: { score: 50 } },
    sigma: { total: 1.0, factors: [] },
    churnPrediction: { probability: 0 },
    voices: [],
  };
  const s = customer || defaultCustomer;
  return (
    <div className="p-3">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onBack} className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/50"><ArrowLeft size={14} /></button>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">{s.name[0]}</div>
        <div className="flex-1">
          <div className="text-sm font-bold">{s.name} <span className="text-[10px] text-slate-400 font-normal">{s.grade} · {s.class}</span></div>
          <div className="text-[9px] text-slate-500">담당: {s.executor?.name || '-'} · {s.tenure || 0}개월</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-slate-400">이탈 확률</div>
          <div className="text-lg font-bold text-red-400">{(s.churnPrediction.probability * 100).toFixed(0)}%</div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-4 space-y-2">
          <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/50 flex flex-col items-center">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#334155" strokeWidth="5" />
                <circle cx="40" cy="40" r="32" fill="none" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(s.temperature.current / 100) * 201} 201`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-xl font-bold text-red-400">{s.temperature.current}°</div>
                <div className="text-[8px] text-red-400 flex items-center"><TrendingDown size={8} />{s.temperature.trendValue}°</div>
              </div>
            </div>
            <div className="text-[9px] text-red-400 mt-1 px-2 py-0.5 bg-red-500/20 rounded-full">위험</div>
          </div>
          {s.recommendation && (
            <div className="p-2 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/30">
              <div className="flex items-center gap-1 mb-1"><Brain size={10} className="text-blue-400" /><span className="text-[9px] text-blue-400">AI 추천</span></div>
              <div className="text-[10px] font-medium">{s.recommendation.strategyName}</div>
              <div className="text-[9px] text-emerald-400">예상 +{s.recommendation.expectedEffect.temperatureChange}°</div>
            </div>
          )}
        </div>
        <div className="col-span-8 space-y-2">
          <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/50">
            <div className="text-[9px] text-slate-400 mb-1">TSEL 관계 지수</div>
            <div className="grid grid-cols-4 gap-1">
              {([['T', s.tsel.trust.score], ['S', s.tsel.satisfaction.score], ['E', s.tsel.engagement.score], ['L', s.tsel.loyalty.score]] as const).map(([k, v]) => (
                <div key={k} className={`p-1.5 rounded text-center ${v < 50 ? 'bg-red-500/10 border border-red-500/30' : 'bg-slate-700/50'}`}>
                  <div className="text-[9px] text-slate-400">{k}</div>
                  <div className={`text-sm font-bold ${v < 50 ? 'text-red-400' : 'text-white'}`}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/50">
              <div className="text-[9px] text-purple-400 mb-1">σ 요인</div>
              <div className="text-lg font-bold text-amber-400 mb-1">{s.sigma.total}</div>
              {s.sigma.factors.map((f, i) => <div key={i} className="text-[9px] flex justify-between"><span className="text-slate-400">{f.name}</span><span className="text-red-400">{(f.impact * 100).toFixed(0)}%</span></div>)}
            </div>
            <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/50">
              <div className="text-[9px] text-amber-400 mb-1">Voice</div>
              {s.voices.map((v, i) => (
                <div key={i} className="p-1 bg-amber-500/20 rounded text-[9px]">
                  <span className="text-amber-400">💭 {v.stage}</span>
                  {v.status === 'pending' && <span className="ml-1 text-[8px] px-1 bg-amber-500/30 rounded">미처리</span>}
                  <div className="text-slate-300 mt-0.5">"{v.content}"</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-[10px] font-medium transition-colors"><Calendar size={12} />상담 예약</button>
        <button className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-[10px] font-medium transition-colors"><Send size={12} />메시지</button>
        <button className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 text-[10px] font-medium transition-colors"><AlertTriangle size={12} />이탈 방지</button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 9. NETWORK (네트워크)
// ═══════════════════════════════════════════════════════════════════════════
interface NetworkProps {
  data: DemoData;
}

const Network: React.FC<NetworkProps> = ({ data }) => (
  <div className="p-3">
    <Header icon={Globe} title="네트워크" sub="관계망 분석" color="purple" />
    <div className="relative h-36 bg-slate-800/40 rounded-lg border border-slate-700/50 overflow-hidden mb-2">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-32 h-32">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-[8px] font-bold shadow-lg shadow-blue-500/50">학원</div>
          {data.network.nodes.map((n, i) => {
            const a = (i / data.network.nodes.length) * 2 * Math.PI - Math.PI / 2;
            const x = 50 + 38 * Math.cos(a);
            const y = 50 + 38 * Math.sin(a);
            return <div key={n.id} className={`absolute w-3 h-3 rounded-full transition-transform hover:scale-150 ${n.zone === 'critical' ? 'bg-red-500' : n.zone === 'warning' ? 'bg-amber-500' : n.zone === 'excellent' ? 'bg-purple-500' : 'bg-emerald-500'}`} style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }} title={n.name} />;
          })}
        </div>
      </div>
    </div>
    <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/50 mb-2">
      <div className="text-[9px] text-slate-400 mb-1">영향력자 👑</div>
      {data.network.influencers.map((inf, i) => (
        <div key={i} className="flex items-center justify-between py-1 text-[10px]">
          <span>{inf.name}</span>
          <span><span className="text-purple-400">추천 {inf.referrals}명</span> · <span className={inf.temp > 60 ? 'text-emerald-400' : 'text-amber-400'}>{inf.temp}°</span></span>
        </div>
      ))}
    </div>
    <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/30">
      <div className="text-[9px] text-red-400">⚠️ 위험 클러스터</div>
      <div className="text-[10px]">{data.network.riskCluster.name}: {data.network.riskCluster.count}명, 평균 {data.network.riskCluster.avgTemp}°</div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// 10. FUNNEL (퍼널)
// ═══════════════════════════════════════════════════════════════════════════
interface FunnelProps {
  data: DemoData;
}

const Funnel: React.FC<FunnelProps> = ({ data }) => (
  <div className="p-3">
    <Header icon={Target} title="퍼널" sub="전환 분석" color="amber" />
    <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/50 mb-2">
      {data.funnel.map((s, i) => (
        <div key={i} className="flex items-center gap-2 mb-1.5 last:mb-0">
          <div className="w-10 text-[9px] text-slate-400">{s.name}</div>
          <div className="flex-1 h-5 bg-slate-700/50 rounded-full overflow-hidden relative">
            <div className={`h-full transition-all ${i === 0 ? 'bg-blue-500' : i < 3 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${s.rate}%` }} />
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium">{s.count}명</span>
          </div>
          <div className="w-8 text-right text-[9px] text-slate-400">{s.rate}%</div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-3 gap-2">
      <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/50 text-center">
        <div className="text-lg font-bold text-emerald-400">6%</div>
        <div className="text-[8px] text-slate-400">전체 전환율</div>
      </div>
      <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/50 text-center">
        <div className="text-sm font-bold text-amber-400">관심→체험</div>
        <div className="text-[8px] text-slate-400">병목 구간</div>
      </div>
      <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/50 text-center">
        <div className="text-lg font-bold text-red-400">60%</div>
        <div className="text-[8px] text-slate-400">병목 이탈률</div>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// 11. CRYSTAL (수정구)
// ═══════════════════════════════════════════════════════════════════════════
interface CrystalProps {
  data: DemoData;
}

const Crystal: React.FC<CrystalProps> = ({ data }) => {
  const [sel, setSel] = useState(data.scenarios.find(s => s.recommended)?.id || data.scenarios[0]?.id || 's1');
  return (
    <div className="p-3">
      <Header icon={Sparkles} title="수정구" sub="시나리오 시뮬레이션" color="purple" />
      <div className="p-2 bg-slate-800/40 rounded-lg border border-slate-700/50 mb-2">
        <div className="text-[9px] text-slate-400 mb-2">3개월 후 시나리오</div>
        {data.scenarios.map(s => (
          <div key={s.id} onClick={() => setSel(s.id)} className={`p-2 rounded-lg border mb-1.5 last:mb-0 cursor-pointer transition-all hover:scale-[1.01] ${sel === s.id ? 'border-purple-500 bg-purple-500/10' : 'border-slate-700/50 hover:border-slate-600'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium flex items-center gap-1">
                {s.recommended && <span className="text-[7px] px-1 py-0.5 bg-purple-500 text-white rounded">AI추천</span>}
                {s.name}
              </span>
              {sel === s.id && <CheckCircle2 size={12} className="text-purple-400" />}
            </div>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div><div className="text-xs font-bold">{s.customers}</div><div className="text-[7px] text-slate-400">재원수</div></div>
              <div><div className="text-xs font-bold text-emerald-400">{s.revenue}만</div><div className="text-[7px] text-slate-400">매출</div></div>
              <div><div className="text-xs font-bold text-amber-400">{s.churn}%</div><div className="text-[7px] text-slate-400">이탈률</div></div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-[10px] font-medium transition-colors"><Play size={12} />시뮬레이션</button>
        <button className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-[10px] font-medium transition-colors"><RotateCcw size={12} />초기화</button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function DemoPage() {
  const [view, setView] = useState('cockpit');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Supabase 데이터 훅 사용
  const { data, loading, error, isLive, refetch, getCustomer } = useDemoData(DEFAULT_ORG_ID);
  
  const views = [
    { id: 'cockpit', icon: Gauge, label: '조종석' },
    { id: 'map', icon: Map, label: '지도' },
    { id: 'weather', icon: Cloud, label: '날씨' },
    { id: 'radar', icon: Radio, label: '레이더' },
    { id: 'score', icon: BarChart3, label: '스코어' },
    { id: 'tide', icon: Waves, label: '조류' },
    { id: 'heartbeat', icon: Heart, label: '심전도' },
    { id: 'microscope', icon: BookOpen, label: '현미경' },
    { id: 'network', icon: Globe, label: '네트워크' },
    { id: 'funnel', icon: Target, label: '퍼널' },
    { id: 'crystal', icon: Sparkles, label: '수정구' },
  ];

  const handleSelectStudent = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setView('microscope');
  };

  const selectedCustomer = selectedCustomerId ? getCustomer(selectedCustomerId) : data.customers[0];

  const render = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <span className="ml-2 text-slate-400">데이터 로딩 중...</span>
        </div>
      );
    }

    switch (view) {
      case 'cockpit': return <Cockpit data={data} onStudent={handleSelectStudent} />;
      case 'map': return <MapView data={data} />;
      case 'weather': return <Weather data={data} />;
      case 'radar': return <Radar data={data} />;
      case 'score': return <Score data={data} />;
      case 'tide': return <Tide data={data} />;
      case 'heartbeat': return <Heartbeat data={data} />;
      case 'microscope': return <Microscope customer={selectedCustomer} onBack={() => setView('cockpit')} />;
      case 'network': return <Network data={data} />;
      case 'funnel': return <Funnel data={data} />;
      case 'crystal': return <Crystal data={data} />;
      default: return <Cockpit data={data} onStudent={handleSelectStudent} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <AnimationStyles />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
      
      {/* Status Bar */}
      <div className="fixed top-2 right-2 z-30 flex items-center gap-2">
        {/* Live/Mock 상태 표시 */}
        <div className={`px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 ${isLive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800/80 text-slate-400'}`}>
          {isLive ? <Wifi size={10} /> : <WifiOff size={10} />}
          {isLive ? 'LIVE' : 'MOCK'}
        </div>
        {/* 새로고침 버튼 */}
        <button 
          onClick={() => refetch()} 
          className="px-2 py-1 bg-slate-800/80 rounded-lg text-[10px] hover:bg-slate-700/80 transition-colors flex items-center gap-1"
          disabled={loading}
        >
          <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
        </button>
        {/* 현재 뷰 */}
        <div className="px-2 py-1 bg-slate-800/80 rounded-lg text-[10px]">
          현재: <span className="text-blue-400 font-bold">{views.find(v => v.id === view)?.label}</span>
        </div>
      </div>
      
      {/* 에러 표시 */}
      {error && (
        <div className="fixed top-12 right-2 z-30 px-3 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-[10px] text-red-400">
          데이터 로드 오류: {error.message}
        </div>
      )}
      
      <div className="relative z-10 pb-16">{render()}</div>
      
      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 p-1.5 bg-slate-900/95 backdrop-blur border-t border-slate-700/50 z-20">
        <div className="flex justify-center gap-0.5 overflow-x-auto px-1">
          {views.map((v, i) => (
            <NavBtn key={v.id} icon={v.icon} label={`${i+1}.${v.label}`} active={view === v.id} onClick={() => setView(v.id)} />
          ))}
        </div>
      </nav>
    </div>
  );
}
