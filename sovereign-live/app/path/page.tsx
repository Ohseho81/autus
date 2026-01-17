"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📈 Page 3: Future Path - 미래 경로 시나리오
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 문장 중심 시나리오 (예측/보장/점수 금지)
 */

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ledger } from "@/lib/ledger";
import { Card, Button } from "@/components/cards";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

export default function PathPage() {
  const decisions = useLiveQuery(() => ledger.decisions.toArray(), []);
  const tasks = useLiveQuery(() => ledger.tasks.toArray(), []);
  const logs = useLiveQuery(() => ledger.actionLogs.toArray(), []);

  // 시나리오 데이터 생성 (실제 데이터 기반 시뮬레이션)
  const chartData = useMemo(() => {
    const baseValue = 100;
    const months = ["현재", "1개월", "3개월", "6개월", "12개월"];

    // 결정 패턴 분석
    const doCount = decisions?.filter((d) => d.decision === "do").length ?? 0;
    const delegateCount = decisions?.filter((d) => d.decision === "delegate").length ?? 0;
    const stopCount = decisions?.filter((d) => d.decision === "stop").length ?? 0;
    const totalDecisions = doCount + delegateCount + stopCount || 1;

    // 실행률 기반 성장 계수
    const doRatio = doCount / totalDecisions;
    const growthFactor = 0.02 + doRatio * 0.03; // 2~5% 월간 성장

    return months.map((month, idx) => ({
      month,
      value: Math.round(baseValue * Math.pow(1 + growthFactor, idx * 2)),
      lower: Math.round(baseValue * Math.pow(1 + growthFactor * 0.5, idx * 2)),
      upper: Math.round(baseValue * Math.pow(1 + growthFactor * 1.5, idx * 2)),
    }));
  }, [decisions]);

  // 시나리오 문장 생성
  const scenarioSentence = useMemo(() => {
    const doCount = decisions?.filter((d) => d.decision === "do").length ?? 0;
    const stopCount = decisions?.filter((d) => d.decision === "stop").length ?? 0;
    const delayedLogs = logs?.filter((l) => l.action_status === "delayed").length ?? 0;

    if (doCount === 0 && stopCount === 0) {
      return "아직 분석할 결정 데이터가 충분하지 않습니다.";
    }

    if (stopCount > doCount) {
      return "현재와 유사한 구조를 유지한 경우, 12개월 이내 확장 단계 진입이 지연되는 사례가 많았습니다.";
    }

    if (delayedLogs > 5) {
      return "실행 지연이 누적되면 구조적 병목이 발생할 수 있습니다. Action Log를 확인하세요.";
    }

    if (doCount > 5) {
      return "현재 실행 중심의 결정 패턴이 유지되면, 점진적인 구조 개선이 예상됩니다.";
    }

    return "현재 결정 패턴으로는 안정적인 운영이 유지될 것으로 분석됩니다.";
  }, [decisions, logs]);

  // 개선 제안
  const suggestions = useMemo(() => {
    const items = [];
    const delayedLogs = logs?.filter((l) => l.action_status === "delayed").length ?? 0;
    const pendingTasks = tasks?.filter((t) => t.status === "pending").length ?? 0;

    if (delayedLogs > 3) {
      items.push({
        icon: TrendingDown,
        type: "warning",
        text: "지연된 실행 항목 처리",
        detail: "Action Log에서 지연 항목을 확인하고 해결하세요.",
      });
    }

    if (pendingTasks > 5) {
      items.push({
        icon: Minus,
        type: "info",
        text: "대기 중인 태스크 검토",
        detail: "위임된 태스크가 누적되고 있습니다.",
      });
    }

    if (items.length === 0) {
      items.push({
        icon: TrendingUp,
        type: "success",
        text: "현재 구조 유지",
        detail: "현재 패턴이 안정적입니다.",
      });
    }

    return items;
  }, [logs, tasks]);

  return (
    <div className="space-y-6">
      {/* 시나리오 문장 */}
      <Card>
        <div className="text-lg leading-relaxed">{scenarioSentence}</div>
        <div className="mt-4 text-xs text-slate-500">
          과거 결정 패턴 기반 구조 분석. 예측/보장 아님.
        </div>
      </Card>

      {/* 시나리오 차트 */}
      <Card title="구조 변화 시나리오" subtitle="현재 패턴 유지 시 예상 범위">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#22c55e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
              <Line
                type="monotone"
                dataKey="lower"
                stroke="#64748b"
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="upper"
                stroke="#64748b"
                strokeDasharray="4 4"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex justify-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 bg-green-500" />
            예상 중심
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 bg-slate-500 border-dashed" />
            예상 범위
          </div>
        </div>
      </Card>

      {/* 구조 개선 제안 */}
      <Card title="구조 개선 제안">
        <div className="space-y-3">
          {suggestions.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-4 rounded-lg border p-4 ${
                item.type === "warning"
                  ? "border-yellow-500/30 bg-yellow-500/10"
                  : item.type === "success"
                  ? "border-green-500/30 bg-green-500/10"
                  : "border-slate-700 bg-slate-800/50"
              }`}
            >
              <item.icon
                className={`h-5 w-5 mt-0.5 ${
                  item.type === "warning"
                    ? "text-yellow-400"
                    : item.type === "success"
                    ? "text-green-400"
                    : "text-slate-400"
                }`}
              />
              <div>
                <div className="font-medium">{item.text}</div>
                <div className="text-sm text-slate-400 mt-1">{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 면책 */}
      <div className="text-center text-xs text-slate-600">
        * 이 분석은 시나리오이며 미래를 보장하지 않습니다.
      </div>
    </div>
  );
}
