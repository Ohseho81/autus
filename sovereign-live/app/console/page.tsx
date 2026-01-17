"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚡ Page 2: Decision Console - 창업자 결정 센터
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 스타트업 창업자 타겟:
 * - 카드 스와이프 UX
 * - 결정 카테고리 (제품/팀/자금/운영)
 * - 긴급도 시각화
 * - 위임 추천
 */

import { useState, useCallback } from "react";
import { nanoid } from "nanoid";
import { useLiveQuery } from "dexie-react-hooks";
import { ledger } from "@/lib/ledger";
import { DECISION_RULES, type DecisionType } from "@/lib/schema";
import { formatRelativeTime, getDecisionColor, getDecisionLabel } from "@/lib/utils";
import { 
  Zap, 
  Users, 
  DollarSign, 
  Package,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
} from "lucide-react";

// 창업자 결정 카테고리
const CATEGORIES = [
  { id: "product", label: "제품", icon: Package, color: "text-purple-400" },
  { id: "team", label: "팀", icon: Users, color: "text-blue-400" },
  { id: "funding", label: "자금", icon: DollarSign, color: "text-green-400" },
  { id: "ops", label: "운영", icon: Zap, color: "text-orange-400" },
];

// 샘플 결정 (스타트업 창업자 관점)
const FOUNDER_DECISIONS = [
  {
    title: "시리즈 A 투자 조건 협상",
    context: "VC에서 제안한 밸류에이션. 희석률 15% 조건.",
    category: "funding",
    urgency: 90,
    suggestDelegate: false,
  },
  {
    title: "개발팀 2명 추가 채용",
    context: "런웨이 18개월. 인건비 월 1,200만원 증가.",
    category: "team",
    urgency: 70,
    suggestDelegate: true,
  },
  {
    title: "신규 기능 로드맵 확정",
    context: "고객 요청 Top 3 기능. 개발 기간 3주.",
    category: "product",
    urgency: 60,
    suggestDelegate: false,
  },
  {
    title: "사무실 임대 계약 갱신",
    context: "현 계약 2개월 후 만료. 10% 인상 제안.",
    category: "ops",
    urgency: 50,
    suggestDelegate: true,
  },
  {
    title: "마케팅 예산 2배 증액",
    context: "CAC 개선을 위한 실험. 월 500만원 → 1000만원.",
    category: "funding",
    urgency: 55,
    suggestDelegate: true,
  },
  {
    title: "핵심 개발자 스톡옵션 제안",
    context: "경쟁사 오퍼 대응. 0.5% 지분 제안.",
    category: "team",
    urgency: 85,
    suggestDelegate: false,
  },
];

