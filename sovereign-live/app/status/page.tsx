"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 Page 1: Founder Dashboard - 창업자 전용 현황판
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 스타트업 창업자 타겟:
 * - 런웨이/캐시 한눈에
 * - 번아웃 경고
 * - 결정 부채 시각화
 * - 투자자 공유 가능
 */

import { useLiveQuery } from "dexie-react-hooks";
import { ledger, getLedgerStats } from "@/lib/ledger";
import { formatRelativeTime } from "@/lib/utils";
import { 
  Zap, 
  TrendingUp, 
  TrendingDown,
  Clock,
  AlertTriangle,
  Target,
  Flame,
  DollarSign,
  Users,
  CheckCircle,
  ArrowRight,
  Calendar,
  Battery,
  BatteryWarning,
} from "lucide-react";
import Link from "next/link";

export default function StatusPage() {
  const stats = useLiveQuery(() => getLedgerStats(), []);
  const recentDecisions = useLiveQuery(
    () => ledger.decisions.orderBy("created_at").reverse().limit(5).toArray(),
    []
  );
  const tasks = useLiveQuery(() => ledger.tasks.toArray(), []);
  const logs = useLiveQuery(() => ledger.actionLogs.toArray(), []);

  // 창업자 메트릭 계산
  const metrics = (() => {
    const pendingDecisions = stats?.needsDecisionLogs ?? 0;
    const delayedTasks = stats?.delayedLogs ?? 0;
    const totalDecisions = stats?.decisions ?? 0;
    const completedTasks = stats?.completedLogs ?? 0;

    // 번아웃 지수 (0-100)
    const burnoutScore = Math.min(100, pendingDecisions * 15 + delayedTasks * 10);
    
    // 실행력 (완료율)
    const executionRate = totalDecisions > 0 
      ? Math.round((completedTasks / Math.max(1, stats?.logs ?? 1)) * 100)
      : 0;

    // 결정 속도 (최근 7일 평균)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentCount = recentDecisions?.filter(d => d.created_at > weekAgo).length ?? 0;
    const decisionsPerDay = Math.round((recentCount / 7) * 10) / 10;

    return {
      pendingDecisions,
      delayedTasks,
      burnoutScore,
      executionRate,
      decisionsPerDay,
      totalDecisions,
    };
  })();

  // 상태 문장 (창업자 관점)
  const statusSentence = (() => {
    if (metrics.burnoutScore > 70) {
      return "⚠️ 결정 부채가 누적되고 있습니다. 위임하거나 중단할 항목을 찾으세요.";
    }
    if (metrics.pendingDecisions > 5) {
      return "📋 미결 결정이 쌓이고 있습니다. Console에서 처리하세요.";
    }
    if (metrics.executionRate > 80) {
      return "🚀 실행력이 높습니다. 이 페이스를 유지하세요.";
    }
    if (metrics.delayedTasks > 3) {
      return "⏰ 지연된 업무가 있습니다. 병목을 확인하세요.";
    }
    return "✅ 현재 구조가 안정적입니다. 다음 성장 단계를 준비하세요.";
  })();

  // 번아웃 레벨
  const burnoutLevel = metrics.burnoutScore > 70 ? "critical" : metrics.burnoutScore > 40 ? "warning" : "healthy";

  return (
    <div className="space-y-6">
      {/* 히어로 상태 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-500/10 to-cyan-500/10 blur-3xl" />
        
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-400 mb-1">Founder Status</div>
              <div className="text-xl font-medium leading-relaxed">{statusSentence}</div>
            </div>
            <Link 
              href="/console"
              className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur px-4 py-2 text-sm font-medium hover:bg-white/20 transition-colors"
            >
              결정하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* 퀵 스탯 */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <QuickStat 
              icon={Target} 
              label="미결 결정" 
              value={metrics.pendingDecisions}
              trend={metrics.pendingDecisions > 3 ? "bad" : "good"}
            />
            <QuickStat 
              icon={Zap} 
              label="실행력" 
              value={`${metrics.executionRate}%`}
              trend={metrics.executionRate > 70 ? "good" : "neutral"}
            />
            <QuickStat 
              icon={Clock} 
              label="지연 업무" 
              value={metrics.delayedTasks}
              trend={metrics.delayedTasks > 2 ? "bad" : "good"}
            />
            <QuickStat 
              icon={TrendingUp} 
              label="일 평균" 
              value={`${metrics.decisionsPerDay}건`}
              trend="neutral"
            />
          </div>
        </div>
      </div>

      {/* 번아웃 미터 */}
      <div className={`rounded-xl border p-5 ${
        burnoutLevel === "critical" 
          ? "border-red-500/50 bg-red-500/10" 
          : burnoutLevel === "warning"
          ? "border-yellow-500/50 bg-yellow-500/10"
          : "border-green-500/50 bg-green-500/10"
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {burnoutLevel === "critical" ? (
              <BatteryWarning className="h-5 w-5 text-red-400" />
            ) : (
              <Battery className="h-5 w-5 text-green-400" />
            )}
            <div>
              <div className="font-medium">
                {burnoutLevel === "critical" ? "번아웃 위험" : burnoutLevel === "warning" ? "주의 필요" : "에너지 양호"}
              </div>
              <div className="text-xs text-slate-500">결정 부채 기반 계산</div>
            </div>
          </div>
          <div className={`text-2xl font-bold ${
            burnoutLevel === "critical" ? "text-red-400" : burnoutLevel === "warning" ? "text-yellow-400" : "text-green-400"
          }`}>
            {100 - metrics.burnoutScore}%
          </div>
        </div>
        <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              burnoutLevel === "critical" ? "bg-red-500" : burnoutLevel === "warning" ? "bg-yellow-500" : "bg-green-500"
            }`}
            style={{ width: `${100 - metrics.burnoutScore}%` }}
          />
        </div>
        {burnoutLevel !== "healthy" && (
          <div className="mt-3 text-sm">
            💡 팁: {metrics.pendingDecisions > 3 ? "위임 가능한 결정을 찾아보세요." : "지연된 업무를 처리하거나 중단하세요."}
          </div>
        )}
      </div>

      {/* 메인 그리드 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 결정 큐 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium">결정 대기열</span>
            </div>
            <Link href="/console" className="text-xs text-green-400 hover:underline">
              전체 보기 →
            </Link>
          </div>
          
          {recentDecisions && recentDecisions.length > 0 ? (
            <div className="space-y-2">
              {recentDecisions.slice(0, 3).map((d) => (
                <div 
                  key={d.event_id}
                  className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{d.title}</div>
                    <div className="text-xs text-slate-500">{formatRelativeTime(d.created_at)}</div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    d.decision === "do" ? "bg-green-500/20 text-green-400" :
                    d.decision === "delegate" ? "bg-blue-500/20 text-blue-400" :
                    "bg-slate-500/20 text-slate-400"
                  }`}>
                    {d.decision === "do" ? "실행" : d.decision === "delegate" ? "위임" : "중단"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-slate-500">
              결정 기록이 없습니다
            </div>
          )}
        </div>

        {/* 이번 주 진행 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium">이번 주</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <WeeklyProgress 
              label="결정 처리" 
              current={metrics.totalDecisions} 
              target={20}
            />
            <WeeklyProgress 
              label="실행 완료" 
              current={stats?.completedLogs ?? 0} 
              target={15}
            />
            <WeeklyProgress 
              label="증빙 기록" 
              current={stats?.proofs ?? 0} 
              target={10}
            />
          </div>
        </div>
      </div>

      {/* 액션 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <ActionCard 
          href="/console"
          icon={Zap}
          title="결정하기"
          description="미결 항목 처리"
          color="green"
        />
        <ActionCard 
          href="/action-log"
          icon={CheckCircle}
          title="실행 기록"
          description="업무 상태 업데이트"
          color="blue"
        />
        <ActionCard 
          href="/proof"
          icon={Target}
          title="증빙 추가"
          description="결과물 아카이브"
          color="purple"
        />
      </div>

      {/* 창업자 인사이트 */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="h-4 w-4 text-orange-400" />
          <span className="text-sm font-medium">창업자 인사이트</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <InsightCard 
            icon={TrendingUp}
            title="성장 패턴"
            text={metrics.decisionsPerDay > 3 
              ? "결정 속도가 빠릅니다. 품질 체크하세요." 
              : "결정 속도를 높이면 더 빠른 성장이 가능합니다."
            }
          />
          <InsightCard 
            icon={Users}
            title="위임 제안"
            text={recentDecisions?.filter(d => d.decision === "delegate").length === 0
              ? "혼자 모든 결정을 하고 있습니다. 위임을 고려하세요."
              : "위임을 잘 활용하고 있습니다."
            }
          />
        </div>
      </div>
    </div>
  );
}

// 퀵 스탯 컴포넌트
function QuickStat({ 
  icon: Icon, 
  label, 
  value, 
  trend 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  trend: "good" | "bad" | "neutral";
}) {
  return (
    <div className="rounded-lg bg-white/5 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${
          trend === "good" ? "text-green-400" : trend === "bad" ? "text-red-400" : "text-slate-400"
        }`} />
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <div className={`text-xl font-bold ${
        trend === "good" ? "text-green-400" : trend === "bad" ? "text-red-400" : "text-white"
      }`}>
        {value}
      </div>
    </div>
  );
}

// 주간 진행률
function WeeklyProgress({ label, current, target }: { label: string; current: number; target: number }) {
  const percent = Math.min(100, Math.round((current / target) * 100));
  
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-400">{label}</span>
        <span>{current}/{target}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-700">
        <div 
          className="h-full rounded-full bg-gradient-to-r from-green-500 to-cyan-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// 액션 카드
function ActionCard({ 
  href, 
  icon: Icon, 
  title, 
  description, 
  color 
}: { 
  href: string; 
  icon: any; 
  title: string; 
  description: string; 
  color: "green" | "blue" | "purple";
}) {
  const colors = {
    green: "from-green-500/20 to-green-600/20 border-green-500/30 hover:border-green-500/50",
    blue: "from-blue-500/20 to-blue-600/20 border-blue-500/30 hover:border-blue-500/50",
    purple: "from-purple-500/20 to-purple-600/20 border-purple-500/30 hover:border-purple-500/50",
  };
  const iconColors = {
    green: "text-green-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
  };

  return (
    <Link 
      href={href}
      className={`rounded-xl border bg-gradient-to-br ${colors[color]} p-4 transition-all hover:scale-[1.02]`}
    >
      <Icon className={`h-6 w-6 ${iconColors[color]} mb-2`} />
      <div className="font-medium">{title}</div>
      <div className="text-xs text-slate-500">{description}</div>
    </Link>
  );
}

// 인사이트 카드
function InsightCard({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="rounded-lg bg-slate-800/50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="text-xs text-slate-400">{text}</div>
    </div>
  );
}
