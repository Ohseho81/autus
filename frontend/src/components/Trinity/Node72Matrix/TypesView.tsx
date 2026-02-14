import {
  INVESTOR_TYPES,
  BUSINESS_TYPES,
  LABOR_TYPES,
} from '../data/node72Types';

export interface TypesViewProps {
  filterCategory: 'all' | 'T' | 'B' | 'L';
  setFilterCategory: (c: 'all' | 'T' | 'B' | 'L') => void;
  selectedType: string | null;
  setSelectedType: (id: string | null) => void;
  setView: (v: 'types' | 'forces' | 'works' | 'matrix' | 'heatmap' | 'detail' | 'mytype') => void;
  myType: string | null;
  saveMyType: (id: string) => void;
}

export function TypesView({
  filterCategory,
  setFilterCategory,
  selectedType,
  setSelectedType,
  setView,
  myType,
  saveMyType
}: TypesViewProps) {
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
