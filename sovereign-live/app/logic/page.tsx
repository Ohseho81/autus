"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎛️ Page 8: Logic Editor - 규칙/가중치 편집
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * V 공식 가중치 및 내러티브 규칙 설정
 */

import { useState } from "react";
import { nanoid } from "nanoid";
import { useLiveQuery } from "dexie-react-hooks";
import { ledger } from "@/lib/ledger";
import { Card, Button } from "@/components/cards";
import type { LogicConfig } from "@/lib/schema";
import { Sliders, Code, Save, RefreshCw } from "lucide-react";

export default function LogicPage() {
  const [showJson, setShowJson] = useState(false);

  const config = useLiveQuery(
    async () => {
      const all = await ledger.logic.orderBy("updated_at").reverse().toArray();
      return all[0] ?? null;
    },
    []
  );

  // 가중치 업데이트
  async function updateWeight(key: "mint" | "tax" | "synergy", value: number) {
    if (!config) return;

    const updated: LogicConfig = {
      ...config,
      config_id: nanoid(),
      updated_at: Date.now(),
      weights: {
        ...config.weights,
        [key]: value,
      },
    };

    await ledger.logic.add(updated);
  }

  // 규칙 업데이트
  async function updateRule<K extends keyof LogicConfig["rules"]>(
    key: K,
    value: LogicConfig["rules"][K]
  ) {
    if (!config) return;

    const updated: LogicConfig = {
      ...config,
      config_id: nanoid(),
      updated_at: Date.now(),
      rules: {
        ...config.rules,
        [key]: value,
      },
    };

    await ledger.logic.add(updated);
  }

  // 기본값으로 리셋
  async function resetToDefault() {
    const defaultConfig: LogicConfig = {
      config_id: nanoid(),
      updated_at: Date.now(),
      weights: {
        mint: 1.0,
        tax: 1.0,
        synergy: 1.0,
      },
      rules: {
        narrative_mode: "template",
        auto_delegate_threshold: 80,
        proof_required: false,
      },
    };

    await ledger.logic.add(defaultConfig);
  }

  if (!config) {
    return (
      <Card>
        <div className="py-8 text-center">
          <div className="text-sm text-slate-500">설정을 불러오는 중...</div>
          <Button onClick={resetToDefault} className="mt-4">
            기본 설정 생성
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* V 공식 가중치 */}
      <Card
        title="V 공식 가중치"
        subtitle="V = (Mint × w1) - (Tax × w2) + (Network × Synergy × w3)"
      >
        <div className="space-y-6">
          <WeightSlider
            label="Mint (가치 생성)"
            value={config.weights.mint}
            onChange={(v) => updateWeight("mint", v)}
            description="결정 실행으로 생성되는 가치 가중치"
          />
          <WeightSlider
            label="Tax (비용/시간)"
            value={config.weights.tax}
            onChange={(v) => updateWeight("tax", v)}
            description="실행에 소요되는 비용/시간 가중치"
          />
          <WeightSlider
            label="Synergy (네트워크 효과)"
            value={config.weights.synergy}
            onChange={(v) => updateWeight("synergy", v)}
            description="1-12-144 네트워크 시너지 가중치"
          />
        </div>
      </Card>

      {/* 규칙 설정 */}
      <Card title="규칙 설정">
        <div className="space-y-4">
          {/* 내러티브 모드 */}
          <div className="flex items-center justify-between rounded-lg border border-slate-800 p-4">
            <div>
              <div className="font-medium">문장 생성 모드</div>
              <div className="text-xs text-slate-500 mt-1">
                Status/Path 문장 생성 방식
              </div>
            </div>
            <select
              value={config.rules.narrative_mode}
              onChange={(e) =>
                updateRule("narrative_mode", e.target.value as "template" | "llm")
              }
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="template">템플릿 기반</option>
              <option value="llm">LLM 기반 (준비 중)</option>
            </select>
          </div>

          {/* 자동 위임 임계값 */}
          <div className="rounded-lg border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-medium">자동 위임 임계값</div>
                <div className="text-xs text-slate-500">
                  긴급도가 이 값 이상이면 위임 제안
                </div>
              </div>
              <span className="text-lg font-mono">
                {config.rules.auto_delegate_threshold}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={config.rules.auto_delegate_threshold}
              onChange={(e) =>
                updateRule("auto_delegate_threshold", Number(e.target.value))
              }
              className="w-full accent-green-500"
            />
          </div>

          {/* 증빙 필수 */}
          <div className="flex items-center justify-between rounded-lg border border-slate-800 p-4">
            <div>
              <div className="font-medium">위임 시 증빙 필수</div>
              <div className="text-xs text-slate-500 mt-1">
                DELEGATE 결정 시 Proof 추가 강제
              </div>
            </div>
            <button
              onClick={() => updateRule("proof_required", !config.rules.proof_required)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                config.rules.proof_required ? "bg-green-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                  config.rules.proof_required ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* JSON 뷰 */}
      <Card
        title="설정 JSON"
        action={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowJson(!showJson)}
            >
              <Code className="h-4 w-4 mr-1" />
              {showJson ? "숨기기" : "보기"}
            </Button>
            <Button variant="ghost" size="sm" onClick={resetToDefault}>
              <RefreshCw className="h-4 w-4 mr-1" />
              리셋
            </Button>
          </div>
        }
      >
        {showJson ? (
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-300">
            {JSON.stringify(config, null, 2)}
          </pre>
        ) : (
          <div className="text-sm text-slate-500">
            마지막 업데이트: {new Date(config.updated_at).toLocaleString("ko-KR")}
          </div>
        )}
      </Card>
    </div>
  );
}

// 가중치 슬라이더 컴포넌트
function WeightSlider({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  description: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-xs text-slate-500">{description}</div>
        </div>
        <span className="text-lg font-mono text-green-400">
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={2}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-green-500"
      />
      <div className="flex justify-between text-xs text-slate-600 mt-1">
        <span>0</span>
        <span>1</span>
        <span>2</span>
      </div>
    </div>
  );
}
