/**
 * AUTUS Trinity - DetailPanel Component (Game Edition)
 * 노드 상세 + 퀘스트 생성
 */

import React, { memo, useState } from 'react';
import { useTrinityStore, selectCurrentNode } from '../../stores/trinityStore';
import { DetailPanelProps } from './types';

type TaskType = '물리삭제' | '사람' | '자동화' | '위임';
type Difficulty = 'easy' | 'normal' | 'hard' | 'legendary';

const DetailPanel = memo(function DetailPanel({ 
  onClose, 
  onMacroClick, 
  onAddTask 
}: DetailPanelProps) {
  const node = useTrinityStore(selectCurrentNode);
  const [selectedType, setSelectedType] = useState<TaskType>('물리삭제');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('normal');

  if (!node) return null;

  const taskTypes: { id: TaskType; label: string; icon: string; desc: string }[] = [
    { id: '물리삭제', label: '직접 행동', icon: '🏃', desc: '낮은 비용, 시간 소요' },
    { id: '사람', label: '인력 투입', icon: '👤', desc: '높은 비용, 안정적' },
    { id: '자동화', label: '자동화', icon: '🤖', desc: '초기 비용, 빠름' },
    { id: '위임', label: '위임', icon: '📤', desc: '중간 비용, 리스크' },
  ];

  const difficulties: { id: Difficulty; label: string; icon: string; color: string; mult: string }[] = [
    { id: 'easy', label: '쉬움', icon: '🟢', color: '#4ade80', mult: 'x0.5' },
    { id: 'normal', label: '보통', icon: '🟡', color: '#fbbf24', mult: 'x1.0' },
    { id: 'hard', label: '어려움', icon: '🟠', color: '#f97316', mult: 'x1.5' },
    { id: 'legendary', label: '전설', icon: '🔴', color: '#ef4444', mult: 'x2.5' },
  ];

  const handleExecute = () => {
    // onAddTask에 타입 정보 전달
    onAddTask(node.action.title, node.icon, selectedType);
  };

  return (
    <div
      className="w-[500px] max-w-[calc(100vw-3rem)] bg-[rgba(8,8,12,0.98)] border border-[rgba(139,92,246,0.2)] rounded-2xl p-5 backdrop-blur-xl shadow-2xl max-h-[85vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-3.5 mb-4">
        <div className="w-14 h-14 rounded-xl bg-[rgba(139,92,246,0.15)] flex items-center justify-center text-3xl">
          {node.icon}
        </div>
        <div className="flex-1">
          <div className="text-xl font-semibold">{node.name} 역량</div>
          <div className="text-[10px] text-white/40 mt-0.5">
            {node.id.toUpperCase()} · 퀘스트 생성
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <span className="text-white/40 text-xl">✕</span>
        </button>
      </div>

      {/* 현재 상태 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-xl text-center bg-[rgba(251,191,36,0.08)] border border-[rgba(251,191,36,0.15)]">
          <div className="text-[9px] text-white/40 mb-1">👑 목표</div>
          <div className="text-lg font-bold text-[#fbbf24]">{node.goal.d}</div>
        </div>
        <div className="p-3 rounded-xl text-center bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.15)]">
          <div className="text-[9px] text-white/40 mb-1">📊 현재</div>
          <div className="text-lg font-bold text-[#a78bfa]">{node.status.d}</div>
        </div>
        <div className="p-3 rounded-xl text-center bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.15)]">
          <div className="text-[9px] text-white/40 mb-1">📈 진행</div>
          <div className="text-lg font-bold text-[#4ade80]">{node.progress.d}</div>
        </div>
      </div>

      {/* 매크로 그리드 */}
      <div className="mb-4">
        <div className="text-[10px] text-white/40 mb-2">📊 세부 지표 (클릭하여 상세)</div>
        <div className="grid grid-cols-4 gap-2">
          {node.macros.map((m, i) => (
            <button
              key={i}
              onClick={() => onMacroClick(i)}
              className="relative p-2 bg-white/[0.02] border border-transparent rounded-lg text-center transition-all hover:bg-[rgba(139,92,246,0.1)] hover:border-[rgba(139,92,246,0.3)]"
            >
              <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${m.ok ? 'bg-[#4ade80]' : 'bg-[#f87171]'}`} />
              <div className="text-[9px] text-white/70">{m.name}</div>
              <div className="text-[8px] text-white/40">{m.val}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 구분선 */}
      <div className="border-t border-white/10 my-4" />

      {/* 퀘스트: 추천 액션 */}
      <div className="mb-4">
        <div className="text-[10px] text-white/40 mb-2">🎯 추천 퀘스트</div>
        <div className="p-4 bg-gradient-to-br from-[rgba(139,92,246,0.1)] to-[rgba(6,182,212,0.05)] border border-[rgba(139,92,246,0.2)] rounded-xl">
          <div className="text-base font-semibold mb-1">{node.action.title}</div>
          <div className="text-[10px] text-white/50">{node.action.desc}</div>
        </div>
      </div>

      {/* 실행 방법 선택 */}
      <div className="mb-4">
        <div className="text-[10px] text-white/40 mb-2">⚡ 실행 방법</div>
        <div className="grid grid-cols-4 gap-2">
          {taskTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`p-3 rounded-xl border transition-all ${
                selectedType === type.id
                  ? 'bg-[rgba(139,92,246,0.15)] border-[rgba(139,92,246,0.4)]'
                  : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05]'
              }`}
            >
              <div className="text-xl mb-1">{type.icon}</div>
              <div className="text-[9px] text-white/70 font-medium">{type.label}</div>
              <div className="text-[7px] text-white/40 mt-0.5">{type.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 난이도 선택 */}
      <div className="mb-4">
        <div className="text-[10px] text-white/40 mb-2">🎮 난이도 (보상 & 리스크)</div>
        <div className="grid grid-cols-4 gap-2">
          {difficulties.map(diff => (
            <button
              key={diff.id}
              onClick={() => setSelectedDifficulty(diff.id)}
              className={`p-2 rounded-lg border transition-all ${
                selectedDifficulty === diff.id
                  ? 'border-white/30'
                  : 'border-transparent hover:border-white/10'
              }`}
              style={{ 
                background: selectedDifficulty === diff.id ? `${diff.color}15` : 'rgba(255,255,255,0.02)'
              }}
            >
              <div className="text-lg mb-0.5">{diff.icon}</div>
              <div className="text-[9px] font-medium" style={{ color: diff.color }}>{diff.label}</div>
              <div className="text-[8px] text-white/40">{diff.mult}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 예상 효과 미리보기 */}
      <div className="mb-4 p-3 bg-black/40 rounded-xl border border-white/5">
        <div className="text-[9px] text-white/40 mb-2">📋 예상 효과</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[8px] text-[#4ade80] mb-1">✨ 성공 시</div>
            <div className="text-[10px] text-white/70">
              • 💰 +₩{getRewardGold(selectedType, selectedDifficulty)}만<br/>
              • ⭐ +{getRewardExp(selectedDifficulty)} EXP<br/>
              • 📊 스탯 상승
            </div>
          </div>
          <div>
            <div className="text-[8px] text-[#f87171] mb-1">💀 실패 시</div>
            <div className="text-[10px] text-white/70">
              • 💰 -{getPenaltyGold(selectedDifficulty)}만<br/>
              • ⏱️ 시간 손실<br/>
              • 😓 디버프 부여
            </div>
          </div>
        </div>
      </div>

      {/* 실행 버튼 */}
      <button
        onClick={handleExecute}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4] text-white text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
      >
        <span className="text-lg">🎲</span>
        <span>퀘스트 실행하기</span>
      </button>

      <div className="text-center text-[8px] text-white/20 mt-3">
        실행 전 성공 확률 및 보상을 확인하세요
      </div>
    </div>
  );
});

// 보상/패널티 계산 헬퍼
function getRewardGold(type: string, difficulty: string): number {
  const base = type === '사람' ? 80 : type === '자동화' ? 50 : type === '위임' ? 60 : 30;
  const mult = difficulty === 'easy' ? 0.5 : difficulty === 'normal' ? 1 : difficulty === 'hard' ? 1.5 : 2.5;
  return Math.round(base * mult);
}

function getRewardExp(difficulty: string): number {
  return difficulty === 'easy' ? 50 : difficulty === 'normal' ? 100 : difficulty === 'hard' ? 150 : 300;
}

function getPenaltyGold(difficulty: string): number {
  return difficulty === 'easy' ? 10 : difficulty === 'normal' ? 20 : difficulty === 'hard' ? 40 : 80;
}

export default DetailPanel;