export default function ConsolePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customContext, setCustomContext] = useState("");
  const [customCategory, setCustomCategory] = useState("product");
  const [lastAction, setLastAction] = useState<{
    title: string;
    decision: DecisionType;
  } | null>(null);

  const recentDecisions = useLiveQuery(
    () => ledger.decisions.orderBy("created_at").reverse().limit(10).toArray(),
    []
  );

  // 필터링된 결정
  const filteredDecisions = selectedCategory
    ? FOUNDER_DECISIONS.filter((d) => d.category === selectedCategory)
    : FOUNDER_DECISIONS;

  const currentItem = filteredDecisions[currentIndex % filteredDecisions.length];
  const category = CATEGORIES.find((c) => c.id === currentItem?.category);

  // 결정 커밋
  async function commit(decision: DecisionType) {
    const title = showCustom ? customTitle : currentItem.title;
    const context = showCustom ? customContext : currentItem.context;

    if (!title.trim()) return;

    const now = Date.now();
    const eventId = nanoid();
    const rules = DECISION_RULES[decision];

    const decisionEvent = {
      event_id: eventId,
      created_at: now,
      title,
      context,
      decision,
      linked_task_id: undefined as string | undefined,
    };

    if (rules.creates_task) {
      const taskId = nanoid();
      decisionEvent.linked_task_id = taskId;

      await ledger.tasks.add({
        task_id: taskId,
        created_at: now,
        title,
        description: context,
        priority: "high",
        due_at: null,
        source_decision_id: eventId,
        status: rules.task_status!,
      });
    }

    await ledger.decisions.add(decisionEvent);

    // 피드백
    setLastAction({ title, decision });
    if (!showCustom) {
      setCurrentIndex((prev) => (prev + 1) % filteredDecisions.length);
    } else {
      setShowCustom(false);
      setCustomTitle("");
      setCustomContext("");
    }

    if ("vibrate" in navigator) {
      navigator.vibrate(decision === "do" ? [50] : decision === "delegate" ? [30, 30] : [20]);
    }
  }

  // 네비게이션
  const goNext = () => setCurrentIndex((prev) => (prev + 1) % filteredDecisions.length);
  const goPrev = () => setCurrentIndex((prev) => (prev - 1 + filteredDecisions.length) % filteredDecisions.length);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Decision Console</h1>
          <p className="text-sm text-slate-500">창업자 결정 센터</p>
        </div>
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          {showCustom ? "샘플 보기" : "직접 입력"}
        </button>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`rounded-lg px-3 py-2 text-sm transition-colors ${
            !selectedCategory
              ? "bg-white text-slate-900"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          전체
        </button>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                selectedCategory === cat.id
                  ? "bg-white text-slate-900"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* 마지막 액션 피드백 */}
      {lastAction && (
        <div className={`rounded-xl border p-4 animate-fade-in ${getDecisionColor(lastAction.decision)}`}>
          <div className="flex items-center gap-2">
            {lastAction.decision === "do" && <CheckCircle className="h-4 w-4" />}
            {lastAction.decision === "delegate" && <Users className="h-4 w-4" />}
            {lastAction.decision === "stop" && <XCircle className="h-4 w-4" />}
            <span className="text-sm">
              "{lastAction.title}" → {getDecisionLabel(lastAction.decision)}
            </span>
          </div>
        </div>
      )}

      {/* 메인 결정 카드 */}
      {showCustom ? (
        <CustomDecisionCard
          title={customTitle}
          setTitle={setCustomTitle}
          context={customContext}
          setContext={setCustomContext}
          category={customCategory}
          setCategory={setCustomCategory}
          onCommit={commit}
        />
      ) : (
        <DecisionCard
          item={currentItem}
          category={category}
          onCommit={commit}
          onPrev={goPrev}
          onNext={goNext}
          currentIndex={currentIndex}
          totalCount={filteredDecisions.length}
        />
      )}

      {/* 결정 히스토리 */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium">최근 결정</span>
          <span className="text-xs text-slate-500">{recentDecisions?.length ?? 0}건</span>
        </div>
        
        {recentDecisions && recentDecisions.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
            {recentDecisions.map((d) => (
              <div
                key={d.event_id}
                className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{d.title}</div>
                  <div className="text-xs text-slate-500">{formatRelativeTime(d.created_at)}</div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${getDecisionColor(d.decision)}`}>
                  {getDecisionLabel(d.decision)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-slate-500">
            아직 결정이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}

