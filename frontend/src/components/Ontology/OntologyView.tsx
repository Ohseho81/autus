// ═══════════════════════════════════════════════════════════════════════════
// AUTUS Ontology View - 인지 직관형 1:3:9 시각화
// "UI는 설명이 필요 없을 때 완성됩니다"
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Heart, Wallet, Shield, Briefcase, BookOpen, Lightbulb, 
  Users, Globe, Award, Plus, Activity, Grid3X3, Circle, Brain,
  AlertTriangle, CheckCircle, Clock, Target, Zap, BarChart3
} from 'lucide-react';
import { FractalCircleMap } from './FractalCircleMap';
import { SelfDiagnosticMap } from './SelfDiagnosticMap';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface NodeState {
  id: string;
  name: string;
  value: number;          // 0-1
  confidence: number;     // 0-1 (reliability)
  log_count: number;
  uncertainty_level: 'range' | 'estimate' | 'confirmed';
  actionable: boolean;
  logs_needed?: number;   // 액션 가능하려면 필요한 로그 수
}

interface DomainState {
  id: string;
  name: string;
  nameKo: string;
  value: number;
  confidence: number;
  weight: number;
  nodes: string[];
  color: string;
}

type ViewMode = 'fractal' | 'list' | 'diagnostic';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const NODE_ICONS: Record<string, React.ReactNode> = {
  HEALTH: <Heart className="w-5 h-5" />,
  WEALTH: <Wallet className="w-5 h-5" />,
  SECURITY: <Shield className="w-5 h-5" />,
  CAREER: <Briefcase className="w-5 h-5" />,
  LEARNING: <BookOpen className="w-5 h-5" />,
  CREATION: <Lightbulb className="w-5 h-5" />,
  FAMILY: <Users className="w-5 h-5" />,
  SOCIAL: <Globe className="w-5 h-5" />,
  LEGACY: <Award className="w-5 h-5" />,
};

const NODE_NAMES_KO: Record<string, string> = {
  HEALTH: '건강',
  WEALTH: '재정',
  SECURITY: '안전',
  CAREER: '경력',
  LEARNING: '학습',
  CREATION: '창작',
  FAMILY: '가족',
  SOCIAL: '사회',
  LEGACY: '유산',
};

// ═══════════════════════════════════════════════════════════════════════════
// Initial Data
// ═══════════════════════════════════════════════════════════════════════════

const INITIAL_DOMAINS: DomainState[] = [
  { id: 'SURVIVE', name: 'SURVIVE', nameKo: '생존', value: 0.65, confidence: 0.65, weight: 0.40, nodes: ['HEALTH', 'WEALTH', 'SECURITY'], color: '#ef4444' },
  { id: 'GROW', name: 'GROW', nameKo: '성장', value: 0.55, confidence: 0.51, weight: 0.35, nodes: ['CAREER', 'LEARNING', 'CREATION'], color: '#22c55e' },
  { id: 'CONNECT', name: 'CONNECT', nameKo: '연결', value: 0.62, confidence: 0.50, weight: 0.25, nodes: ['FAMILY', 'SOCIAL', 'LEGACY'], color: '#3b82f6' },
];

const INITIAL_NODES: NodeState[] = [
  // SURVIVE
  { id: 'HEALTH', name: '건강', value: 0.72, confidence: 0.85, log_count: 45, uncertainty_level: 'confirmed', actionable: true },
  { id: 'WEALTH', name: '재정', value: 0.58, confidence: 0.68, log_count: 28, uncertainty_level: 'estimate', actionable: true },
  { id: 'SECURITY', name: '안전', value: 0.65, confidence: 0.42, log_count: 12, uncertainty_level: 'estimate', actionable: false, logs_needed: 8 },
  // GROW
  { id: 'CAREER', name: '경력', value: 0.62, confidence: 0.75, log_count: 38, uncertainty_level: 'confirmed', actionable: true },
  { id: 'LEARNING', name: '학습', value: 0.55, confidence: 0.52, log_count: 18, uncertainty_level: 'estimate', actionable: false, logs_needed: 7 },
  { id: 'CREATION', name: '창작', value: 0.48, confidence: 0.25, log_count: 6, uncertainty_level: 'range', actionable: false, logs_needed: 14 },
  // CONNECT
  { id: 'FAMILY', name: '가족', value: 0.82, confidence: 0.88, log_count: 52, uncertainty_level: 'confirmed', actionable: true },
  { id: 'SOCIAL', name: '사회', value: 0.65, confidence: 0.48, log_count: 15, uncertainty_level: 'estimate', actionable: false, logs_needed: 10 },
  { id: 'LEGACY', name: '유산', value: 0.38, confidence: 0.18, log_count: 3, uncertainty_level: 'range', actionable: false, logs_needed: 17 },
];

