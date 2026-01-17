"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 Page 4: Action Log - 실행 기록 (개인평가 불가)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 핵심 루프: Task → ActionLog 기록
 * 규칙:
 * - actor_role은 항상 "employee" (개인 식별 금지)
 * - 개인 평가/비교 불가 상시 고지
 */

import { useState } from "react";
import { nanoid } from "nanoid";
import { useLiveQuery } from "dexie-react-hooks";
import { ledger } from "@/lib/ledger";
import { Card, Button, Badge } from "@/components/cards";
import { formatRelativeTime, getStatusColor, getPriorityColor } from "@/lib/utils";
import type { ActionStatus, Task } from "@/lib/schema";
import { CheckCircle, Clock, AlertCircle, Play, Plus, Filter } from "lucide-react";

const STATUS_OPTIONS: { value: ActionStatus; label: string; icon: typeof CheckCircle }[] = [
  { value: "completed", label: "완료", icon: CheckCircle },
  { value: "in_progress", label: "진행중", icon: Play },
  { value: "delayed", label: "지연", icon: Clock },
  { value: "needs_decision", label: "판단 필요", icon: AlertCircle },
];

export default function ActionLogPage() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const tasks = useLiveQuery(
    () => ledger.tasks.orderBy("created_at").reverse().toArray(),
    []
  );

  const logs = useLiveQuery(
    () => ledger.actionLogs.orderBy("logged_at").reverse().toArray(),
    []
  );

  // 태스크 추가
  async function addTask() {
    if (!newTaskTitle.trim()) return;

    await ledger.tasks.add({
      task_id: nanoid(),
      created_at: Date.now(),
      title: newTaskTitle,
      priority: "medium",
      due_at: null,
      status: "pending",
    });

    setNewTaskTitle("");
    setShowAddTask(false);
  }

  // 액션 로그 추가
  async function logAction(taskId: string, status: ActionStatus) {
    await ledger.actionLogs.add({
      log_id: nanoid(),
      task_id: taskId,
      actor_role: "employee", // 항상 고정
      action_status: status,
      time_spent_min: null,
      used_tools: [],
      logged_at: Date.now(),
    });

    // Task 상태 업데이트
    if (status === "completed") {
      await ledger.tasks.update(taskId, { status: "done" });
    } else if (status === "in_progress") {
      await ledger.tasks.update(taskId, { status: "active" });
    }
  }

  // 필터링
  const filteredTasks = tasks?.filter((t) => {
    if (filterStatus === "all") return true;
    return t.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* 면책 공지 */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3">
        <div className="text-sm text-blue-400">
          ℹ️ 본 기록은 개인 평가에 활용되지 않으며, 구조적 병목 파악에만 사용됩니다.
        </div>
      </div>

      {/* 헤더 */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-medium">Action Log</div>
            <div className="text-sm text-slate-500">
              {tasks?.length ?? 0}개 태스크 / {logs?.length ?? 0}개 로그
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddTask(!showAddTask)}
            >
              <Plus className="h-4 w-4 mr-1" />
              태스크 추가
            </Button>
          </div>
        </div>

        {/* 태스크 추가 폼 */}
        {showAddTask && (
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="새 태스크 제목"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm focus:border-slate-600 focus:outline-none"
            />
            <Button onClick={addTask}>추가</Button>
          </div>
        )}
      </Card>

      {/* 필터 */}
      <div className="flex gap-2">
        <Button
          variant={filterStatus === "all" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setFilterStatus("all")}
        >
          전체
        </Button>
        <Button
          variant={filterStatus === "pending" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setFilterStatus("pending")}
        >
          대기
        </Button>
        <Button
          variant={filterStatus === "active" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setFilterStatus("active")}
        >
          진행중
        </Button>
        <Button
          variant={filterStatus === "done" ? "primary" : "ghost"}
          size="sm"
          onClick={() => setFilterStatus("done")}
        >
          완료
        </Button>
      </div>

      {/* 태스크 목록 */}
      <div className="space-y-3">
        {filteredTasks && filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.task_id}
              task={task}
              onLog={logAction}
              logs={logs?.filter((l) => l.task_id === task.task_id) ?? []}
            />
          ))
        ) : (
          <Card>
            <div className="py-8 text-center text-sm text-slate-500">
              {filterStatus === "all"
                ? "태스크가 없습니다. Decision Console에서 결정을 내리거나 직접 추가하세요."
                : "해당 상태의 태스크가 없습니다."}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// 태스크 카드 컴포넌트
function TaskCard({
  task,
  onLog,
  logs,
}: {
  task: Task;
  onLog: (taskId: string, status: ActionStatus) => void;
  logs: any[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
              [{task.priority.toUpperCase()}]
            </span>
            <span className="text-base">{task.title}</span>
          </div>
          {task.description && (
            <div className="mt-1 text-sm text-slate-500">{task.description}</div>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
            <span>{formatRelativeTime(task.created_at)}</span>
            <Badge
              variant={
                task.status === "done"
                  ? "success"
                  : task.status === "active"
                  ? "warning"
                  : "default"
              }
            >
              {task.status}
            </Badge>
            {logs.length > 0 && (
              <span
                className="cursor-pointer hover:text-slate-400"
                onClick={() => setExpanded(!expanded)}
              >
                {logs.length}개 로그 {expanded ? "▲" : "▼"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      {task.status !== "done" && task.status !== "cancelled" && (
        <div className="mt-4 flex gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onLog(task.task_id, opt.value)}
              className={`flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs hover:bg-slate-800 ${getStatusColor(
                opt.value
              )}`}
            >
              <opt.icon className="h-3 w-3" />
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* 로그 히스토리 */}
      {expanded && logs.length > 0 && (
        <div className="mt-4 border-t border-slate-800 pt-4">
          <div className="text-xs text-slate-500 mb-2">실행 기록</div>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.log_id}
                className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2 text-xs"
              >
                <span className={getStatusColor(log.action_status)}>
                  {log.action_status}
                </span>
                <span className="text-slate-500">
                  {formatRelativeTime(log.logged_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