// 결정 카드 컴포넌트
function DecisionCard({
  item,
  category,
  onCommit,
  onPrev,
  onNext,
  currentIndex,
  totalCount,
}: {
  item: typeof FOUNDER_DECISIONS[0];
  category: typeof CATEGORIES[0] | undefined;
  onCommit: (decision: DecisionType) => void;
  onPrev: () => void;
  onNext: () => void;
  currentIndex: number;
  totalCount: number;
}) {
  const Icon = category?.icon ?? Package;

  return (
    <div className="relative">
      {/* 네비게이션 화살표 */}
      <button
        onClick={onPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 rounded-full bg-slate-800 p-2 hover:bg-slate-700"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={onNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 rounded-full bg-slate-800 p-2 hover:bg-slate-700"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* 카드 */}
      <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 p-6 mx-8">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-4">
          <div className={`flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 ${category?.color}`}>
            <Icon className="h-4 w-4" />
            <span className="text-xs font-medium">{category?.label ?? "일반"}</span>
          </div>
          <div className="text-xs text-slate-500">
            {currentIndex + 1} / {totalCount}
          </div>
        </div>

        {/* 긴급도 */}
        <div className="flex items-center gap-2 mb-3">
          <Clock className={`h-4 w-4 ${item.urgency > 70 ? "text-red-400" : item.urgency > 50 ? "text-yellow-400" : "text-slate-400"}`} />
          <div className="flex-1 h-1.5 rounded-full bg-slate-700">
            <div 
              className={`h-full rounded-full ${item.urgency > 70 ? "bg-red-500" : item.urgency > 50 ? "bg-yellow-500" : "bg-slate-500"}`}
              style={{ width: `${item.urgency}%` }}
            />
          </div>
          <span className="text-xs text-slate-400">{item.urgency}%</span>
        </div>

        {/* 제목 & 컨텍스트 */}
        <h2 className="text-xl font-semibold mb-2">{item.title}</h2>
        <p className="text-sm text-slate-400 mb-6">{item.context}</p>

        {/* 위임 추천 */}
        {item.suggestDelegate && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/30 px-3 py-2 mb-4">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-blue-400">💡 위임 가능한 결정입니다</span>
          </div>
        )}

        {/* 결정 버튼 */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => onCommit("do")}
            className="group relative rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 p-4 hover:border-green-500/60 transition-all"
          >
            <CheckCircle className="h-6 w-6 text-green-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-sm font-medium text-green-400">실행</div>
            <div className="text-xs text-green-500/60 mt-1">직접 처리</div>
          </button>

          <button
            onClick={() => onCommit("delegate")}
            className="group relative rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 p-4 hover:border-blue-500/60 transition-all"
          >
            <Users className="h-6 w-6 text-blue-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-sm font-medium text-blue-400">위임</div>
            <div className="text-xs text-blue-500/60 mt-1">팀에 맡기기</div>
          </button>

          <button
            onClick={() => onCommit("stop")}
            className="group relative rounded-xl bg-gradient-to-br from-slate-500/20 to-slate-600/20 border border-slate-500/30 p-4 hover:border-slate-500/60 transition-all"
          >
            <XCircle className="h-6 w-6 text-slate-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-sm font-medium text-slate-400">중단</div>
            <div className="text-xs text-slate-500/60 mt-1">지금은 아님</div>
          </button>
        </div>

        {/* 안내 */}
        <div className="mt-4 text-center text-xs text-slate-600">
          선택은 기록됩니다. 되돌리기 없음.
        </div>
      </div>
    </div>
  );
}

// 커스텀 결정 카드
function CustomDecisionCard({
  title,
  setTitle,
  context,
  setContext,
  category,
  setCategory,
  onCommit,
}: {
  title: string;
  setTitle: (v: string) => void;
  context: string;
  setContext: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  onCommit: (decision: DecisionType) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="space-y-4 mb-6">
        {/* 카테고리 선택 */}
        <div>
          <label className="text-xs text-slate-500 mb-2 block">카테고리</label>
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    category === cat.id
                      ? "bg-slate-700 text-white"
                      : "bg-slate-800/50 text-slate-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="text-xs text-slate-500 mb-2 block">결정 항목</label>
          <input
            type="text"
            placeholder="결정이 필요한 항목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 focus:border-slate-600 focus:outline-none"
          />
        </div>

        {/* 컨텍스트 */}
        <div>
          <label className="text-xs text-slate-500 mb-2 block">배경/컨텍스트</label>
          <textarea
            placeholder="관련 정보, 숫자, 제약 조건 등"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 focus:border-slate-600 focus:outline-none resize-none"
          />
        </div>
      </div>

      {/* 결정 버튼 */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => onCommit("do")}
          disabled={!title.trim()}
          className="rounded-xl bg-green-500/20 border border-green-500/30 p-4 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
        >
          <CheckCircle className="h-6 w-6 mx-auto mb-2" />
          <div className="text-sm font-medium">실행</div>
        </button>
        <button
          onClick={() => onCommit("delegate")}
          disabled={!title.trim()}
          className="rounded-xl bg-blue-500/20 border border-blue-500/30 p-4 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50"
        >
          <Users className="h-6 w-6 mx-auto mb-2" />
          <div className="text-sm font-medium">위임</div>
        </button>
        <button
          onClick={() => onCommit("stop")}
          disabled={!title.trim()}
          className="rounded-xl bg-slate-500/20 border border-slate-500/30 p-4 text-slate-400 hover:bg-slate-500/30 disabled:opacity-50"
        >
          <XCircle className="h-6 w-6 mx-auto mb-2" />
          <div className="text-sm font-medium">중단</div>
        </button>
      </div>
    </div>
  );
}
