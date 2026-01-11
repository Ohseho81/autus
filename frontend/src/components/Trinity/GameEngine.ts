/**
 * AUTUS Trinity - Game Engine
 * =============================
 * 
 * 인생을 RPG로 모델링
 * - 한정된 자원 (Gold, Energy, Time)
 * - 스탯 시스템 (6대 역량)
 * - 운/확률 시스템
 * - 관계성/시너지
 */

// ═══════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════

export interface PlayerStats {
  // 기본 자원 (한정됨)
  gold: number;           // 자본 (원)
  energy: number;         // 에너지 (0-100)
  maxEnergy: number;      // 최대 에너지
  time: number;           // 가용 시간 (시간/주)
  maxTime: number;        // 주당 최대 시간
  
  // 6대 스탯 (0-100)
  stats: {
    bio: number;          // 생체 (체력, 건강)
    capital: number;      // 자본 (재무 능력)
    cognitive: number;    // 인지 (지능, 집중)
    relation: number;     // 관계 (네트워크)
    environment: number;  // 환경 (적응력)
    security: number;     // 안전 (리스크 관리)
  };
  
  // 성장 시스템
  level: number;
  exp: number;
  expToNextLevel: number;
  
  // 운/버프
  luck: number;           // 행운 (0-100)
  buffs: Buff[];
  debuffs: Debuff[];
  
  // 관계성
  relationships: Relationship[];
  synergyMultiplier: number;
}

export interface Buff {
  id: string;
  name: string;
  icon: string;
  effect: string;
  multiplier: number;
  duration: number;       // 남은 턴
  source: string;
}

export interface Debuff extends Buff {
  severity: 'minor' | 'major' | 'critical';
}

export interface Relationship {
  id: string;
  name: string;
  type: 'family' | 'friend' | 'business' | 'mentor' | 'rival';
  affinity: number;       // 호감도 (-100 ~ 100)
  influence: number;      // 영향력 (0-100)
  lastContact: number;    // 마지막 연락 (턴)
  synergyBonus: number;   // 시너지 보너스
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'main' | 'side' | 'daily' | 'event';
  difficulty: 'easy' | 'normal' | 'hard' | 'legendary';
  
  // 요구사항
  requirements: {
    energy: number;
    time: number;
    gold: number;
    minStats?: Partial<PlayerStats['stats']>;
  };
  
  // 보상 (성공 시)
  rewards: {
    gold: number;
    exp: number;
    statBonus?: Partial<PlayerStats['stats']>;
    buff?: Buff;
    relationshipBonus?: { id: string; amount: number };
  };
  
  // 패널티 (실패 시)
  penalties: {
    gold: number;
    exp: number;
    statPenalty?: Partial<PlayerStats['stats']>;
    debuff?: Debuff;
  };
  
  // 확률
  baseSuccessRate: number;
  progress: number;
}

