/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎭 AUTUS Archetype Onboarding v3.0
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 2단계 온보딩:
 * Step 1: Core 선택 (6개 중 1개)
 * Step 2: Role 선택 (3개 중 0~2개)
 * 
 * 결과: 42가지 인간 유형 중 하나로 분류
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 및 상수
// ═══════════════════════════════════════════════════════════════════════════════

interface CoreArchetype {
  id: string;
  label: string;
  description: string;
}

interface RoleModifier {
  id: string | null;
  label: string;
  description: string;
}

interface OnboardingResult {
  core: string;
  roles: string[];
  displayName: string;
  displayEmoji: string;
  syncNumber: number;
}

const CORE_OPTIONS: CoreArchetype[] = [
  { id: 'EMPLOYEE', label: '💼 조직에서 일하고 있다', description: '직장인 - 50%' },
  { id: 'ENTREPRENEUR', label: '🚀 사업을 키우고 있다', description: '창업가 - 3%' },
  { id: 'SELF_EMPLOYED', label: '🏪 혼자/작은 규모로 일한다', description: '자영업자 - 12%' },
  { id: 'STUDENT', label: '📚 배우는 중이다', description: '학생 - 15%' },
  { id: 'TRANSITION', label: '🔍 전환기다 (구직/이직/휴식)', description: '전환기 - 5%' },
  { id: 'RETIRED', label: '🌅 은퇴했다', description: '은퇴자 - 15%' },
];

const ROLE_OPTIONS: RoleModifier[] = [
  { id: 'CAREGIVER', label: '👨‍👩‍👧 돌봄 책임이 있다', description: '양육자 - 25%' },
  { id: 'INVESTOR', label: '📈 투자/자산 운용을 한다', description: '투자자 - 15%' },
  { id: 'CREATOR', label: '✨ 콘텐츠/작품을 만든다', description: '창작자 - 8%' },
  { id: null, label: '⬜ 해당 없음', description: '' },
];

const CORE_DATA: Record<string, { name: string; emoji: string }> = {
  EMPLOYEE: { name: '직장인', emoji: '💼' },
  ENTREPRENEUR: { name: '창업가', emoji: '🚀' },
  SELF_EMPLOYED: { name: '자영업자', emoji: '🏪' },
  STUDENT: { name: '학생', emoji: '📚' },
  TRANSITION: { name: '전환기', emoji: '🔍' },
  RETIRED: { name: '은퇴자', emoji: '🌅' },
};

