/**
 * AUTUS - 변환 엔진 UI
 * =====================
 * 
 * 72×72 노드-작용 변환 시뮬레이터
 */

import React, { useState, useMemo, useCallback } from 'react';
import { ALL_72_TYPES, getTypeById } from './data/node72Types';
import { ALL_72_FORCES, PHYSICS_NODES, FORCE_RARITY_COLORS } from './data/forceTypes';
import {
  calculateTransformation,
  getRecommendedForces,
  findOptimalPath,
  TRANSFORMATION_STATS,
  TransformationResult
} from './data/transformationMatrix';

// 타입 색상
const TYPE_COLORS = {
  T: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/50' },
  B: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' },
  L: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/50' },
};

// 난이도 색상
const DIFFICULTY_COLORS = {
  Easy: 'text-green-400',
  Medium: 'text-yellow-400',
  Hard: 'text-orange-400',
  Expert: 'text-red-400',
  Legendary: 'text-purple-400',
};

export default function TransformationEngine() {
  const [view, setView] = useState<'simulator' | 'pathfinder' | 'matrix' | 'stats'>('simulator');
  const [selectedType, setSelectedType] = useState<string>('L21');
  const [selectedForce, setSelectedForce] = useState<string>('F15');
  const [targetType, setTargetType] = useState<string>('B15');
  const [result, setResult] = useState<TransformationResult | null>(null);
  
  // 변환 계산
  const handleCalculate = useCallback(() => {
    const transformation = calculateTransformation(selectedType, selectedForce);
    setResult(transformation);
  }, [selectedType, selectedForce]);
  
  // 추천 Force
  const recommendations = useMemo(() => {
    return getRecommendedForces(selectedType, 'evolve');
  }, [selectedType]);
  
  // 최적 경로
  const optimalPaths = useMemo(() => {
    if (view === 'pathfinder') {
      return findOptimalPath(selectedType, targetType, 4);
    }
    return [];
  }, [selectedType, targetType, view]);
  
  // 시뮬레이터 뷰
  const SimulatorView = () => (
    <div className="space-y-6">
      {/* 입력 섹션 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 노드 타입 선택 */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <label className="block text-sm text-gray-400 mb-2">현재 노드 타입</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
          >
            <optgroup label="T: 투자자">
              {ALL_72_TYPES.filter(t => t.id.startsWith('T')).map(t => (
                <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
              ))}
            </optgroup>
            <optgroup label="B: 사업가">
              {ALL_72_TYPES.filter(t => t.id.startsWith('B')).map(t => (
                <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
              ))}
            </optgroup>
            <optgroup label="L: 근로자">
              {ALL_72_TYPES.filter(t => t.id.startsWith('L')).map(t => (
                <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
              ))}
            </optgroup>
          </select>
          
          {/* 선택된 타입 정보 */}
          {selectedType && (
            <div className={`mt-3 p-3 rounded-lg ${TYPE_COLORS[selectedType.charAt(0) as keyof typeof TYPE_COLORS].bg}`}>
              <div className="font-bold text-white">{getTypeById(selectedType)?.name}</div>
              <div className="text-sm text-gray-300 mt-1">{getTypeById(selectedType)?.desc}</div>
            </div>
          )}
        </div>
        
        {/* Force 선택 */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <label className="block text-sm text-gray-400 mb-2">적용할 Force</label>
          <select
            value={selectedForce}
            onChange={(e) => setSelectedForce(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
          >
            {Object.entries(PHYSICS_NODES).map(([nodeId, node]) => (
              <optgroup key={nodeId} label={`${node.icon} ${node.name}`}>
                {ALL_72_FORCES.filter(f => f.node === nodeId).map(f => (
                  <option key={f.id} value={f.id}>{f.id} - {f.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          
          {/* 선택된 Force 정보 */}
          {selectedForce && (
            <div className="mt-3 p-3 rounded-lg bg-gray-700/50">
              {(() => {
                const force = ALL_72_FORCES.find(f => f.id === selectedForce);
                if (!force) return null;
                const rarityColor = FORCE_RARITY_COLORS[force.rarity];
                return (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{force.name}</span>
                      <span 
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ background: rarityColor.bg, color: rarityColor.text }}
                      >
                        {force.rarity}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300 mt-1">{force.desc}</div>
                    <div className="text-xs text-gray-400 mt-2">
                      예: {force.examples.slice(0, 3).join(', ')}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
        
        {/* 계산 버튼 */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 flex flex-col justify-center">
          <button
            onClick={handleCalculate}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105"
          >
            ⚡ 변환 시뮬레이션
          </button>
          <p className="text-center text-sm text-gray-400 mt-3">
            {selectedType} + {selectedForce} = ?
          </p>
        </div>
      </div>
      
      {/* 결과 섹션 */}
      {result && (
        <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-bold text-white mb-4">🎯 변환 결과</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 주요 결과 */}
            <div className="space-y-4">
              <div className={`p-4 rounded-xl ${TYPE_COLORS[result.primaryResult.targetType.charAt(0) as keyof typeof TYPE_COLORS].bg} border ${TYPE_COLORS[result.primaryResult.targetType.charAt(0) as keyof typeof TYPE_COLORS].border}`}>
                <div className="text-sm text-gray-400">주요 변환 결과</div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-2xl font-bold text-white">
                    {result.sourceType} → {result.primaryResult.targetType}
                  </span>
                </div>
                <div className="text-lg font-semibold text-white mt-1">
                  {getTypeById(result.primaryResult.targetType)?.name}
                </div>
                
                {/* 확률 바 */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">성공 확률</span>
                    <span className="text-white font-bold">{result.primaryResult.probability}%</span>
                  </div>
                  <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                      style={{ width: `${result.primaryResult.probability}%` }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <span className="text-gray-400">소요 시간:</span>
                    <span className="text-white ml-2">{result.primaryResult.duration}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">난이도:</span>
                    <span className={`ml-2 ${DIFFICULTY_COLORS[result.difficulty]}`}>
                      {result.difficulty}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">비용 배수:</span>
                    <span className="text-white ml-2">×{result.costMultiplier}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">가역성:</span>
                    <span className={`ml-2 ${result.reversible ? 'text-green-400' : 'text-red-400'}`}>
                      {result.reversible ? '가역' : '비가역'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* 대안 결과 */}
              {result.alternativeResults.length > 0 && (
                <div className="bg-gray-700/30 rounded-xl p-4">
                  <div className="text-sm text-gray-400 mb-2">대안 경로 (카테고리 전환)</div>
                  {result.alternativeResults.map((alt, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                      <div>
                        <span className={`font-semibold ${TYPE_COLORS[alt.targetType.charAt(0) as keyof typeof TYPE_COLORS].text}`}>
                          {alt.targetType}
                        </span>
                        <span className="text-gray-400 ml-2 text-sm">({alt.condition})</span>
                      </div>
                      <span className="text-white">{alt.probability}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* 부작용 */}
            <div className="space-y-4">
              <div className="bg-gray-700/30 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-3">📊 물리 노드 영향</div>
                {result.sideEffects.map((effect, idx) => {
                  const node = PHYSICS_NODES[effect.node as keyof typeof PHYSICS_NODES];
                  return (
                    <div key={idx} className="flex items-center gap-3 py-2">
                      <span className="text-xl">{node?.icon || '⚪'}</span>
                      <span className="text-white flex-1">{effect.description}</span>
                      <span className={`font-bold ${effect.effect > 0 ? 'text-green-400' : effect.effect < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {effect.effect > 0 ? '+' : ''}{effect.effect}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {/* 시각적 변환 */}
              <div className="bg-gray-700/30 rounded-xl p-4">
                <div className="text-sm text-gray-400 mb-3">🔄 변환 흐름</div>
                <div className="flex items-center justify-center gap-4 py-4">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center ${TYPE_COLORS[result.sourceType.charAt(0) as keyof typeof TYPE_COLORS].bg} border-2 ${TYPE_COLORS[result.sourceType.charAt(0) as keyof typeof TYPE_COLORS].border}`}>
                    <span className="text-2xl font-bold text-white">{result.sourceType}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl">⚡</span>
                    <span className="text-xs text-gray-400">{result.forceApplied}</span>
                  </div>
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center ${TYPE_COLORS[result.primaryResult.targetType.charAt(0) as keyof typeof TYPE_COLORS].bg} border-2 ${TYPE_COLORS[result.primaryResult.targetType.charAt(0) as keyof typeof TYPE_COLORS].border}`}>
                    <span className="text-2xl font-bold text-white">{result.primaryResult.targetType}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 추천 Force */}
      <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-bold text-white mb-4">💡 {selectedType}에 추천하는 Force</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {recommendations.slice(0, 6).map((rec, idx) => {
            const rarityColor = FORCE_RARITY_COLORS[rec.force.rarity];
            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedForce(rec.force.id);
                  handleCalculate();
                }}
                className="p-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg text-left transition-all"
              >
                <div className="flex items-center gap-2">
                  <span 
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ background: rarityColor.bg, color: rarityColor.text }}
                  >
                    {rec.force.id}
                  </span>
                  <span className="text-white font-semibold">{rec.force.name}</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">{rec.reason}</div>
                <div className="text-sm text-green-400 mt-1">성공률: {rec.probability}%</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
  
  // 경로 탐색 뷰
  const PathfinderView = () => (
    <div className="space-y-6">
      {/* 입력 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <label className="block text-sm text-gray-400 mb-2">현재 타입</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
          >
            {ALL_72_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center justify-center text-4xl">→</div>
        
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <label className="block text-sm text-gray-400 mb-2">목표 타입</label>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
          >
            {ALL_72_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* 결과 */}
      <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-bold text-white mb-4">
          🗺️ {selectedType} → {targetType} 최적 경로
        </h3>
        
        {optimalPaths.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            경로를 계산 중이거나 직접 연결된 경로가 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {optimalPaths.map((path, idx) => (
              <div key={idx} className="bg-gray-700/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-400">경로 {idx + 1}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-green-400 font-bold">{Math.round(path.totalProbability)}%</span>
                    <span className="text-gray-400">{path.totalDuration}</span>
                  </div>
                </div>
                
                {/* 경로 시각화 */}
                <div className="flex items-center gap-2 flex-wrap">
                  {path.path.map((typeId, stepIdx) => (
                    <React.Fragment key={stepIdx}>
                      <div className={`px-3 py-2 rounded-lg ${TYPE_COLORS[typeId.charAt(0) as keyof typeof TYPE_COLORS].bg} border ${TYPE_COLORS[typeId.charAt(0) as keyof typeof TYPE_COLORS].border}`}>
                        <div className="font-bold text-white">{typeId}</div>
                        <div className="text-xs text-gray-300">{getTypeById(typeId)?.name}</div>
                      </div>
                      {stepIdx < path.path.length - 1 && (
                        <div className="flex flex-col items-center">
                          <span className="text-xl">→</span>
                          <span className="text-xs text-gray-500">{path.forces[stepIdx]}</span>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  
  // 통계 뷰
  const StatsView = () => (
    <div className="space-y-6">
      {/* 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700/50">
          <div className="text-3xl font-bold text-white">{TRANSFORMATION_STATS.totalCombinations.toLocaleString()}</div>
          <div className="text-sm text-gray-400 mt-1">총 조합</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700/50">
          <div className="text-3xl font-bold text-amber-400">72</div>
          <div className="text-sm text-gray-400 mt-1">노드 타입</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700/50">
          <div className="text-3xl font-bold text-blue-400">72</div>
          <div className="text-sm text-gray-400 mt-1">외부 작용</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 text-center border border-gray-700/50">
          <div className="text-3xl font-bold text-purple-400">6</div>
          <div className="text-sm text-gray-400 mt-1">카테고리 전환</div>
        </div>
      </div>
      
      {/* 카테고리 전환 통계 */}
      <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-bold text-white mb-4">📊 카테고리 전환 통계</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(TRANSFORMATION_STATS.categoryTransitions).map(([key, data]) => (
            <div key={key} className="bg-gray-700/30 rounded-lg p-4">
              <div className="text-xl font-bold text-white mb-2">{key}</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">평균 확률</span>
                  <span className="text-green-400">{data.avgProbability}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">소요 시간</span>
                  <span className="text-white">{data.avgDuration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">난이도</span>
                  <span className={DIFFICULTY_COLORS[data.difficulty as keyof typeof DIFFICULTY_COLORS]}>
                    {data.difficulty}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 가장 효과적인 Force */}
      <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-bold text-white mb-4">🔥 가장 효과적인 Force Top 5</h3>
        <div className="space-y-3">
          {TRANSFORMATION_STATS.mostEffectiveForces.map((f, idx) => (
            <div key={f.id} className="flex items-center gap-4 bg-gray-700/30 rounded-lg p-3">
              <span className="text-2xl font-bold text-amber-400">#{idx + 1}</span>
              <div className="flex-1">
                <div className="font-bold text-white">{f.id} - {f.name}</div>
                <div className="text-sm text-gray-400">
                  {ALL_72_FORCES.find(force => force.id === f.id)?.desc}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-green-400">{f.avgEvolutionRate}%</div>
                <div className="text-xs text-gray-400">평균 진화율</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  
  // 매트릭스 히트맵 뷰 (간소화)
  const MatrixView = () => {
    const [hoverCell, setHoverCell] = useState<{ type: string; force: string } | null>(null);
    
    // 샘플 데이터 (전체 72x72는 너무 크므로)
    const sampleTypes = ALL_72_TYPES.slice(0, 12);
    const sampleForces = ALL_72_FORCES.slice(0, 12);
    
    return (
      <div className="space-y-4">
        <div className="text-sm text-gray-400">
          * 전체 72×72 = 5,184 셀 중 샘플 12×12 표시
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-2 bg-gray-800"></th>
                {sampleForces.map(f => (
                  <th key={f.id} className="p-2 bg-gray-800 text-gray-400 font-normal">
                    {f.id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleTypes.map(type => (
                <tr key={type.id}>
                  <td className={`p-2 font-semibold ${TYPE_COLORS[type.id.charAt(0) as keyof typeof TYPE_COLORS].text}`}>
                    {type.id}
                  </td>
                  {sampleForces.map(force => {
                    const result = calculateTransformation(type.id, force.id);
                    const prob = result.primaryResult.probability;
                    const changed = result.primaryResult.targetType !== type.id;
                    
                    return (
                      <td
                        key={force.id}
                        className="p-1 cursor-pointer transition-all hover:scale-150 hover:z-10"
                        onMouseEnter={() => setHoverCell({ type: type.id, force: force.id })}
                        onMouseLeave={() => setHoverCell(null)}
                        style={{
                          background: changed 
                            ? `rgba(34, 197, 94, ${prob / 100})` 
                            : `rgba(107, 114, 128, 0.3)`
                        }}
                      >
                        <div className="w-6 h-6 flex items-center justify-center text-[10px] text-white">
                          {changed ? result.primaryResult.targetType : '·'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* 호버 상세 */}
        {hoverCell && (
          <div className="fixed bottom-4 right-4 bg-gray-800 rounded-xl p-4 shadow-xl border border-gray-700 max-w-sm">
            {(() => {
              const result = calculateTransformation(hoverCell.type, hoverCell.force);
              return (
                <>
                  <div className="font-bold text-white mb-2">
                    {hoverCell.type} + {hoverCell.force}
                  </div>
                  <div className="text-sm text-gray-300">
                    → {result.primaryResult.targetType} ({result.primaryResult.probability}%)
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {result.primaryResult.duration} | {result.difficulty}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="min-h-full bg-slate-900 text-white p-6">
      {/* 헤더 */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">⚡ 변환 엔진</h1>
            <p className="text-gray-400 text-sm">72×72 노드-작용 변환 시뮬레이터</p>
          </div>
          
          {/* 탭 네비게이션 */}
          <div className="flex gap-2">
            {[
              { id: 'simulator', label: '🎮 시뮬레이터' },
              { id: 'pathfinder', label: '🗺️ 경로탐색' },
              { id: 'matrix', label: '📊 매트릭스' },
              { id: 'stats', label: '📈 통계' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id as typeof view)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  view === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* 컨텐츠 */}
        {view === 'simulator' && <SimulatorView />}
        {view === 'pathfinder' && <PathfinderView />}
        {view === 'matrix' && <MatrixView />}
        {view === 'stats' && <StatsView />}
      </div>
    </div>
  );
}
