/**
 * AUTUS - Money Flow Matrix (72×72×72)
 * =====================================
 * 
 * 373,248 경우의 수 = 세상 모든 돈의 흐름
 * 
 * "내 타입" 중심 히트맵 + Golden Path 추천
 * 
 * Node(WHO) × Motion(HOW) × Work(WHAT) = Result
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ALL_72_TYPES, getTypeById, NodeType } from './data/node72Types';
import { ALL_72_FORCES, PHYSICS_NODES, ForceType } from './data/forceTypes';
import { ALL_72_WORKS, WORK_DOMAINS, WorkType, calculateMoneyFlow } from './data/workTypes';

// localStorage 키
const MY_TYPE_KEY = 'autus_my_type';

// 타입 색상
const TYPE_COLORS = {
  T: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/50', hex: '#f59e0b' },
  B: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50', hex: '#3b82f6' },
  L: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/50', hex: '#10b981' },
};

// ═══════════════════════════════════════════════════════════════════════════
// 공명 점수 계산 (Resonance Score)
// ═══════════════════════════════════════════════════════════════════════════

function calculateResonanceScore(nodeId: string, forceId: string, workId: string): number {
  const node = getTypeById(nodeId);
  const force = ALL_72_FORCES.find(f => f.id === forceId);
  const work = ALL_72_WORKS.find(w => w.id === workId);
  
  if (!node || !force || !work) return 0;
  
  // 1. 노드-작용 적합도 (0-40)
  const nodeForceMatch = force.node === 'CAPITAL' && node.category === 'T' ? 40 :
                         force.node === 'NETWORK' && node.category === 'B' ? 40 :
                         force.node === 'TIME' && node.category === 'L' ? 40 :
                         force.node === work.domain ? 30 : 15;
  
  // 2. 작용-업무 적합도 (0-30)
  const forceWorkMatch = force.node === work.domain ? 30 :
                         force.action === 'AMPLIFY' && work.pattern === 'CREATE' ? 25 :
                         force.action === 'UPGRADE' && work.pattern === 'BUILD' ? 25 : 10;
  
  // 3. 노드-업무 적합도 (0-30)
  const nodeWorkMatch = (node.category === 'T' && work.domain === 'CAPITAL') ? 30 :
                        (node.category === 'B' && ['NETWORK', 'TIME'].includes(work.domain)) ? 30 :
                        (node.category === 'L' && ['TIME', 'KNOWLEDGE'].includes(work.domain)) ? 30 : 10;
  
  // 난이도 보정
  const difficultyPenalty = (work.difficulty - 3) * 5;
  
  const score = nodeForceMatch + forceWorkMatch + nodeWorkMatch - difficultyPenalty;
  return Math.max(0, Math.min(100, score));
}

// 점수 → 색상
function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'; // 녹색
  if (score >= 60) return '#84cc16'; // 라임
  if (score >= 40) return '#eab308'; // 노랑
  if (score >= 20) return '#f97316'; // 주황
  return '#ef4444'; // 빨강
}

// ═══════════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════

export default function MoneyFlowCube() {
  const [view, setView] = useState<'heatmap' | 'golden' | 'compare' | 'calc'>('heatmap');
  
  // 내 타입 (localStorage에서 로드)
  const [myType, setMyType] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(MY_TYPE_KEY) || 'L21';
    }
    return 'L21';
  });
  
  // 선택된 셀
  const [selectedForce, setSelectedForce] = useState<string | null>(null);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  
  // 내 타입 저장
  const saveMyType = useCallback((typeId: string) => {
    setMyType(typeId);
    localStorage.setItem(MY_TYPE_KEY, typeId);
  }, []);

  const myNodeType = getTypeById(myType);

  return (
    <div className="min-h-full h-full bg-[#08080c] text-white">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-4">
          <span className="text-lg font-light tracking-wider">AUTUS</span>
          <div className="h-4 w-px bg-white/20" />
          <span className="text-sm text-white/50">Money Flow Matrix</span>
          <span className="text-xs text-white/30 ml-2">72×72×72 = 373,248</span>
          
          {/* 내 타입 표시 */}
          {myNodeType && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${TYPE_COLORS[myNodeType.category].bg} border ${TYPE_COLORS[myNodeType.category].border}`}>
              <span className="text-xs text-white/50">내 타입:</span>
              <span className={`text-sm font-bold ${TYPE_COLORS[myNodeType.category].text}`}>{myType}</span>
              <span className="text-xs text-white/60">{myNodeType.name}</span>
            </div>
          )}
        </div>

        {/* 뷰 전환 */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/5">
          {[
            { id: 'heatmap', label: '내 히트맵', icon: '🔥' },
            { id: 'golden', label: 'Golden Path', icon: '✨' },
            { id: 'compare', label: '타입 비교', icon: '⚖️' },
            { id: 'calc', label: '계산기', icon: '🧮' },
          ].map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id as typeof view)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                view === v.id 
                  ? 'bg-white/10 text-white' 
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <span className="mr-2">{v.icon}</span>
              {v.label}
            </button>
          ))}
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="p-6">
        {view === 'heatmap' && (
          <HeatmapView 
            myType={myType}
            setMyType={saveMyType}
            selectedForce={selectedForce}
            setSelectedForce={setSelectedForce}
            selectedWork={selectedWork}
            setSelectedWork={setSelectedWork}
          />
        )}
        
        {view === 'golden' && (
          <GoldenPathView myType={myType} setMyType={saveMyType} />
        )}
        
        {view === 'compare' && (
          <CompareView myType={myType} />
        )}
        
        {view === 'calc' && (
          <CalculatorView myType={myType} />
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔥 히트맵 뷰 (핵심)
// ═══════════════════════════════════════════════════════════════════════════

function HeatmapView({
  myType,
  setMyType,
  selectedForce,
  setSelectedForce,
  selectedWork,
  setSelectedWork
}: {
  myType: string;
  setMyType: (v: string) => void;
  selectedForce: string | null;
  setSelectedForce: (v: string | null) => void;
  selectedWork: string | null;
  setSelectedWork: (v: string | null) => void;
}) {
  const [hoverCell, setHoverCell] = useState<{ force: string; work: string } | null>(null);
  const [forceFilter, setForceFilter] = useState<string>('all');
  const [workFilter, setWorkFilter] = useState<string>('all');
  const [zoom, setZoom] = useState<number>(1);

  // 필터링된 데이터
  const filteredForces = forceFilter === 'all' 
    ? ALL_72_FORCES 
    : ALL_72_FORCES.filter(f => f.node === forceFilter);
  
  const filteredWorks = workFilter === 'all'
    ? ALL_72_WORKS
    : ALL_72_WORKS.filter(w => w.domain === workFilter);

  // 히트맵 데이터 계산 (메모이제이션)
  const heatmapData = useMemo(() => {
    const data: { force: string; work: string; score: number }[] = [];
    
    for (const force of filteredForces) {
      for (const work of filteredWorks) {
        const score = calculateResonanceScore(myType, force.id, work.id);
        data.push({ force: force.id, work: work.id, score });
      }
    }
    
    return data;
  }, [myType, filteredForces, filteredWorks]);

  // 선택된 셀 정보
  const selectedCell = hoverCell || (selectedForce && selectedWork ? { force: selectedForce, work: selectedWork } : null);
  const selectedScore = selectedCell ? calculateResonanceScore(myType, selectedCell.force, selectedCell.work) : null;
  const selectedForceData = selectedCell ? ALL_72_FORCES.find(f => f.id === selectedCell.force) : null;
  const selectedWorkData = selectedCell ? ALL_72_WORKS.find(w => w.id === selectedCell.work) : null;

  return (
    <div className="max-w-full mx-auto">
      {/* 타입 선택기 + 필터 */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {/* 내 타입 선택 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/50">내 타입 (Z축):</span>
            <select
              value={myType}
              onChange={(e) => setMyType(e.target.value)}
              className="bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-sm"
            >
              <optgroup label="T: 투자자">
                {ALL_72_TYPES.filter(t => t.category === 'T').map(t => (
                  <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
                ))}
              </optgroup>
              <optgroup label="B: 사업가">
                {ALL_72_TYPES.filter(t => t.category === 'B').map(t => (
                  <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
                ))}
              </optgroup>
              <optgroup label="L: 근로자">
                {ALL_72_TYPES.filter(t => t.category === 'L').map(t => (
                  <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Force 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/50">모션:</span>
            <select
              value={forceFilter}
              onChange={(e) => setForceFilter(e.target.value)}
              className="bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">전체 (72)</option>
              {Object.entries(PHYSICS_NODES).map(([id, node]) => (
                <option key={id} value={id}>{node.icon} {node.name} (12)</option>
              ))}
            </select>
          </div>

          {/* Work 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/50">업무:</span>
            <select
              value={workFilter}
              onChange={(e) => setWorkFilter(e.target.value)}
              className="bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">전체 (72)</option>
              {Object.entries(WORK_DOMAINS).map(([id, domain]) => (
                <option key={id} value={id}>{domain.icon} {domain.name.replace(' 업무', '')} (12)</option>
              ))}
            </select>
          </div>
        </div>

        {/* 줌 컨트롤 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">{filteredForces.length}×{filteredWorks.length} = {filteredForces.length * filteredWorks.length} 셀</span>
          <button 
            onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} 
            className="w-8 h-8 rounded bg-white/10 hover:bg-white/20"
          >
            -
          </button>
          <span className="text-xs text-white/50 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button 
            onClick={() => setZoom(z => Math.min(2, z + 0.25))} 
            className="w-8 h-8 rounded bg-white/10 hover:bg-white/20"
          >
            +
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 히트맵 */}
        <div className="lg:col-span-3 bg-black/30 rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <div className="text-sm text-white/50">
              X축: 모션 (F01-F72) | Y축: 업무 (W01-W72) | Z축: <span className="text-white">{myType} ({getTypeById(myType)?.name})</span>
            </div>
          </div>
          
          <div className="overflow-auto max-h-[600px]" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="p-1 bg-[#08080c] sticky left-0 z-20 min-w-[60px]"></th>
                  {filteredForces.map(force => {
                    const node = PHYSICS_NODES[force.node as keyof typeof PHYSICS_NODES];
                    return (
                      <th 
                        key={force.id} 
                        className="p-1 bg-[#08080c] text-[10px] text-white/40 font-normal min-w-[24px] whitespace-nowrap"
                        title={`${force.id}: ${force.name}`}
                      >
                        {force.id.replace('F', '')}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredWorks.map(work => (
                  <tr key={work.id}>
                    <td 
                      className="p-1 bg-[#08080c] sticky left-0 text-[10px] text-white/40 min-w-[60px]"
                      title={`${work.id}: ${work.name}`}
                    >
                      {work.id}
                    </td>
                    {filteredForces.map(force => {
                      const score = calculateResonanceScore(myType, force.id, work.id);
                      const isSelected = selectedForce === force.id && selectedWork === work.id;
                      const isHovered = hoverCell?.force === force.id && hoverCell?.work === work.id;
                      
                      return (
                        <td 
                          key={force.id}
                          className={`p-0 cursor-pointer transition-all ${isSelected || isHovered ? 'ring-2 ring-white' : ''}`}
                          onMouseEnter={() => setHoverCell({ force: force.id, work: work.id })}
                          onMouseLeave={() => setHoverCell(null)}
                          onClick={() => {
                            setSelectedForce(force.id);
                            setSelectedWork(work.id);
                          }}
                        >
                          <div 
                            className="w-6 h-6 flex items-center justify-center text-[8px] font-bold"
                            style={{ 
                              background: getScoreColor(score),
                              opacity: 0.3 + (score / 100) * 0.7,
                              color: score >= 50 ? 'white' : 'rgba(255,255,255,0.7)'
                            }}
                          >
                            {zoom >= 1 ? score : ''}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 사이드 패널 */}
        <div className="space-y-4">
          {/* 선택된 셀 정보 */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-sm text-white/50 mb-3">선택된 조합</h3>
            
            {selectedCell && selectedForceData && selectedWorkData ? (
              <div className="space-y-4">
                {/* 점수 */}
                <div className="text-center">
                  <div 
                    className="text-5xl font-bold mb-2"
                    style={{ color: getScoreColor(selectedScore || 0) }}
                  >
                    {selectedScore}
                  </div>
                  <div className="text-sm text-white/50">공명 점수</div>
                </div>

                {/* 조합 정보 */}
                <div className="space-y-2 text-sm">
                  <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30">
                    <div className="text-xs text-amber-400/70">노드 (WHO)</div>
                    <div className="font-bold text-amber-400">{myType} - {getTypeById(myType)?.name}</div>
                  </div>
                  <div className="p-2 rounded bg-purple-500/10 border border-purple-500/30">
                    <div className="text-xs text-purple-400/70">모션 (HOW)</div>
                    <div className="font-bold text-purple-400">{selectedForceData.id} - {selectedForceData.name}</div>
                    <div className="text-xs text-white/40 mt-1">{selectedForceData.desc}</div>
                  </div>
                  <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/30">
                    <div className="text-xs text-cyan-400/70">업무 (WHAT)</div>
                    <div className="font-bold text-cyan-400">{selectedWorkData.id} - {selectedWorkData.name}</div>
                    <div className="text-xs text-white/40 mt-1">{selectedWorkData.desc}</div>
                  </div>
                </div>

                {/* 추천 */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-white/10">
                  <div className="text-xs text-white/50 mb-1">💡 해석</div>
                  <div className="text-sm text-white/80">
                    {(selectedScore || 0) >= 70 
                      ? `${getTypeById(myType)?.name}이 ${selectedForceData.name}을 받아 ${selectedWorkData.name}를 수행하면 최고의 성과를 낼 수 있습니다.`
                      : (selectedScore || 0) >= 40
                        ? `보통 수준의 효율입니다. 다른 조합을 탐색해보세요.`
                        : `이 조합은 비효율적입니다. Golden Path에서 최적 경로를 확인하세요.`
                    }
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-white/30 py-8">
                히트맵 셀을 클릭하세요
              </div>
            )}
          </div>

          {/* 범례 */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-sm text-white/50 mb-3">범례</h3>
            <div className="space-y-2">
              {[
                { min: 80, label: '최적', color: '#22c55e' },
                { min: 60, label: '양호', color: '#84cc16' },
                { min: 40, label: '보통', color: '#eab308' },
                { min: 20, label: '비효율', color: '#f97316' },
                { min: 0, label: '부적합', color: '#ef4444' },
              ].map(item => (
                <div key={item.min} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ background: item.color }} />
                  <span className="text-xs text-white/60">{item.min}+ : {item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ✨ Golden Path 뷰
// ═══════════════════════════════════════════════════════════════════════════

function GoldenPathView({ myType, setMyType }: { myType: string; setMyType: (v: string) => void }) {
  // 모든 조합의 점수 계산 및 정렬
  const goldenPaths = useMemo(() => {
    const results: { force: ForceType; work: WorkType; score: number }[] = [];
    
    for (const force of ALL_72_FORCES) {
      for (const work of ALL_72_WORKS) {
        const score = calculateResonanceScore(myType, force.id, work.id);
        results.push({ force, work, score });
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  }, [myType]);

  const top20 = goldenPaths.slice(0, 20);
  const worst10 = goldenPaths.slice(-10).reverse();
  const myNodeType = getTypeById(myType);

  return (
    <div className="max-w-6xl mx-auto">
      {/* 타입 선택 */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm text-white/50">내 타입:</span>
        <select
          value={myType}
          onChange={(e) => setMyType(e.target.value)}
          className="bg-black/50 border border-white/20 rounded-lg px-4 py-2"
        >
          {ALL_72_TYPES.map(t => (
            <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
          ))}
        </select>
        {myNodeType && (
          <div className="text-sm text-white/60">
            ({myNodeType.category === 'T' ? '투자자' : myNodeType.category === 'B' ? '사업가' : '근로자'})
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 20 Golden Paths */}
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-gradient-to-r from-amber-500/10 to-transparent">
            <h3 className="text-lg font-bold text-amber-400">✨ Golden Path Top 20</h3>
            <p className="text-xs text-white/50 mt-1">당신에게 최적화된 모션 × 업무 조합</p>
          </div>
          
          <div className="max-h-[600px] overflow-y-auto">
            {top20.map((item, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition-all"
              >
                <div className="text-2xl font-bold text-amber-400/50 w-8">#{idx + 1}</div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs font-mono">
                      {item.force.id}
                    </span>
                    <span className="text-white/30">×</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-xs font-mono">
                      {item.work.id}
                    </span>
                  </div>
                  <div className="text-sm text-white/80">
                    <span className="text-purple-400">{item.force.name}</span>
                    <span className="text-white/30 mx-2">→</span>
                    <span className="text-cyan-400">{item.work.name}</span>
                  </div>
                </div>
                
                <div 
                  className="text-2xl font-bold"
                  style={{ color: getScoreColor(item.score) }}
                >
                  {item.score}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Worst 10 & 조언 */}
        <div className="space-y-6">
          {/* AI 추천 */}
          <div className="bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4">🎯 AI 추천</h3>
            
            {top20[0] && (
              <div className="space-y-4">
                <div className="text-white/80">
                  <span className={`font-bold ${TYPE_COLORS[myType.charAt(0) as keyof typeof TYPE_COLORS].text}`}>
                    {myNodeType?.name}
                  </span>
                  인 당신에게 가장 효과적인 전략:
                </div>
                
                <div className="p-4 bg-black/30 rounded-lg">
                  <div className="text-xl font-bold text-white mb-2">
                    "{top20[0].force.name}" + "{top20[0].work.name}"
                  </div>
                  <div className="text-sm text-white/60">
                    {top20[0].force.examples[0]}을 통해 {top20[0].work.desc}
                  </div>
                </div>

                <div className="text-sm text-white/50">
                  예상 성공률: <span className="text-green-400 font-bold">{top20[0].score}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Worst 10 */}
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-red-500/10 to-transparent">
              <h3 className="text-lg font-bold text-red-400">⚠️ 피해야 할 조합</h3>
              <p className="text-xs text-white/50 mt-1">낮은 공명 점수 = 비효율</p>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto">
              {worst10.map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-3 p-3 border-b border-white/5"
                >
                  <div className="text-sm text-red-400/50">#{72*72 - 9 + idx}</div>
                  <div className="flex-1 text-xs text-white/60">
                    {item.force.name} × {item.work.name}
                  </div>
                  <div className="text-sm font-bold text-red-400">{item.score}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ⚖️ 타입 비교 뷰
// ═══════════════════════════════════════════════════════════════════════════

function CompareView({ myType }: { myType: string }) {
  const [compareType, setCompareType] = useState<string>(myType === 'T01' ? 'L04' : 'T01');

  // 두 타입의 상위 10개 Golden Path
  const myPaths = useMemo(() => {
    const results: { force: ForceType; work: WorkType; score: number }[] = [];
    for (const force of ALL_72_FORCES) {
      for (const work of ALL_72_WORKS) {
        results.push({ force, work, score: calculateResonanceScore(myType, force.id, work.id) });
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [myType]);

  const comparePaths = useMemo(() => {
    const results: { force: ForceType; work: WorkType; score: number }[] = [];
    for (const force of ALL_72_FORCES) {
      for (const work of ALL_72_WORKS) {
        results.push({ force, work, score: calculateResonanceScore(compareType, force.id, work.id) });
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [compareType]);

  // 상보적 조합 (내가 약한 곳에서 상대가 강한 것)
  const complementary = useMemo(() => {
    const myScores = new Map<string, number>();
    const compareScores = new Map<string, number>();
    
    for (const force of ALL_72_FORCES) {
      for (const work of ALL_72_WORKS) {
        const key = `${force.id}-${work.id}`;
        myScores.set(key, calculateResonanceScore(myType, force.id, work.id));
        compareScores.set(key, calculateResonanceScore(compareType, force.id, work.id));
      }
    }
    
    const results: { force: ForceType; work: WorkType; myScore: number; compareScore: number; diff: number }[] = [];
    
    for (const force of ALL_72_FORCES) {
      for (const work of ALL_72_WORKS) {
        const key = `${force.id}-${work.id}`;
        const myScore = myScores.get(key) || 0;
        const compareScore = compareScores.get(key) || 0;
        
        // 상대가 나보다 20점 이상 높은 영역
        if (compareScore - myScore >= 20) {
          results.push({ force, work, myScore, compareScore, diff: compareScore - myScore });
        }
      }
    }
    
    return results.sort((a, b) => b.diff - a.diff).slice(0, 10);
  }, [myType, compareType]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* 비교 대상 선택 */}
      <div className="flex items-center justify-center gap-8 mb-8">
        <div className={`p-4 rounded-xl ${TYPE_COLORS[myType.charAt(0) as keyof typeof TYPE_COLORS].bg} border ${TYPE_COLORS[myType.charAt(0) as keyof typeof TYPE_COLORS].border}`}>
          <div className="text-xs text-white/50 mb-1">나</div>
          <div className={`text-xl font-bold ${TYPE_COLORS[myType.charAt(0) as keyof typeof TYPE_COLORS].text}`}>
            {myType}
          </div>
          <div className="text-sm text-white/60">{getTypeById(myType)?.name}</div>
        </div>

        <div className="text-4xl text-white/20">⚖️</div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/20">
          <div className="text-xs text-white/50 mb-1">비교 대상</div>
          <select
            value={compareType}
            onChange={(e) => setCompareType(e.target.value)}
            className="bg-transparent text-xl font-bold text-white border-none outline-none"
          >
            {ALL_72_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 내 강점 */}
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className={`p-4 border-b border-white/10 ${TYPE_COLORS[myType.charAt(0) as keyof typeof TYPE_COLORS].bg}`}>
            <h3 className={`font-bold ${TYPE_COLORS[myType.charAt(0) as keyof typeof TYPE_COLORS].text}`}>
              내 강점 Top 10
            </h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {myPaths.map((item, idx) => (
              <div key={idx} className="p-3 border-b border-white/5 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">{item.force.name} × {item.work.name}</span>
                  <span className="font-bold" style={{ color: getScoreColor(item.score) }}>{item.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 상보적 영역 */}
        <div className="bg-gradient-to-b from-purple-500/10 to-cyan-500/10 rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="font-bold text-white">🤝 상보적 영역</h3>
            <p className="text-xs text-white/50 mt-1">상대가 나보다 강한 영역 = 협업 기회</p>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {complementary.length === 0 ? (
              <div className="p-4 text-center text-white/40">
                상보적 영역이 없습니다
              </div>
            ) : (
              complementary.map((item, idx) => (
                <div key={idx} className="p-3 border-b border-white/5 text-sm">
                  <div className="text-white/80 mb-1">{item.force.name} × {item.work.name}</div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-red-400">나: {item.myScore}</span>
                    <span className="text-white/30">→</span>
                    <span className="text-green-400">상대: {item.compareScore}</span>
                    <span className="text-cyan-400">(+{item.diff})</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 상대 강점 */}
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-white/5">
            <h3 className="font-bold text-white">상대 강점 Top 10</h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {comparePaths.map((item, idx) => (
              <div key={idx} className="p-3 border-b border-white/5 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">{item.force.name} × {item.work.name}</span>
                  <span className="font-bold" style={{ color: getScoreColor(item.score) }}>{item.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧮 계산기 뷰
// ═══════════════════════════════════════════════════════════════════════════

function CalculatorView({ myType }: { myType: string }) {
  const [selectedNode, setSelectedNode] = useState(myType);
  const [selectedForce, setSelectedForce] = useState('F15');
  const [selectedWork, setSelectedWork] = useState('W13');

  const score = calculateResonanceScore(selectedNode, selectedForce, selectedWork);
  const nodeType = getTypeById(selectedNode);
  const forceType = ALL_72_FORCES.find(f => f.id === selectedForce);
  const workType = ALL_72_WORKS.find(w => w.id === selectedWork);

  return (
    <div className="max-w-3xl mx-auto">
      {/* 입력 */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Node */}
        <div className="bg-gradient-to-br from-amber-500/20 to-transparent rounded-2xl p-6 border border-amber-500/30">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">👥</div>
            <div className="text-amber-400 font-bold">WHO</div>
          </div>
          <select
            value={selectedNode}
            onChange={(e) => setSelectedNode(e.target.value)}
            className="w-full bg-black/50 border border-amber-500/30 rounded-lg px-3 py-3 text-center"
          >
            {ALL_72_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
            ))}
          </select>
        </div>

        {/* Force */}
        <div className="bg-gradient-to-br from-purple-500/20 to-transparent rounded-2xl p-6 border border-purple-500/30">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">⚡</div>
            <div className="text-purple-400 font-bold">HOW</div>
          </div>
          <select
            value={selectedForce}
            onChange={(e) => setSelectedForce(e.target.value)}
            className="w-full bg-black/50 border border-purple-500/30 rounded-lg px-3 py-3 text-center"
          >
            {ALL_72_FORCES.map(f => (
              <option key={f.id} value={f.id}>{f.id} - {f.name}</option>
            ))}
          </select>
        </div>

        {/* Work */}
        <div className="bg-gradient-to-br from-cyan-500/20 to-transparent rounded-2xl p-6 border border-cyan-500/30">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">📋</div>
            <div className="text-cyan-400 font-bold">WHAT</div>
          </div>
          <select
            value={selectedWork}
            onChange={(e) => setSelectedWork(e.target.value)}
            className="w-full bg-black/50 border border-cyan-500/30 rounded-lg px-3 py-3 text-center"
          >
            {ALL_72_WORKS.map(w => (
              <option key={w.id} value={w.id}>{w.id} - {w.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 공식 */}
      <div className="text-center mb-8">
        <div className="text-3xl font-mono">
          <span className="text-amber-400">{selectedNode}</span>
          <span className="text-white/30 mx-4">×</span>
          <span className="text-purple-400">{selectedForce}</span>
          <span className="text-white/30 mx-4">×</span>
          <span className="text-cyan-400">{selectedWork}</span>
        </div>
      </div>

      {/* 결과 */}
      <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-8 border border-white/20 text-center">
        <div 
          className="text-8xl font-bold mb-4"
          style={{ color: getScoreColor(score) }}
        >
          {score}
        </div>
        <div className="text-xl text-white/50 mb-6">공명 점수</div>
        
        <div className="text-lg text-white/80">
          <span className="text-amber-400">{nodeType?.name}</span>이(가)
          <span className="text-purple-400"> {forceType?.name}</span>을(를) 받아
          <span className="text-cyan-400"> {workType?.name}</span>을(를) 수행할 때
        </div>
        
        <div className="mt-6 text-2xl">
          {score >= 80 ? '✅ 최적의 조합!' : 
           score >= 60 ? '👍 좋은 조합' : 
           score >= 40 ? '⚠️ 보통' : 
           '❌ 비효율적'}
        </div>
      </div>
    </div>
  );
}
