/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Pain Signal Engine
 *
 * 학습형 Pain Signal 판단 시스템
 * - 헌법 (K1-K5): 고정 불변
 * - 키워드/가중치: 데이터 기반 학습
 * - 임계값: 산업별 자동 조정
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 헌법 (CONSTITUTIONAL) - 절대 변경 불가
// ═══════════════════════════════════════════════════════════════════════════════

export const CONSTITUTION = Object.freeze({
  K1: 'Score-based promotion only',
  K2: 'User input is signal, not command',
  K3: 'No action without proof',
  K4: '24h waiting period for major decisions',
  K5: 'Standard ≤ 10%',

  // Pain Signal 핵심 정의 (불변)
  PAIN_DEFINITION: 'Pain Signal = 해결하면 V가 창출되는 사용자 입력',
  FILTER_TARGET: 0.90, // 90% 필터링 목표
  PROOF_REQUIRED: true, // K3: 증거 필수
});

// ═══════════════════════════════════════════════════════════════════════════════
// 학습 가능 영역 (ADAPTIVE)
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_PAIN_KEYWORDS = {
  HIGH: {
    keywords: ['안됨', '불가', '오류', '실패', '취소', '환불', '손실', '고장', '먹통'],
    baseWeight: 0.9,
  },
  MID: {
    keywords: ['불편', '느림', '어려움', '복잡', '이상', '문제', '안되', '왜', '어떻게'],
    baseWeight: 0.6,
  },
  LOW: {
    keywords: ['아쉬움', '바람', '제안', '희망', '가능하면', '있으면', '좋겠'],
    baseWeight: 0.3,
  },
};

const DEFAULT_NOISE_KEYWORDS = ['감사', '좋아요', 'ㅋㅋ', 'ㅎㅎ', '👍', '👏', '❤️', 'ok', 'ㄱㅅ', 'ㄳ'];

const DEFAULT_THRESHOLDS = {
  PAIN: 0.70,      // Pain Signal 임계값
  REQUEST: 0.30,   // Request 임계값
  // < 0.30 = Noise
};

