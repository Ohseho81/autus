"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏛️ Page 1: Company Status - 경영적 결론
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 실제 데이터 인젝션: 필리핀 SPC 3억 / 부채 8억
 */

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ledger } from "@/lib/ledger";
import { Shield, Activity, TrendingUp, AlertCircle, Zap, Clock } from "lucide-react";

export default function StatusPage() {
  // 실제 데이터 인젝션: 필리핀 SPC 3억 / 부채 8억 기반 초기값
  const [data, setData] = useState({
    health: 78,
    statusText: "필리핀 클락 SPC 법인 설립 자본금 3억원이 안전하게 확인되었습니다. 부채(8억) 상환 루틴이 정상 가동 중이며, 학원 매출을 통한 현금 흐름이 개선되고 있습니다.",
    bottlenecks: ["필리핀 현지 매니저 업무 보고 지연 (2건)", "캠프 비자 서류 검토 대기"],
    vTrend: "+1.2%"
  });

  // Ledger 데이터 연동
  const stats = useLiveQuery(async () => {
    const [decisions, tasks, logs] = await Promise.all([
      ledger.decisions.count(),
      ledger.tasks.count(),
      ledger.actionLogs.count(),
    ]);
    
    const pendingTasks = await ledger.tasks
      .where("status")
      .anyOf(["pending", "active"])
      .count();
    
    const delayedLogs = await ledger.actionLogs
      .where("action_status")
      .equals("delayed")
      .toArray();

    return { decisions, tasks, logs, pendingTasks, delayedLogs };
  }, []);

  // 동적 병목 업데이트
  useEffect(() => {
    if (stats?.delayedLogs && stats.delayedLogs.length > 0) {
      const dynamicBottlenecks = [
        ...data.bottlenecks,
        ...stats.delayedLogs.slice(0, 2).map((log) => `지연된 태스크 (${log.task_id.slice(0, 8)}...)`)
      ];
      setData(prev => ({ ...prev, bottlenecks: dynamicBottlenecks.slice(0, 4) }));
    }
  }, [stats?.delayedLogs]);

  return (
    <div className="space-y-6">
      {/* 상단: 시스템 무결성 상태 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-green-400">
          <Shield size={20} />
          <span className="text-sm font-mono uppercase tracking-widest">Sovereign Mode Active</span>
        </div>
        <div className="text-slate-500 text-xs">Genesis Block: #0001-2026</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. 건강 지수 카드 */}
        <div className="lg:col-span-1 bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl">
          <h3 className="text-slate-500 text-sm font-bold uppercase mb-4 flex items-center gap-2">
            <Activity size={16} /> Health Score
          </h3>
          <div className="text-7xl font-black text-white mb-2">
            {data.health}<span className="text-2xl text-slate-500">%</span>
          </div>
          <p className="text-slate-400 text-sm">
            시스템이 분석한 조직 및 자산의 구조적 안정도입니다.
          </p>
          
          {/* 건강 바 */}
          <div className="mt-6 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-1000"
              style={{ width: `${data.health}%` }}
            />
          </div>
        </div>

        {/* 2. 전략 리포트 카드 (AI Narrative) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-2xl text-slate-900">
          <h3 className="text-slate-400 text-sm font-bold uppercase mb-4">Strategic Narrative</h3>
          <p className="text-2xl font-semibold leading-relaxed tracking-tight">
            "{data.statusText}"
          </p>
          
          {/* 메타 정보 */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Clock size={14} />
              Last updated: {new Date().toLocaleTimeString("ko-KR")}
            </span>
            <span className="flex items-center gap-1">
              <Zap size={14} />
              AI: WebLLM Local
            </span>
          </div>
        </div>

        {/* 3. 실시간 병목 알림 (Bottlenecks) */}
        <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-8 border border-slate-800">
          <h3 className="text-red-400 text-sm font-bold uppercase mb-6 flex items-center gap-2">
            <AlertCircle size={16} /> Immediate Bottlenecks
          </h3>
          <div className="space-y-4">
            {data.bottlenecks.map((item, i) => (
              <div 
                key={i} 
                className="bg-slate-800 p-4 rounded-xl border-l-4 border-red-500 text-slate-200 font-medium flex items-center justify-between"
              >
                <span>{item}</span>
                <button className="text-xs text-red-400 hover:text-red-300 transition-colors">
                  RESOLVE →
                </button>
              </div>
            ))}
            {data.bottlenecks.length === 0 && (
              <div className="text-slate-500 text-center py-8">
                ✓ 현재 병목 없음
              </div>
            )}
          </div>
        </div>

        {/* 4. 가치 추세 (V-Trend) */}
        <div className="lg:col-span-1 bg-blue-600 rounded-3xl p-8 text-white shadow-2xl">
          <h3 className="text-blue-200 text-sm font-bold uppercase mb-4 flex items-center gap-2">
            <TrendingUp size={16} /> V-Trend (24h)
          </h3>
          <div className="text-5xl font-black">{data.vTrend}</div>
          <p className="mt-4 text-blue-100 text-sm leading-snug">
            자산 가치가 목표 곡선(V)을 따라 우상향하고 있습니다.
          </p>
          
          {/* 미니 차트 시각화 */}
          <div className="mt-6 flex items-end gap-1 h-12">
            {[40, 45, 42, 48, 52, 50, 55, 58].map((h, i) => (
              <div 
                key={i}
                className="flex-1 bg-blue-400/50 rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 5. 퀵 스탯 */}
      <div className="grid grid-cols-4 gap-4">
        <QuickStat label="Decisions" value={stats?.decisions ?? 0} />
        <QuickStat label="Active Tasks" value={stats?.pendingTasks ?? 0} />
        <QuickStat label="Total Logs" value={stats?.logs ?? 0} />
        <QuickStat label="Ledger" value="Local" isText />
      </div>

      {/* 푸터 */}
      <div className="text-center text-xs text-green-400 pt-4">
        All data processed locally. Zero server storage. Full sovereign control.
      </div>
    </div>
  );
}

function QuickStat({ 
  label, 
  value, 
  isText = false 
}: { 
  label: string; 
  value: number | string; 
  isText?: boolean;
}) {
  return (
    <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
      <div className="text-slate-500 text-xs uppercase tracking-wider">{label}</div>
      <div className={`mt-1 font-bold ${isText ? "text-lg text-green-400" : "text-2xl text-white"}`}>
        {value}
      </div>
    </div>
  );
}
