import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTrinityEngineData, useTrinityEngineActions, useTrinityEngineUI } from '../../../stores/trinityEngineStore';
import { MOCK_TRINITY_DATA } from '../../../api/trinity';
import type { TrinityData } from './types';
import { Icons } from './Icons';
import { StatCard } from './common';
import { InputModal } from './InputModal';
import { CrystallizationSection } from './CrystallizationSection';
import { EnvironmentSection } from './EnvironmentSection';
import { ProgressSection } from './ProgressSection';
import { ActionCard } from './ActionCard';

const TrinityEngineDashboard: React.FC = () => {
  // Store 연결
  const { data, isLoading, hasData } = useTrinityEngineData();
  const { runAnalysis, setUserDesire, toggleInputModal } = useTrinityEngineActions();
  const { showInputModal, userDesire } = useTrinityEngineUI();

  // 폴백: 스토어에 데이터 없으면 Mock 사용 (개발용)
  const displayData: TrinityData = data || MOCK_TRINITY_DATA;

  const handleSubmitDesire = useCallback(async (desire: string) => {
    setUserDesire(desire);
    await runAnalysis();
  }, [setUserDesire, runAnalysis]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      {/* 배경 그라데이션 */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-gray-950 to-purple-900/20 pointer-events-none" />

      {/* 배경 그리드 */}
      <div className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="relative max-w-7xl mx-auto">
        {/* 헤더 */}
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <motion.div
                className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30"
                whileHover={{ scale: 1.05 }}
              >
                <Icons.Target />
              </motion.div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    AUTUS TRINITY
                  </span>
                </h1>
                <p className="text-gray-400 text-sm">목표 달성 가속기</p>
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleInputModal}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-all flex items-center gap-2"
              >
                <Icons.Sparkles />
                <span className="hidden sm:inline">새 목표</span>
              </button>
            </div>
          </div>
          <p className="text-gray-500 text-sm md:text-base italic mt-4 max-w-2xl">
            "무슨 존재가 될지는 당신이 정한다. 그 존재를 유지하는 일은 우리가 한다."
          </p>
        </motion.header>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <motion.div
              className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}

        {/* 메인 콘텐츠 */}
        {!isLoading && (
          <>
            {/* 상단 통계 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard icon={Icons.Clock} label="필요 기간" value={displayData.crystallization.requiredMonths} unit="개월" color="blue" />
              <StatCard icon={Icons.TrendingUp} label="진행률" value={displayData.progress.progress} unit="%" color="green" trend={2.3} />
              <StatCard icon={Icons.Shield} label="실현 가능성" value={displayData.crystallization.feasibility} unit="%" color="yellow" />
              <StatCard icon={Icons.Zap} label="환경 점수" value={displayData.environment.environmentScore} unit="/100" color="purple" />
            </div>

            {/* Trinity 섹션 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <CrystallizationSection data={displayData.crystallization} />
              <EnvironmentSection data={displayData.environment} />
              <ProgressSection data={displayData.progress} />
            </div>

            {/* 액션 카드 */}
            <ActionCard actions={displayData.actions} />
          </>
        )}

        {/* 푸터 */}
        <footer className="mt-8 text-center text-gray-600 text-sm">
          <p>AUTUS v3.0 Trinity Engine • 2026</p>
        </footer>
      </div>

      {/* 입력 모달 */}
      <InputModal
        isOpen={showInputModal}
        onClose={toggleInputModal}
        onSubmit={handleSubmitDesire}
        isLoading={isLoading}
      />
    </div>
  );
};

export default TrinityEngineDashboard;