const ROLE_DATA: Record<string, { name: string; emoji: string }> = {
  CAREGIVER: { name: '양육자', emoji: '👨‍👩‍👧' },
  INVESTOR: { name: '투자자', emoji: '📈' },
  CREATOR: { name: '창작자', emoji: '✨' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export const ArchetypeOnboardingV3: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 'result'>(1);
  const [selectedCore, setSelectedCore] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [result, setResult] = useState<OnboardingResult | null>(null);

  // Core 선택
  const handleCoreSelect = (coreId: string) => {
    setSelectedCore(coreId);
    setTimeout(() => setStep(2), 300);
  };

  // Role 토글
  const handleRoleToggle = (roleId: string | null) => {
    if (roleId === null) {
      setSelectedRoles([]);
      return;
    }

    setSelectedRoles(prev => {
      if (prev.includes(roleId)) {
        return prev.filter(r => r !== roleId);
      }
      if (prev.length >= 2) {
        return [...prev.slice(1), roleId];
      }
      return [...prev, roleId];
    });
  };

  // 완료
  const handleComplete = () => {
    if (!selectedCore) return;

    const core = CORE_DATA[selectedCore];
    const roles = selectedRoles.map(r => ROLE_DATA[r]);

    const displayName = roles.length > 0
      ? `${core.name} + ${roles.map(r => r.name).join(' + ')}`
      : core.name;

    const displayEmoji = roles.length > 0
      ? `${core.emoji}${roles.map(r => r.emoji).join('')}`
      : core.emoji;

    // 시뮬레이션된 동기화 번호
    const syncNumber = Math.floor(12_000_000 + Math.random() * 1_000_000);

    setResult({
      core: selectedCore,
      roles: selectedRoles,
      displayName,
      displayEmoji,
      syncNumber,
    });
    setStep('result');
  };

  // 다시 시작
  const handleRestart = () => {
    setStep(1);
    setSelectedCore(null);
    setSelectedRoles([]);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-lg w-full"
          >
            <div className="text-center mb-8">
              <span className="text-4xl mb-4 block">🏛️</span>
              <h1 className="text-2xl font-bold mb-2">AUTUS 동기화</h1>
              <p className="text-gray-400 text-sm">Step 1/2</p>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold mb-4">지금 당신의 주된 상태는?</h2>
              <div className="space-y-2">
                {CORE_OPTIONS.map(option => (
                  <motion.button
                    key={option.id}
                    onClick={() => handleCoreSelect(option.id)}
                    className={`w-full p-4 rounded-lg text-left transition-all ${
                      selectedCore === option.id
                        ? 'bg-blue-600 border-blue-500'
                        : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                    } border`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-400 mt-1">{option.description}</div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-lg w-full"
          >
            <div className="text-center mb-8">
              <span className="text-4xl mb-4 block">🎭</span>
              <h1 className="text-2xl font-bold mb-2">역할 추가</h1>
              <p className="text-gray-400 text-sm">Step 2/2 (최대 2개 선택)</p>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold mb-4">추가로 해당되는 역할이 있나요?</h2>
              <div className="space-y-2">
                {ROLE_OPTIONS.map(option => {
                  const isSelected = option.id === null
                    ? selectedRoles.length === 0
                    : selectedRoles.includes(option.id);

                  return (
                    <motion.button
                      key={option.id ?? 'none'}
                      onClick={() => handleRoleToggle(option.id)}
                      className={`w-full p-4 rounded-lg text-left transition-all ${
                        isSelected
                          ? 'bg-purple-600 border-purple-500'
                          : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                      } border`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-gray-400 mt-1">{option.description}</div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
                >
                  ← 이전
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 transition font-semibold"
                >
                  완료 →
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'result' && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg w-full text-center"
          >
            <motion.div
              className="text-6xl mb-6"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5 }}
            >
              {result.displayEmoji}
            </motion.div>

            <h1 className="text-3xl font-bold mb-2">{result.displayName}</h1>

            <motion.p
              className="text-lg text-gray-400 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              당신은 <span className="text-blue-400 font-semibold">
                {result.syncNumber.toLocaleString()}
              </span>번째로 동기화되었습니다
            </motion.p>

            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 mb-6">
              <div className="text-sm text-gray-400 mb-4">조합 정보</div>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <div className="px-4 py-2 bg-blue-600/20 rounded-lg border border-blue-600">
                  <span className="text-blue-400">Core: </span>
                  <span>{CORE_DATA[result.core].emoji} {CORE_DATA[result.core].name}</span>
                </div>
                {result.roles.map(role => (
                  <div
                    key={role}
                    className="px-4 py-2 bg-purple-600/20 rounded-lg border border-purple-600"
                  >
                    <span className="text-purple-400">Role: </span>
                    <span>{ROLE_DATA[role].emoji} {ROLE_DATA[role].name}</span>
                  </div>
                ))}
              </div>
            </div>

            <motion.div
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <button
                onClick={handleRestart}
                className="w-full py-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
              >
                다시 시작
              </button>
              <button
                className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition font-semibold"
              >
                🏛️ AUTUS 대시보드로 이동
              </button>
            </motion.div>

            <p className="text-xs text-gray-600 mt-6">
              "이해할 수 없으면 변화할 수 없다" - AUTUS v3.0
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ArchetypeOnboardingV3;
