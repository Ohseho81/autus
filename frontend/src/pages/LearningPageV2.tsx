/**
 * AUTUS Learning Page V2
 * 
 * ROF Framework 기반 학습 및 추천 UI
 * - 4계층 학습 소스
 * - 7가지 메타 추천
 * - ROF (Result, Optimization, Future) 점수
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

// ============================================
// Types
// ============================================

interface ROFScore {
  result: number;
  optimization: number;
  future: number;
}

interface Recommendation {
  rec_id: string;
  rec_type: string;
  icon: string;
  title: string;
  description: string;
  rof_score: ROFScore | null;
  expected_impact: Record<string, any>;
  action_type: string;
  action_data: Record<string, any>;
  priority: number;
  confidence: number;
}

interface RecommendationSimple {
  rec_id: string;
  icon: string;
  title: string;
  description: string;
  action_type: string;
  priority: number;
  rof: ROFScore | null;
}

interface ImpactLabels {
  conversion?: string;
  time?: string;
  risk?: string;
  simplify?: string;
}

interface RecWithImpact extends RecommendationSimple {
  impact: ImpactLabels;
}

interface LearningSource {
  name: string;
  icon: string;
  auto: boolean;
  progress: number;
  status: string;
  selected?: string[];
  connected?: number;
  total?: number;
}

interface Discovery {
  id: string;
  text: string;
  confidence: number;
  feedback?: 'positive' | 'negative';
}

interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  executions: number;
}

interface AvailableService {
  id: string;
  name: string;
  category: string;
  connected: boolean;
  impact: number;
}

interface LearningState {
  accuracy: number;
  accuracyChange: number;
  weeklyAutoCount: number;
  timeSaved: number;
  sources: Record<string, LearningSource>;
  recommendations: RecWithImpact[];
  discoveries: Discovery[];
  automations: Automation[];
  availableServices: AvailableService[];
  accuracyHistory: Array<{ day: number; accuracy: number }>;
}

// ============================================
// Initial State
// ============================================

const INITIAL_STATE: LearningState = {
  accuracy: 82,
  accuracyChange: 3,
  weeklyAutoCount: 12,
  timeSaved: 2.4,
  
  sources: {
    L1_macro: { name: '거시경제', icon: '📊', auto: true, progress: 100, status: 'active' },
    L2_interest: { name: '관심분야', icon: '🎯', auto: false, progress: 67, status: 'active', selected: ['교육/학원', 'AI'] },
    L3_behavior: { name: '내 행동', icon: '👆', auto: true, progress: 52, status: 'active' },
    L4_connection: { name: '외부 연결', icon: '🔗', auto: false, progress: 20, status: 'partial', connected: 1, total: 5 },
  },
  
  recommendations: [
    {
      rec_id: 'rec1',
      icon: '🔥',
      title: "'인보이스 자동발송' 추천",
      description: '비슷한 사업자 82%가 사용합니다',
      rof: { result: 4, optimization: 7, future: 1 },
      impact: { conversion: '+12%', time: '월 3h' },
      priority: 8.2,
      action_type: 'enable',
    },
    {
      rec_id: 'rec2',
      icon: '📅',
      title: '분기말 2주 전!',
      description: '결산 준비 체크리스트 확인하세요',
      rof: { result: 1, optimization: 4, future: 8 },
      impact: { risk: '-30%' },
      priority: 7.5,
      action_type: 'view',
    },
    {
      rec_id: 'rec3',
      icon: '🧹',
      title: '45일간 안 쓴 규칙 3개',
      description: '시스템 단순화를 위해 정리할까요?',
      rof: { result: 0, optimization: 5, future: 2 },
      impact: { simplify: '3개 정리' },
      priority: 4.5,
      action_type: 'cleanup',
    },
  ],
  
  discoveries: [
    { id: 'd1', text: '월요일 오전 고객 연락 → 응답률 높음', confidence: 78 },
    { id: 'd2', text: '모멘텀 6 이하일 때 중요 결정 피함', confidence: 65 },
  ],
  
  automations: [
    { id: 'a1', name: '리마인더 자동 생성', enabled: true, executions: 5 },
    { id: 'a2', name: '일일 기록 알림', enabled: true, executions: 4 },
    { id: 'a3', name: '위험 경고', enabled: true, executions: 2 },
  ],
  
  availableServices: [
    { id: 'google_calendar', name: 'Google Calendar', category: '📅 일정', connected: true, impact: 15 },
    { id: 'bank', name: '은행 계좌', category: '💰 금융', connected: false, impact: 22 },
    { id: 'gmail', name: 'Gmail', category: '📧 이메일', connected: false, impact: 12 },
    { id: 'notion', name: 'Notion', category: '📝 문서', connected: false, impact: 10 },
    { id: 'stripe', name: 'Stripe', category: '💳 결제', connected: false, impact: 18 },
  ],
  
  accuracyHistory: Array.from({ length: 14 }, (_, i) => ({
    day: i + 1,
    accuracy: 68 + i * 1 + Math.random() * 2,
  })),
};

// ============================================
// ROF Bar Component
// ============================================

interface ROFBarProps {
  label: string;
  value: number;
  icon: string;
  color: string;
}

const ROFBar: React.FC<ROFBarProps> = ({ label, value, icon, color }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 text-center">{icon}</span>
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${color}`}
          style={{ width: `${value * 10}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-6">{value}</span>
    </div>
  );
};

// ============================================
// Recommendation Card Component
// ============================================

interface RecommendationCardProps {
  rec: RecWithImpact;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ rec, onAccept, onDismiss }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-cyan-500/50 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{rec.icon}</span>
            <h3 className="font-medium">{rec.title}</h3>
          </div>
          <p className="text-sm text-gray-400 mb-3">{rec.description}</p>
          
          {/* Impact Labels */}
          <div className="flex flex-wrap gap-2 mb-3">
            {rec.impact.conversion && (
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                💰 {rec.impact.conversion}
              </span>
            )}
            {rec.impact.time && (
              <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded">
                ⚡ {rec.impact.time}
              </span>
            )}
            {rec.impact.risk && (
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                🛡️ {rec.impact.risk}
              </span>
            )}
            {rec.impact.simplify && (
              <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded">
                🧹 {rec.impact.simplify}
              </span>
            )}
          </div>
          
          {/* ROF Toggle */}
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            {expanded ? '▼ ROF 숨기기' : '▶ ROF 보기'}
          </button>
          
          {expanded && rec.rof && (
            <div className="mt-3 space-y-2 p-3 bg-gray-900 rounded-lg">
              <ROFBar label="결과" value={rec.rof.result} icon="💰" color="bg-green-500" />
              <ROFBar label="효율" value={rec.rof.optimization} icon="⚡" color="bg-cyan-500" />
              <ROFBar label="미래" value={rec.rof.future} icon="🛡️" color="bg-purple-500" />
              <div className="text-right text-xs text-gray-500 mt-2">
                총점: {rec.priority.toFixed(1)}/10
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onAccept(rec.rec_id)}
          className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-sm font-medium transition-colors"
        >
          {rec.action_type === 'enable' ? '사용하기' : 
           rec.action_type === 'view' ? '확인하기' : 
           rec.action_type === 'cleanup' ? '정리하기' : '실행'}
        </button>
        <button
          onClick={() => onDismiss(rec.rec_id)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
        >
          나중에
        </button>
      </div>
    </div>
  );
};

