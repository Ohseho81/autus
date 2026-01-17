/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 Report Generator — 분석 리포트
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 결정 데이터 기반 분석 리포트 생성:
 * - 일일/주간/월간 요약
 * - V 성장 분석
 * - 패턴 인사이트
 * - 추천 액션
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReportPeriod {
  start: string;
  end: string;
  type: 'daily' | 'weekly' | 'monthly';
}

export interface DecisionSummary {
  total: number;
  accepted: number;
  rejected: number;
  delayed: number;
  delegated: number;
  acceptRate: number;
}

export interface VSummary {
  startV: number;
  endV: number;
  change: number;
  changePercent: number;
  peak: number;
  peakDate: string;
  avgDaily: number;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  totalDelta: number;
  acceptRate: number;
  avgUrgency: number;
}

export interface TimePattern {
  hour: number;
  count: number;
  acceptRate: number;
}

export interface ReportInsight {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  action?: string;
}

export interface FullReport {
  period: ReportPeriod;
  decisions: DecisionSummary;
  v: VSummary;
  categories: CategoryBreakdown[];
  timePatterns: TimePattern[];
  insights: ReportInsight[];
  generatedAt: string;
}

export interface StoredDecision {
  id: string;
  text: string;
  source: string;
  delta: number;
  urgency: number;
  timestamp: string;
  action: 'accepted' | 'rejected' | 'delayed' | 'delegated';
  vBefore: number;
  vAfter: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Report Generator
// ═══════════════════════════════════════════════════════════════════════════════

export class ReportGenerator {
  /**
   * 일일 리포트 생성
   */
  generateDailyReport(
    decisions: StoredDecision[],
    date: string = new Date().toISOString().split('T')[0]
  ): FullReport {
    const dayDecisions = decisions.filter(d => 
      d.timestamp.startsWith(date)
    );

    return this.generateReport(dayDecisions, {
      start: `${date}T00:00:00Z`,
      end: `${date}T23:59:59Z`,
      type: 'daily',
    });
  }

  /**
   * 주간 리포트 생성
   */
  generateWeeklyReport(decisions: StoredDecision[]): FullReport {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weekDecisions = decisions.filter(d => 
      new Date(d.timestamp) >= weekAgo
    );

    return this.generateReport(weekDecisions, {
      start: weekAgo.toISOString(),
      end: now.toISOString(),
      type: 'weekly',
    });
  }

  /**
   * 월간 리포트 생성
   */
  generateMonthlyReport(decisions: StoredDecision[]): FullReport {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const monthDecisions = decisions.filter(d => 
      new Date(d.timestamp) >= monthAgo
    );

    return this.generateReport(monthDecisions, {
      start: monthAgo.toISOString(),
      end: now.toISOString(),
      type: 'monthly',
    });
  }

