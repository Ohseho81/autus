import { useState } from 'react';
import {
  ALL_72_FORCES,
  PHYSICS_NODES,
  FORCE_RARITY_COLORS,
  ForceType
} from '../data/forceTypes';

export function ForcesView() {
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
