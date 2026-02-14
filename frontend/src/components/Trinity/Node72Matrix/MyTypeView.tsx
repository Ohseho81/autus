import { useState, } from 'react';
import {
  ALL_72_TYPES,
  NodeType,
  getTypeById
} from '../data/node72Types';
import {
  getTopInteractions,
  getWorstInteractions,
  INTERACTION_COLORS,
} from '../data/interactionMatrix';

interface MyTypeViewProps {
  myType: string | null;
  myNodeType: NodeType | null;
  saveMyType: (id: string) => void;
  clearMyType: () => void;
  setSelectedType: (id: string | null) => void;
  setView: (v: 'types' | 'forces' | 'works' | 'matrix' | 'heatmap' | 'detail' | 'mytype') => void;
}

export function MyTypeView({
  myType,
  myNodeType,
  saveMyType,
  clearMyType,
  setSelectedType,
  setView
}: MyTypeViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'T' | 'B' | 'L'>('all');

  const topInteractions = myType ? getTopInteractions(myType, 10) : [];
  const worstInteractions = myType ? getWorstInteractions(myType, 5) : [];

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

  if (!myNodeType) {
    return (
      <div className="h-full flex flex-col p-6">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-light mb-2">내 타입을 설정하세요</h2>
          <p className="text-white/50">72가지 타입 중 자신에게 맞는 타입을 선택하면<br />최적의 상호작용 파트너를 찾을 수 있습니다.</p>
        </div>

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

  return (
    <div className="h-full grid grid-cols-3 gap-6 p-6 overflow-hidden">
      <div className="overflow-y-auto">
        <div className={`p-6 rounded-2xl bg-gradient-to-br from-${catColors[myNodeType.category]}-500/20 to-transparent border border-${catColors[myNodeType.category]}-500/30`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">내 타입</span>
              <span className={`text-3xl font-bold text-${catColors[myNodeType.category]}-400`}>
                {myNodeType.id}
              </span>
            </div>
            <button onClick={clearMyType} className="text-xs text-white/30 hover:text-white/60 transition-colors">변경</button>
          </div>

          <h2 className="text-xl font-medium mb-1">{myNodeType.name}</h2>
          <div className="text-sm text-white/40 mb-4">{myNodeType.nameEn}</div>
          <p className="text-sm text-white/60 mb-6">{myNodeType.desc}</p>

          <div className="flex flex-wrap gap-2 mb-6">
            {myNodeType.traits.map((trait, i) => (
              <span key={i} className="px-2 py-1 rounded-lg bg-white/5 text-xs text-white/60">{trait}</span>
            ))}
          </div>

          <div className="space-y-3">
            <div className="text-xs text-white/40 mb-2">벡터 특성</div>
            {Object.entries(myNodeType.vectors).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-20 text-[10px] text-white/40 capitalize">{key}</span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full bg-${catColors[myNodeType.category]}-400`} style={{ width: `${value}%` }} />
                </div>
                <span className="w-8 text-[10px] text-white/50 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-white/10">
          <h3 className="text-sm text-white/60 mb-3">📋 나의 전략</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-white/70">{catNames[myNodeType.category]}와의 협업에서 강점 발휘</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400">!</span>
              <span className="text-white/70">리스크 성향: {myNodeType.vectors.risk > 70 ? '공격적' : myNodeType.vectors.risk > 40 ? '균형' : '보수적'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-cyan-400">→</span>
              <span className="text-white/70">최적 파트너: {topInteractions[0] ? getTypeById(topInteractions[0].nodeB)?.name : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto">
        <h3 className="text-sm text-green-400 mb-4">🏆 나와 잘 맞는 타입 Top 10</h3>
        <div className="space-y-2">
          {topInteractions.map((interaction, i) => {
            const otherType = getTypeById(interaction.nodeB);
            const colors = INTERACTION_COLORS[interaction.type];
            return (
              <div key={i} className={`p-3 rounded-xl ${colors.bg} border ${colors.border} cursor-pointer hover:scale-[1.02] transition-all`}
                onClick={() => { setSelectedType(interaction.nodeB); setView('detail'); }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">#{i + 1}</span>
                    <span className="font-medium">{otherType?.id}</span>
                    <span className="text-sm text-white/60">{otherType?.name}</span>
                  </div>
                  <span className={`text-sm font-bold ${colors.text}`}>+{interaction.coefficient}</span>
                </div>
                <div className="text-xs text-white/40">{interaction.outcome}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="overflow-y-auto space-y-6">
        <div>
          <h3 className="text-sm text-red-400 mb-4">⚠️ 나와 맞지 않는 타입 Top 5</h3>
          <div className="space-y-2">
            {worstInteractions.map((interaction, i) => {
              const otherType = getTypeById(interaction.nodeB);
              const colors = INTERACTION_COLORS[interaction.type];
              return (
                <div key={i} className={`p-3 rounded-xl ${colors.bg} border ${colors.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{otherType?.id}</span>
                      <span className="text-sm text-white/60">{otherType?.name}</span>
                    </div>
                    <span className={`text-sm font-bold ${colors.text}`}>{interaction.coefficient}</span>
                  </div>
                  <div className="text-xs text-white/40">{interaction.action}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <h3 className="text-sm text-amber-400 mb-3">⚡ 추천 액션</h3>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-black/20">
              <div className="text-xs text-white/40 mb-1">최적 협업 찾기</div>
              <div className="text-white/80">{topInteractions[0] && getTypeById(topInteractions[0].nodeB)?.name}과(와) 연결하세요</div>
            </div>
            <div className="p-3 rounded-lg bg-black/20">
              <div className="text-xs text-white/40 mb-1">피해야 할 상호작용</div>
              <div className="text-white/80">{worstInteractions[0] && getTypeById(worstInteractions[0].nodeB)?.name}과(와)의 직접 연결 주의</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
