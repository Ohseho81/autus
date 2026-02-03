/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS App Generator
 * JSON 스펙에서 완전한 업무 앱 코드를 생성
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// 메인 앱 코드 생성
export function generateAppCode(spec, pages, industry) {
  const timestamp = new Date().toISOString();

  return `/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ${industry.name} 업무 앱 - AUTUS Factory 자동 생성
 * Generated: ${timestamp}
 * Brand ID: ${spec.brand_id}
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// SPEC 정의
// ═══════════════════════════════════════════════════════════════════════════
const SPEC = ${JSON.stringify(spec, null, 2)};

// ═══════════════════════════════════════════════════════════════════════════
// 상태 머신
// ═══════════════════════════════════════════════════════════════════════════
const STATE_MACHINE = {
  S0: { name: '대기', color: '#6B7280', next: ['S1'] },
  S1: { name: '접수', color: '#3B82F6', next: ['S2'] },
  S2: { name: '적격', color: '#8B5CF6', next: ['S3', 'S4'] },
  S3: { name: '승인', color: '#F59E0B', next: ['S4', 'S1'] },
  S4: { name: '개입', color: '#EF4444', next: ['S5'] },
  S5: { name: '모니터', color: '#10B981', next: ['S6', 'S7'] },
  S6: { name: '안정', color: '#06B6D4', next: ['S0', 'S1'] },
  S7: { name: '섀도우', color: '#EC4899', next: ['S5'] },
  S9: { name: '종료', color: '#64748B', next: [] },
};

// ═══════════════════════════════════════════════════════════════════════════
// 위젯 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════

function DecisionInbox({ outcomes, onSelect }) {
  const sTierOutcomes = outcomes.filter(o => o.tier === 'S');

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">📥 의사결정 인박스</h3>
        <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
          {sTierOutcomes.length}
        </span>
      </div>
      <div className="space-y-2">
        {sTierOutcomes.map((outcome, i) => (
          <button
            key={i}
            onClick={() => onSelect?.(outcome)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100 hover:border-red-300 transition-all"
          >
            <span className="text-red-500">⚡</span>
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900">{outcome.label}</div>
              <div className="text-xs text-gray-500">{outcome.id}</div>
            </div>
            <span className="text-gray-400">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StateMachine({ currentState = 'S0', onTransition }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4">⚙️ 상태 머신</h3>
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATE_MACHINE).map(([key, state]) => (
          <button
            key={key}
            onClick={() => onTransition?.(key)}
            className={\`px-3 py-2 rounded-xl text-sm font-medium transition-all \${
              currentState === key
                ? 'ring-2 ring-offset-2'
                : 'opacity-60 hover:opacity-100'
            }\`}
            style={{
              backgroundColor: state.color + '20',
              color: state.color,
              ringColor: state.color,
            }}
          >
            {key} {state.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function Heatmap({ slots = [], valueKey = 'vv' }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4">🗺️ 히트맵</h3>
      <div className="grid grid-cols-7 gap-1">
        {Array(28).fill(0).map((_, i) => {
          const value = Math.random();
          const color = value > 0.7 ? '#10B981' : value > 0.4 ? '#F59E0B' : '#EF4444';
          return (
            <div
              key={i}
              className="aspect-square rounded"
              style={{ backgroundColor: color + '40' }}
            />
          );
        })}
      </div>
      <div className="flex justify-center gap-4 mt-3 text-xs text-gray-500">
        <span>🟢 좋음</span>
        <span>🟡 보통</span>
        <span>🔴 위험</span>
      </div>
    </div>
  );
}

function KPICards({ metrics = {} }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4">📊 KPI</h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600">+12%</div>
          <div className="text-xs text-emerald-600">VV 7d</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">85%</div>
          <div className="text-xs text-blue-600">갱신율</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">3</div>
          <div className="text-xs text-amber-600">경고</div>
        </div>
      </div>
    </div>
  );
}

function LogViewer({ logs = [] }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4">📜 불변 로그</h3>
      <div className="space-y-2 max-h-60 overflow-auto">
        {logs.length > 0 ? logs.map((log, i) => (
          <div key={i} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded-lg">
            <span className="text-gray-400">{log.ts}</span>
            <span className="font-mono text-gray-600">{log.action}</span>
          </div>
        )) : (
          <div className="text-center text-gray-400 py-8">로그가 없습니다</div>
        )}
      </div>
    </div>
  );
}

function ActionButtons({ buttons = [], onAction }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4">🔘 액션</h3>
      <div className="grid grid-cols-2 gap-2">
        {buttons.map((btn, i) => (
          <button
            key={i}
            onClick={() => onAction?.(btn)}
            className="py-3 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:shadow-lg transition-all"
          >
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
}

function NotificationCenter({ notifications = [], replyOptions = [] }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4">🔔 알림</h3>
      <div className="space-y-3">
        {notifications.length > 0 ? notifications.map((notif, i) => (
          <div key={i} className="p-3 bg-gray-50 rounded-xl">
            <div className="text-sm font-medium text-gray-900">{notif.message}</div>
            <div className="flex gap-2 mt-2">
              {replyOptions.map((opt, j) => (
                <button
                  key={j}
                  className="px-3 py-1 text-xs rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )) : (
          <div className="text-center text-gray-400 py-8">새 알림이 없습니다</div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 페이지 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════

${pages.map(page => generatePageComponent(page, spec)).join('\n\n')}

// ═══════════════════════════════════════════════════════════════════════════
// 메인 앱
// ═══════════════════════════════════════════════════════════════════════════

export default function ${toPascalCase(spec.brand_id)}App() {
  const [activePage, setActivePage] = useState('${pages[0]?.id || 'owner'}');
  const [contractState, setContractState] = useState('S0');
  const [logs, setLogs] = useState([]);

  const handleStateTransition = useCallback((newState) => {
    setLogs(prev => [...prev, {
      ts: new Date().toLocaleTimeString(),
      action: \`상태 전이: \${contractState} → \${newState}\`,
    }]);
    setContractState(newState);
  }, [contractState]);

  const pages = ${JSON.stringify(pages.map(p => ({ id: p.id, name: p.name, role: p.role })))};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">${industry.icon}</span>
            <h1 className="text-lg font-bold text-gray-900">${industry.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
              {STATE_MACHINE[contractState]?.name || contractState}
            </span>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex overflow-x-auto px-2 pb-2 gap-1">
          {pages.map(page => (
            <button
              key={page.id}
              onClick={() => setActivePage(page.id)}
              className={\`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap \${
                activePage === page.id
                  ? 'bg-orange-100 text-orange-600'
                  : 'text-gray-500 hover:bg-gray-100'
              }\`}
            >
              {page.name}
            </button>
          ))}
        </div>
      </header>

      {/* 페이지 컨텐츠 */}
      <main className="p-4">
        {${pages.map(p => `activePage === '${p.id}' && <${toPascalCase(p.id)}Page contractState={contractState} onStateTransition={handleStateTransition} logs={logs} />`).join('\n        ')}
        }
      </main>
    </div>
  );
}
`;
}

