"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📊 Page 1: Status - 현재 상태 (문장 중심)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useLiveQuery } from "dexie-react-hooks";
import { ledger, getLedgerStats } from "@/lib/ledger";
import { Card, StatCard } from "@/components/cards";
import { formatRelativeTime } from "@/lib/utils";
import { AlertCircle, CheckCircle, Clock, TrendingUp } from "lucide-react";

export default function StatusPage() {
  const stats = useLiveQuery(() => getLedgerStats(), []);
  const recentDecisions = useLiveQuery(
    () => ledger.decisions.orderBy("created_at").reverse().limit(5).toArray(),
    []
  );
  const activeTasks = useLiveQuery(
    () => ledger.tasks.where("status").anyOf(["pending", "active"]).toArray(),
    []
  );

  // 상태 문장 생성 (규칙 기반)
  const statusSentence = (() => {
    if (!stats) return "상태를 분석 중입니다...";

    const { delayedLogs, needsDecisionLogs, completedLogs } = stats;

    if (needsDecisionLogs > 3) {
      return "현재 구조는 특정 영역에서 판단 필요가 반복 발생 중입니다. Decision Console에서 미결 항목을 처리하세요.";
    }
    
    if (delayedLogs > 5) {
      return "현재 구조는 실행 지연이 일부 영역에 집중되는 경향이 있습니다. 병목 지점을 확인하세요.";
    }

    if (completedLogs > 10 && delayedLogs === 0) {
      return "현재 상태는 구조적으로 안정화 단계입니다. 루프가 원활하게 작동하고 있습니다.";
    }

    if (stats.decisions === 0) {
      return "아직 기록된 결정이 없습니다. Decision Console에서 첫 번째 결정을 내리세요.";
    }

    return "현재 구조는 정상 범위 내에서 운영되고 있습니다.";
  })();

  // 인사이트 도출
  const insights = [];
  if (stats?.needsDecisionLogs && stats.needsDecisionLogs > 0) {
    insights.push({
      type: "warning",
      icon: AlertCircle,
      text: `${stats.needsDecisionLogs}건의 항목이 추가 결정을 기다리고 있습니다.`,
    });
  }
  if (stats?.delayedLogs && stats.delayedLogs > 0) {
    insights.push({
      type: "warning",
      icon: Clock,
      text: `${stats.delayedLogs}건의 지연된 실행이 있습니다.`,
    });
  }
  if (stats?.completedLogs && stats.completedLogs > 0) {
    insights.push({
      type: "success",
      icon: CheckCircle,
      text: `${stats.completedLogs}건의 실행이 완료되었습니다.`,
    });
  }

  return (
    <div className="space-y-6">
      {/* 메인 상태 문장 */}
      <Card>
        <div className="text-lg leading-relaxed">{statusSentence}</div>
        <div className="mt-4 text-xs text-slate-500">
          실행 로그 기반 내부 구조 분석 결과. 개인 평가 아님.
        </div>
      </Card>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="결정" value={stats?.decisions ?? 0} />
        <StatCard label="태스크" value={stats?.tasks ?? 0} />
        <StatCard label="실행 로그" value={stats?.logs ?? 0} />
        <StatCard label="증빙" value={stats?.proofs ?? 0} />
      </div>

      {/* 인사이트 */}
      {insights.length > 0 && (
        <Card title="인사이트">
          <div className="space-y-3">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  insight.type === "warning"
                    ? "border-yellow-500/30 bg-yellow-500/10"
                    : "border-green-500/30 bg-green-500/10"
                }`}
              >
                <insight.icon
                  className={`h-4 w-4 ${
                    insight.type === "warning" ? "text-yellow-400" : "text-green-400"
                  }`}
                />
                <span className="text-sm">{insight.text}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 최근 결정 */}
      <Card title="최근 결정" subtitle="Decision Console에서 내린 결정들">
        {recentDecisions && recentDecisions.length > 0 ? (
          <div className="space-y-2">
            {recentDecisions.map((d) => (
              <div
                key={d.event_id}
                className="flex items-center justify-between rounded-lg border border-slate-800 p-3"
              >
                <div>
                  <div className="text-sm">{d.title}</div>
                  <div className="text-xs text-slate-500">{d.context}</div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-xs font-medium ${
                      d.decision === "do"
                        ? "text-green-400"
                        : d.decision === "delegate"
                        ? "text-blue-400"
                        : "text-slate-400"
                    }`}
                  >
                    {d.decision === "do" ? "실행" : d.decision === "delegate" ? "위임" : "중단"}
                  </div>
                  <div className="text-xs text-slate-600">
                    {formatRelativeTime(d.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-slate-500">
            아직 결정이 없습니다. Console에서 첫 결정을 내리세요.
          </div>
        )}
      </Card>

      {/* 활성 태스크 */}
      <Card title="활성 태스크" subtitle="현재 진행 중인 업무">
        {activeTasks && activeTasks.length > 0 ? (
          <div className="space-y-2">
            {activeTasks.slice(0, 5).map((t) => (
              <div
                key={t.task_id}
                className="flex items-center justify-between rounded-lg border border-slate-800 p-3"
              >
                <div className="text-sm">{t.title}</div>
                <div
                  className={`text-xs ${
                    t.priority === "high"
                      ? "text-red-400"
                      : t.priority === "medium"
                      ? "text-yellow-400"
                      : "text-slate-400"
                  }`}
                >
                  {t.priority}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-slate-500">
            활성 태스크가 없습니다.
          </div>
        )}
      </Card>
    </div>
  );
}
