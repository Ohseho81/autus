/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 월간 학습 자동화 (Monthly Learning Scheduler)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 매월 자동으로:
 * 1. 데이터 수집 리마인더
 * 2. 학습 실행
 * 3. 예측 생성
 * 4. 결과 알림
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { LearningLoop72, State72, LearningStep } from './LearningLoop72';
import { DataConnector, SupabaseConfig } from './DataConnector';
import { NODE_IDS, NODE_NAMES, CAUSAL_LINKS, getStatistics } from './CausalMatrix72';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export interface SchedulerConfig {
  entityId: string;
  entityType: 'ACADEMY' | 'RETAIL' | 'FREELANCER' | 'GENERAL';
  supabase: SupabaseConfig;
  
  // 스케줄 설정
  learningDay: number;           // 매월 학습 실행일 (1-28)
  reminderDaysBefore: number;    // 데이터 수집 리마인더 (학습일 N일 전)
  
  // 학습 설정
  minDataMonths: number;         // 최소 데이터 개월수
  learningEpochs: number;        // 학습 에포크
  learningRate: number;          // 학습률
  
  // 알림 설정
  notifyOnComplete?: boolean;
  notifyOnError?: boolean;
  webhookUrl?: string;
  slackWebhook?: string;
}

export interface SchedulerStatus {
  isActive: boolean;
  lastRunDate: Date | null;
  nextRunDate: Date | null;
  lastResult: LearningResult | null;
  pendingDataCollection: boolean;
}

export interface LearningResult {
  timestamp: Date;
  success: boolean;
  
  // 학습 결과
  dataMonths: number;
  learningSteps: number;
  initialMse: number;
  finalMse: number;
  improvement: number;
  
  // 예측
  predictions: {
    period: string;
    values: Record<string, number>;
  }[];
  
  // 인사이트
  insights: LearningInsight[];
  
  // 에러
  error?: string;
}

export interface LearningInsight {
  type: 'IMPROVEMENT' | 'WARNING' | 'ANOMALY' | 'TREND';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  nodeId?: string;
  message: string;
  value?: number;
  recommendation?: string;
}

