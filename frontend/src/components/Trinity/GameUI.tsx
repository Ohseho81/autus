/**
 * AUTUS Trinity - Game UI Components
 * ===================================
 * 
 * RPG 스타일 인터페이스
 */

import React, { memo, useState, useEffect } from 'react';
import { PlayerStats, Buff, Debuff, ActionResult, Quest, GameEngine, getGameEngine, GAME_CONSTANTS } from './GameEngine';

// ═══════════════════════════════════════════════════════════════════════════
// 스탯 바 (화면 상단/좌측)
// ═══════════════════════════════════════════════════════════════════════════

interface StatsBarProps {
  player: PlayerStats;
  turn: number;
}

export const StatsBar = memo(function StatsBar({ player, turn }: StatsBarProps) {
  return (
    <div className="fixed top-16 left-16 z-40 flex flex-col gap-2">
      {/* 레벨 & 경험치 */}
      <div className="bg-black/80 backdrop-blur-xl rounded-xl p-3 border border-white/10 w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚔️</span>
            <span className="text-white font-bold">Lv.{player.level}</span>
          </div>
          <span className="text-[10px] text-white/40">Turn {turn}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-500"
            style={{ width: `${(player.exp / player.expToNextLevel) * 100}%` }}
          />
        </div>
        <div className="text-[9px] text-white/40 mt-1 text-right">
          {player.exp} / {player.expToNextLevel} EXP
        </div>
      </div>

      {/* 자원 바 */}
      <div className="bg-black/80 backdrop-blur-xl rounded-xl p-3 border border-white/10 w-[200px]">
        {/* 골드 */}
        <ResourceBar
          icon="💰"
          label="Gold"
          current={player.gold}
          max={null}
          color="#fbbf24"
          format={(v) => `₩${(v / 1000000).toFixed(1)}M`}
        />
        
        {/* 에너지 */}
        <ResourceBar
          icon="⚡"
          label="Energy"
          current={player.energy}
          max={player.maxEnergy}
          color="#4ade80"
        />
        
        {/* 시간 */}
        <ResourceBar
          icon="⏱️"
          label="Time"
          current={player.time}
          max={player.maxTime}
          color="#06b6d4"
          format={(v) => `${v}h`}
        />
        
        {/* 운 */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
          <span className="text-sm">🍀</span>
          <span className="text-[10px] text-white/50">Luck</span>
          <div className="flex-1 flex justify-end">
            <span 
              className="text-xs font-bold"
              style={{ color: player.luck > 60 ? '#4ade80' : player.luck > 40 ? '#fbbf24' : '#f87171' }}
            >
              {Math.round(player.luck)}
            </span>
          </div>
        </div>
      </div>

      {/* 시너지 */}
      <div className="bg-black/80 backdrop-blur-xl rounded-xl p-3 border border-white/10 w-[200px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔗</span>
            <span className="text-[10px] text-white/50">Synergy</span>
          </div>
          <span 
            className="text-sm font-bold"
            style={{ color: player.synergyMultiplier > 1.2 ? '#4ade80' : '#a78bfa' }}
          >
            x{player.synergyMultiplier.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 버프/디버프 */}
      {(player.buffs.length > 0 || player.debuffs.length > 0) && (
        <div className="bg-black/80 backdrop-blur-xl rounded-xl p-2 border border-white/10 w-[200px]">
          <div className="flex flex-wrap gap-1">
            {player.buffs.map(buff => (
              <BuffIcon key={buff.id} buff={buff} />
            ))}
            {player.debuffs.map(debuff => (
              <DebuffIcon key={debuff.id} debuff={debuff} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// 자원 바 컴포넌트
function ResourceBar({ 
  icon, 
  label, 
  current, 
  max, 
  color,
  format = (v: number) => v.toString()
}: { 
  icon: string; 
  label: string; 
  current: number; 
  max: number | null;
  color: string;
  format?: (v: number) => string;
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{icon}</span>
          <span className="text-[10px] text-white/50">{label}</span>
        </div>
        <span className="text-[10px] font-medium" style={{ color }}>
          {format(current)}{max ? ` / ${format(max)}` : ''}
        </span>
      </div>
      {max && (
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{ 
              width: `${(current / max) * 100}%`,
              background: `linear-gradient(90deg, ${color}80, ${color})`
            }}
          />
        </div>
      )}
    </div>
  );
}

// 버프 아이콘
function BuffIcon({ buff }: { buff: Buff }) {
  return (
    <div 
      className="relative w-8 h-8 rounded-lg bg-[rgba(74,222,128,0.2)] border border-[rgba(74,222,128,0.3)] flex items-center justify-center cursor-help group"
      title={`${buff.name}: ${buff.effect} (${buff.duration}턴)`}
    >
      <span className="text-sm">{buff.icon}</span>
      <span className="absolute -bottom-1 -right-1 text-[8px] bg-[#4ade80] text-black rounded px-1 font-bold">
        {buff.duration}
      </span>
      
      {/* 툴팁 */}
      <div className="absolute left-full ml-2 top-0 bg-black/95 rounded-lg p-2 w-[150px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
        <div className="text-[10px] font-bold text-[#4ade80]">{buff.name}</div>
        <div className="text-[9px] text-white/60 mt-1">{buff.effect}</div>
      </div>
    </div>
  );
}

// 디버프 아이콘
function DebuffIcon({ debuff }: { debuff: Debuff }) {
  const severityColor = {
    minor: 'rgba(248,113,113,0.2)',
    major: 'rgba(248,113,113,0.4)',
    critical: 'rgba(248,113,113,0.6)'
  };
  
  return (
    <div 
      className="relative w-8 h-8 rounded-lg border border-[rgba(248,113,113,0.3)] flex items-center justify-center cursor-help group"
      style={{ background: severityColor[debuff.severity] }}
      title={`${debuff.name}: ${debuff.effect} (${debuff.duration}턴)`}
    >
      <span className="text-sm">{debuff.icon}</span>
      <span className="absolute -bottom-1 -right-1 text-[8px] bg-[#f87171] text-white rounded px-1 font-bold">
        {debuff.duration}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6대 스탯 헥사곤 오버레이
// ═══════════════════════════════════════════════════════════════════════════

interface StatHexagonProps {
  stats: PlayerStats['stats'];
  size?: number;
}

export const StatHexagon = memo(function StatHexagon({ stats, size = 120 }: StatHexagonProps) {
  const statEntries = [
    { key: 'bio', label: '생체', icon: '❤️', angle: 90 },
    { key: 'capital', label: '자본', icon: '💰', angle: 30 },
    { key: 'cognitive', label: '인지', icon: '🧠', angle: -30 },
    { key: 'relation', label: '관계', icon: '🤝', angle: -90 },
    { key: 'environment', label: '환경', icon: '🌍', angle: -150 },
    { key: 'security', label: '안전', icon: '🛡️', angle: 150 },
  ];

  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.4;

  const points = statEntries.map(s => {
    const a = (s.angle * Math.PI) / 180;
    const val = stats[s.key as keyof typeof stats];
    const r = R * (val / 100);
    return `${cx + Math.cos(a) * r},${cy - Math.sin(a) * r}`;
  }).join(' ');

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
        {/* 배경 그리드 */}
        {[25, 50, 75, 100].map(pct => {
          const gridPoints = statEntries.map(s => {
            const a = (s.angle * Math.PI) / 180;
            const r = R * (pct / 100);
            return `${cx + Math.cos(a) * r},${cy - Math.sin(a) * r}`;
          }).join(' ');
          return (
            <polygon
              key={pct}
              points={gridPoints}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />
          );
        })}
        
        {/* 스탯 영역 */}
        <polygon
          points={points}
          fill="rgba(139,92,246,0.3)"
          stroke="#a78bfa"
          strokeWidth="2"
        />
        
        {/* 스탯 포인트 */}
        {statEntries.map((s, i) => {
          const a = (s.angle * Math.PI) / 180;
          const val = stats[s.key as keyof typeof stats];
          const x = cx + Math.cos(a) * R;
          const y = cy - Math.sin(a) * R;
          
          return (
            <g key={s.key}>
              <circle cx={x} cy={y} r={size * 0.06} fill="#08080c" stroke="rgba(255,255,255,0.2)" />
              <text 
                x={x} 
                y={y + 1} 
                textAnchor="middle" 
                dominantBaseline="middle"
                fontSize={size * 0.08}
              >
                {s.icon}
              </text>
              <text
                x={x + Math.cos(a) * (size * 0.15)}
                y={y - Math.sin(a) * (size * 0.15)}
                textAnchor="middle"
                fill="white"
                fontSize={size * 0.07}
                fontWeight="bold"
              >
                {val}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// 액션 결과 팝업
// ═══════════════════════════════════════════════════════════════════════════

interface ActionResultPopupProps {
  result: ActionResult;
  onClose: () => void;
}

export const ActionResultPopup = memo(function ActionResultPopup({ result, onClose }: ActionResultPopupProps) {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    setShow(true);
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onClose, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = result.success 
    ? result.isCritical ? 'from-yellow-500/20 to-amber-500/20' : 'from-green-500/20 to-emerald-500/20'
    : result.isCritical ? 'from-red-600/20 to-rose-600/20' : 'from-red-500/20 to-orange-500/20';

  const borderColor = result.success
    ? result.isCritical ? 'border-yellow-500/50' : 'border-green-500/50'
    : result.isCritical ? 'border-red-600/50' : 'border-red-500/50';

  return (
    <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 transition-all duration-300 ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
      <div className={`bg-gradient-to-br ${bgColor} backdrop-blur-xl rounded-2xl p-6 border ${borderColor} min-w-[300px] text-center`}>
        {/* 아이콘 */}
        <div className="text-6xl mb-4">
          {result.success 
            ? result.isCritical ? '🎊' : '✅'
            : result.isCritical ? '💀' : '❌'
          }
        </div>
        
        {/* 메시지 */}
        <div className="text-lg font-bold mb-4">{result.message}</div>
        
        {/* 변화량 */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {result.changes.gold !== 0 && (
            <div className={result.changes.gold > 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}>
              💰 {result.changes.gold > 0 ? '+' : ''}₩{(result.changes.gold / 10000).toFixed(0)}만
            </div>
          )}
          {result.changes.exp !== 0 && (
            <div className={result.changes.exp > 0 ? 'text-[#fbbf24]' : 'text-[#f87171]'}>
              ⭐ {result.changes.exp > 0 ? '+' : ''}{result.changes.exp} EXP
            </div>
          )}
          {result.changes.energy !== 0 && (
            <div className="text-[#06b6d4]">
              ⚡ {result.changes.energy} Energy
            </div>
          )}
          {Object.entries(result.changes.stats).map(([stat, val]) => val !== 0 && (
            <div key={stat} className={(val ?? 0) > 0 ? 'text-[#a78bfa]' : 'text-[#f87171]'}>
              📊 {stat} {(val ?? 0) > 0 ? '+' : ''}{val}
            </div>
          ))}
        </div>
        
        {/* 버프/디버프 */}
        {result.newBuffs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-[10px] text-[#4ade80] mb-2">✨ 버프 획득!</div>
            {result.newBuffs.map(b => (
              <div key={b.id} className="text-xs text-white/70">{b.icon} {b.name}</div>
            ))}
          </div>
        )}
        {result.newDebuffs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-[10px] text-[#f87171] mb-2">😓 디버프 부여</div>
            {result.newDebuffs.map(d => (
              <div key={d.id} className="text-xs text-white/70">{d.icon} {d.name}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// 퀘스트 미리보기 (실행 전 확률 표시)
// ═══════════════════════════════════════════════════════════════════════════

interface QuestPreviewProps {
  quest: Quest;
  successRate: number;
  canAfford: { canAfford: boolean; reasons: string[] };
  onExecute: () => void;
  onCancel: () => void;
}

export const QuestPreview = memo(function QuestPreview({ 
  quest, 
  successRate, 
  canAfford,
  onExecute, 
  onCancel 
}: QuestPreviewProps) {
  const difficultyColor = {
    easy: '#4ade80',
    normal: '#06b6d4',
    hard: '#fbbf24',
    legendary: '#f87171'
  };

  return (
    <div className="bg-black/90 backdrop-blur-xl rounded-2xl p-5 border border-white/10 w-[400px]">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{quest.icon}</span>
        <div>
          <div className="text-lg font-bold">{quest.title}</div>
          <div 
            className="text-[10px] font-semibold"
            style={{ color: difficultyColor[quest.difficulty] }}
          >
            {quest.difficulty.toUpperCase()}
          </div>
        </div>
      </div>

      {/* 성공 확률 게이지 */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] mb-1">
          <span className="text-white/50">성공 확률</span>
          <span 
            className="font-bold"
            style={{ color: successRate > 70 ? '#4ade80' : successRate > 40 ? '#fbbf24' : '#f87171' }}
          >
            {Math.round(successRate)}%
          </span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden relative">
          <div 
            className="h-full rounded-full transition-all"
            style={{ 
              width: `${successRate}%`,
              background: successRate > 70 
                ? 'linear-gradient(90deg, #4ade80, #22c55e)' 
                : successRate > 40 
                  ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                  : 'linear-gradient(90deg, #f87171, #ef4444)'
            }}
          />
          {/* 크리티컬 존 표시 */}
          <div className="absolute right-0 top-0 h-full w-[5%] bg-yellow-500/30" title="대성공 존" />
          <div className="absolute left-0 top-0 h-full w-[5%] bg-red-500/30" title="대실패 존" />
        </div>
        <div className="flex justify-between text-[8px] text-white/30 mt-1">
          <span>💀 대실패</span>
          <span>🎊 대성공</span>
        </div>
      </div>

      {/* 요구사항 */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className={`p-2 rounded-lg text-center ${quest.requirements.energy > 0 ? 'bg-white/5' : 'bg-white/[0.02]'}`}>
          <div className="text-lg">⚡</div>
          <div className="text-[10px] text-white/50">에너지</div>
          <div className="text-sm font-bold">{quest.requirements.energy}</div>
        </div>
        <div className={`p-2 rounded-lg text-center ${quest.requirements.time > 0 ? 'bg-white/5' : 'bg-white/[0.02]'}`}>
          <div className="text-lg">⏱️</div>
          <div className="text-[10px] text-white/50">시간</div>
          <div className="text-sm font-bold">{quest.requirements.time}h</div>
        </div>
        <div className={`p-2 rounded-lg text-center ${quest.requirements.gold > 0 ? 'bg-white/5' : 'bg-white/[0.02]'}`}>
          <div className="text-lg">💰</div>
          <div className="text-[10px] text-white/50">비용</div>
          <div className="text-sm font-bold">₩{(quest.requirements.gold / 10000).toFixed(0)}만</div>
        </div>
      </div>

      {/* 보상 vs 패널티 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-[rgba(74,222,128,0.1)] rounded-xl border border-[rgba(74,222,128,0.2)]">
          <div className="text-[10px] text-[#4ade80] mb-2">✨ 성공 보상</div>
          <div className="text-xs space-y-1">
            <div>💰 +₩{(quest.rewards.gold / 10000).toFixed(0)}만</div>
            <div>⭐ +{quest.rewards.exp} EXP</div>
            {quest.rewards.statBonus && Object.entries(quest.rewards.statBonus).map(([s, v]) => (
              <div key={s}>📊 {s} +{v}</div>
            ))}
          </div>
        </div>
        <div className="p-3 bg-[rgba(248,113,113,0.1)] rounded-xl border border-[rgba(248,113,113,0.2)]">
          <div className="text-[10px] text-[#f87171] mb-2">💀 실패 페널티</div>
          <div className="text-xs space-y-1">
            <div>💰 -₩{(quest.penalties.gold / 10000).toFixed(0)}만</div>
            <div>⭐ -{quest.penalties.exp} EXP</div>
            {quest.penalties.debuff && (
              <div>😓 {quest.penalties.debuff.name}</div>
            )}
          </div>
        </div>
      </div>

      {/* 실행 불가 이유 */}
      {!canAfford.canAfford && (
        <div className="mb-4 p-3 bg-[rgba(248,113,113,0.1)] rounded-lg border border-[rgba(248,113,113,0.2)]">
          <div className="text-[10px] text-[#f87171] font-bold mb-1">⚠️ 실행 불가</div>
          {canAfford.reasons.map((reason, i) => (
            <div key={i} className="text-[9px] text-white/60">• {reason}</div>
          ))}
        </div>
      )}

      {/* 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 text-sm font-medium hover:bg-white/10 transition-colors"
        >
          취소
        </button>
        <button
          onClick={onExecute}
          disabled={!canAfford.canAfford}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
            canAfford.canAfford
              ? 'bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4] text-white hover:opacity-90'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          🎲 실행하기
        </button>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// 관계 패널
// ═══════════════════════════════════════════════════════════════════════════

interface RelationshipsPanelProps {
  relationships: PlayerStats['relationships'];
}

export const RelationshipsPanel = memo(function RelationshipsPanel({ relationships }: RelationshipsPanelProps) {
  const typeIcons = {
    family: '👨‍👩‍👧',
    friend: '🤝',
    business: '💼',
    mentor: '🎓',
    rival: '⚔️'
  };

  return (
    <div className="bg-black/80 backdrop-blur-xl rounded-xl p-4 border border-white/10 w-[250px]">
      <div className="text-[11px] font-semibold mb-3 flex items-center gap-2">
        <span>🔗</span> 관계 네트워크
      </div>
      
      <div className="space-y-2">
        {relationships.map(rel => (
          <div 
            key={rel.id}
            className="p-2 bg-white/[0.02] rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span>{typeIcons[rel.type]}</span>
                <span className="text-xs font-medium">{rel.name}</span>
              </div>
              <span 
                className="text-[10px] font-bold"
                style={{ color: rel.affinity > 50 ? '#4ade80' : rel.affinity > 0 ? '#fbbf24' : '#f87171' }}
              >
                {rel.affinity > 0 ? '+' : ''}{rel.affinity}
              </span>
            </div>
            
            {/* 호감도 바 */}
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${Math.abs(rel.affinity)}%`,
                  marginLeft: rel.affinity < 0 ? `${100 - Math.abs(rel.affinity)}%` : '0',
                  background: rel.affinity > 0 ? '#4ade80' : '#f87171'
                }}
              />
            </div>
            
            {/* 마지막 연락 경고 */}
            {rel.lastContact > 3 && (
              <div className="text-[8px] text-[#f87171] mt-1">
                ⚠️ {rel.lastContact}턴 동안 연락 없음
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

export default StatsBar;