// ============================================
// Source Card Component
// ============================================

interface SourceCardProps {
  source: LearningSource;
  layerKey: string;
}

const SourceCard: React.FC<SourceCardProps> = ({ source, layerKey }) => {
  const getBorderClass = () => {
    if (source.status === 'active') return 'bg-gray-800 border-gray-700';
    if (source.status === 'partial') return 'bg-gray-800 border-yellow-500/30';
    return 'bg-gray-900 border-gray-800';
  };

  const getProgressColor = () => {
    if (source.progress >= 80) return 'bg-green-500';
    if (source.progress >= 50) return 'bg-cyan-500';
    if (source.progress >= 20) return 'bg-yellow-500';
    return 'bg-gray-600';
  };

  return (
    <div className={`p-4 rounded-xl border ${getBorderClass()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{source.icon}</span>
          <span className="font-medium">{source.name}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${
          source.auto ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'
        }`}>
          {source.auto ? '자동' : '수동'}
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
        <div 
          className={`h-full rounded-full ${getProgressColor()}`}
          style={{ width: `${Math.min(source.progress, 100)}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-gray-500">
        <span>{source.progress}%</span>
        {layerKey === 'L4_connection' && source.connected !== undefined && (
          <span>{source.connected}/{source.total} 연결됨</span>
        )}
        {layerKey === 'L2_interest' && source.selected && (
          <span>{source.selected.join(', ')}</span>
        )}
      </div>
    </div>
  );
};

// ============================================
// Main Component
// ============================================

const LearningPageV2: React.FC = () => {
  const [state, setState] = useState<LearningState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'discoveries' | 'automations'>('recommendations');
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Accept recommendation
  const handleAccept = useCallback((recId: string) => {
    setState(prev => ({
      ...prev,
      recommendations: prev.recommendations.filter(r => r.rec_id !== recId),
    }));
    console.log(`Accepted: ${recId}`);
  }, []);

  // Dismiss recommendation
  const handleDismiss = useCallback((recId: string) => {
    setState(prev => ({
      ...prev,
      recommendations: prev.recommendations.filter(r => r.rec_id !== recId),
    }));
    console.log(`Dismissed: ${recId}`);
  }, []);

  // Discovery feedback
  const handleDiscoveryFeedback = useCallback((id: string, isPositive: boolean) => {
    setState(prev => ({
      ...prev,
      discoveries: prev.discoveries.map(d =>
        d.id === id ? { ...d, feedback: isPositive ? 'positive' : 'negative' } : d
      ),
    }));
  }, []);

  // Connect service
  const handleConnect = useCallback((serviceId: string) => {
    setState(prev => ({
      ...prev,
      availableServices: prev.availableServices.map(s =>
        s.id === serviceId ? { ...s, connected: true } : s
      ),
    }));
    setShowConnectModal(false);
  }, []);

  // Toggle automation
  const handleToggleAutomation = useCallback((autoId: string) => {
    setState(prev => ({
      ...prev,
      automations: prev.automations.map(a =>
        a.id === autoId ? { ...a, enabled: !a.enabled } : a
      ),
    }));
  }, []);

  return (
    <div className="min-h-full bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🧠 학습</h1>
          <p className="text-gray-400 text-sm mt-1">
            AUTUS가 자동으로 학습하고 추천합니다
          </p>
        </div>
        <button
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
        >
          ⚙️ 설정
        </button>
      </div>

      {/* Status Bar */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="text-2xl font-bold text-cyan-400">{state.accuracy}%</p>
                <p className="text-xs text-gray-400">정확도</p>
              </div>
              <span className="text-green-400 text-sm">+{state.accuracyChange}%</span>
            </div>
            <div className="w-px h-10 bg-gray-700" />
            <div>
              <p className="text-lg font-semibold">{state.weeklyAutoCount}건</p>
              <p className="text-xs text-gray-400">이번 주 자동</p>
            </div>
            <div className="w-px h-10 bg-gray-700" />
            <div>
              <p className="text-lg font-semibold">{state.timeSaved}h</p>
              <p className="text-xs text-gray-400">절약</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-gray-400">작동 중</span>
          </div>
        </div>
      </div>

      {/* Learning Sources 4-Layer */}
      <div className="mb-6">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          📚 학습 소스
          <button
            onClick={() => setShowConnectModal(true)}
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            [+ 연결]
          </button>
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(state.sources).map(([key, source]) => (
            <SourceCard key={key} source={source} layerKey={key} />
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'recommendations' as const, label: '💡 추천', count: state.recommendations.length },
          { id: 'discoveries' as const, label: '🔍 발견', count: state.discoveries.length },
          { id: 'automations' as const, label: '⚡ 자동화', count: state.automations.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-cyan-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-4">
          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">💡 AUTUS 추천</h2>
                <span className="text-xs text-gray-500">ROF = 결과 + 효율 + 미래</span>
              </div>
              {state.recommendations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  ✨ 모든 추천을 확인했어요!
                </div>
              ) : (
                state.recommendations.map(rec => (
                  <RecommendationCard
                    key={rec.rec_id}
                    rec={rec}
                    onAccept={handleAccept}
                    onDismiss={handleDismiss}
                  />
                ))
              )}
            </div>
          )}

          {/* Discoveries Tab */}
          {activeTab === 'discoveries' && (
            <div className="space-y-4">
              <h2 className="font-semibold">🔍 AUTUS가 발견한 것</h2>
              {state.discoveries.map(d => (
                <div
                  key={d.id}
                  className={`p-4 rounded-xl border ${
                    d.feedback === 'positive' ? 'bg-green-500/10 border-green-500/30' :
                    d.feedback === 'negative' ? 'bg-red-500/10 border-red-500/30 opacity-50' :
                    'bg-gray-800 border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm">{d.text}</p>
                      <p className="text-xs text-gray-500 mt-1">신뢰도 {d.confidence}%</p>
                    </div>
                    {!d.feedback && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDiscoveryFeedback(d.id, true)}
                          className="p-2 hover:bg-green-500/20 rounded-lg"
                        >
                          👍
                        </button>
                        <button
                          onClick={() => handleDiscoveryFeedback(d.id, false)}
                          className="p-2 hover:bg-red-500/20 rounded-lg"
                        >
                          👎
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Automations Tab */}
          {activeTab === 'automations' && (
            <div className="space-y-4">
              <h2 className="font-semibold">⚡ 자동화 작동 중</h2>
              {state.automations.map(auto => (
                <div key={auto.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${auto.enabled ? 'bg-green-400' : 'bg-gray-500'}`} />
                    <div>
                      <p className="font-medium">{auto.name}</p>
                      <p className="text-xs text-gray-500">{auto.executions}건 처리</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleAutomation(auto.id)}
                    className={`px-3 py-1 rounded-full text-xs ${
                      auto.enabled
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {auto.enabled ? '작동 중' : '일시정지'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Accuracy Chart */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h3 className="font-semibold mb-3">📈 정확도 추이</h3>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={state.accuracyHistory}>
                <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[60, 90]} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }} 
                />
                <Line type="monotone" dataKey="accuracy" stroke="#06b6d4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ROF Guide */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h3 className="font-semibold mb-3">📊 ROF 기준</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <div>
                  <p className="font-medium text-green-400">Result (결과)</p>
                  <p className="text-xs text-gray-500">매출, 전환율, 정확도 향상</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <div>
                  <p className="font-medium text-cyan-400">Optimization (효율)</p>
                  <p className="text-xs text-gray-500">시간, 비용, 복잡도 절감</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🛡️</span>
                <div>
                  <p className="font-medium text-purple-400">Future (미래)</p>
                  <p className="text-xs text-gray-500">위험 감소, 기회 포착</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">🔗 외부 서비스 연결</h2>
              <button 
                onClick={() => setShowConnectModal(false)} 
                className="p-2 hover:bg-gray-800 rounded-lg"
              >
                ✕
              </button>
            </div>
            
            <p className="text-sm text-gray-400 mb-4">
              서비스를 연결하면 더 정확한 학습이 가능합니다
            </p>
            
            <div className="space-y-3">
              {state.availableServices.map(service => (
                <div key={service.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-xs text-gray-500">{service.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-cyan-400">+{service.impact}% 정확도</span>
                    {service.connected ? (
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">연결됨</span>
                    ) : (
                      <button
                        onClick={() => handleConnect(service.id)}
                        className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 rounded-full text-xs"
                      >
                        연결
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningPageV2;
