"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🧠 Logic Map - V-Formula: Asset Growth Logic
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 노드 기반 플로우 에디터 + n8n Automation Hub
 */

import { useState, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ledger } from "@/lib/ledger";
import { 
  Settings, 
  Zap, 
  Globe, 
  UserPlus, 
  Search,
  Play,
  Pause,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// 노드 데이터
// ═══════════════════════════════════════════════════════════════════════════════

interface FlowNode {
  id: string;
  label: string;
  description: string;
  x: number;
  y: number;
  type: "mint" | "tax" | "synergy" | "output";
}

interface FlowEdge {
  from: string;
  to: string;
}

const INITIAL_NODES: FlowNode[] = [
  { id: "m1", label: "M (Mint)", description: "System + Prod? Revenue", x: 100, y: 80, type: "mint" },
  { id: "m2", label: "M (Tax)", description: "Admin Time + Fees", x: 100, y: 280, type: "mint" },
  { id: "t1", label: "T (Tax)", description: "V @ Admin Time + Fees", x: 400, y: 180, type: "tax" },
  { id: "s1", label: "Synergy (s)", description: "ex: P2P Interactions", x: 400, y: 350, type: "synergy" },
];

const INITIAL_EDGES: FlowEdge[] = [
  { from: "m1", to: "t1" },
  { from: "m2", to: "t1" },
  { from: "t1", to: "s1" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Automation 토글
// ═══════════════════════════════════════════════════════════════════════════════

interface AutomationToggle {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  color: string;
}

const INITIAL_AUTOMATIONS: AutomationToggle[] = [
  { id: "financial", label: "Financial Loop", description: "Auto-Pay", enabled: true, color: "green" },
  { id: "global", label: "Global Sync", description: "Translate", enabled: true, color: "green" },
  { id: "onboarding", label: "Onboarding", description: "New Node Setup", enabled: false, color: "slate" },
];

export default function LogicPage() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [edges] = useState(INITIAL_EDGES);
  const [automations, setAutomations] = useState(INITIAL_AUTOMATIONS);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const logic = useLiveQuery(
    async () => (await ledger.logic.orderBy("updated_at").last()) ?? null,
    []
  );

  // 캔버스 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // 배경
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // 그리드
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let x = 0; x < rect.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    for (let y = 0; y < rect.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    // 엣지 그리기
    edges.forEach((edge) => {
      const from = nodes.find((n) => n.id === edge.from);
      const to = nodes.find((n) => n.id === edge.to);
      if (!from || !to) return;

      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2;
      ctx.beginPath();

      // 베지어 커브
      const midX = (from.x + 120 + to.x) / 2;
      ctx.moveTo(from.x + 120, from.y + 30);
      ctx.bezierCurveTo(
        midX, from.y + 30,
        midX, to.y + 30,
        to.x, to.y + 30
      );
      ctx.stroke();

      // 화살표
      const angle = Math.atan2(to.y - from.y, to.x - from.x - 120);
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.moveTo(to.x, to.y + 30);
      ctx.lineTo(to.x - 10 * Math.cos(angle - 0.3), to.y + 30 - 10 * Math.sin(angle - 0.3));
      ctx.lineTo(to.x - 10 * Math.cos(angle + 0.3), to.y + 30 - 10 * Math.sin(angle + 0.3));
      ctx.fill();
    });
  }, [nodes, edges]);

  function toggleAutomation(id: string) {
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, enabled: !a.enabled } : a
      )
    );
  }

  async function updateWeight(key: "mint" | "tax" | "synergy", value: number) {
    if (!logic) return;
    await ledger.logic.add({
      ...logic,
      updated_at: Date.now(),
      weights: { ...logic.weights, [key]: value },
    });
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Logic Map</h1>
          <p className="text-sm text-slate-400 mt-1">V-Formula: Asset Growth Logic</p>
        </div>
        <div className="flex items-center gap-3">
          <code className="px-4 py-2 bg-slate-800 rounded-lg font-mono text-green-400">
            V = (M - T) × (1 + s)<sup>t</sup>
          </code>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 왼쪽: 카테고리 */}
        <div className="col-span-2 space-y-2">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Logic Map</div>
          
          {["V-Digital Weights", "Synergy Logic (s)", "Automation Flows", "Custom Events"].map((item, i) => (
            <button
              key={item}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                i === 0 ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50"
              }`}
            >
              <Settings className="h-4 w-4" />
              {item}
            </button>
          ))}
        </div>

        {/* 중앙: 플로우 캔버스 */}
        <div className="col-span-6 relative">
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-sm font-medium">V-Formula: Asset Growth Logic</span>
              <div className="flex gap-2">
                <button className="p-1.5 rounded hover:bg-slate-800">
                  <Play className="h-4 w-4 text-green-400" />
                </button>
              </div>
            </div>

            {/* 캔버스 */}
            <div className="relative h-[400px]">
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
              />
              
              {/* 노드 오버레이 */}
              {nodes.map((node) => (
                <div
                  key={node.id}
                  className={`absolute cursor-pointer transition-all ${
                    selectedNode === node.id ? "ring-2 ring-green-400" : ""
                  }`}
                  style={{ left: node.x, top: node.y }}
                  onClick={() => setSelectedNode(node.id)}
                >
                  <div className="w-[120px] rounded-lg border border-green-500/50 bg-slate-800/90 p-3">
                    <div className="text-xs text-green-400 font-medium">{node.label}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{node.description}</div>
                    
                    {/* 슬라이더 */}
                    {logic && (node.type === "mint" || node.type === "tax" || node.type === "synergy") && (
                      <div className="mt-2">
                        <input
                          type="range"
                          min={0}
                          max={2}
                          step={0.1}
                          value={logic.weights[node.type as keyof typeof logic.weights] ?? 1}
                          onChange={(e) => updateWeight(node.type as "mint" | "tax" | "synergy", parseFloat(e.target.value))}
                          className="w-full h-1 accent-green-500"
                        />
                        <div className="text-[10px] text-right text-slate-500">
                          x{(logic.weights[node.type as keyof typeof logic.weights] ?? 1).toFixed(1)}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 연결점 */}
                  <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-green-500 border-2 border-slate-900" />
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-green-500 border-2 border-slate-900" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 오른쪽: Automation Hub */}
        <div className="col-span-4 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-sm font-medium mb-4">Automation Hub (n8n Integration)</div>

            <div className="space-y-4">
              {automations.map((auto) => (
                <div key={auto.id} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm">{auto.label}: <span className="text-green-400">{auto.description}</span></div>
                  </div>
                  <button
                    onClick={() => toggleAutomation(auto.id)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      auto.enabled ? "bg-green-500" : "bg-slate-700"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        auto.enabled ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            {/* 검색 */}
            <div className="mt-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Command Palette (/) for raw code editing"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>

            {/* 로직 JSON */}
            {logic && (
              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                <div className="text-[10px] font-mono text-slate-500 mb-2">
                  {`V = {M:${logic.weights.mint.toFixed(1)}, T:${logic.weights.tax.toFixed(1)}} × (1+s)^t`}
                </div>
                <div className="text-[10px] font-mono text-slate-600 break-all">
                  {`MAN:7ARV8V.OMP/AUTOV/TR3.4.ILB`}
                  <br />
                  {`MAS:7VERN.OMP/AUTGMTR3 GH4CQUBN3.AN4 QHD5 THO7`}
                  <br />
                  {`SLOVO`}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 푸터 */}
      <div className="text-center text-xs text-green-400">
        All changes are saved & processed locally. Full Sovereign Control
      </div>
    </div>
  );
}
