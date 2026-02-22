/**
 * AUTUS - 72타입 분류표 & 상호작용 매트릭스 UI
 * =============================================
 */

import { useState, useCallback } from 'react';
import { getTypeById } from '../data/node72Types';
import { MyTypeView } from './MyTypeView';
import { TypesView } from './TypesView';
import { HeatmapView } from './HeatmapView';
import { MatrixView } from './MatrixView';
import { DetailView } from './DetailView';
import { ForcesView } from './ForcesView';
import { WorksView } from './WorksView';

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

  const selectedNodeType = (selectedType ? getTypeById(selectedType) : null) ?? null;
  const myNodeType = (myType ? getTypeById(myType) : null) ?? null;

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
          <span className="text-lg font-light tracking-wider">온리쌤</span>
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

export { Node72Matrix };