// ═══════════════════════════════════════════════════════════════════════════
// Visual Helpers
// ═══════════════════════════════════════════════════════════════════════════

const getVisualState = (confidence: number) => {
  if (confidence >= 0.7) {
    return { blur: 0, opacity: 1, state: 'confirmed' as const, color: '#22c55e' };
  } else if (confidence >= 0.3) {
    return { blur: 2, opacity: 0.8, state: 'estimate' as const, color: '#eab308' };
  } else {
    return { blur: 4, opacity: 0.5, state: 'range' as const, color: '#ef4444' };
  }
};

const getTrafficLightColor = (confidence: number) => {
  if (confidence >= 0.7) return 'emerald';
  if (confidence >= 0.3) return 'yellow';
  return 'red';
};

// 자기 진단 메시지 생성
const generateStatusReport = (node: NodeState): string => {
  const { name, value, confidence, log_count, actionable } = node;
  
  if (confidence >= 0.7) {
    return `나(${name})는 현재 안정적이야. ${log_count}개의 데이터가 쌓여서 신뢰할 수 있어.`;
  }
  
  if (confidence >= 0.5) {
    return `나(${name})는 지금 주의가 필요해. 데이터가 ${log_count}개뿐이라 판단이 좀 불안정해.`;
  }
  
  if (confidence >= 0.3) {
    return `나(${name})는 지금 불안해! 로그가 ${log_count}개밖에 없어서 정확한 판단이 어려워.`;
  }
  
  return `나(${name})는 지금 위험 상태야! 데이터가 거의 없어서 아무것도 확신할 수 없어. 도와줘!`;
};

// ═══════════════════════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════════════════════