// 개별 페이지 컴포넌트 생성
function generatePageComponent(page, spec) {
  const widgetComponents = page.widgets.map(widgetId => {
    switch (widgetId) {
      case 'decision_inbox':
        return `<DecisionInbox outcomes={SPEC.outcome_facts} />`;
      case 'state_machine':
        return `<StateMachine currentState={contractState} onTransition={onStateTransition} />`;
      case 'heatmap':
        return `<Heatmap />`;
      case 'kpi_cards':
        return `<KPICards />`;
      case 'log_viewer':
        return `<LogViewer logs={logs} />`;
      case 'action_buttons':
        return `<ActionButtons buttons={${JSON.stringify(spec.decision_cards?.[0]?.options || ['액션1', '액션2'])}} />`;
      case 'notification_center':
        return `<NotificationCenter replyOptions={['확인', '보강확정', '전화요청']} />`;
      default:
        return `{/* ${widgetId} */}`;
    }
  }).join('\n        ');

  return `function ${toPascalCase(page.id)}Page({ contractState, onStateTransition, logs }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-xl font-bold text-gray-900">${page.name}</h2>
        <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs">
          👤 ${page.role}
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        ${widgetComponents}
      </div>
    </div>
  );
}`;
}

// 파스칼 케이스 변환
function toPascalCase(str) {
  return str.split(/[-_\s]/).map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join('');
}

// 스펙 JSON 파일 생성
export function generateSpecFile(spec) {
  return JSON.stringify(spec, null, 2);
}

// 테스트 시나리오 생성
export function generateTestScenarios(spec, count = 30) {
  const scenarios = [];
  const sTierFacts = spec.outcome_facts?.filter(f => f.tier === 'S') || [];

  for (let i = 1; i <= count; i++) {
    const fact = sTierFacts[i % sTierFacts.length] || { id: 'unknown', tier: 'A' };
    scenarios.push({
      scenario_id: `SC${String(i).padStart(3, '0')}`,
      name: `시나리오 ${i}`,
      trigger: {
        fact_type: fact.id,
        tier: fact.tier,
        contract_id: `C${String(i).padStart(3, '0')}`,
      },
      expected_state_flow: ['S0', 'S1', 'S2', 'S4', 'S5', 'S6'],
      expected_outcome: '처리 완료',
    });
  }

  return scenarios.map(s => JSON.stringify(s)).join('\n');
}

// 파일 목록 생성
export function generateFileList(spec, pages) {
  const brandId = spec.brand_id || 'app';
  return [
    { name: `${brandId}App.jsx`, lines: 450 + pages.length * 30 },
    { name: `${brandId}Spec.json`, lines: JSON.stringify(spec, null, 2).split('\n').length },
    { name: 'widgets/DecisionInbox.jsx', lines: 85 },
    { name: 'widgets/StateMachine.jsx', lines: 120 },
    { name: 'widgets/Heatmap.jsx', lines: 65 },
    { name: 'widgets/KPICards.jsx', lines: 55 },
    { name: 'widgets/LogViewer.jsx', lines: 70 },
    { name: 'widgets/ActionButtons.jsx', lines: 45 },
    { name: 'widgets/NotificationCenter.jsx', lines: 80 },
    { name: 'hooks/useStateMachine.js', lines: 95 },
    { name: 'hooks/useDecisionCards.js', lines: 75 },
    { name: `tests/${brandId}_30.jsonl`, lines: 30 },
    { name: `tests/assertions.json`, lines: 150 },
  ];
}

export default {
  generateAppCode,
  generateSpecFile,
  generateTestScenarios,
  generateFileList,
};
