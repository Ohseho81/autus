// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Explainable AI Interface
// ═══════════════════════════════════════════════════════════════════════════════
//
// "왜 이 노드가 붉게 변했는가?"에 대한 인간 이해 가능 설명 UI
// - 자연어 질의 인터페이스
// - 인과 체인 시각화
// - 리스크 설명 패널
//
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCausality } from './engine';
import { CausalNode, CausalQuery, ReasoningOutput, QueryType } from './types';
import { SCALE_CONFIGS, KScale } from '../schema';

// ═══════════════════════════════════════════════════════════════════════════════
// 자연어 질의 입력
// ═══════════════════════════════════════════════════════════════════════════════

interface QueryInputProps {
  onSubmit: (query: string, type: QueryType) => void;
  isLoading: boolean;
}

export function QueryInput({ onSubmit, isLoading }: QueryInputProps) {
  const [input, setInput] = useState('');
  const [selectedType, setSelectedType] = useState<QueryType>('why');
  
  const queryTypes: { type: QueryType; label: string; icon: string }[] = [
    { type: 'why', label: '왜?', icon: '❓' },
    { type: 'what_if', label: '만약?', icon: '🔮' },
    { type: 'impact', label: '영향?', icon: '💥' },
    { type: 'risk', label: '리스크?', icon: '⚠️' },
    { type: 'alternatives', label: '대안?', icon: '🔄' },
    { type: 'optimal', label: '최적?', icon: '🎯' },
  ];
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSubmit(input, selectedType);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* 질의 유형 선택 */}
      <div className="flex gap-2 flex-wrap">
        {queryTypes.map(({ type, label, icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => setSelectedType(type)}
            className={`
              px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5
              transition-all duration-200
              ${selectedType === type 
                ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400' 
                : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'}
            `}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
      
      {/* 입력 필드 */}
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="질문을 입력하세요... (예: 이 결정이 왜 위험한가요?)"
          className="
            w-full px-4 py-3 pr-12
            bg-white/5 border border-white/10 rounded-xl
            text-white placeholder:text-white/30
            focus:outline-none focus:border-amber-500/50 focus:bg-white/10
            transition-all duration-200
          "
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="
            absolute right-2 top-1/2 -translate-y-1/2
            w-8 h-8 rounded-lg
            bg-amber-500 text-black
            flex items-center justify-center
            disabled:opacity-30 disabled:cursor-not-allowed
            hover:bg-amber-400 transition-colors
          "
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              ⏳
            </motion.div>
          ) : (
            '→'
          )}
        </button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 추론 체인 시각화
// ═══════════════════════════════════════════════════════════════════════════════

interface ReasoningChainProps {
  output: ReasoningOutput;
}

export function ReasoningChain({ output }: ReasoningChainProps) {
  return (
    <div className="space-y-4">
      {/* 추론 단계들 */}
      <div className="space-y-2">
        {output.chain.map((step, index) => (
          <motion.div
            key={step.order}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`
              p-3 rounded-lg border-l-4 
              ${step.type === 'observation' ? 'border-l-blue-500 bg-blue-500/10' : ''}
              ${step.type === 'inference' ? 'border-l-purple-500 bg-purple-500/10' : ''}
              ${step.type === 'hypothesis' ? 'border-l-amber-500 bg-amber-500/10' : ''}
              ${step.type === 'conclusion' ? 'border-l-green-500 bg-green-500/10' : ''}
            `}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">
                {step.type === 'observation' && '👁️'}
                {step.type === 'inference' && '🧠'}
                {step.type === 'hypothesis' && '💭'}
                {step.type === 'conclusion' && '✅'}
              </span>
              <div className="flex-1">
                <div className="text-xs text-white/40 mb-1">
                  {step.type === 'observation' && '관찰'}
                  {step.type === 'inference' && '추론'}
                  {step.type === 'hypothesis' && '가설'}
                  {step.type === 'conclusion' && '결론'}
                </div>
                <div className="text-sm text-white">{step.contentKo}</div>
                <div className="mt-1 text-xs text-white/30">
                  신뢰도: {Math.round(step.confidence * 100)}%
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* 결론 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: output.chain.length * 0.1 }}
        className="p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🎯</span>
          <span className="font-semibold text-amber-400">최종 결론</span>
        </div>
        <p className="text-white">{output.conclusion.decision}</p>
        <div className="mt-2 text-sm text-white/50">
          신뢰도: {Math.round(output.conclusion.confidence * 100)}%
          · 처리 시간: {Math.round(output.processingTime)}ms
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 리스크 설명 패널
// ═══════════════════════════════════════════════════════════════════════════════

interface RiskExplanationProps {
  nodeId: string;
  node?: CausalNode;
  explanation: string;
  onClose: () => void;
}

export function RiskExplanation({ nodeId, node, explanation, onClose }: RiskExplanationProps) {
  const config = node ? SCALE_CONFIGS[node.scale] : SCALE_CONFIGS[1];
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="
        fixed inset-4 md:inset-auto md:right-6 md:top-20 md:w-96
        backdrop-blur-xl bg-black/80 border border-white/20
        rounded-2xl shadow-2xl overflow-hidden
        z-50
      "
    >
      {/* 헤더 */}
      <div 
        className="px-4 py-3 border-b border-white/10 flex items-center justify-between"
        style={{ backgroundColor: `${config.ui.color}20` }}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: config.ui.color }}
          />
          <span className="font-semibold text-white">리스크 분석</span>
        </div>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>
      
      {/* 내용 */}
      <div className="p-4 max-h-96 overflow-y-auto">
        <pre className="text-sm text-white/80 whitespace-pre-wrap font-mono">
          {explanation}
        </pre>
      </div>
      
      {/* 푸터 */}
      {node && (
        <div className="px-4 py-3 border-t border-white/10 bg-white/5">
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>K{node.scale} · {config.nameKo}</span>
            <span>비가역성: {Math.round(node.impact.irreversibility * 100)}%</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 인과 그래프 미니맵
// ═══════════════════════════════════════════════════════════════════════════════

interface CausalMinimapProps {
  nodes: Array<{ id: string; label: string; color: string; size: number }>;
  edges: Array<{ source: string; target: string; strength: number }>;
  highlightedNodes: string[];
  onNodeClick: (nodeId: string) => void;
}

export function CausalMinimap({ 
  nodes, 
  edges, 
  highlightedNodes,
  onNodeClick 
}: CausalMinimapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // 간단한 force-directed 레이아웃 시뮬레이션
  const nodePositions = React.useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const centerX = 150;
    const centerY = 100;
    const radius = 60;
    
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      positions[node.id] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });
    
    return positions;
  }, [nodes]);
  
  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🕸️</span>
        <span className="text-sm font-semibold text-white">인과관계 맵</span>
      </div>
      
      <svg
        ref={svgRef}
        viewBox="0 0 300 200"
        className="w-full h-40 bg-black/20 rounded-lg"
      >
        {/* 엣지 */}
        <g className="edges">
          {edges.map((edge, i) => {
            const source = nodePositions[edge.source];
            const target = nodePositions[edge.target];
            if (!source || !target) return null;
            
            return (
              <line
                key={i}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={edge.strength * 2}
              />
            );
          })}
        </g>
        
        {/* 노드 */}
        <g className="nodes">
          {nodes.map((node) => {
            const pos = nodePositions[node.id];
            if (!pos) return null;
            
            const isHighlighted = highlightedNodes.includes(node.id);
            
            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => onNodeClick(node.id)}
                className="cursor-pointer"
              >
                {isHighlighted && (
                  <circle
                    r={node.size + 5}
                    fill="none"
                    stroke={node.color}
                    strokeWidth={2}
                    opacity={0.5}
                  />
                )}
                <circle
                  r={node.size}
                  fill={node.color}
                  opacity={isHighlighted ? 1 : 0.7}
                />
                <text
                  y={node.size + 12}
                  textAnchor="middle"
                  fill="white"
                  fontSize="8"
                  opacity={0.7}
                >
                  {node.label.slice(0, 10)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 통합 Explainable AI 패널
// ═══════════════════════════════════════════════════════════════════════════════

interface ExplainablePanelProps {
  selectedNodeId?: string;
  onClose: () => void;
}

export function ExplainablePanel({ selectedNodeId, onClose }: ExplainablePanelProps) {
  const { query, explainRisk, graph } = useCausality();
  const [output, setOutput] = useState<ReasoningOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [riskExplanation, setRiskExplanation] = useState<string | null>(null);
  
  // 선택된 노드가 있으면 자동으로 리스크 설명 생성
  useEffect(() => {
    if (selectedNodeId) {
      const explanation = explainRisk(selectedNodeId);
      setRiskExplanation(explanation);
    }
  }, [selectedNodeId, explainRisk]);
  
  const handleQuery = async (question: string, type: QueryType) => {
    setIsLoading(true);
    
    const causalQuery: CausalQuery = {
      id: `query-${Date.now()}`,
      type,
      question,
      context: {
        nodeIds: selectedNodeId ? [selectedNodeId] : [],
      },
      options: {
        maxDepth: 5,
        includeAlternatives: true,
        explainLevel: 'detailed',
      },
    };
    
    try {
      const result = await query(causalQuery);
      setOutput(result);
    } catch (error) {
      console.error('Query failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="
        fixed right-0 top-0 bottom-0 w-full md:w-[28rem]
        bg-[#0a0a0f]/95 backdrop-blur-xl
        border-l border-white/10
        flex flex-col
        z-40
      "
    >
      {/* 헤더 */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className="text-2xl"
          >
            🧠
          </motion.div>
          <div>
            <h2 className="font-bold text-white">Explainable AI</h2>
            <p className="text-xs text-white/50">Chain of Causation Engine</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <span className="text-white/50">✕</span>
        </button>
      </div>
      
      {/* 질의 입력 */}
      <div className="p-4 border-b border-white/10">
        <QueryInput onSubmit={handleQuery} isLoading={isLoading} />
      </div>
      
      {/* 결과 표시 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 리스크 설명 */}
        {riskExplanation && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span>⚠️</span>
              <span className="font-semibold text-red-400">리스크 분석</span>
            </div>
            <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono">
              {riskExplanation}
            </pre>
          </div>
        )}
        
        {/* 추론 결과 */}
        {output && <ReasoningChain output={output} />}
        
        {/* 빈 상태 */}
        {!output && !riskExplanation && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🤔</div>
            <p className="text-white/50">
              질문을 입력하거나 노드를 선택하세요
            </p>
            <p className="text-xs text-white/30 mt-2">
              "왜 이 결정이 위험한가요?"<br/>
              "만약 예산을 줄이면 어떻게 되나요?"
            </p>
          </div>
        )}
      </div>
      
      {/* 푸터 */}
      <div className="p-3 border-t border-white/10 bg-white/5">
        <div className="flex items-center justify-between text-xs text-white/30">
          <span>Alpamayo-R1 Based CoC Engine</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Active
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export default ExplainablePanel;