  /**
   * 리포트 생성
   */
  private generateReport(decisions: StoredDecision[], period: ReportPeriod): FullReport {
    const decisionSummary = this.summarizeDecisions(decisions);
    const vSummary = this.summarizeV(decisions);
    const categories = this.breakdownByCategory(decisions);
    const timePatterns = this.analyzeTimePatterns(decisions);
    const insights = this.generateInsights(decisions, decisionSummary, vSummary, categories);

    return {
      period,
      decisions: decisionSummary,
      v: vSummary,
      categories,
      timePatterns,
      insights,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 결정 요약
   */
  private summarizeDecisions(decisions: StoredDecision[]): DecisionSummary {
    const total = decisions.length;
    const accepted = decisions.filter(d => d.action === 'accepted').length;
    const rejected = decisions.filter(d => d.action === 'rejected').length;
    const delayed = decisions.filter(d => d.action === 'delayed').length;
    const delegated = decisions.filter(d => d.action === 'delegated').length;

    return {
      total,
      accepted,
      rejected,
      delayed,
      delegated,
      acceptRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
    };
  }

  /**
   * V 요약
   */
  private summarizeV(decisions: StoredDecision[]): VSummary {
    if (decisions.length === 0) {
      return {
        startV: 0,
        endV: 0,
        change: 0,
        changePercent: 0,
        peak: 0,
        peakDate: '',
        avgDaily: 0,
      };
    }

    const sorted = [...decisions].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const startV = sorted[0].vBefore;
    const endV = sorted[sorted.length - 1].vAfter;
    const change = endV - startV;
    const changePercent = startV > 0 ? Math.round((change / startV) * 100) : 0;

    // 피크 찾기
    let peak = 0;
    let peakDate = '';
    for (const d of sorted) {
      if (d.vAfter > peak) {
        peak = d.vAfter;
        peakDate = d.timestamp.split('T')[0];
      }
    }

    // 일평균 V 증가
    const days = new Set(sorted.map(d => d.timestamp.split('T')[0])).size;
    const avgDaily = days > 0 ? Math.round(change / days) : 0;

    return {
      startV,
      endV,
      change,
      changePercent,
      peak,
      peakDate,
      avgDaily,
    };
  }

  /**
   * 카테고리별 분류
   */
  private breakdownByCategory(decisions: StoredDecision[]): CategoryBreakdown[] {
    const categories = new Map<string, {
      count: number;
      totalDelta: number;
      accepted: number;
      urgencySum: number;
    }>();

    for (const d of decisions) {
      const existing = categories.get(d.source) || {
        count: 0,
        totalDelta: 0,
        accepted: 0,
        urgencySum: 0,
      };

      existing.count++;
      existing.totalDelta += d.delta;
      if (d.action === 'accepted') existing.accepted++;
      existing.urgencySum += d.urgency;

      categories.set(d.source, existing);
    }

    return Array.from(categories.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        totalDelta: data.totalDelta,
        acceptRate: Math.round((data.accepted / data.count) * 100),
        avgUrgency: Math.round(data.urgencySum / data.count),
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 시간대별 패턴 분석
   */
  private analyzeTimePatterns(decisions: StoredDecision[]): TimePattern[] {
    const patterns = new Map<number, { count: number; accepted: number }>();

    for (const d of decisions) {
      const hour = new Date(d.timestamp).getHours();
      const existing = patterns.get(hour) || { count: 0, accepted: 0 };
      
      existing.count++;
      if (d.action === 'accepted') existing.accepted++;
      
      patterns.set(hour, existing);
    }

    return Array.from(patterns.entries())
      .map(([hour, data]) => ({
        hour,
        count: data.count,
        acceptRate: Math.round((data.accepted / data.count) * 100),
      }))
      .sort((a, b) => a.hour - b.hour);
  }

  /**
   * 인사이트 생성
   */
  private generateInsights(
    decisions: StoredDecision[],
    summary: DecisionSummary,
    vSummary: VSummary,
    categories: CategoryBreakdown[]
  ): ReportInsight[] {
    const insights: ReportInsight[] = [];

    // V 성장 인사이트
    if (vSummary.changePercent > 10) {
      insights.push({
        type: 'success',
        title: '높은 V 성장률',
        description: `이 기간 동안 V가 ${vSummary.changePercent}% 증가했습니다.`,
      });
    } else if (vSummary.change < 0) {
      insights.push({
        type: 'warning',
        title: 'V 감소',
        description: `V가 ${Math.abs(vSummary.change)} 감소했습니다. 결정 패턴을 검토하세요.`,
        action: '패턴 분석 보기',
      });
    }

    // 수락률 인사이트
    if (summary.acceptRate > 80) {
      insights.push({
        type: 'info',
        title: '높은 수락률',
        description: `수락률이 ${summary.acceptRate}%입니다. 자동화를 고려해보세요.`,
        action: '자동화 규칙 설정',
      });
    } else if (summary.acceptRate < 30) {
      insights.push({
        type: 'warning',
        title: '낮은 수락률',
        description: `수락률이 ${summary.acceptRate}%입니다. 결정 소스를 필터링하세요.`,
        action: '필터 설정',
      });
    }

    // 카테고리 인사이트
    const topCategory = categories[0];
    if (topCategory && topCategory.count > summary.total * 0.5) {
      insights.push({
        type: 'info',
        title: `${topCategory.category} 집중`,
        description: `결정의 ${Math.round((topCategory.count / summary.total) * 100)}%가 ${topCategory.category}에서 왔습니다.`,
      });
    }

    // 지연 비율 인사이트
    if (summary.delayed > summary.total * 0.3) {
      insights.push({
        type: 'warning',
        title: '많은 지연',
        description: `결정의 ${Math.round((summary.delayed / summary.total) * 100)}%가 지연되었습니다.`,
        action: '지연된 결정 처리',
      });
    }

    // 일평균 인사이트
    if (vSummary.avgDaily > 50) {
      insights.push({
        type: 'success',
        title: '활발한 활동',
        description: `일평균 ${vSummary.avgDaily}V를 획득 중입니다.`,
      });
    }

    return insights;
  }

  /**
   * 텍스트 리포트 생성
   */
  formatAsText(report: FullReport): string {
    const lines: string[] = [];
    
    lines.push(`═══════════════════════════════════════════════════════════`);
    lines.push(`📊 AUTUS ${report.period.type.toUpperCase()} REPORT`);
    lines.push(`기간: ${report.period.start.split('T')[0]} ~ ${report.period.end.split('T')[0]}`);
    lines.push(`═══════════════════════════════════════════════════════════`);
    lines.push(``);
    
    lines.push(`📌 결정 요약`);
    lines.push(`  총 결정: ${report.decisions.total}건`);
    lines.push(`  수락: ${report.decisions.accepted}건 (${report.decisions.acceptRate}%)`);
    lines.push(`  거절: ${report.decisions.rejected}건`);
    lines.push(`  지연: ${report.decisions.delayed}건`);
    lines.push(`  위임: ${report.decisions.delegated}건`);
    lines.push(``);
    
    lines.push(`📈 V 성과`);
    lines.push(`  시작: ${report.v.startV}V → 종료: ${report.v.endV}V`);
    lines.push(`  변화: ${report.v.change > 0 ? '+' : ''}${report.v.change}V (${report.v.changePercent > 0 ? '+' : ''}${report.v.changePercent}%)`);
    lines.push(`  최고점: ${report.v.peak}V (${report.v.peakDate})`);
    lines.push(`  일평균: ${report.v.avgDaily > 0 ? '+' : ''}${report.v.avgDaily}V`);
    lines.push(``);
    
    if (report.categories.length > 0) {
      lines.push(`📂 카테고리별`);
      for (const cat of report.categories.slice(0, 5)) {
        lines.push(`  ${cat.category}: ${cat.count}건 / +${cat.totalDelta}V / 수락${cat.acceptRate}%`);
      }
      lines.push(``);
    }
    
    if (report.insights.length > 0) {
      lines.push(`💡 인사이트`);
      for (const insight of report.insights) {
        const icon = insight.type === 'success' ? '✅' : insight.type === 'warning' ? '⚠️' : 'ℹ️';
        lines.push(`  ${icon} ${insight.title}: ${insight.description}`);
      }
      lines.push(``);
    }
    
    lines.push(`생성: ${new Date(report.generatedAt).toLocaleString('ko-KR')}`);
    lines.push(`═══════════════════════════════════════════════════════════`);
    
    return lines.join('\n');
  }

  /**
   * JSON 내보내기
   */
  exportAsJSON(report: FullReport): string {
    return JSON.stringify(report, null, 2);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════════════════

export function createReportGenerator(): ReportGenerator {
  return new ReportGenerator();
}

export default ReportGenerator;
