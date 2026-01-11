/**
 * AUTUS - 72타입 분류표 & 상호작용 매트릭스 UI
 * =============================================
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  ALL_72_TYPES, 
  INVESTOR_TYPES, 
  BUSINESS_TYPES, 
  LABOR_TYPES,
  NodeType,
  getTypeById
} from './data/node72Types';
import { 
  calculateInteraction, 
  getTopInteractions, 
  getWorstInteractions,
  INTERACTION_COLORS,
  INTERACTION_LABELS,
  InteractionResult
} from './data/interactionMatrix';
import {
  ALL_72_FORCES,
  PHYSICS_NODES,
  FORCE_RARITY_COLORS,
  ForceType
} from './data/forceTypes';
import {
  ALL_72_WORKS,
  WORK_DOMAINS,
  WORK_PATTERNS,
  WorkType
} from './data/workTypes';

// ═══════════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════

// localStorage 키
const MY_TYPE_KEY = 'autus_my_type';

export default function Node72Matrix() {
  const [view, setView] = useState<'types' | 'forces' | 'works' | 'matrix' | 'heatmap' | 'detail' | 'mytype'>('types');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<'all' | 'T' | 'B' | 'L'>('all');
  const [matrixCategory, setMatrixCategory] = useState<{ row: 'T' | 'B' | 'L'; col: 'T' | 'B' | 'L' }>({ row: 'T', col: 'B' });
  
  // 내 타입 상태 (localStorage에서 로드)
  const [myType, setMyType] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(MY_TYPE_KEY);
    }
    return null;
  });

  const selectedNodeType = selectedType ? getTypeById(selectedType) : null;
  const myNodeType = myType ? getTypeById(myType) : null;

  // 내 타입 저장
  const saveMyType = useCallback((typeId: string) => {
    setMyType(typeId);
    localStorage.setItem(MY_TYPE_KEY, typeId);
  }, []);

  // 내 타입 삭제
  const clearMyType = useCallback(() => {
    setMyType(null);
    localStorage.removeItem(MY_TYPE_KEY);
  }, []);

  return (
    <div className="h-full bg-[#08080c] text-white flex flex-col overflow-hidden">

      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-4">
          <span className="text-lg font-light tracking-wider">AUTUS</span>
          <div className="h-4 w-px bg-white/20" />
          <span className="text-sm text-white/50">72-Type 인간 온톨로지</span>
          
          {/* 내 타입 표시 */}
          {myNodeType && (
            <button
              onClick={() => {
                setSelectedType(myType);
                setView('mytype');
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/30 hover:border-amber-500/50 transition-all"
            >
              <span className="text-xs text-white/50">내 타입:</span>
              <span className="text-sm font-bold text-amber-400">{myNodeType.id}</span>
              <span className="text-xs text-white/60">{myNodeType.name}</span>
            </button>
          )}
        </div>

        {/* 뷰 전환 */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/5">
          {[
            { id: 'mytype', label: '내 타입', icon: '👤' },
            { id: 'types', label: '노드 72', icon: '👥' },
            { id: 'forces', label: '모션 72', icon: '⚡' },
            { id: 'works', label: '업무 72', icon: '📋' },
            { id: 'heatmap', label: '히트맵', icon: '🔥' },
            { id: 'matrix', label: '매트릭스', icon: '⊞' },
            { id: 'detail', label: '상세', icon: '🔍' },
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
      <main className="flex-1 overflow-hidden">
        
        {/* 내 타입 뷰 */}
        {view === 'mytype' && (
          <MyTypeView 
            myType={myType}
            myNodeType={myNodeType}
            saveMyType={saveMyType}
            clearMyType={clearMyType}
            setSelectedType={setSelectedType}
            setView={setView}
          />
        )}

        {/* 72타입 분류표 뷰 */}
        {view === 'types' && (
          <TypesView 
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            setView={setView}
            myType={myType}
            saveMyType={saveMyType}
          />
        )}

        {/* 72 모션(Force) 뷰 */}
        {view === 'forces' && (
          <ForcesView />
        )}

        {/* 72 업무(Work) 뷰 */}
        {view === 'works' && (
          <WorksView />
        )}

        {/* 72x72 전체 히트맵 뷰 */}
        {view === 'heatmap' && (
          <HeatmapView 
            setSelectedType={setSelectedType}
            setView={setView}
            myType={myType}
          />
        )}

        {/* 섹션별 매트릭스 뷰 */}
        {view === 'matrix' && (
          <MatrixView 
            matrixCategory={matrixCategory}
            setMatrixCategory={setMatrixCategory}
            setSelectedType={setSelectedType}
            setView={setView}
          />
        )}

        {/* 상세 분석 뷰 */}
        {view === 'detail' && (
          <DetailView 
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            selectedNodeType={selectedNodeType}
          />
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 내 타입 뷰
// ═══════════════════════════════════════════════════════════════════════════

function MyTypeView({
  myType,
  myNodeType,
  saveMyType,
  clearMyType,
  setSelectedType,
  setView
}: {
  myType: string | null;
  myNodeType: NodeType | null;
  saveMyType: (id: string) => void;
  clearMyType: () => void;
  setSelectedType: (id: string | null) => void;
  setView: (v: 'types' | 'forces' | 'works' | 'matrix' | 'heatmap' | 'detail' | 'mytype') => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'T' | 'B' | 'L'>('all');

  // 내 타입의 상호작용
  const topInteractions = myType ? getTopInteractions(myType, 10) : [];
  const worstInteractions = myType ? getWorstInteractions(myType, 5) : [];

  // 검색 필터링
  const filteredTypes = ALL_72_TYPES.filter(t => {
    const matchesSearch = searchQuery === '' || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const catColors = { T: 'amber', B: 'purple', L: 'cyan' };
  const catNames = { T: '투자자', B: '사업가', L: '근로자' };

  // 내 타입이 설정되지 않은 경우
  if (!myNodeType) {
    return (
      <div className="h-full flex flex-col p-6">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-light mb-2">내 타입을 설정하세요</h2>
          <p className="text-white/50">72가지 타입 중 자신에게 맞는 타입을 선택하면<br />최적의 상호작용 파트너를 찾을 수 있습니다.</p>
        </div>

        {/* 검색 및 필터 */}
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="타입 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-white/30"
          />
          <div className="flex gap-1">
            {(['all', 'T', 'B', 'L'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm transition-all ${
                  selectedCategory === cat
                    ? cat === 'all' ? 'bg-white/20 text-white' : `bg-${catColors[cat as 'T'|'B'|'L']}-500/20 text-${catColors[cat as 'T'|'B'|'L']}-400`
                    : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                {cat === 'all' ? '전체' : catNames[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* 타입 그리드 */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-4 gap-3">
            {filteredTypes.map(type => (
              <button
                key={type.id}
                onClick={() => saveMyType(type.id)}
                className={`p-4 rounded-xl text-left transition-all hover:scale-105 bg-${catColors[type.category]}-500/10 border border-${catColors[type.category]}-500/20 hover:border-${catColors[type.category]}-500/50`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-lg font-bold text-${catColors[type.category]}-400`}>{type.id}</span>
                  <span className="text-xs text-white/30">{catNames[type.category]}</span>
                </div>
                <div className="text-sm font-medium mb-1">{type.name}</div>
                <div className="text-[10px] text-white/40">{type.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 내 타입이 설정된 경우
  return (
    <div className="h-full grid grid-cols-3 gap-6 p-6 overflow-hidden">
      
      {/* 좌측: 내 타입 정보 */}
      <div className="overflow-y-auto">
        <div className={`p-6 rounded-2xl bg-gradient-to-br from-${catColors[myNodeType.category]}-500/20 to-transparent border border-${catColors[myNodeType.category]}-500/30`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">내 타입</span>
              <span className={`text-3xl font-bold text-${catColors[myNodeType.category]}-400`}>
                {myNodeType.id}
              </span>
            </div>
            <button
              onClick={clearMyType}
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              변경
            </button>
          </div>
          
          <h2 className="text-xl font-medium mb-1">{myNodeType.name}</h2>
          <div className="text-sm text-white/40 mb-4">{myNodeType.nameEn}</div>
          <p className="text-sm text-white/60 mb-6">{myNodeType.desc}</p>

          {/* 특성 태그 */}
          <div className="flex flex-wrap gap-2 mb-6">
            {myNodeType.traits.map((trait, i) => (
              <span key={i} className="px-2 py-1 rounded-lg bg-white/5 text-xs text-white/60">
                {trait}
              </span>
            ))}
          </div>

          {/* 벡터 그래프 */}
          <div className="space-y-3">
            <div className="text-xs text-white/40 mb-2">벡터 특성</div>
            {Object.entries(myNodeType.vectors).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-20 text-[10px] text-white/40 capitalize">{key}</span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full bg-${catColors[myNodeType.category]}-400`}
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span className="w-8 text-[10px] text-white/50 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 전략 요약 */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-white/10">
          <h3 className="text-sm text-white/60 mb-3">📋 나의 전략</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-white/70">
                {catNames[myNodeType.category]}와의 협업에서 강점 발휘
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400">!</span>
              <span className="text-white/70">
                리스크 성향: {myNodeType.vectors.risk > 70 ? '공격적' : myNodeType.vectors.risk > 40 ? '균형' : '보수적'}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-cyan-400">→</span>
              <span className="text-white/70">
                최적 파트너: {topInteractions[0] ? getTypeById(topInteractions[0].nodeB)?.name : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 중앙: 최고 상호작용 */}
      <div className="overflow-y-auto">
        <h3 className="text-sm text-green-400 mb-4">🏆 나와 잘 맞는 타입 Top 10</h3>
        <div className="space-y-2">
          {topInteractions.map((interaction, i) => {
            const otherType = getTypeById(interaction.nodeB);
            const colors = INTERACTION_COLORS[interaction.type];
            
            return (
              <div 
                key={i}
                className={`p-3 rounded-xl ${colors.bg} border ${colors.border} cursor-pointer hover:scale-[1.02] transition-all`}
                onClick={() => {
                  setSelectedType(interaction.nodeB);
                  setView('detail');
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">#{i + 1}</span>
                    <span className="font-medium">{otherType?.id}</span>
                    <span className="text-sm text-white/60">{otherType?.name}</span>
                  </div>
                  <span className={`text-sm font-bold ${colors.text}`}>
                    +{interaction.coefficient}
                  </span>
                </div>
                <div className="text-xs text-white/40">{interaction.outcome}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 우측: 주의 타입 + 추천 */}
      <div className="overflow-y-auto space-y-6">
        <div>
          <h3 className="text-sm text-red-400 mb-4">⚠️ 나와 맞지 않는 타입 Top 5</h3>
          <div className="space-y-2">
            {worstInteractions.map((interaction, i) => {
              const otherType = getTypeById(interaction.nodeB);
              const colors = INTERACTION_COLORS[interaction.type];
              
              return (
                <div 
                  key={i}
                  className={`p-3 rounded-xl ${colors.bg} border ${colors.border}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{otherType?.id}</span>
                      <span className="text-sm text-white/60">{otherType?.name}</span>
                    </div>
                    <span className={`text-sm font-bold ${colors.text}`}>
                      {interaction.coefficient}
                    </span>
                  </div>
                  <div className="text-xs text-white/40">{interaction.action}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 추천 액션 */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <h3 className="text-sm text-amber-400 mb-3">⚡ 추천 액션</h3>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-black/20">
              <div className="text-xs text-white/40 mb-1">최적 협업 찾기</div>
              <div className="text-white/80">
                {topInteractions[0] && getTypeById(topInteractions[0].nodeB)?.name}과(와) 연결하세요
              </div>
            </div>
            <div className="p-3 rounded-lg bg-black/20">
              <div className="text-xs text-white/40 mb-1">피해야 할 상호작용</div>
              <div className="text-white/80">
                {worstInteractions[0] && getTypeById(worstInteractions[0].nodeB)?.name}과(와)의 직접 연결 주의
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 72타입 분류표 뷰
// ═══════════════════════════════════════════════════════════════════════════

function TypesView({ 
  filterCategory, 
  setFilterCategory, 
  selectedType, 
  setSelectedType,
  setView,
  myType,
  saveMyType
}: {
  filterCategory: 'all' | 'T' | 'B' | 'L';
  setFilterCategory: (c: 'all' | 'T' | 'B' | 'L') => void;
  selectedType: string | null;
  setSelectedType: (id: string | null) => void;
  setView: (v: 'types' | 'forces' | 'works' | 'matrix' | 'heatmap' | 'detail' | 'mytype') => void;
  myType: string | null;
  saveMyType: (id: string) => void;
}) {
  const categories = [
    { id: 'T', name: '투자자 (Capital)', color: 'amber', types: INVESTOR_TYPES },
    { id: 'B', name: '사업가 (Structure)', color: 'purple', types: BUSINESS_TYPES },
    { id: 'L', name: '근로자 (Labor)', color: 'cyan', types: LABOR_TYPES },
  ];

  const filteredCategories = filterCategory === 'all' 
    ? categories 
    : categories.filter(c => c.id === filterCategory);

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* 필터 */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'all', label: '전체 72타입' },
          { id: 'T', label: '투자자 24타입', color: 'amber' },
          { id: 'B', label: '사업가 24타입', color: 'purple' },
          { id: 'L', label: '근로자 24타입', color: 'cyan' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilterCategory(f.id as typeof filterCategory)}
            className={`px-4 py-2 rounded-xl text-sm transition-all ${
              filterCategory === f.id
                ? `bg-${f.color || 'white'}-500/20 text-${f.color || 'white'}-400 border border-${f.color || 'white'}-500/30`
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 타입 그리드 */}
      <div className="flex-1 overflow-y-auto">
        {filteredCategories.map(cat => (
          <div key={cat.id} className="mb-8">
            <h2 className={`text-lg font-medium mb-4 text-${cat.color}-400`}>
              {cat.name} ({cat.types.length}타입)
            </h2>
            
            <div className="grid grid-cols-6 gap-3">
              {cat.types.map(type => (
                <div
                  key={type.id}
                  className={`p-3 rounded-xl text-left transition-all hover:scale-105 relative group ${
                    myType === type.id
                      ? 'bg-amber-500/20 border-2 border-amber-500/50 ring-2 ring-amber-500/20'
                      : selectedType === type.id
                      ? `bg-${cat.color}-500/20 border border-${cat.color}-500/50`
                      : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]'
                  }`}
                >
                  {/* 내 타입 뱃지 */}
                  {myType === type.id && (
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-amber-500 text-[9px] text-black font-bold">
                      MY
                    </div>
                  )}
                  
                  <button
                    onClick={() => {
                      setSelectedType(type.id);
                      setView('detail');
                    }}
                    className="w-full text-left"
                  >
                    <div className="text-xs text-white/40 mb-1">{type.id}</div>
                    <div className="text-sm font-medium truncate">{type.name}</div>
                    <div className="text-[10px] text-white/30 mt-1 truncate">{type.nameEn}</div>
                  </button>

                  {/* 내 타입으로 설정 버튼 (호버 시) */}
                  {myType !== type.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveMyType(type.id);
                      }}
                      className="absolute inset-0 bg-black/80 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <span className="text-xs text-amber-400">👤 내 타입으로 설정</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 72x72 전체 히트맵 뷰
// ═══════════════════════════════════════════════════════════════════════════

function HeatmapView({
  setSelectedType,
  setView,
  myType
}: {
  setSelectedType: (id: string | null) => void;
  setView: (v: 'types' | 'forces' | 'works' | 'matrix' | 'heatmap' | 'detail' | 'mytype') => void;
  myType: string | null;
}) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [zoom, setZoom] = useState(1);

  // 전체 72x72 매트릭스 계산 (메모이제이션)
  const fullMatrix = useMemo(() => {
    return ALL_72_TYPES.map(rowType => 
      ALL_72_TYPES.map(colType => calculateInteraction(rowType, colType))
    );
  }, []);

  // 호버된 상호작용
  const hoveredInteraction = hoveredCell 
    ? fullMatrix[hoveredCell.row][hoveredCell.col] 
    : null;

  // 계수를 색상으로 변환
  const getColor = (coefficient: number): string => {
    if (coefficient >= 0.7) return '#fbbf24'; // 금색 - 공명
    if (coefficient >= 0.3) return '#4ade80'; // 초록 - 안정
    if (coefficient >= -0.3) return '#6b7280'; // 회색 - 중립
    if (coefficient >= -0.7) return '#fbbf24'; // 노랑 - 마찰
    return '#ef4444'; // 빨강 - 충돌
  };

  // 셀 크기 (줌에 따라)
  const cellSize = Math.max(4, 8 * zoom);

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      {/* 컨트롤 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/50">72×72 = 5,184 상호작용</span>
          
          {/* 줌 컨트롤 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">줌:</span>
            <button 
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              className="w-6 h-6 rounded bg-white/10 text-xs hover:bg-white/20"
            >
              -
            </button>
            <span className="text-xs w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
            <button 
              onClick={() => setZoom(Math.min(2, zoom + 0.25))}
              className="w-6 h-6 rounded bg-white/10 text-xs hover:bg-white/20"
            >
              +
            </button>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: '#fbbf24' }} />
            공명 ≥0.7
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: '#4ade80' }} />
            안정 0.3~0.7
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: '#6b7280' }} />
            중립 ±0.3
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: '#f59e0b' }} />
            마찰 -0.3~-0.7
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ background: '#ef4444' }} />
            충돌 ≤-0.7
          </span>
        </div>
      </div>

      {/* 히트맵 + 정보 패널 */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        
        {/* 히트맵 */}
        <div className="flex-1 overflow-auto border border-white/10 rounded-xl bg-black/40">
          <div className="inline-block p-2">
            {/* 카테고리 구분선 라벨 */}
            <div className="flex">
              <div style={{ width: 40, height: 20 }} /> {/* 코너 */}
              <div className="flex">
                <div style={{ width: cellSize * 24 }} className="text-[8px] text-amber-400 text-center border-b border-amber-500/30">T (투자자)</div>
                <div style={{ width: cellSize * 24 }} className="text-[8px] text-purple-400 text-center border-b border-purple-500/30">B (사업가)</div>
                <div style={{ width: cellSize * 24 }} className="text-[8px] text-cyan-400 text-center border-b border-cyan-500/30">L (근로자)</div>
              </div>
            </div>

            {/* 매트릭스 */}
            <div className="flex">
              {/* 행 라벨 */}
              <div className="flex flex-col" style={{ width: 40 }}>
                <div style={{ height: cellSize * 24 }} className="flex items-center justify-center">
                  <span className="text-[8px] text-amber-400 -rotate-90 whitespace-nowrap">T (투자자)</span>
                </div>
                <div style={{ height: cellSize * 24 }} className="flex items-center justify-center">
                  <span className="text-[8px] text-purple-400 -rotate-90 whitespace-nowrap">B (사업가)</span>
                </div>
                <div style={{ height: cellSize * 24 }} className="flex items-center justify-center">
                  <span className="text-[8px] text-cyan-400 -rotate-90 whitespace-nowrap">L (근로자)</span>
                </div>
              </div>

              {/* 셀 그리드 */}
              <div>
                {ALL_72_TYPES.map((rowType, rowIdx) => {
                  const isMyRow = myType === rowType.id;
                  
                  return (
                    <div key={rowIdx} className="flex">
                      {ALL_72_TYPES.map((colType, colIdx) => {
                        const interaction = fullMatrix[rowIdx][colIdx];
                        const isHovered = hoveredCell?.row === rowIdx && hoveredCell?.col === colIdx;
                        const isMyCol = myType === colType.id;
                        const isMyCell = isMyRow || isMyCol;
                        
                        // 카테고리 경계선
                        const isRowBoundary = rowIdx === 24 || rowIdx === 48;
                        const isColBoundary = colIdx === 24 || colIdx === 48;
                        
                        return (
                          <div
                            key={colIdx}
                            style={{
                              width: cellSize,
                              height: cellSize,
                              backgroundColor: getColor(interaction.coefficient),
                              opacity: isMyCell ? 1 : 0.3 + Math.abs(interaction.coefficient) * 0.7,
                              borderTop: isRowBoundary ? '1px solid rgba(255,255,255,0.3)' : undefined,
                              borderLeft: isColBoundary ? '1px solid rgba(255,255,255,0.3)' : undefined,
                              boxShadow: isMyCell ? '0 0 4px rgba(251,191,36,0.5)' : undefined,
                            }}
                            className={`cursor-pointer transition-all ${isHovered ? 'ring-2 ring-white z-10' : ''} ${isMyCell ? 'z-5' : ''}`}
                            onMouseEnter={() => setHoveredCell({ row: rowIdx, col: colIdx })}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => {
                              setSelectedType(rowType.id);
                              setView('detail');
                            }}
                            title={`${rowType.id} × ${colType.id}: ${interaction.coefficient}${isMyCell ? ' (내 타입 관련)' : ''}`}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 정보 패널 */}
        <div className="w-80 p-4 rounded-2xl bg-white/[0.02] border border-white/5 overflow-y-auto flex flex-col">
          {hoveredInteraction ? (
            <>
              <div className="text-xs text-white/40 mb-3">상호작용 분석</div>
              
              {/* 노드 정보 */}
              <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-black/30">
                <div className="text-center">
                  <div className="text-lg font-bold">{getTypeById(hoveredInteraction.nodeA)?.id}</div>
                  <div className="text-[10px] text-white/40">{getTypeById(hoveredInteraction.nodeA)?.name}</div>
                </div>
                <div className="text-white/30 text-xl">×</div>
                <div className="text-center">
                  <div className="text-lg font-bold">{getTypeById(hoveredInteraction.nodeB)?.id}</div>
                  <div className="text-[10px] text-white/40">{getTypeById(hoveredInteraction.nodeB)?.name}</div>
                </div>
              </div>

              {/* 계수 표시 */}
              <div 
                className={`text-center p-4 rounded-xl mb-4 ${INTERACTION_COLORS[hoveredInteraction.type].bg} ${INTERACTION_COLORS[hoveredInteraction.type].border} border`}
              >
                <div className={`text-3xl font-bold ${INTERACTION_COLORS[hoveredInteraction.type].text}`}>
                  {hoveredInteraction.coefficient > 0 ? '+' : ''}{hoveredInteraction.coefficient}
                </div>
                <div className={`text-sm ${INTERACTION_COLORS[hoveredInteraction.type].text}`}>
                  {INTERACTION_LABELS[hoveredInteraction.type]}
                </div>
              </div>

              {/* 결과 & 액션 */}
              <div className="space-y-3 flex-1">
                <div className="p-3 rounded-xl bg-black/20">
                  <div className="text-[10px] text-white/40 mb-1">📊 결과값 (Outcome)</div>
                  <div className="text-sm">{hoveredInteraction.outcome}</div>
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <div className="text-[10px] text-cyan-400 mb-1">⚡ 연결 통제 액션</div>
                  <div className="text-sm text-cyan-300">{hoveredInteraction.action}</div>
                </div>
              </div>

              {/* 상세 보기 버튼 */}
              <button
                onClick={() => {
                  setSelectedType(hoveredInteraction.nodeA);
                  setView('detail');
                }}
                className="mt-4 w-full py-2 rounded-xl bg-white/10 text-sm hover:bg-white/20 transition-colors"
              >
                상세 분석 보기 →
              </button>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white/30">
              <div className="text-4xl mb-4">🔥</div>
              <div className="text-sm text-center">
                셀 위에 마우스를 올리면<br />
                상호작용 분석이 표시됩니다
              </div>
              <div className="mt-4 text-xs text-white/20">
                클릭하면 상세 분석으로 이동
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 통계 요약 */}
      <div className="mt-4 flex gap-4">
        {(() => {
          const stats = { resonance: 0, stable: 0, neutral: 0, friction: 0, conflict: 0 };
          fullMatrix.forEach(row => row.forEach(cell => stats[cell.type]++));
          const total = 72 * 72;
          
          return Object.entries(stats).map(([type, count]) => (
            <div 
              key={type}
              className={`flex-1 p-3 rounded-xl ${INTERACTION_COLORS[type as keyof typeof INTERACTION_COLORS].bg}`}
            >
              <div className={`text-lg font-bold ${INTERACTION_COLORS[type as keyof typeof INTERACTION_COLORS].text}`}>
                {count}
              </div>
              <div className="text-xs text-white/50">
                {INTERACTION_LABELS[type as keyof typeof INTERACTION_LABELS]} ({((count / total) * 100).toFixed(1)}%)
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 섹션별 매트릭스 뷰 (24x24)
// ═══════════════════════════════════════════════════════════════════════════

function MatrixView({
  matrixCategory,
  setMatrixCategory,
  setSelectedType,
  setView
}: {
  matrixCategory: { row: 'T' | 'B' | 'L'; col: 'T' | 'B' | 'L' };
  setMatrixCategory: (c: { row: 'T' | 'B' | 'L'; col: 'T' | 'B' | 'L' }) => void;
  setSelectedType: (id: string | null) => void;
  setView: (v: 'types' | 'forces' | 'works' | 'matrix' | 'heatmap' | 'detail' | 'mytype') => void;
}) {
  const getTypes = (cat: 'T' | 'B' | 'L') => {
    switch (cat) {
      case 'T': return INVESTOR_TYPES;
      case 'B': return BUSINESS_TYPES;
      case 'L': return LABOR_TYPES;
    }
  };

  const rowTypes = getTypes(matrixCategory.row);
  const colTypes = getTypes(matrixCategory.col);

  const catNames = { T: '투자자', B: '사업가', L: '근로자' };
  const catColors = { T: 'amber', B: 'purple', L: 'cyan' };

  // 매트릭스 데이터 계산
  const matrixData = useMemo(() => {
    return rowTypes.map(rowType => 
      colTypes.map(colType => calculateInteraction(rowType, colType))
    );
  }, [rowTypes, colTypes]);

  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const hoveredInteraction = hoveredCell 
    ? matrixData[hoveredCell.row][hoveredCell.col] 
    : null;

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      {/* 매트릭스 선택 */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">행:</span>
          {(['T', 'B', 'L'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setMatrixCategory({ ...matrixCategory, row: cat })}
              className={`px-3 py-1 rounded-lg text-xs transition-all ${
                matrixCategory.row === cat
                  ? `bg-${catColors[cat]}-500/20 text-${catColors[cat]}-400`
                  : 'bg-white/5 text-white/50'
              }`}
            >
              {catNames[cat]}
            </button>
          ))}
        </div>
        <span className="text-white/20">×</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">열:</span>
          {(['T', 'B', 'L'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setMatrixCategory({ ...matrixCategory, col: cat })}
              className={`px-3 py-1 rounded-lg text-xs transition-all ${
                matrixCategory.col === cat
                  ? `bg-${catColors[cat]}-500/20 text-${catColors[cat]}-400`
                  : 'bg-white/5 text-white/50'
              }`}
            >
              {catNames[cat]}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2 text-[10px]">
          {Object.entries(INTERACTION_LABELS).map(([type, label]) => (
            <span key={type} className={`px-2 py-1 rounded ${INTERACTION_COLORS[type as keyof typeof INTERACTION_COLORS].bg} ${INTERACTION_COLORS[type as keyof typeof INTERACTION_COLORS].text}`}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* 매트릭스 */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* 매트릭스 그리드 */}
        <div className="flex-1 overflow-auto">
          <div className="inline-block">
            {/* 헤더 행 */}
            <div className="flex">
              <div className="w-16 h-8" /> {/* 코너 */}
              {colTypes.map((type, i) => (
                <div 
                  key={i} 
                  className="w-8 h-8 flex items-center justify-center text-[8px] text-white/40 -rotate-45 origin-center"
                  title={type.name}
                >
                  {type.id}
                </div>
              ))}
            </div>

            {/* 데이터 행 */}
            {rowTypes.map((rowType, rowIdx) => (
              <div key={rowIdx} className="flex">
                <div 
                  className="w-16 h-8 flex items-center text-[10px] text-white/50 pr-2 truncate"
                  title={rowType.name}
                >
                  {rowType.id}
                </div>
                {colTypes.map((colType, colIdx) => {
                  const interaction = matrixData[rowIdx][colIdx];
                  const colors = INTERACTION_COLORS[interaction.type];
                  
                  return (
                    <div
                      key={colIdx}
                      className={`w-8 h-8 flex items-center justify-center text-[9px] cursor-pointer transition-all hover:scale-125 hover:z-10 ${colors.bg} ${colors.text} border border-transparent hover:${colors.border}`}
                      onMouseEnter={() => setHoveredCell({ row: rowIdx, col: colIdx })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => {
                        setSelectedType(rowType.id);
                        setView('detail');
                      }}
                      title={`${rowType.id} × ${colType.id}: ${interaction.coefficient}`}
                    >
                      {interaction.coefficient > 0 ? '+' : ''}{(interaction.coefficient * 10).toFixed(0)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 호버 정보 */}
        <div className="w-80 p-4 rounded-2xl bg-white/[0.02] border border-white/5 overflow-y-auto">
          {hoveredInteraction ? (
            <>
              <div className="text-xs text-white/40 mb-2">상호작용 분석</div>
              
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">{getTypeById(hoveredInteraction.nodeA)?.id}</span>
                <span className="text-white/30">×</span>
                <span className="text-lg">{getTypeById(hoveredInteraction.nodeB)?.id}</span>
              </div>

              <div className={`inline-block px-3 py-1 rounded-full text-sm mb-4 ${INTERACTION_COLORS[hoveredInteraction.type].bg} ${INTERACTION_COLORS[hoveredInteraction.type].text}`}>
                {INTERACTION_LABELS[hoveredInteraction.type]} ({hoveredInteraction.coefficient > 0 ? '+' : ''}{hoveredInteraction.coefficient})
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-[10px] text-white/40 mb-1">결과값 (Outcome)</div>
                  <div className="text-sm">{hoveredInteraction.outcome}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40 mb-1">연결 통제 액션</div>
                  <div className="text-sm text-cyan-400">{hoveredInteraction.action}</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="text-[10px] text-white/40 mb-2">노드 A: {getTypeById(hoveredInteraction.nodeA)?.name}</div>
                <div className="text-[10px] text-white/30">{getTypeById(hoveredInteraction.nodeA)?.desc}</div>
                
                <div className="text-[10px] text-white/40 mb-2 mt-3">노드 B: {getTypeById(hoveredInteraction.nodeB)?.name}</div>
                <div className="text-[10px] text-white/30">{getTypeById(hoveredInteraction.nodeB)?.desc}</div>
              </div>
            </>
          ) : (
            <div className="text-white/30 text-sm text-center py-8">
              셀 위에 마우스를 올리면<br />상호작용 분석이 표시됩니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 상세 분석 뷰
// ═══════════════════════════════════════════════════════════════════════════

function DetailView({
  selectedType,
  setSelectedType,
  selectedNodeType
}: {
  selectedType: string | null;
  setSelectedType: (id: string | null) => void;
  selectedNodeType: NodeType | null;
}) {
  const topInteractions = selectedType ? getTopInteractions(selectedType, 10) : [];
  const worstInteractions = selectedType ? getWorstInteractions(selectedType, 5) : [];

  if (!selectedNodeType) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="text-4xl mb-4">🔍</div>
        <div className="text-white/50">타입을 선택하면 상세 분석이 표시됩니다</div>
        
        {/* 빠른 선택 */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {['T01', 'B01', 'L01'].map(id => {
            const type = getTypeById(id);
            return type ? (
              <button
                key={id}
                onClick={() => setSelectedType(id)}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all"
              >
                <div className="text-2xl mb-2">{type.id}</div>
                <div className="text-sm">{type.name}</div>
              </button>
            ) : null;
          })}
        </div>
      </div>
    );
  }

  const catColors = { T: 'amber', B: 'purple', L: 'cyan' };
  const catNames = { T: '투자자', B: '사업가', L: '근로자' };

  return (
    <div className="h-full grid grid-cols-3 gap-6 p-6 overflow-hidden">
      
      {/* 좌측: 타입 정보 */}
      <div className="overflow-y-auto">
        <div className={`p-6 rounded-2xl bg-${catColors[selectedNodeType.category]}-500/10 border border-${catColors[selectedNodeType.category]}-500/20`}>
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-3xl font-bold text-${catColors[selectedNodeType.category]}-400`}>
              {selectedNodeType.id}
            </span>
            <span className="text-xs text-white/40">{catNames[selectedNodeType.category]}</span>
          </div>
          
          <h2 className="text-xl font-medium mb-1">{selectedNodeType.name}</h2>
          <div className="text-sm text-white/40 mb-4">{selectedNodeType.nameEn}</div>
          <p className="text-sm text-white/60 mb-6">{selectedNodeType.desc}</p>

          {/* 특성 태그 */}
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedNodeType.traits.map((trait, i) => (
              <span key={i} className="px-2 py-1 rounded-lg bg-white/5 text-xs text-white/60">
                {trait}
              </span>
            ))}
          </div>

          {/* 벡터 그래프 */}
          <div className="space-y-3">
            <div className="text-xs text-white/40 mb-2">벡터 특성</div>
            {Object.entries(selectedNodeType.vectors).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-20 text-[10px] text-white/40 capitalize">{key}</span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full bg-${catColors[selectedNodeType.category]}-400`}
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span className="w-8 text-[10px] text-white/50 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 타입 선택 드롭다운 */}
        <div className="mt-4">
          <select
            value={selectedType || ''}
            onChange={e => setSelectedType(e.target.value)}
            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-sm"
          >
            <optgroup label="투자자 (T)">
              {INVESTOR_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
              ))}
            </optgroup>
            <optgroup label="사업가 (B)">
              {BUSINESS_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
              ))}
            </optgroup>
            <optgroup label="근로자 (L)">
              {LABOR_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* 중앙: 최고 상호작용 */}
      <div className="overflow-y-auto">
        <h3 className="text-sm text-green-400 mb-4">🏆 최고 상호작용 Top 10</h3>
        <div className="space-y-2">
          {topInteractions.map((interaction, i) => {
            const otherType = getTypeById(interaction.nodeB);
            const colors = INTERACTION_COLORS[interaction.type];
            
            return (
              <div 
                key={i}
                className={`p-3 rounded-xl ${colors.bg} border ${colors.border} cursor-pointer hover:scale-[1.02] transition-all`}
                onClick={() => setSelectedType(interaction.nodeB)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">#{i + 1}</span>
                    <span className="font-medium">{otherType?.id}</span>
                    <span className="text-sm text-white/60">{otherType?.name}</span>
                  </div>
                  <span className={`text-sm font-bold ${colors.text}`}>
                    +{interaction.coefficient}
                  </span>
                </div>
                <div className="text-xs text-white/40">{interaction.outcome}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 우측: 최악 상호작용 + 전략 */}
      <div className="overflow-y-auto space-y-6">
        <div>
          <h3 className="text-sm text-red-400 mb-4">⚠️ 주의 상호작용 Top 5</h3>
          <div className="space-y-2">
            {worstInteractions.map((interaction, i) => {
              const otherType = getTypeById(interaction.nodeB);
              const colors = INTERACTION_COLORS[interaction.type];
              
              return (
                <div 
                  key={i}
                  className={`p-3 rounded-xl ${colors.bg} border ${colors.border}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{otherType?.id}</span>
                      <span className="text-sm text-white/60">{otherType?.name}</span>
                    </div>
                    <span className={`text-sm font-bold ${colors.text}`}>
                      {interaction.coefficient}
                    </span>
                  </div>
                  <div className="text-xs text-white/40">{interaction.action}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 전략 요약 */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-white/10">
          <h3 className="text-sm text-white/60 mb-3">📋 전략 요약</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-white/70">
                {catNames[selectedNodeType.category]}와의 협업에서 강점 발휘
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400">!</span>
              <span className="text-white/70">
                리스크 성향: {selectedNodeType.vectors.risk > 70 ? '공격적' : selectedNodeType.vectors.risk > 40 ? '균형' : '보수적'}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-cyan-400">→</span>
              <span className="text-white/70">
                최적 파트너: {topInteractions[0] ? getTypeById(topInteractions[0].nodeB)?.name : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 72 모션(Force) 뷰
// ═══════════════════════════════════════════════════════════════════════════

function ForcesView() {
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [selectedForce, setSelectedForce] = useState<ForceType | null>(null);

  const filteredForces = filterDomain === 'all' 
    ? ALL_72_FORCES 
    : ALL_72_FORCES.filter(f => f.node === filterDomain);

  const domains = Object.entries(PHYSICS_NODES);

  return (
    <div className="h-full overflow-hidden p-6">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        
        {/* 필터 */}
        <div className="flex items-center gap-4 mb-6">
          <span className="text-sm text-white/50">물리 노드:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterDomain('all')}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                filterDomain === 'all' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              전체 (72)
            </button>
            {domains.map(([id, node]) => (
              <button
                key={id}
                onClick={() => setFilterDomain(id)}
                className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                  filterDomain === id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
                }`}
                style={{ borderBottom: filterDomain === id ? `2px solid ${node.color}` : 'none' }}
              >
                <span>{node.icon}</span>
                <span>{node.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 그리드 */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {filteredForces.map(force => {
              const node = PHYSICS_NODES[force.node as keyof typeof PHYSICS_NODES];
              const rarityColors = FORCE_RARITY_COLORS[force.rarity];
              
              return (
                <button
                  key={force.id}
                  onClick={() => setSelectedForce(selectedForce?.id === force.id ? null : force)}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    selectedForce?.id === force.id 
                      ? 'bg-white/10 border-white/30 scale-105' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{node?.icon}</span>
                    <span className="text-xs font-mono text-white/40">{force.id}</span>
                    <span 
                      className="text-[10px] px-1.5 py-0.5 rounded ml-auto"
                      style={{ background: rarityColors.bg, color: rarityColors.text }}
                    >
                      {force.rarity}
                    </span>
                  </div>
                  <div className="font-semibold text-sm text-white">{force.name}</div>
                  <div className="text-xs text-white/50 mt-1 line-clamp-2">{force.desc}</div>
                  
                  {selectedForce?.id === force.id && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                      <div className="text-xs text-white/40">예시:</div>
                      <div className="flex flex-wrap gap-1">
                        {force.examples.slice(0, 3).map((ex, i) => (
                          <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-white/60">
                            {ex}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-white/40 mt-2">
                        <span>비용: {force.cost}/10</span>
                        <span>{force.duration}</span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 하단 요약 */}
        <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-sm">
                <span className="text-white/50">전체:</span>
                <span className="text-white font-bold ml-2">72개</span>
              </div>
              <div className="text-sm">
                <span className="text-white/50">구조:</span>
                <span className="text-white ml-2">6 물리노드 × 12 작용</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {Object.entries(FORCE_RARITY_COLORS).map(([rarity, colors]) => (
                <div key={rarity} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: colors.text }} />
                  <span className="text-xs text-white/40">{rarity}</span>
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
// 72 업무(Work) 뷰
// ═══════════════════════════════════════════════════════════════════════════

function WorksView() {
  const [filterDomain, setFilterDomain] = useState<string>('all');
  const [filterPattern, setFilterPattern] = useState<string>('all');
  const [selectedWork, setSelectedWork] = useState<WorkType | null>(null);

  const filteredWorks = ALL_72_WORKS.filter(w => {
    if (filterDomain !== 'all' && w.domain !== filterDomain) return false;
    if (filterPattern !== 'all' && w.pattern !== filterPattern) return false;
    return true;
  });

  const domains = Object.entries(WORK_DOMAINS);
  const patterns = Object.entries(WORK_PATTERNS);

  const difficultyColors = ['', 'text-green-400', 'text-lime-400', 'text-yellow-400', 'text-orange-400', 'text-red-400'];
  const frequencyLabels: Record<string, string> = {
    daily: '매일',
    weekly: '매주',
    monthly: '매월',
    quarterly: '분기',
    yearly: '매년',
    once: '1회성'
  };

  return (
    <div className="h-full overflow-hidden p-6">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        
        {/* 필터 */}
        <div className="space-y-3 mb-6">
          {/* 도메인 필터 */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/50 w-20">도메인:</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterDomain('all')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  filterDomain === 'all' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                전체
              </button>
              {domains.map(([id, domain]) => (
                <button
                  key={id}
                  onClick={() => setFilterDomain(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                    filterDomain === id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  <span>{domain.icon}</span>
                  <span>{domain.name.replace(' 업무', '')}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* 패턴 필터 */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/50 w-20">패턴:</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterPattern('all')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  filterPattern === 'all' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                전체
              </button>
              {patterns.map(([id, pattern]) => (
                <button
                  key={id}
                  onClick={() => setFilterPattern(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    filterPattern === id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {pattern.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 그리드 */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {filteredWorks.map(work => {
              const domain = WORK_DOMAINS[work.domain as keyof typeof WORK_DOMAINS];
              
              return (
                <button
                  key={work.id}
                  onClick={() => setSelectedWork(selectedWork?.id === work.id ? null : work)}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    selectedWork?.id === work.id 
                      ? 'bg-white/10 border-white/30 scale-105' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{domain?.icon}</span>
                    <span className="text-xs font-mono text-white/40">{work.id}</span>
                    <span className={`text-[10px] ml-auto ${difficultyColors[work.difficulty]}`}>
                      {'★'.repeat(work.difficulty)}
                    </span>
                  </div>
                  <div className="font-semibold text-sm text-white">{work.name}</div>
                  <div className="text-xs text-white/50 mt-1 line-clamp-2">{work.desc}</div>
                  
                  {selectedWork?.id === work.id && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                      <div className="text-xs text-white/40">예시:</div>
                      <div className="flex flex-wrap gap-1">
                        {work.examples.slice(0, 3).map((ex, i) => (
                          <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-white/60">
                            {ex}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-white/40 mt-2">
                        <span>{frequencyLabels[work.frequency]}</span>
                        <span>{work.timeRequired}</span>
                      </div>
                      <div className="text-xs text-white/40">
                        입력: {work.inputNodes.join(', ')} → 출력: {work.outputNode}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 하단 요약 */}
        <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-sm">
                <span className="text-white/50">전체:</span>
                <span className="text-white font-bold ml-2">72개</span>
              </div>
              <div className="text-sm">
                <span className="text-white/50">구조:</span>
                <span className="text-white ml-2">6 도메인 × 12 패턴</span>
              </div>
              <div className="text-sm">
                <span className="text-white/50">표시:</span>
                <span className="text-white ml-2">{filteredWorks.length}개</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40">난이도:</span>
              {[1, 2, 3, 4, 5].map(d => (
                <span key={d} className={`text-xs ${difficultyColors[d]}`}>
                  {'★'.repeat(d)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Node72Matrix };