export interface ActionResult {
  success: boolean;
  isCritical: boolean;    // 대성공/대실패
  message: string;
  changes: {
    gold: number;
    energy: number;
    exp: number;
    stats: Partial<PlayerStats['stats']>;
    luck: number;
  };
  newBuffs: Buff[];
  newDebuffs: Debuff[];
  relationshipChanges: { id: string; change: number }[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 게임 상수
// ═══════════════════════════════════════════════════════════════════════════

export const GAME_CONSTANTS = {
  // 에너지
  ENERGY_REGEN_PER_TURN: 20,
  ENERGY_COST_BASE: 10,
  
  // 시간
  HOURS_PER_WEEK: 168,
  WORK_HOURS: 40,
  SLEEP_HOURS: 56,
  AVAILABLE_HOURS: 72,    // 168 - 40 - 56
  
  // 운
  LUCK_BASE: 50,
  LUCK_VARIANCE: 20,
  CRITICAL_THRESHOLD: 95,
  FAIL_THRESHOLD: 5,
  
  // 레벨
  EXP_BASE: 1000,
  EXP_MULTIPLIER: 1.5,
  
  // 관계
  RELATIONSHIP_DECAY: 5,  // 연락 안하면 감소
  SYNERGY_BASE: 1.0,
  SYNERGY_PER_RELATION: 0.05,
  
  // 난이도별 배율
  DIFFICULTY_MULTIPLIER: {
    easy: 0.5,
    normal: 1.0,
    hard: 1.5,
    legendary: 2.5
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 게임 엔진
// ═══════════════════════════════════════════════════════════════════════════

export class GameEngine {
  private player: PlayerStats;
  private turn: number = 1;
  private history: ActionResult[] = [];
  
  constructor(initialState?: Partial<PlayerStats>) {
    this.player = this.createInitialPlayer(initialState);
  }
  
  private createInitialPlayer(initial?: Partial<PlayerStats>): PlayerStats {
    return {
      gold: initial?.gold ?? 12500000,  // ₩12.5M
      energy: initial?.energy ?? 80,
      maxEnergy: 100,
      time: initial?.time ?? GAME_CONSTANTS.AVAILABLE_HOURS,
      maxTime: GAME_CONSTANTS.AVAILABLE_HOURS,
      
      stats: {
        bio: initial?.stats?.bio ?? 78,
        capital: initial?.stats?.capital ?? 62,
        cognitive: initial?.stats?.cognitive ?? 88,
        relation: initial?.stats?.relation ?? 55,
        environment: initial?.stats?.environment ?? 30,
        security: initial?.stats?.security ?? 72,
      },
      
      level: initial?.level ?? 1,
      exp: initial?.exp ?? 0,
      expToNextLevel: GAME_CONSTANTS.EXP_BASE,
      
      luck: initial?.luck ?? GAME_CONSTANTS.LUCK_BASE,
      buffs: [],
      debuffs: [],
      
      relationships: initial?.relationships ?? this.createInitialRelationships(),
      synergyMultiplier: 1.0
    };
  }
  
  private createInitialRelationships(): Relationship[] {
    return [
      { id: 'family', name: '가족', type: 'family', affinity: 80, influence: 30, lastContact: 0, synergyBonus: 0.1 },
      { id: 'mentor', name: '멘토', type: 'mentor', affinity: 60, influence: 50, lastContact: 2, synergyBonus: 0.15 },
      { id: 'client_a', name: 'A사', type: 'business', affinity: 40, influence: 70, lastContact: 1, synergyBonus: 0.2 },
      { id: 'partner', name: '파트너', type: 'business', affinity: 65, influence: 45, lastContact: 0, synergyBonus: 0.12 },
    ];
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // 운/확률 시스템
  // ─────────────────────────────────────────────────────────────────────────
  
  rollDice(sides: number = 100): number {
    return Math.floor(Math.random() * sides) + 1;
  }
  
  calculateSuccessRate(quest: Quest): number {
    const { stats, luck, buffs, debuffs, synergyMultiplier } = this.player;
    
    let rate = quest.baseSuccessRate;
    
    // 스탯 영향 (관련 스탯이 높으면 성공률 증가)
    const avgStat = Object.values(stats).reduce((a, b) => a + b, 0) / 6;
    rate += (avgStat - 50) * 0.5;  // 평균 50 기준, ±25% 영향
    
    // 운 영향
    rate += (luck - 50) * 0.3;
    
    // 버프/디버프 영향
    buffs.forEach(b => rate *= b.multiplier);
    debuffs.forEach(d => rate /= d.multiplier);
    
    // 시너지 영향
    rate *= synergyMultiplier;
    
    // 난이도 보정
    rate /= GAME_CONSTANTS.DIFFICULTY_MULTIPLIER[quest.difficulty];
    
    // 0-100 범위 제한
    return Math.max(5, Math.min(95, rate));
  }
  
  executeAction(quest: Quest): ActionResult {
    const successRate = this.calculateSuccessRate(quest);
    const roll = this.rollDice();
    const luckRoll = this.rollDice();
    
    // 크리티컬 판정
    const isCriticalSuccess = roll >= GAME_CONSTANTS.CRITICAL_THRESHOLD;
    const isCriticalFail = roll <= GAME_CONSTANTS.FAIL_THRESHOLD;
    const success = roll <= successRate;
    
    // 운 변동 (행동할 때마다 운이 조금씩 변함)
    const luckChange = (luckRoll - 50) * 0.1;
    
    const result: ActionResult = {
      success,
      isCritical: isCriticalSuccess || isCriticalFail,
      message: '',
      changes: {
        gold: 0,
        energy: -quest.requirements.energy,
        exp: 0,
        stats: {},
        luck: luckChange
      },
      newBuffs: [],
      newDebuffs: [],
      relationshipChanges: []
    };
    
    if (success) {
      // 성공 보상
      const multiplier = isCriticalSuccess ? 2 : 1;
      result.changes.gold = quest.rewards.gold * multiplier;
      result.changes.exp = quest.rewards.exp * multiplier;
      
      if (quest.rewards.statBonus) {
        Object.entries(quest.rewards.statBonus).forEach(([stat, value]) => {
          result.changes.stats[stat as keyof PlayerStats['stats']] = (value ?? 0) * multiplier;
        });
      }
      
      if (quest.rewards.buff) {
        result.newBuffs.push({ ...quest.rewards.buff, duration: 3 });
      }
      
      if (quest.rewards.relationshipBonus) {
        result.relationshipChanges.push({
          id: quest.rewards.relationshipBonus.id,
          change: quest.rewards.relationshipBonus.amount * multiplier
        });
      }
      
      result.message = isCriticalSuccess 
        ? `🎉 대성공! ${quest.title} 완료! (보상 2배)`
        : `✅ ${quest.title} 성공!`;
    } else {
      // 실패 패널티
      const multiplier = isCriticalFail ? 2 : 1;
      result.changes.gold = -quest.penalties.gold * multiplier;
      result.changes.exp = -quest.penalties.exp * multiplier;
      
      if (quest.penalties.statPenalty) {
        Object.entries(quest.penalties.statPenalty).forEach(([stat, value]) => {
          result.changes.stats[stat as keyof PlayerStats['stats']] = -(value ?? 0) * multiplier;
        });
      }
      
      if (quest.penalties.debuff) {
        result.newDebuffs.push({ 
          ...quest.penalties.debuff, 
          duration: isCriticalFail ? 5 : 3,
          severity: isCriticalFail ? 'major' : 'minor'
        });
      }
      
      result.message = isCriticalFail
        ? `💀 대실패! ${quest.title} 실패... (패널티 2배)`
        : `❌ ${quest.title} 실패`;
    }
    
    // 결과 적용
    this.applyResult(result);
    this.history.push(result);
    
    return result;
  }
  
  private applyResult(result: ActionResult) {
    // 자원 변경
    this.player.gold += result.changes.gold;
    this.player.energy = Math.max(0, Math.min(this.player.maxEnergy, 
      this.player.energy + result.changes.energy));
    this.player.luck = Math.max(0, Math.min(100, 
      this.player.luck + result.changes.luck));
    
    // 스탯 변경
    Object.entries(result.changes.stats).forEach(([stat, value]) => {
      if (value) {
        const key = stat as keyof PlayerStats['stats'];
        this.player.stats[key] = Math.max(0, Math.min(100, 
          this.player.stats[key] + value));
      }
    });
    
    // 경험치 및 레벨업
    this.player.exp += result.changes.exp;
    this.checkLevelUp();
    
    // 버프/디버프 추가
    this.player.buffs.push(...result.newBuffs);
    this.player.debuffs.push(...result.newDebuffs);
    
    // 관계 변경
    result.relationshipChanges.forEach(({ id, change }) => {
      const rel = this.player.relationships.find(r => r.id === id);
      if (rel) {
        rel.affinity = Math.max(-100, Math.min(100, rel.affinity + change));
        rel.lastContact = 0;
      }
    });
    
    // 시너지 재계산
    this.updateSynergy();
  }
  
  private checkLevelUp() {
    while (this.player.exp >= this.player.expToNextLevel) {
      this.player.exp -= this.player.expToNextLevel;
      this.player.level++;
      this.player.expToNextLevel = Math.floor(
        GAME_CONSTANTS.EXP_BASE * Math.pow(GAME_CONSTANTS.EXP_MULTIPLIER, this.player.level - 1)
      );
      this.player.maxEnergy += 5;
      this.player.energy = this.player.maxEnergy;
      
      // 레벨업 버프
      this.player.buffs.push({
        id: `levelup_${this.player.level}`,
        name: '레벨업 부스트',
        icon: '⬆️',
        effect: '모든 행동 성공률 +10%',
        multiplier: 1.1,
        duration: 2,
        source: 'levelup'
      });
    }
  }
  
  private updateSynergy() {
    const positiveRelations = this.player.relationships.filter(r => r.affinity > 0);
    let synergy = GAME_CONSTANTS.SYNERGY_BASE;
    
    positiveRelations.forEach(rel => {
      synergy += (rel.affinity / 100) * rel.synergyBonus;
    });
    
    this.player.synergyMultiplier = synergy;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // 턴 진행
  // ─────────────────────────────────────────────────────────────────────────
  
  nextTurn() {
    this.turn++;
    
    // 에너지 회복
    this.player.energy = Math.min(
      this.player.maxEnergy,
      this.player.energy + GAME_CONSTANTS.ENERGY_REGEN_PER_TURN
    );
    
    // 시간 리셋
    this.player.time = this.player.maxTime;
    
    // 버프/디버프 지속시간 감소
    this.player.buffs = this.player.buffs
      .map(b => ({ ...b, duration: b.duration - 1 }))
      .filter(b => b.duration > 0);
    
    this.player.debuffs = this.player.debuffs
      .map(d => ({ ...d, duration: d.duration - 1 }))
      .filter(d => d.duration > 0);
    
    // 관계 쇠퇴
    this.player.relationships.forEach(rel => {
      rel.lastContact++;
      if (rel.lastContact > 3) {
        rel.affinity -= GAME_CONSTANTS.RELATIONSHIP_DECAY;
      }
    });
    
    // 운 변동 (매 턴 약간의 랜덤)
    this.player.luck += (this.rollDice(20) - 10) * 0.5;
    this.player.luck = Math.max(20, Math.min(80, this.player.luck));
    
    // 시너지 업데이트
    this.updateSynergy();
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Getters
  // ─────────────────────────────────────────────────────────────────────────
  
  getPlayer(): PlayerStats {
    return { ...this.player };
  }
  
  getTurn(): number {
    return this.turn;
  }
  
  getHistory(): ActionResult[] {
    return [...this.history];
  }
  
  canAfford(quest: Quest): { canAfford: boolean; reasons: string[] } {
    const reasons: string[] = [];
    
    if (this.player.energy < quest.requirements.energy) {
      reasons.push(`에너지 부족 (필요: ${quest.requirements.energy}, 현재: ${this.player.energy})`);
    }
    if (this.player.time < quest.requirements.time) {
      reasons.push(`시간 부족 (필요: ${quest.requirements.time}h, 현재: ${this.player.time}h)`);
    }
    if (this.player.gold < quest.requirements.gold) {
      reasons.push(`자금 부족 (필요: ₩${quest.requirements.gold.toLocaleString()})`);
    }
    
    if (quest.requirements.minStats) {
      Object.entries(quest.requirements.minStats).forEach(([stat, min]) => {
        const current = this.player.stats[stat as keyof PlayerStats['stats']];
        if (current < (min ?? 0)) {
          reasons.push(`${stat} 스탯 부족 (필요: ${min}, 현재: ${current})`);
        }
      });
    }
    
    return { canAfford: reasons.length === 0, reasons };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 유틸리티
// ═══════════════════════════════════════════════════════════════════════════

export function createQuestFromTask(
  task: { text: string; icon: string; type: string },
  difficulty: Quest['difficulty'] = 'normal'
): Quest {
  const diffMult = GAME_CONSTANTS.DIFFICULTY_MULTIPLIER[difficulty];
  
  return {
    id: `quest_${Date.now()}`,
    title: task.text,
    description: `${task.type} 타입의 과제입니다.`,
    icon: task.icon,
    type: 'side',
    difficulty,
    
    requirements: {
      energy: Math.floor(20 * diffMult),
      time: Math.floor(4 * diffMult),
      gold: Math.floor(100000 * diffMult),
    },
    
    rewards: {
      gold: Math.floor(500000 * diffMult),
      exp: Math.floor(100 * diffMult),
      statBonus: getStatBonusForType(task.type),
    },
    
    penalties: {
      gold: Math.floor(200000 * diffMult),
      exp: Math.floor(50 * diffMult),
      debuff: {
        id: `fail_${Date.now()}`,
        name: '실패의 여파',
        icon: '😓',
        effect: '성공률 -10%',
        multiplier: 0.9,
        duration: 2,
        source: 'quest_fail',
        severity: 'minor'
      }
    },
    
    baseSuccessRate: 70 - (diffMult - 1) * 20,
    progress: 0
  };
}

function getStatBonusForType(type: string): Partial<PlayerStats['stats']> {
  switch (type) {
    case '사람': return { relation: 3 };
    case '자동화': return { cognitive: 2, security: 1 };
    case '물리삭제': return { bio: 1, capital: 2 };
    case '전략': return { cognitive: 3, environment: 2 };
    case '모니터링': return { security: 2, environment: 1 };
    case '위임': return { relation: 2, capital: 1 };
    default: return { cognitive: 1 };
  }
}

// 싱글톤 인스턴스
let gameInstance: GameEngine | null = null;

export function getGameEngine(): GameEngine {
  if (!gameInstance) {
    gameInstance = new GameEngine();
  }
  return gameInstance;
}

export function resetGameEngine(initialState?: Partial<PlayerStats>): GameEngine {
  gameInstance = new GameEngine(initialState);
  return gameInstance;
}
