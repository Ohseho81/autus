import React from 'react';
import { motion } from 'framer-motion';

interface EfficiencyScore {
  id: string;
  name: string;
  score: number; // 0-100
  trend: 'up' | 'down' | 'stable';
  change: number;
}

interface EfficiencyScoreboardProps {
  scores: EfficiencyScore[];
  overallScore: number;
  lastUpdated?: Date;
}

/**
 * 효율성 스코어보드 컴포넌트
 * 시스템/팀 효율성 점수를 리더보드 형태로 표시
 */
export const EfficiencyScoreboard: React.FC<EfficiencyScoreboardProps> = ({
  scores,
  overallScore,
  lastUpdated,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/20';
    if (score >= 60) return 'bg-yellow-500/20';
    return 'bg-red-500/20';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <span className="text-green-400">▲</span>;
      case 'down':
        return <span className="text-red-400">▼</span>;
      default:
        return <span className="text-gray-400">―</span>;
    }
  };

  const sortedScores = [...scores].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* 헤더 - 전체 점수 */}
      <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              ⚡ 효율성 스코어보드
            </h3>
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                {lastUpdated.toLocaleString('ko-KR')}
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">전체 점수</div>
            <motion.div
              key={overallScore}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className={`text-3xl font-bold ${getScoreColor(overallScore)}`}
            >
              {overallScore}
            </motion.div>
          </div>
        </div>

        {/* 전체 프로그레스 바 */}
        <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallScore}%` }}
            transition={{ duration: 1 }}
            className={`h-full rounded-full ${
              overallScore >= 80
                ? 'bg-green-500'
                : overallScore >= 60
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
          />
        </div>
      </div>

      {/* 개별 점수 리스트 */}
      <div className="divide-y divide-gray-800/50">
        {sortedScores.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 p-3 hover:bg-gray-800/30 transition-colors"
          >
            {/* 순위 */}
            <div
              className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                index === 0
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : index === 1
                  ? 'bg-gray-400/20 text-gray-300'
                  : index === 2
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'bg-gray-700/50 text-gray-500'
              }`}
            >
              {index + 1}
            </div>

            {/* 이름 */}
            <span className="flex-1 text-white font-medium truncate">
              {item.name}
            </span>

            {/* 트렌드 & 변화량 */}
            <div className="flex items-center gap-1 text-sm">
              {getTrendIcon(item.trend)}
              <span
                className={
                  item.change > 0 ? 'text-green-400' : item.change < 0 ? 'text-red-400' : 'text-gray-500'
                }
              >
                {item.change > 0 ? '+' : ''}
                {item.change}
              </span>
            </div>

            {/* 점수 */}
            <div
              className={`px-2 py-1 rounded-lg text-sm font-mono font-bold ${getScoreBg(
                item.score
              )} ${getScoreColor(item.score)}`}
            >
              {item.score}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default EfficiencyScoreboard;