// 인지 직관형 노드 카드
function IntuitiveNodeCard({ 
  node, 
  domainColor,
  isSelected,
  onClick 
}: { 
  node: NodeState;
  domainColor: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const visual = getVisualState(node.confidence);
  const trafficColor = getTrafficLightColor(node.confidence);
  
  return (
    <div 
      onClick={onClick}
      className={`
        relative p-4 rounded-xl cursor-pointer transition-all duration-300
        ${isSelected ? 'ring-2 ring-cyan-400 scale-105' : ''}
        ${!node.actionable ? 'pointer-events-auto' : ''}
      `}
      style={{
        backgroundColor: `${domainColor}20`,
        filter: `blur(${visual.blur * 0.5}px)`,
        opacity: visual.opacity,
      }}
    >
      {/* 신호등 인디케이터 */}
      <div 
        className={`absolute top-2 right-2 w-3 h-3 rounded-full bg-${trafficColor}-500 ${
          visual.state === 'range' ? 'animate-pulse' : ''
        }`}
        title={visual.state === 'confirmed' ? '신뢰 가능' : visual.state === 'estimate' ? '추정값' : '데이터 부족'}
      />
      
      {/* 아이콘 + 이름 */}
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${domainColor}30` }}
        >
          <div style={{ color: domainColor }}>
            {NODE_ICONS[node.id]}
          </div>
        </div>
        <div>
          <h4 className="font-bold">{node.name}</h4>
          <p className="text-xs text-slate-500">{node.id}</p>
        </div>
      </div>
      
      {/* 값 - 큰 숫자로 직관적 표시 */}
      <div className="text-center my-4">
        <div 
          className="text-4xl font-bold"
          style={{ color: domainColor }}
        >
          {Math.round(node.value * 100)}
        </div>
        <div className="text-xs text-slate-500">/ 100</div>
      </div>
      
      {/* 진행 바 (값) */}
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${node.value * 100}%`,
            backgroundColor: domainColor,
          }}
        />
      </div>
      
      {/* 신뢰도 바 */}
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 bg-${trafficColor}-500`}
          style={{ width: `${node.confidence * 100}%` }}
        />
      </div>
      
      {/* 상태 메시지 */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className={`text-${trafficColor}-400 flex items-center gap-1`}>
          {visual.state === 'confirmed' && <CheckCircle className="w-3 h-3" />}
          {visual.state === 'estimate' && <Clock className="w-3 h-3" />}
          {visual.state === 'range' && <AlertTriangle className="w-3 h-3" />}
          {visual.state === 'confirmed' ? '확인됨' : visual.state === 'estimate' ? '추정값' : '수집 중'}
        </span>
        <span className="text-slate-500">{node.log_count}건</span>
      </div>
      
      {/* Action Gate - 비활성화 시 오버레이 */}
      {!node.actionable && (
        <div 
          className="absolute inset-0 bg-slate-950/50 rounded-xl flex items-center justify-center"
          style={{ backdropFilter: 'blur(2px)' }}
        >
          <div className="text-center px-4">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-xs text-amber-400 font-medium">
              증거 부족: {node.logs_needed || '?'}건 더 필요
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Action Gate 상세 패널
function ActionGatePanel({ 
  node, 
  domainColor,
  onClose,
  onAction 
}: { 
  node: NodeState;
  domainColor: string;
  onClose: () => void;
  onAction: (action: string) => void;
}) {
  const visual = getVisualState(node.confidence);
  const trafficColor = getTrafficLightColor(node.confidence);
  
  const actions = [
    { id: 'observe', label: '관찰하기', icon: <Target className="w-4 h-4" />, minConfidence: 0, description: '현재 상태를 기록합니다' },
    { id: 'suggest', label: '제안받기', icon: <Lightbulb className="w-4 h-4" />, minConfidence: 0.3, description: 'AI가 개선점을 제안합니다' },
    { id: 'plan', label: '계획 세우기', icon: <BarChart3 className="w-4 h-4" />, minConfidence: 0.5, description: '목표와 계획을 설정합니다' },
    { id: 'action', label: '행동하기', icon: <Zap className="w-4 h-4" />, minConfidence: 0.7, description: '구체적인 액션을 실행합니다' },
  ];
  
  return (
    <div className="bg-slate-900/95 backdrop-blur-lg border border-slate-700 rounded-2xl p-6 max-w-md">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div 
            className="p-3 rounded-xl"
            style={{ backgroundColor: `${domainColor}30` }}
          >
            <div style={{ color: domainColor }}>
              {NODE_ICONS[node.id]}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg">{node.name}</h3>
            <p className="text-sm text-slate-400">Action Gate</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          ✕
        </button>
      </div>
      
      {/* 현재 신뢰도 시각화 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">데이터 신뢰도</span>
          <span className={`text-${trafficColor}-400 font-bold`}>
            {Math.round(node.confidence * 100)}%
          </span>
        </div>
        <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden">
          {/* 구간 마커 */}
          <div className="absolute top-0 left-[30%] w-px h-full bg-slate-600" />
          <div className="absolute top-0 left-[70%] w-px h-full bg-slate-600" />
          {/* 현재 값 */}
          <div 
            className={`h-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 transition-all duration-500`}
            style={{ width: `${node.confidence * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-slate-500">
          <span>불확실</span>
          <span>추정</span>
          <span>확인됨</span>
        </div>
      </div>
      
      {/* 액션 버튼 목록 */}
      <div className="space-y-2">
        {actions.map(action => {
          const isEnabled = node.confidence >= action.minConfidence;
          
          return (
            <button
              key={action.id}
              onClick={() => isEnabled && onAction(action.id)}
              disabled={!isEnabled}
              className={`
                w-full p-4 rounded-xl flex items-center gap-4 transition-all
                ${isEnabled 
                  ? 'bg-slate-800 hover:bg-slate-700 cursor-pointer' 
                  : 'bg-slate-900/50 cursor-not-allowed opacity-50'
                }
              `}
              style={{
                filter: isEnabled ? 'none' : 'blur(1px)',
              }}
            >
              <div className={`p-2 rounded-lg ${isEnabled ? 'bg-cyan-900/50 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
                {action.icon}
              </div>
              <div className="flex-1 text-left">
                <div className={`font-medium ${isEnabled ? 'text-white' : 'text-slate-500'}`}>
                  {action.label}
                </div>
                <div className="text-xs text-slate-500">
                  {action.description}
                </div>
              </div>
              {!isEnabled && (
                <div className="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded">
                  {Math.round(action.minConfidence * 100)}% 필요
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* 안내 메시지 */}
      <div className="mt-6 p-3 bg-slate-800/50 rounded-lg">
        <p className="text-xs text-slate-400 text-center">
          💡 신뢰할 수 없는 데이터로는 행동하지 않습니다
        </p>
      </div>
    </div>
  );
}

// 로그 입력 패널 (개선된 버전)
function LogInputPanel({ onSubmit }: { onSubmit: (content: string, category?: string) => void }) {
  const [input, setInput] = useState('');
  
  const quickLogs = [
    { text: '운동했다 💪', category: 'HEALTH' },
    { text: '책을 읽었다 📚', category: 'LEARNING' },
    { text: '가족과 식사 🍽️', category: 'FAMILY' },
    { text: '업무 완료 ✅', category: 'CAREER' },
    { text: '저축했다 💰', category: 'WEALTH' },
    { text: '친구를 만났다 🤝', category: 'SOCIAL' },
  ];

  const handleSubmit = () => {
    if (input.trim()) {
      onSubmit(input.trim());
      setInput('');
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur rounded-2xl p-5 border border-slate-800">
      <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
        <Plus className="w-4 h-4 text-cyan-400" /> 오늘 뭘 했나요?
      </h3>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="관찰 중인 흐름 검색..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
        />
        <button
          onClick={handleSubmit}
          className="px-5 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-sm font-medium transition-all"
        >
          추가
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {quickLogs.map((log, i) => (
          <button
            key={i}
            onClick={() => onSubmit(log.text, log.category)}
            className="px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded-full transition-colors border border-slate-700 hover:border-slate-600"
          >
            {log.text}
          </button>
        ))}
      </div>
    </div>
  );
}

// SELF 상태 표시 (개선된 버전)
function SelfStatus({ value, confidence, systemState, totalLogs }: { 
  value: number; 
  confidence: number;
  systemState: string;
  totalLogs: number;
}) {
  const visual = getVisualState(confidence);
  const circumference = 2 * Math.PI * 50;
  const strokeDashoffset = circumference * (1 - value);

  return (
    <div className="bg-slate-900/80 backdrop-blur rounded-2xl p-5 border border-slate-800">
      <div className="flex items-center gap-6">
        {/* 원형 게이지 */}
        <div className="relative w-28 h-28">
          <svg className="w-28 h-28 transform -rotate-90" style={{ filter: `blur(${visual.blur * 0.3}px)` }}>
            <circle
              cx="56" cy="56" r="50"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-800"
            />
            <circle
              cx="56" cy="56" r="50"
              fill="none"
              stroke="url(#selfGradient)"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000"
              style={{ opacity: visual.opacity }}
            />
            <defs>
              <linearGradient id="selfGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{Math.round(value * 100)}</span>
            <span className="text-[10px] text-slate-500">SELF</span>
          </div>
        </div>
        
        {/* 상태 정보 */}
        <div className="flex-1">
          <div className="mb-3">
            <div className="text-sm text-slate-400 mb-1">시스템 상태</div>
            <div className={`font-bold text-lg ${
              systemState === 'STABLE' ? 'text-emerald-400' :
              systemState === 'VOLATILE' ? 'text-yellow-400' : 'text-cyan-400'
            }`}>
              {systemState === 'STABLE' ? '안정' : systemState === 'VOLATILE' ? '변동' : '기회'}
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <div>
              <div className="text-slate-500 text-xs">로그</div>
              <div className="font-bold text-cyan-400">{totalLogs}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">신뢰도</div>
              <div className={`font-bold text-${getTrafficLightColor(confidence)}-400`}>
                {Math.round(confidence * 100)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function OntologyView() {
  const [viewMode, setViewMode] = useState<ViewMode>('fractal');
  const [domains, setDomains] = useState<DomainState[]>(INITIAL_DOMAINS);
  const [nodes, setNodes] = useState<NodeState[]>(INITIAL_NODES);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [recentLogs, setRecentLogs] = useState<string[]>([]);
  const [showActionGate, setShowActionGate] = useState(false);
  
  // SELF 값 계산
  const selfValue = useMemo(() => {
    return domains.reduce((sum, d) => sum + d.value * d.weight, 0);
  }, [domains]);
  
  // 전체 신뢰도 계산
  const selfConfidence = useMemo(() => {
    return domains.reduce((sum, d) => sum + d.confidence * d.weight, 0);
  }, [domains]);
  
  // 총 로그 수
  const totalLogs = useMemo(() => {
    return nodes.reduce((sum, n) => sum + n.log_count, 0);
  }, [nodes]);
  
  // 로그 처리
  const handleLogSubmit = useCallback((content: string, category?: string) => {
    setRecentLogs(prev => [content, ...prev.slice(0, 4)]);
    
    // 노드 업데이트
    setNodes(prevNodes => {
      const newNodes = [...prevNodes];
      
      // 카테고리 매칭
      const targetNodes: string[] = [];
      if (category) {
        targetNodes.push(category);
      } else {
        // 키워드 기반 매칭
        if (content.includes('운동') || content.includes('건강') || content.includes('💪')) targetNodes.push('HEALTH');
        if (content.includes('책') || content.includes('배웠') || content.includes('📚')) targetNodes.push('LEARNING');
        if (content.includes('가족') || content.includes('식사') || content.includes('🍽️')) targetNodes.push('FAMILY');
        if (content.includes('업무') || content.includes('완료') || content.includes('✅')) targetNodes.push('CAREER');
        if (content.includes('저축') || content.includes('💰')) targetNodes.push('WEALTH');
        if (content.includes('친구') || content.includes('🤝')) targetNodes.push('SOCIAL');
      }
      
      targetNodes.forEach(nodeId => {
        const idx = newNodes.findIndex(n => n.id === nodeId);
        if (idx !== -1) {
          newNodes[idx] = {
            ...newNodes[idx],
            value: Math.min(1, newNodes[idx].value + 0.02),
            confidence: Math.min(1, newNodes[idx].confidence + 0.01),
            log_count: newNodes[idx].log_count + 1,
          };
          
          // 신뢰도에 따른 상태 업데이트
          if (newNodes[idx].confidence >= 0.7) {
            newNodes[idx].uncertainty_level = 'confirmed';
            newNodes[idx].actionable = true;
          } else if (newNodes[idx].confidence >= 0.3) {
            newNodes[idx].uncertainty_level = 'estimate';
          }
        }
      });
      
      return newNodes;
    });
    
    // 도메인 값 재계산
    setDomains(prevDomains => {
      return prevDomains.map(domain => {
        const domainNodes = nodes.filter(n => domain.nodes.includes(n.id));
        const avgValue = domainNodes.reduce((sum, n) => sum + n.value, 0) / domainNodes.length;
        const avgConfidence = domainNodes.reduce((sum, n) => sum + n.confidence, 0) / domainNodes.length;
        return {
          ...domain,
          value: avgValue,
          confidence: avgConfidence,
        };
      });
    });
  }, [nodes]);
  
  // 노드 클릭 핸들러
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
    setShowActionGate(true);
  }, []);
  
  // 선택된 노드 데이터
  const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null;
  const selectedNodeDomain = selectedNode ? domains.find(d => d.nodes.includes(selectedNode)) : null;
  
  return (
    <div className="min-h-full h-full bg-slate-950 text-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">🧬</span> AUTUS Ontology
            </h1>
            <p className="text-xs text-slate-500">인지 직관형 1:3:9 시각화</p>
          </div>
          
          {/* 뷰 모드 전환 */}
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('diagnostic')}
              className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                viewMode === 'diagnostic' 
                  ? 'bg-gradient-to-r from-amber-600 to-red-600 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Brain className="w-4 h-4" /> 자가진단
            </button>
            <button
              onClick={() => setViewMode('fractal')}
              className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                viewMode === 'fractal' 
                  ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Circle className="w-4 h-4" /> 프랙탈
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                viewMode === 'list' 
                  ? 'bg-slate-700 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-4 h-4" /> 리스트
            </button>
          </div>
        </div>
      </header>
      
      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* 자가진단 모드 - 전체 화면 */}
        {viewMode === 'diagnostic' && (
          <SelfDiagnosticMap
            diagnoses={nodes.map(n => ({
              node_id: n.id,
              node_name: n.name,
              health_status: n.confidence >= 0.7 ? 'healthy' : n.confidence >= 0.4 ? 'warning' : 'critical',
              urgency_level: Math.max(1, Math.round((1 - n.confidence) * 10)),
              status_report: generateStatusReport(n),
              primary_issue: n.confidence < 0.5 ? '신뢰도 부족' : n.confidence < 0.7 ? '데이터 추가 필요' : '안정',
              reliability_score: n.confidence,
              freshness_score: Math.min(1, n.log_count / 30),
              consistency_score: Math.min(1, n.log_count / 20),
              upstream_issues: [],
              downstream_risks: [],
              recommended_action: n.logs_needed 
                ? `${n.name} 영역에서 ${n.logs_needed}건의 추가 흐름이 감지되면 신뢰도가 높아집니다.`
                : `${n.name}는 안정적입니다.`,
              action_enabled: n.actionable,
              logs_needed: n.logs_needed || 0,
              value: n.value,
              domain: domains.find(d => d.nodes.includes(n.id))?.id || 'SURVIVE',
              domainColor: domains.find(d => d.nodes.includes(n.id))?.color || '#ef4444',
            }))}
            bottlenecks={[]}
            selfValue={selfValue}
            onNodeSelect={handleNodeClick}
          />
        )}
        
        {/* 프랙탈/리스트 모드 */}
        {viewMode !== 'diagnostic' && (
        <div className="grid grid-cols-12 gap-6">
          {/* 좌측: 메인 시각화 */}
          <div className="col-span-8">
            {viewMode === 'fractal' ? (
              <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden" style={{ height: '600px' }}>
                <FractalCircleMap
                  selfValue={selfValue}
                  domains={domains}
                  nodes={nodes}
                  onNodeClick={handleNodeClick}
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {domains.map(domain => (
                  <div key={domain.id} className="space-y-4">
                    {/* 도메인 헤더 */}
                    <div 
                      className="p-4 rounded-xl"
                      style={{ 
                        backgroundColor: `${domain.color}20`,
                        borderLeft: `4px solid ${domain.color}`,
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-bold" style={{ color: domain.color }}>
                            {domain.nameKo}
                          </h3>
                          <p className="text-xs text-slate-500">{domain.name}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold" style={{ color: domain.color }}>
                            {Math.round(domain.value * 100)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            가중치 {Math.round(domain.weight * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* 도메인 내 노드들 */}
                    {nodes
                      .filter(n => domain.nodes.includes(n.id))
                      .map(node => (
                        <IntuitiveNodeCard
                          key={node.id}
                          node={node}
                          domainColor={domain.color}
                          isSelected={selectedNode === node.id}
                          onClick={() => handleNodeClick(node.id)}
                        />
                      ))
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 우측: 상태 및 입력 */}
          <div className="col-span-4 space-y-4">
            {/* SELF 상태 */}
            <SelfStatus
              value={selfValue}
              confidence={selfConfidence}
              systemState="STABLE"
              totalLogs={totalLogs}
            />
            
            {/* 로그 입력 */}
            <LogInputPanel onSubmit={handleLogSubmit} />
            
            {/* 최근 로그 */}
            <div className="bg-slate-900/80 backdrop-blur rounded-2xl p-5 border border-slate-800">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" /> 최근 활동
              </h3>
              {recentLogs.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  아직 기록이 없습니다
                </p>
              ) : (
                <div className="space-y-2">
                  {recentLogs.map((log, i) => (
                    <div 
                      key={i} 
                      className="p-3 bg-slate-800/50 rounded-lg text-sm"
                      style={{ opacity: 1 - i * 0.15 }}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* 범례 */}
            <div className="bg-slate-900/80 backdrop-blur rounded-2xl p-5 border border-slate-800">
              <h3 className="font-bold text-sm mb-4">신호등 시스템</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-emerald-500" />
                  <div>
                    <div className="text-sm font-medium">확인됨</div>
                    <div className="text-xs text-slate-500">신뢰도 ≥70% - 액션 가능</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-yellow-500" />
                  <div>
                    <div className="text-sm font-medium">추정값</div>
                    <div className="text-xs text-slate-500">신뢰도 30-70% - 제한된 액션</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                  <div>
                    <div className="text-sm font-medium">수집 중</div>
                    <div className="text-xs text-slate-500">신뢰도 &lt;30% - 데이터 필요</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </main>
      
      {/* Action Gate 모달 */}
      {showActionGate && selectedNodeData && selectedNodeDomain && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowActionGate(false)}
        >
          <div onClick={e => e.stopPropagation()}>
            <ActionGatePanel
              node={selectedNodeData}
              domainColor={selectedNodeDomain.color}
              onClose={() => setShowActionGate(false)}
              onAction={(action) => {
                console.log(`Action: ${action} on ${selectedNodeData.id}`);
                setShowActionGate(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default OntologyView;