// 산업별 임계값 조정
const INDUSTRY_ADJUSTMENTS = {
  교육: { PAIN: 0.65, REQUEST: 0.25 },      // 더 민감 (학부모 Pain 중요)
  물류: { PAIN: 0.75, REQUEST: 0.35 },      // 더 엄격 (노이즈 많음)
  의료: { PAIN: 0.60, REQUEST: 0.20 },      // 매우 민감 (생명 관련)
  커머스: { PAIN: 0.70, REQUEST: 0.30 },    // 표준
  금융: { PAIN: 0.72, REQUEST: 0.32 },      // 약간 엄격
  default: { PAIN: 0.70, REQUEST: 0.30 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Pain Signal Engine Class
// ═══════════════════════════════════════════════════════════════════════════════

class PainSignalEngine {
  constructor(industry = 'default') {
    this.industry = industry;
    this.painKeywords = JSON.parse(JSON.stringify(DEFAULT_PAIN_KEYWORDS));
    this.noiseKeywords = [...DEFAULT_NOISE_KEYWORDS];
    this.thresholds = { ...INDUSTRY_ADJUSTMENTS[industry] || INDUSTRY_ADJUSTMENTS.default };

    // 학습 데이터
    this.learningData = {
      signals: [],           // 처리된 신호들
      validatedPains: [],    // V 창출 확인된 Pain
      falsePositives: [],    // 잘못 통과된 것
      falseNegatives: [],    // 잘못 버린 것
      keywordStats: {},      // 키워드별 통계
      lastUpdate: null,
    };

    // 사용자별 패턴 (실시간 학습)
    this.userPatterns = new Map();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 메인 판단 함수
  // ─────────────────────────────────────────────────────────────────────────────

  analyze(input, userId = null, context = {}) {
    const result = {
      id: `PS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      input,
      userId,
      timestamp: Date.now(),

      // 분석 결과
      classification: null,  // PAIN | REQUEST | NOISE
      score: 0,
      confidence: 0,

      // 상세 분석
      keywordsFound: [],
      repetitionBonus: 0,
      userPatternBonus: 0,

      // 라우팅
      route: null,  // producer | manager | discard

      // 증거 (K3)
      proof: null,
    };

    // Step 1: 노이즈 체크 (빠른 탈락)
    if (this._isNoise(input)) {
      result.classification = 'NOISE';
      result.score = 0;
      result.route = 'discard';
      result.confidence = 0.95;
      this._recordSignal(result);
      return result;
    }

    // Step 2: 키워드 스코어링
    const keywordScore = this._calculateKeywordScore(input, result);

    // Step 3: 반복성 보너스
    const repetitionBonus = this._checkRepetition(input, userId);
    result.repetitionBonus = repetitionBonus;

    // Step 4: 사용자 패턴 보너스 (실시간 학습)
    const userBonus = this._getUserPatternBonus(userId, input);
    result.userPatternBonus = userBonus;

    // Step 5: 최종 스코어 계산
    result.score = Math.min(1, keywordScore * (1 + repetitionBonus) + userBonus);

    // Step 6: 분류
    if (result.score >= this.thresholds.PAIN) {
      result.classification = 'PAIN';
      result.route = 'producer';
      result.confidence = Math.min(0.95, 0.7 + (result.score - this.thresholds.PAIN));
    } else if (result.score >= this.thresholds.REQUEST) {
      result.classification = 'REQUEST';
      result.route = 'manager';
      result.confidence = Math.min(0.85, 0.6 + (result.score - this.thresholds.REQUEST));
    } else {
      result.classification = 'NOISE';
      result.route = 'discard';
      result.confidence = 0.8;
    }

    // Step 7: Proof 생성 (K3)
    result.proof = this._generateProof(result);

    // 기록
    this._recordSignal(result);

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 내부 분석 함수들
  // ─────────────────────────────────────────────────────────────────────────────

  _isNoise(input) {
    const normalized = input.toLowerCase().trim();

    // 너무 짧은 입력
    if (normalized.length < 3) return true;

    // 이모지만
    if (/^[\u{1F300}-\u{1F9FF}]+$/u.test(normalized)) return true;

    // 노이즈 키워드만
    return this.noiseKeywords.some(kw =>
      normalized === kw || normalized === kw.toLowerCase()
    );
  }

  _calculateKeywordScore(input, result) {
    let totalScore = 0;
    let matchCount = 0;

    for (const [level, data] of Object.entries(this.painKeywords)) {
      for (const keyword of data.keywords) {
        // 키워드별 학습된 가중치 적용
        const learnedWeight = this.learningData.keywordStats[keyword]?.weight || data.baseWeight;

        if (input.includes(keyword)) {
          totalScore += learnedWeight;
          matchCount++;
          result.keywordsFound.push({ keyword, level, weight: learnedWeight });

          // 키워드 사용 통계 업데이트
          this._updateKeywordStats(keyword);
        }
      }
    }

    // 여러 키워드 매칭 시 시너지
    if (matchCount > 1) {
      totalScore *= (1 + matchCount * 0.1);
    }

    return Math.min(1, totalScore);
  }

  _checkRepetition(input, userId) {
    if (!userId) return 0;

    const userSignals = this.learningData.signals.filter(s =>
      s.userId === userId &&
      Date.now() - s.timestamp < 7 * 24 * 60 * 60 * 1000 // 7일 내
    );

    // 유사 입력 카운트
    const similarCount = userSignals.filter(s =>
      this._similarity(s.input, input) > 0.6
    ).length;

    // 2회 이상 = 50% 보너스
    return similarCount >= 2 ? 0.5 : similarCount >= 1 ? 0.2 : 0;
  }

  _getUserPatternBonus(userId, input) {
    if (!userId) return 0;

    const pattern = this.userPatterns.get(userId);
    if (!pattern) return 0;

    // 이 사용자의 과거 Pain Signal 중 V 창출률
    const vCreationRate = pattern.validatedPains / Math.max(1, pattern.totalPains);

    // 높은 V 창출률 사용자 = 더 민감하게 처리
    return vCreationRate > 0.7 ? 0.15 : vCreationRate > 0.5 ? 0.1 : 0;
  }

  _similarity(str1, str2) {
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  _generateProof(result) {
    return {
      id: result.id,
      timestamp: result.timestamp,
      classification: result.classification,
      score: result.score,
      keywordsFound: result.keywordsFound,
      thresholdsUsed: { ...this.thresholds },
      industry: this.industry,
      algorithm: 'PainSignalEngine v1.0',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 학습 함수들
  // ─────────────────────────────────────────────────────────────────────────────

  _recordSignal(signal) {
    this.learningData.signals.push(signal);

    // 최근 1000개만 유지
    if (this.learningData.signals.length > 1000) {
      this.learningData.signals = this.learningData.signals.slice(-1000);
    }
  }

  _updateKeywordStats(keyword) {
    if (!this.learningData.keywordStats[keyword]) {
      this.learningData.keywordStats[keyword] = {
        count: 0,
        validatedCount: 0,
        weight: this._getBaseWeight(keyword),
      };
    }
    this.learningData.keywordStats[keyword].count++;
  }

  _getBaseWeight(keyword) {
    for (const [level, data] of Object.entries(this.painKeywords)) {
      if (data.keywords.includes(keyword)) {
        return data.baseWeight;
      }
    }
    return 0.5;
  }

  // V 창출 피드백 (외부에서 호출)
  recordVCreation(signalId, vAmount) {
    const signal = this.learningData.signals.find(s => s.id === signalId);
    if (!signal) return;

    signal.vCreated = vAmount;
    signal.validated = true;

    this.learningData.validatedPains.push(signal);

    // 키워드 가중치 업데이트
    for (const kw of signal.keywordsFound) {
      const stats = this.learningData.keywordStats[kw.keyword];
      if (stats) {
        stats.validatedCount++;
        // 검증률에 따라 가중치 조정
        const validationRate = stats.validatedCount / Math.max(1, stats.count);
        stats.weight = Math.min(0.95, stats.weight * (1 + validationRate * 0.1));
      }
    }

    // 사용자 패턴 업데이트
    if (signal.userId) {
      this._updateUserPattern(signal.userId, true, vAmount);
    }
  }

  // 잘못된 판단 피드백
  recordMistake(signalId, type) {
    const signal = this.learningData.signals.find(s => s.id === signalId);
    if (!signal) return;

    if (type === 'false_positive') {
      // Pain으로 분류했지만 V 없음
      this.learningData.falsePositives.push(signal);

      // 키워드 가중치 하향
      for (const kw of signal.keywordsFound) {
        const stats = this.learningData.keywordStats[kw.keyword];
        if (stats) {
          stats.weight = Math.max(0.1, stats.weight * 0.95);
        }
      }
    } else if (type === 'false_negative') {
      // Noise로 버렸지만 실제 Pain이었음
      this.learningData.falseNegatives.push(signal);

      // 임계값 하향 조정
      this.thresholds.PAIN = Math.max(0.5, this.thresholds.PAIN - 0.02);
    }
  }

  _updateUserPattern(userId, validated, vAmount) {
    if (!this.userPatterns.has(userId)) {
      this.userPatterns.set(userId, {
        totalPains: 0,
        validatedPains: 0,
        totalV: 0,
      });
    }

    const pattern = this.userPatterns.get(userId);
    pattern.totalPains++;
    if (validated) {
      pattern.validatedPains++;
      pattern.totalV += vAmount;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 일일 학습 업데이트 (배치)
  // ─────────────────────────────────────────────────────────────────────────────

  dailyUpdate() {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // 지난 24시간 데이터
    const recentSignals = this.learningData.signals.filter(s => s.timestamp > oneDayAgo);
    const recentValidated = this.learningData.validatedPains.filter(s => s.timestamp > oneDayAgo);

    // 통계
    const stats = {
      total: recentSignals.length,
      pains: recentSignals.filter(s => s.classification === 'PAIN').length,
      requests: recentSignals.filter(s => s.classification === 'REQUEST').length,
      noise: recentSignals.filter(s => s.classification === 'NOISE').length,
      validated: recentValidated.length,
      falsePositives: this.learningData.falsePositives.filter(s => s.timestamp > oneDayAgo).length,
      falseNegatives: this.learningData.falseNegatives.filter(s => s.timestamp > oneDayAgo).length,
    };

    // 필터링 비율 체크 (90% 목표)
    const filterRate = stats.noise / Math.max(1, stats.total);

    if (filterRate < CONSTITUTION.FILTER_TARGET - 0.05) {
      // 너무 많이 통과 → 임계값 상향
      this.thresholds.PAIN = Math.min(0.85, this.thresholds.PAIN + 0.02);
      this.thresholds.REQUEST = Math.min(0.5, this.thresholds.REQUEST + 0.02);
    } else if (filterRate > CONSTITUTION.FILTER_TARGET + 0.05) {
      // 너무 많이 버림 → 임계값 하향
      this.thresholds.PAIN = Math.max(0.5, this.thresholds.PAIN - 0.02);
      this.thresholds.REQUEST = Math.max(0.2, this.thresholds.REQUEST - 0.02);
    }

    this.learningData.lastUpdate = now;

    return {
      stats,
      filterRate,
      newThresholds: { ...this.thresholds },
      topKeywords: this._getTopKeywords(),
    };
  }

  _getTopKeywords() {
    return Object.entries(this.learningData.keywordStats)
      .sort((a, b) => b[1].validatedCount - a[1].validatedCount)
      .slice(0, 10)
      .map(([keyword, stats]) => ({
        keyword,
        count: stats.count,
        validated: stats.validatedCount,
        weight: stats.weight.toFixed(2),
      }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 상태 조회
  // ─────────────────────────────────────────────────────────────────────────────

  getStats() {
    return {
      industry: this.industry,
      thresholds: { ...this.thresholds },
      signalsProcessed: this.learningData.signals.length,
      validatedPains: this.learningData.validatedPains.length,
      falsePositives: this.learningData.falsePositives.length,
      falseNegatives: this.learningData.falseNegatives.length,
      topKeywords: this._getTopKeywords(),
      lastUpdate: this.learningData.lastUpdate,
      constitution: CONSTITUTION,
    };
  }

  getCurrentThresholds() {
    return {
      ...this.thresholds,
      industry: this.industry,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 싱글톤 인스턴스 & Export
// ═══════════════════════════════════════════════════════════════════════════════

let engineInstance = null;

export function getPainSignalEngine(industry = 'default') {
  if (!engineInstance || engineInstance.industry !== industry) {
    engineInstance = new PainSignalEngine(industry);
  }
  return engineInstance;
}

export function analyzePainSignal(input, userId = null, context = {}) {
  return getPainSignalEngine().analyze(input, userId, context);
}

export function recordVCreation(signalId, vAmount) {
  return getPainSignalEngine().recordVCreation(signalId, vAmount);
}

export function recordMistake(signalId, type) {
  return getPainSignalEngine().recordMistake(signalId, type);
}

export function dailyUpdate() {
  return getPainSignalEngine().dailyUpdate();
}

export function getEngineStats() {
  return getPainSignalEngine().getStats();
}

export default PainSignalEngine;