export interface DataCollectionReminder {
  dueDate: Date;
  requiredNodes: string[];
  optionalNodes: string[];
  tips: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 기본 설정
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_SCHEDULER_CONFIG: Partial<SchedulerConfig> = {
  learningDay: 5,              // 매월 5일
  reminderDaysBefore: 3,       // 3일 전 리마인더
  minDataMonths: 3,            // 최소 3개월 데이터
  learningEpochs: 10,          // 10 에포크
  learningRate: 0.1,           // 학습률 0.1
  notifyOnComplete: true,
  notifyOnError: true,
};

// 도메인별 필수 노드
export const REQUIRED_NODES_BY_DOMAIN: Record<string, string[]> = {
  ACADEMY: [
    'n01', // 현금
    'n05', // 수입
    'n06', // 지출
    'n09', // 고객수
    'n33', // 충성도
    'n34', // 강사근속
  ],
  RETAIL: [
    'n01', // 현금
    'n05', // 수입
    'n06', // 지출
    'n09', // 고객수
    'n17', // 수입흐름
  ],
  FREELANCER: [
    'n01', // 현금
    'n05', // 수입
    'n06', // 지출
    'n07', // 투자
  ],
  GENERAL: [
    'n01', // 현금
    'n05', // 수입
    'n06', // 지출
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// 월간 학습 스케줄러
// ═══════════════════════════════════════════════════════════════════════════════

export class MonthlyLearningScheduler {
  private config: SchedulerConfig;
  private connector: DataConnector;
  private loop: LearningLoop72;
  private status: SchedulerStatus;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  
  constructor(config: SchedulerConfig) {
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...config } as SchedulerConfig;
    this.connector = new DataConnector(
      config.supabase,
      config.entityId,
      config.entityType
    );
    this.loop = new LearningLoop72();
    this.status = {
      isActive: false,
      lastRunDate: null,
      nextRunDate: null,
      lastResult: null,
      pendingDataCollection: false,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 스케줄러 제어
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 스케줄러 시작
   */
  start(): void {
    if (this.status.isActive) return;
    
    this.status.isActive = true;
    this.status.nextRunDate = this.getNextRunDate();
    
    // 체크 인터벌 (매일 자정)
    this.scheduleNextCheck();
    
    console.log('📅 Monthly Learning Scheduler Started');
    console.log(`   Next run: ${this.status.nextRunDate?.toLocaleDateString()}`);
  }
  
  /**
   * 스케줄러 중지
   */
  stop(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.status.isActive = false;
    console.log('⏹️ Monthly Learning Scheduler Stopped');
  }
  
  /**
   * 수동 실행
   */
  async runNow(): Promise<LearningResult> {
    console.log('🚀 Manual learning run triggered');
    return this.executeLearning();
  }
  
  /**
   * 상태 조회
   */
  getStatus(): SchedulerStatus {
    return { ...this.status };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 스케줄링 로직
  // ═══════════════════════════════════════════════════════════════════════════
  
  private scheduleNextCheck(): void {
    // 다음 자정까지 대기
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    this.timerId = setTimeout(() => {
      this.dailyCheck();
      this.scheduleNextCheck();
    }, msUntilMidnight);
  }
  
  private async dailyCheck(): Promise<void> {
    const today = new Date();
    const dayOfMonth = today.getDate();
    
    // 리마인더 체크
    const reminderDay = this.config.learningDay - this.config.reminderDaysBefore;
    if (dayOfMonth === reminderDay) {
      await this.sendReminder();
    }
    
    // 학습 실행일 체크
    if (dayOfMonth === this.config.learningDay) {
      await this.executeLearning();
    }
    
    // 다음 실행일 업데이트
    this.status.nextRunDate = this.getNextRunDate();
  }
  
  private getNextRunDate(): Date {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), this.config.learningDay);
    
    if (now <= thisMonth) {
      return thisMonth;
    }
    
    // 다음 달
    return new Date(now.getFullYear(), now.getMonth() + 1, this.config.learningDay);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 데이터 수집 리마인더
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * 데이터 수집 리마인더 생성
   */
  getDataCollectionReminder(): DataCollectionReminder {
    const dueDate = new Date();
    dueDate.setDate(this.config.learningDay);
    
    const requiredNodes = REQUIRED_NODES_BY_DOMAIN[this.config.entityType] || [];
    
    const tips = this.getCollectionTips();
    
    return {
      dueDate,
      requiredNodes,
      optionalNodes: NODE_IDS.filter(n => !requiredNodes.includes(n)),
      tips,
    };
  }
  
  private getCollectionTips(): string[] {
    const tips: string[] = [];
    
    switch (this.config.entityType) {
      case 'ACADEMY':
        tips.push('📊 이번 달 학생 수 (신규/이탈 포함)');
        tips.push('💰 월 매출 및 비용 내역');
        tips.push('👨‍🏫 강사 현황 (채용/퇴사)');
        tips.push('⭐ 학부모 만족도 조사 결과');
        tips.push('📢 마케팅 비용 및 신규 문의 수');
        break;
      case 'RETAIL':
        tips.push('📊 일/주/월별 매출');
        tips.push('👥 고객 방문 수');
        tips.push('📦 재고 현황');
        tips.push('💳 결제 수단별 비율');
        break;
      case 'FREELANCER':
        tips.push('💰 이번 달 수입');
        tips.push('📋 진행 프로젝트 수');
        tips.push('⏰ 근무 시간');
        tips.push('🔄 반복 고객 비율');
        break;
      default:
        tips.push('💰 이번 달 수입/지출');
        tips.push('📊 주요 지표 변화');
    }
    
    return tips;
  }
  
  private async sendReminder(): Promise<void> {
    this.status.pendingDataCollection = true;
    
    const reminder = this.getDataCollectionReminder();
    
    console.log('📬 Data Collection Reminder');
    console.log(`   Due: ${reminder.dueDate.toLocaleDateString()}`);
    console.log(`   Required: ${reminder.requiredNodes.join(', ')}`);
    
    // 웹훅 알림
    if (this.config.webhookUrl) {
      await this.sendWebhook('reminder', { reminder });
    }
    
    // Slack 알림
    if (this.config.slackWebhook) {
      await this.sendSlackNotification({
        text: `📊 AUTUS 데이터 수집 리마인더`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${this.config.learningDay}일까지 이번 달 데이터를 입력해주세요*\n\n` +
                    `필수 항목:\n${reminder.requiredNodes.map(n => `• ${NODE_NAMES[n]}`).join('\n')}\n\n` +
                    `팁:\n${reminder.tips.map(t => `• ${t}`).join('\n')}`,
            },
          },
        ],
      });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 학습 실행
  // ═══════════════════════════════════════════════════════════════════════════
  
  private async executeLearning(): Promise<LearningResult> {
    console.log('🔄 Executing monthly learning...');
    
    try {
      // 1. 데이터 로드
      const snapshots = await this.connector.getSnapshots();
      
      if (snapshots.length < this.config.minDataMonths) {
        throw new Error(`Insufficient data: ${snapshots.length} months (minimum: ${this.config.minDataMonths})`);
      }
      
      const states = snapshots.map(s => this.connector.snapshotToState(s));
      
      // 2. 학습 실행
      this.loop.reset();
      this.loop.setConfig({ learningRate: this.config.learningRate });
      
      const epochResult = this.loop.epochLearn(states, this.config.learningEpochs);
      const history = this.loop.getHistory();
      
      // 3. 평가
      const evaluation = this.loop.evaluate(states);
      
      // 4. 다음 기간 예측
      const predictions = this.generatePredictions(states[states.length - 1]);
      
      // 5. 인사이트 생성
      const insights = this.generateInsights(history, evaluation);
      
      // 6. 결과 저장
      const result: LearningResult = {
        timestamp: new Date(),
        success: true,
        dataMonths: states.length,
        learningSteps: history.length,
        initialMse: epochResult.epochResults[0]?.avgMse || 0,
        finalMse: epochResult.finalMse,
        improvement: epochResult.epochResults[0]?.avgMse 
          ? (epochResult.epochResults[0].avgMse - epochResult.finalMse) / epochResult.epochResults[0].avgMse * 100
          : 0,
        predictions,
        insights,
      };
      
      this.status.lastRunDate = new Date();
      this.status.lastResult = result;
      this.status.pendingDataCollection = false;
      
      // 7. 알림
      if (this.config.notifyOnComplete) {
        await this.notifyComplete(result);
      }
      
      console.log('✅ Monthly learning completed');
      console.log(`   MSE: ${result.initialMse.toFixed(6)} → ${result.finalMse.toFixed(6)} (${result.improvement.toFixed(1)}% improvement)`);
      
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const result: LearningResult = {
        timestamp: new Date(),
        success: false,
        dataMonths: 0,
        learningSteps: 0,
        initialMse: 0,
        finalMse: 0,
        improvement: 0,
        predictions: [],
        insights: [],
        error: errorMessage,
      };
      
      this.status.lastResult = result;
      
      if (this.config.notifyOnError) {
        await this.notifyError(errorMessage);
      }
      
      console.error('❌ Monthly learning failed:', errorMessage);
      
      return result;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 예측 생성
  // ═══════════════════════════════════════════════════════════════════════════
  
  private generatePredictions(lastState: State72): LearningResult['predictions'] {
    const predictions: LearningResult['predictions'] = [];
    
    let currentState = lastState;
    
    // 향후 3개월 예측
    for (let i = 1; i <= 3; i++) {
      const nextMonth = new Date(lastState.timestamp);
      nextMonth.setMonth(nextMonth.getMonth() + i);
      const period = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
      
      const predicted = this.loop.predict(currentState);
      
      predictions.push({
        period,
        values: predicted,
      });
      
      // 다음 예측을 위해 상태 업데이트
      currentState = {
        timestamp: nextMonth,
        values: predicted,
      };
    }
    
    return predictions;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 인사이트 생성
  // ═══════════════════════════════════════════════════════════════════════════
  
  private generateInsights(
    history: LearningStep[],
    evaluation: ReturnType<LearningLoop72['evaluate']>
  ): LearningInsight[] {
    const insights: LearningInsight[] = [];
    
    // 1. 모델 개선 정도
    if (history.length >= 2) {
      const firstMse = history[0].mse;
      const lastMse = history[history.length - 1].mse;
      const improvement = (firstMse - lastMse) / firstMse * 100;
      
      if (improvement > 50) {
        insights.push({
          type: 'IMPROVEMENT',
          severity: 'INFO',
          message: `모델 정확도가 ${improvement.toFixed(1)}% 개선되었습니다`,
          value: improvement,
        });
      } else if (improvement < 10) {
        insights.push({
          type: 'WARNING',
          severity: 'WARNING',
          message: `모델 개선이 미미합니다 (${improvement.toFixed(1)}%). 더 많은 데이터가 필요할 수 있습니다.`,
          value: improvement,
          recommendation: '다양한 상황의 데이터를 추가로 수집해주세요',
        });
      }
    }
    
    // 2. R² 평가
    if (evaluation.r2 < 0.5) {
      insights.push({
        type: 'WARNING',
        severity: 'WARNING',
        message: `설명력(R²)이 낮습니다: ${(evaluation.r2 * 100).toFixed(1)}%`,
        value: evaluation.r2,
        recommendation: '외부 요인이 크게 작용하거나 데이터 품질을 확인해주세요',
      });
    } else if (evaluation.r2 > 0.8) {
      insights.push({
        type: 'IMPROVEMENT',
        severity: 'INFO',
        message: `모델 설명력이 우수합니다: R² = ${(evaluation.r2 * 100).toFixed(1)}%`,
        value: evaluation.r2,
      });
    }
    
    // 3. 가장 예측이 어려운 노드
    const nodeAccuracies = Object.entries(evaluation.nodeAccuracy)
      .sort((a, b) => b[1].mse - a[1].mse);
    
    const hardestNode = nodeAccuracies[0];
    if (hardestNode && hardestNode[1].mse > 0.01) {
      insights.push({
        type: 'ANOMALY',
        severity: 'INFO',
        nodeId: hardestNode[0],
        message: `${NODE_NAMES[hardestNode[0]]} 노드의 예측이 가장 어렵습니다`,
        value: hardestNode[1].mse,
        recommendation: '해당 노드에 영향을 주는 외부 요인을 추가로 기록해주세요',
      });
    }
    
    // 4. 가장 많이 조정된 연결
    const linkAdjustments = new Map<string, number>();
    for (const step of history) {
      for (const adj of step.adjustments) {
        const key = `${adj.from}→${adj.to}`;
        linkAdjustments.set(key, (linkAdjustments.get(key) || 0) + Math.abs(adj.delta));
      }
    }
    
    const topAdjusted = Array.from(linkAdjustments.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    if (topAdjusted.length > 0) {
      const [link, delta] = topAdjusted[0];
      const [from, to] = link.split('→');
      
      insights.push({
        type: 'TREND',
        severity: 'INFO',
        message: `${NODE_NAMES[from]} → ${NODE_NAMES[to]} 관계가 가장 많이 학습되었습니다`,
        value: delta,
        recommendation: '이 관계가 예상과 다르게 작동하고 있을 수 있습니다',
      });
    }
    
    return insights;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 알림
  // ═══════════════════════════════════════════════════════════════════════════
  
  private async notifyComplete(result: LearningResult): Promise<void> {
    console.log('📬 Sending completion notification');
    
    if (this.config.webhookUrl) {
      await this.sendWebhook('complete', { result });
    }
    
    if (this.config.slackWebhook) {
      const insightTexts = result.insights
        .filter(i => i.severity !== 'INFO')
        .map(i => `• ${i.message}`);
      
      await this.sendSlackNotification({
        text: `✅ AUTUS 월간 학습 완료`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*월간 학습이 완료되었습니다*\n\n` +
                    `📊 데이터: ${result.dataMonths}개월\n` +
                    `📈 MSE 개선: ${result.improvement.toFixed(1)}%\n` +
                    `🎯 최종 MSE: ${result.finalMse.toFixed(6)}\n\n` +
                    (insightTexts.length > 0 ? `*주의 사항:*\n${insightTexts.join('\n')}` : ''),
            },
          },
        ],
      });
    }
  }
  
  private async notifyError(error: string): Promise<void> {
    console.log('📬 Sending error notification');
    
    if (this.config.webhookUrl) {
      await this.sendWebhook('error', { error });
    }
    
    if (this.config.slackWebhook) {
      await this.sendSlackNotification({
        text: `❌ AUTUS 월간 학습 실패`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*월간 학습이 실패했습니다*\n\n` +
                    `오류: ${error}\n\n` +
                    `데이터를 확인하고 다시 시도해주세요.`,
            },
          },
        ],
      });
    }
  }
  
  private async sendWebhook(event: string, data: any): Promise<void> {
    if (!this.config.webhookUrl) return;
    
    try {
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          entityId: this.config.entityId,
          timestamp: new Date().toISOString(),
          data,
        }),
      });
    } catch (error) {
      console.error('Webhook failed:', error);
    }
  }
  
  private async sendSlackNotification(message: any): Promise<void> {
    if (!this.config.slackWebhook) return;
    
    try {
      await fetch(this.config.slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
    } catch (error) {
      console.error('Slack notification failed:', error);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 월간 리포트 생성
// ═══════════════════════════════════════════════════════════════════════════════

export function generateMonthlyReport(result: LearningResult): string {
  const date = result.timestamp.toLocaleDateString('ko-KR');
  
  let report = `# AUTUS 월간 학습 리포트\n\n`;
  report += `📅 **생성일**: ${date}\n\n`;
  
  if (!result.success) {
    report += `## ❌ 학습 실패\n\n`;
    report += `오류: ${result.error}\n\n`;
    return report;
  }
  
  // 요약
  report += `## 📊 요약\n\n`;
  report += `| 항목 | 값 |\n`;
  report += `|------|----|\n`;
  report += `| 데이터 기간 | ${result.dataMonths}개월 |\n`;
  report += `| 학습 스텝 | ${result.learningSteps}회 |\n`;
  report += `| 초기 MSE | ${result.initialMse.toFixed(6)} |\n`;
  report += `| 최종 MSE | ${result.finalMse.toFixed(6)} |\n`;
  report += `| 개선율 | ${result.improvement.toFixed(1)}% |\n\n`;
  
  // 예측
  report += `## 🔮 향후 3개월 예측\n\n`;
  for (const pred of result.predictions) {
    report += `### ${pred.period}\n\n`;
    
    const keyNodes = ['n01', 'n05', 'n06', 'n09', 'n33'];
    for (const nodeId of keyNodes) {
      if (pred.values[nodeId] !== undefined) {
        const value = pred.values[nodeId];
        const formatted = nodeId === 'n01' || nodeId === 'n05' || nodeId === 'n06'
          ? `₩${value.toLocaleString()}`
          : nodeId === 'n09'
            ? `${Math.round(value)}명`
            : `${(value * 100).toFixed(1)}%`;
        report += `- ${NODE_NAMES[nodeId]}: ${formatted}\n`;
      }
    }
    report += '\n';
  }
  
  // 인사이트
  if (result.insights.length > 0) {
    report += `## 💡 인사이트\n\n`;
    
    for (const insight of result.insights) {
      const icon = insight.severity === 'CRITICAL' ? '🚨' 
        : insight.severity === 'WARNING' ? '⚠️' 
        : 'ℹ️';
      
      report += `${icon} **${insight.message}**\n`;
      if (insight.recommendation) {
        report += `   → ${insight.recommendation}\n`;
      }
      report += '\n';
    }
  }
  
  report += `---\n\n`;
  report += `*AUTUS 72³ Bayesian Laplace Engine*\n`;
  
  return report;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

console.log('📅 Monthly Learning Scheduler Loaded');
