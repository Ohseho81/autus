"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎯 Page 2: Decision Console - 결정 입력 (3버튼)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 핵심 루프: Decision → Task 생성
 * 규칙:
 * - DO: Task 생성 (active)
 * - DELEGATE: Task 생성 (pending) + Proof 필수
 * - STOP: Task 생성 안 함
 */

import { useState } from "react";
import { nanoid } from "nanoid";
import { useLiveQuery } from "dexie-react-hooks";
import { ledger } from "@/lib/ledger";
import { Card, Button } from "@/components/cards";
import { DECISION_RULES, type DecisionType } from "@/lib/schema";
import { formatRelativeTime, getDecisionColor, getDecisionLabel } from "@/lib/utils";
import { CheckCircle, AlertCircle, XCircle, Plus } from "lucide-react";

// 샘플 결정 항목 (실제로는 외부 소스에서 주입)
const SAMPLE_DECISIONS = [
  {
    title: "Q1 마케팅 예산 10% 증액 승인",
    context: "영업팀 요청. 신규 채널 테스트 목적.",
  },
  {
    title: "개발팀 신규 채용 진행 여부",
    context: "현재 업무량 증가. 2명 추가 필요 의견.",
  },
  {
    title: "거래처 A사 결제 조건 변경 수락",
    context: "기존 30일 → 45일. 관계 유지 목적.",
  },
  {
    title: "사무실 이전 검토",
    context: "현 임대 계약 6개월 후 만료. 대안 검토 필요.",
  },
];

export default function ConsolePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [customTitle, setCustomTitle] = useState("");
  const [customContext, setCustomContext] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [lastDecision, setLastDecision] = useState<{
    title: string;
    decision: DecisionType;
  } | null>(null);

  const recentDecisions = useLiveQuery(
    () => ledger.decisions.orderBy("created_at").reverse().limit(10).toArray(),
    []
  );

  const currentItem = SAMPLE_DECISIONS[currentIndex % SAMPLE_DECISIONS.length];

  // 결정 커밋
  async function commit(decision: DecisionType, title: string, context: string) {
    const now = Date.now();
    const eventId = nanoid();
    const rules = DECISION_RULES[decision];

    // 1. DecisionEvent 생성
    const decisionEvent = {
      event_id: eventId,
      created_at: now,
      title,
      context,
      decision,
      linked_task_id: undefined as string | undefined,
    };

    // 2. Task 생성 (규칙에 따라)
    if (rules.creates_task) {
      const taskId = nanoid();
      decisionEvent.linked_task_id = taskId;

      await ledger.tasks.add({
        task_id: taskId,
        created_at: now,
        title,
        description: context,
        priority: "medium",
        due_at: null,
        source_decision_id: eventId,
        status: rules.task_status!,
      });
    }

    // 3. DecisionEvent 저장
    await ledger.decisions.add(decisionEvent);

    // 4. UI 업데이트
    setLastDecision({ title, decision });
    setCurrentIndex((prev) => prev + 1);
    setShowCustom(false);
    setCustomTitle("");
    setCustomContext("");

    // 피드백 (햅틱)
    if ("vibrate" in navigator) {
      navigator.vibrate(50);
    }
  }

  const title = showCustom ? customTitle : currentItem.title;
  const context = showCustom ? customContext : currentItem.context;
  const isValid = title.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* 마지막 결정 피드백 */}
      {lastDecision && (
        <div
          className={`rounded-lg border p-4 animate-fade-in ${getDecisionColor(
            lastDecision.decision
          )}`}
        >
          <div className="flex items-center gap-2">
            {lastDecision.decision === "do" && <CheckCircle className="h-4 w-4" />}
            {lastDecision.decision === "delegate" && <AlertCircle className="h-4 w-4" />}
            {lastDecision.decision === "stop" && <XCircle className="h-4 w-4" />}
            <span className="text-sm">
              "{lastDecision.title}" → {getDecisionLabel(lastDecision.decision)}
            </span>
          </div>
        </div>
      )}

      {/* 결정 카드 */}
      <Card>
        <div className="mb-6">
          <div className="text-xs text-slate-500 mb-2">결정 항목</div>
          {showCustom ? (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="결정이 필요한 항목 제목"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-base focus:border-slate-600 focus:outline-none"
              />
              <textarea
                placeholder="배경/컨텍스트 (선택)"
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm focus:border-slate-600 focus:outline-none resize-none"
              />
            </div>
          ) : (
            <>
              <div className="text-xl font-medium">{title}</div>
              <div className="mt-2 text-sm text-slate-400">{context}</div>
            </>
          )}
        </div>

        {/* 3버튼 결정 */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => commit("do", title, context)}
            disabled={!isValid}
            className="rounded-xl bg-green-500/20 border border-green-500/30 px-4 py-4 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
          >
            <CheckCircle className="h-5 w-5 mx-auto mb-2" />
            <div className="text-sm font-medium">실행한다</div>
            <div className="text-xs text-green-500/70 mt-1">Task 생성</div>
          </button>

          <button
            onClick={() => commit("delegate", title, context)}
            disabled={!isValid}
            className="rounded-xl bg-blue-500/20 border border-blue-500/30 px-4 py-4 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
          >
            <AlertCircle className="h-5 w-5 mx-auto mb-2" />
            <div className="text-sm font-medium">위임한다</div>
            <div className="text-xs text-blue-500/70 mt-1">Proof 필요</div>
          </button>

          <button
            onClick={() => commit("stop", title, context)}
            disabled={!isValid}
            className="rounded-xl bg-slate-500/20 border border-slate-500/30 px-4 py-4 text-slate-400 hover:bg-slate-500/30 transition-colors disabled:opacity-50"
          >
            <XCircle className="h-5 w-5 mx-auto mb-2" />
            <div className="text-sm font-medium">중단한다</div>
            <div className="text-xs text-slate-500/70 mt-1">기록만</div>
          </button>
        </div>

        {/* 안내 문구 */}
        <div className="mt-6 text-center text-xs text-slate-500">
          선택이 기록됩니다. 되돌리기 없음. 코멘트 없음.
        </div>
      </Card>

      {/* 커스텀 입력 토글 */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          onClick={() => setShowCustom(!showCustom)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {showCustom ? "샘플 항목 보기" : "직접 입력"}
        </Button>
      </div>

      {/* 최근 결정 히스토리 */}
      <Card title="결정 히스토리" subtitle="최근 10건">
        {recentDecisions && recentDecisions.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {recentDecisions.map((d) => (
              <div
                key={d.event_id}
                className="flex items-center justify-between rounded-lg border border-slate-800 p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{d.title}</div>
                  <div className="text-xs text-slate-500 truncate">{d.context}</div>
                </div>
                <div className="ml-4 text-right flex-shrink-0">
                  <div
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${getDecisionColor(
                      d.decision
                    )}`}
                  >
                    {getDecisionLabel(d.decision)}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {formatRelativeTime(d.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-slate-500">
            아직 결정이 없습니다.
          </div>
        )}
      </Card>
    </div>
  );
}
