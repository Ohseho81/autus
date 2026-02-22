import {
  INVESTOR_TYPES,
  BUSINESS_TYPES,
  LABOR_TYPES,
  NodeType,
  getTypeById
} from '../data/node72Types';
import {
  getTopInteractions,
  getWorstInteractions,
  INTERACTION_COLORS,
} from '../data/interactionMatrix';

export interface DetailViewProps {
  selectedType: string | null;
  setSelectedType: (id: string | null) => void;
  selectedNodeType: NodeType | null;
}

export function DetailView({
  selectedType,
  setSelectedType,
  selectedNodeType
}: DetailViewProps) {
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
