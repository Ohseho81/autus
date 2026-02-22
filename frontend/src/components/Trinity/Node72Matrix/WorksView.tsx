import { useState } from 'react';
import {
  ALL_72_WORKS,
  WORK_DOMAINS,
  WORK_PATTERNS,
  WorkType
} from '../data/workTypes';

export function WorksView() {
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
