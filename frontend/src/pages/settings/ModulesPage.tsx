/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 학원 설정 > 모듈 관리
 * Core + Optional Modules 토글 인터페이스
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import {
  MODULE_CONFIGS,
  PLAN_CONFIGS,
  type ModuleId,
  type PlanType,
  canEnableModule,
  getDefaultEnabledModules,
  getModuleDependencies,
} from '../../core/modules/module-config';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════════════════════════

interface ModulesPageProps {
  orgId?: string;
}

interface OrgModuleSettings {
  plan: PlanType;
  enabledModules: ModuleId[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export default function ModulesPage({ orgId = 'demo-org' }: ModulesPageProps) {
  const [settings, setSettings] = useState<OrgModuleSettings>({
    plan: 'PRO', // MVP 기본값: Pro
    enabledModules: getDefaultEnabledModules('PRO'),
  });

  const [saving, setSaving] = useState(false);

  // 모듈 토글 핸들러
  const handleToggleModule = (moduleId: ModuleId) => {
    const module = MODULE_CONFIGS[moduleId];
    
    // Core는 비활성화 불가
    if (module.isCore) return;
    
    // 플랜 체크
    if (!canEnableModule(moduleId, settings.plan)) {
      alert(`이 모듈은 ${PLAN_CONFIGS[module.minPlan].nameKo} 플랜 이상에서 사용 가능합니다.`);
      return;
    }

    setSettings(prev => {
      const isCurrentlyEnabled = prev.enabledModules.includes(moduleId);
      
      if (isCurrentlyEnabled) {
        // 비활성화: 이 모듈에 의존하는 다른 모듈도 비활성화
        const dependents = Object.values(MODULE_CONFIGS)
          .filter(m => m.dependencies.includes(moduleId))
          .map(m => m.id);
        
        return {
          ...prev,
          enabledModules: prev.enabledModules.filter(
            id => id !== moduleId && !dependents.includes(id)
          ),
        };
      } else {
        // 활성화: 의존 모듈도 함께 활성화
        const deps = getModuleDependencies(moduleId);
        const newModules = [...new Set([...prev.enabledModules, moduleId, ...deps])];
        
        return {
          ...prev,
          enabledModules: newModules,
        };
      }
    });
  };

  // 저장
  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: API 연동
      await new Promise(r => setTimeout(r, 500));
      alert('모듈 설정이 저장되었습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 모듈 그룹화
  const coreModules = Object.values(MODULE_CONFIGS).filter(m => m.isCore);
  const optionalModules = Object.values(MODULE_CONFIGS).filter(m => !m.isCore);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-3xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>⚙️</span> 학원 설정 {'>'} 모듈 관리
          </h1>
          <p className="text-slate-400 mt-2">
            필요한 기능만 활성화하여 사용하세요. Core 기능은 항상 활성화됩니다.
          </p>
        </div>

        {/* 현재 플랜 */}
        <div className="mb-6 p-4 bg-slate-800 rounded-xl border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-400">현재 플랜</div>
              <div className="text-xl font-bold text-amber-400">
                {PLAN_CONFIGS[settings.plan].nameKo}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {settings.plan === 'COMMUNITY' 
                  ? '무료' 
                  : `₩${PLAN_CONFIGS[settings.plan].price.toLocaleString()}/월`}
              </div>
              <div className="text-sm text-slate-400">
                학생 {PLAN_CONFIGS[settings.plan].studentLimit || '무제한'}명
              </div>
            </div>
          </div>
        </div>

        {/* MVP 배지 */}
        <div className="mb-6 p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg flex items-center gap-2">
          <span className="text-amber-400">🧪</span>
          <span className="text-amber-300 text-sm">
            MVP 모드: 모든 모듈을 테스트할 수 있습니다 (Pro 플랜 기준)
          </span>
        </div>

        {/* Core 모듈 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            Core (항상 활성)
          </h2>
          <div className="space-y-3">
            {coreModules.map(module => (
              <ModuleCard
                key={module.id}
                module={module}
                isEnabled={true}
                canToggle={false}
                plan={settings.plan}
                onToggle={() => {}}
              />
            ))}
          </div>
        </div>

        {/* Optional 모듈 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
            Optional Modules
          </h2>
          <div className="space-y-3">
            {optionalModules.map(module => {
              const isEnabled = settings.enabledModules.includes(module.id);
              const canToggle = canEnableModule(module.id, settings.plan);
              
              return (
                <ModuleCard
                  key={module.id}
                  module={module}
                  isEnabled={isEnabled}
                  canToggle={canToggle}
                  plan={settings.plan}
                  onToggle={() => handleToggleModule(module.id)}
                />
              );
            })}
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-lg font-medium transition-colors"
          >
            {saving ? '저장 중...' : '💾 설정 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ModuleCard 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface ModuleCardProps {
  module: typeof MODULE_CONFIGS[ModuleId];
  isEnabled: boolean;
  canToggle: boolean;
  plan: PlanType;
  onToggle: () => void;
}

function ModuleCard({ module, isEnabled, canToggle, plan, onToggle }: ModuleCardProps) {
  const [expanded, setExpanded] = useState(false);
  const planBadge = module.minPlan !== 'COMMUNITY' ? PLAN_CONFIGS[module.minPlan].nameKo : null;

  return (
    <div 
      className={`
        p-4 rounded-xl border transition-all
        ${isEnabled 
          ? 'bg-slate-800/80 border-blue-500/50' 
          : 'bg-slate-800/40 border-slate-700'
        }
        ${!canToggle && !module.isCore ? 'opacity-50' : ''}
      `}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{module.nameKo}</h3>
            {planBadge && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                {planBadge}
              </span>
            )}
            {module.isCore && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                필수
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400">{module.description}</p>
        </div>

        {/* 토글 */}
        <div className="ml-4">
          {module.isCore ? (
            <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
              ✓ 필수
            </div>
          ) : (
            <button
              onClick={onToggle}
              disabled={!canToggle}
              className={`
                w-14 h-8 rounded-full transition-colors relative
                ${isEnabled ? 'bg-blue-600' : 'bg-slate-600'}
                ${!canToggle ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div 
                className={`
                  w-6 h-6 bg-white rounded-full absolute top-1 transition-all
                  ${isEnabled ? 'left-7' : 'left-1'}
                `}
              />
            </button>
          )}
        </div>
      </div>

      {/* 상세 펼치기 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-sm text-slate-500 hover:text-slate-300 flex items-center gap-1"
      >
        {expanded ? '▼' : '▶'} 상세 정보
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-700 space-y-3">
          {/* 기능 목록 */}
          <div>
            <div className="text-xs text-slate-500 mb-1">포함 기능</div>
            <div className="flex flex-wrap gap-1">
              {module.features.map((feature, i) => (
                <span 
                  key={i}
                  className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* 추천 시점 */}
          <div>
            <div className="text-xs text-slate-500 mb-1">💡 추천</div>
            <div className="text-sm text-slate-300">{module.recommendedWhen}</div>
          </div>

          {/* 의존성 */}
          {module.dependencies.length > 0 && (
            <div>
              <div className="text-xs text-slate-500 mb-1">의존 모듈</div>
              <div className="flex gap-1">
                {module.dependencies.map(depId => (
                  <span 
                    key={depId}
                    className="px-2 py-0.5 bg-slate-600 rounded text-xs"
                  >
                    {MODULE_CONFIGS[depId].nameKo}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
