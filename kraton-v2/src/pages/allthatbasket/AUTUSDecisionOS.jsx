import React, { useState, useEffect } from 'react';

/**
 * AUTUS Decision OS - Palantir식 원장 전용 콘솔
 *
 * 핵심 원칙:
 * - 차트 없음, KPI 없음
 * - 객체(Object) 클릭 → State Transition
 * - Decision Card로 결정 생성
 * - Blast Radius 필수 표시
 * - Immutable Log
 */

// Contract State Machine
const CONTRACT_STATES = {
  S0: { name: '리드', color: '#6B7280', next: ['S1'] },
  S1: { name: '상담', color: '#3B82F6', next: ['S2', 'S9'] },
  S2: { name: '활성', color: '#10B981', next: ['S3', 'S5'] },
  S3: { name: '위험', color: '#F59E0B', next: ['S4', 'S2', 'S9'] },
  S4: { name: '개입', color: '#EF4444', next: ['S2', 'S5', 'S9'] },
  S5: { name: '휴원', color: '#8B5CF6', next: ['S2', 'S9'] },
  S9: { name: '종료', color: '#374151', next: [] }
};

// 샘플 데이터 - Ontology Objects
const SAMPLE_DATA = {
  customers: [
    { id: 'C001', name: '김민준 학부모', student: '김민준', state: 'S2', vv: 2.1, risk: 'green' },
    { id: 'C002', name: '이서연 학부모', student: '이서연', state: 'S3', vv: 1.4, risk: 'red' },
    { id: 'C003', name: '박지훈 학부모', student: '박지훈', state: 'S2', vv: 1.9, risk: 'yellow' },
    { id: 'C004', name: '최유나 학부모', student: '최유나', state: 'S4', vv: 0.8, risk: 'red' },
    { id: 'C005', name: '정도윤 학부모', student: '정도윤', state: 'S2', vv: 2.4, risk: 'green' },
  ],
  producers: [
    { id: 'P001', name: '박코치', ce: 4.2, slots: ['T001', 'T002'], contracts: 12 },
    { id: 'P002', name: '김코치', ce: 3.8, slots: ['T003'], contracts: 8 },
    { id: 'P003', name: '이코치', ce: 4.5, slots: ['T004', 'T005'], contracts: 15 },
  ],
  timeSlots: [
    { id: 'T001', time: '17:00-18:00', day: '월/수/금', clf: 0.9, vv: 1.3, status: 'red', coach: 'P001' },
    { id: 'T002', time: '18:00-19:00', day: '월/수/금', clf: 0.7, vv: 2.1, status: 'green', coach: 'P001' },
    { id: 'T003', time: '17:00-18:00', day: '화/목', clf: 0.85, vv: 1.6, status: 'yellow', coach: 'P002' },
    { id: 'T004', time: '19:00-20:00', day: '월/수/금', clf: 0.6, vv: 2.3, status: 'green', coach: 'P003' },
    { id: 'T005', time: '18:00-19:00', day: '화/목', clf: 0.75, vv: 1.8, status: 'yellow', coach: 'P003' },
  ],
  decisions: [
    {
      id: 'D001',
      trigger: 'attendance.drop',
      customer: 'C002',
      context: { slot: 'T001', coach: 'P001', vv: 1.4 },
      options: ['reassign_coach', 'apply_makeup', 'contact_parent'],
      owner: '원장',
      deadline: '48h',
      status: 'pending'
    },
    {
      id: 'D002',
      trigger: 'vv.critical',
      customer: 'C004',
      context: { slot: 'T001', coach: 'P001', vv: 0.8 },
      options: ['discount_offer', 'schedule_change', 'intervention_call'],
      owner: '원장',
      deadline: '24h',
      status: 'pending'
    },
  ],
  logs: [
    { time: '2026-02-01 14:22', decision: 'D-2215', action: 'Reassign Coach', owner: '원장', basis: ['attendance.drop x3', 'VV_7d < 1.5'] },
    { time: '2026-02-01 10:15', decision: 'D-2214', action: 'Apply Makeup', owner: '관리자', basis: ['notification.ignored', 'parent.complaint'] },
    { time: '2026-01-31 16:40', decision: 'D-2213', action: 'Kill Slot', owner: '원장', basis: ['CLF > 0.95', 'VV < 1.0', 'churn x5'] },
  ]
};

// Action 정의
const ACTIONS = {
  reassign_coach: { label: '코치 재배치', impact: '+0.4 VV', blast: { contracts: 8, slots: 1 } },
  apply_makeup: { label: '보강 정책 적용', impact: '+0.2 VV', blast: { contracts: 1, slots: 0 } },
  contact_parent: { label: '학부모 연락', impact: '+0.1 VV', blast: { contracts: 1, slots: 0 } },
  discount_offer: { label: '할인 제안', impact: '+0.3 VV', blast: { contracts: 1, slots: 0 } },
  schedule_change: { label: '시간대 변경', impact: '+0.5 VV', blast: { contracts: 1, slots: 2 } },
  intervention_call: { label: '개입 상담', impact: '+0.6 VV', blast: { contracts: 1, slots: 0 } },
  reduce_capacity: { label: '정원 축소', impact: '-0.1 VV', blast: { contracts: 5, slots: 1 } },
  kill_slot: { label: '슬롯 폐지', impact: '0 VV', blast: { contracts: 10, slots: 1 } },
};

// Risk 색상
const getRiskColor = (risk) => {
  switch (risk) {
    case 'red': return '#EF4444';
    case 'yellow': return '#F59E0B';
    case 'green': return '#10B981';
    default: return '#6B7280';
  }
};

export default function AUTUSDecisionOS() {
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [showTransition, setShowTransition] = useState(null);
  const [activeTab, setActiveTab] = useState('world'); // world, decisions, logs
  const [data, setData] = useState(SAMPLE_DATA);

  // 객체 선택 핸들러
  const handleObjectClick = (type, obj) => {
    setSelectedObject(obj);
    setSelectedType(type);
  };

  // State Transition 실행
  const handleAction = (action, targetState = null) => {
    setShowTransition({
      action: ACTIONS[action],
      actionKey: action,
      from: selectedObject?.state,
      to: targetState,
      object: selectedObject
    });
  };

  // Transition 승인
  const approveTransition = () => {
    // 실제로는 여기서 상태 업데이트
    const newLog = {
      time: new Date().toLocaleString(),
      decision: `D-${Date.now().toString().slice(-4)}`,
      action: showTransition.action.label,
      owner: '원장',
      basis: [`${selectedObject?.name}`, `VV: ${selectedObject?.vv}`]
    };
    setData(prev => ({
      ...prev,
      logs: [newLog, ...prev.logs]
    }));
    setShowTransition(null);
    setSelectedObject(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* 헤더 */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-xl">👑</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">AUTUS Decision OS</h1>
              <p className="text-sm text-slate-400">원장 전용 콘솔</p>
            </div>
          </div>

          {/* 탭 */}
          <div className="flex gap-2">
            {[
              { key: 'world', label: '🌍 World Map', count: null },
              { key: 'decisions', label: '⚡ Decisions', count: data.decisions.filter(d => d.status === 'pending').length },
              { key: 'logs', label: '📜 Logs', count: null },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  activeTab === tab.key
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 메인 영역 */}
        <main className="flex-1 p-6">
          {activeTab === 'world' && (
            <div className="space-y-6">
              {/* Contract State Machine */}
              <section className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                <h2 className="text-sm font-semibold text-slate-400 uppercase mb-4">Contract State Machine</h2>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {Object.entries(CONTRACT_STATES).map(([key, state], i) => (
                    <React.Fragment key={key}>
                      <div
                        className="px-4 py-2 rounded-lg text-sm font-medium"
                        style={{ backgroundColor: state.color + '30', borderColor: state.color, borderWidth: 2 }}
                      >
                        {key}: {state.name}
                      </div>
                      {i < Object.keys(CONTRACT_STATES).length - 1 && (
                        <span className="text-slate-600">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </section>

              {/* Ontology Objects */}
              <div className="grid grid-cols-3 gap-6">
                {/* Customers */}
                <section className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                  <h2 className="text-sm font-semibold text-slate-400 uppercase mb-4 flex items-center gap-2">
                    <span>👤</span> Customers
                    <span className="text-xs text-slate-500">({data.customers.length})</span>
                  </h2>
                  <div className="space-y-2">
                    {data.customers.map(customer => (
                      <div
                        key={customer.id}
                        onClick={() => handleObjectClick('customer', customer)}
                        className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${
                          selectedObject?.id === customer.id
                            ? 'border-amber-500 bg-slate-800'
                            : 'border-transparent bg-slate-800/50 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{customer.student}</div>
                            <div className="text-xs text-slate-400">{customer.name}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="px-2 py-0.5 rounded text-xs font-mono"
                              style={{ backgroundColor: CONTRACT_STATES[customer.state]?.color + '30' }}
                            >
                              {customer.state}
                            </span>
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getRiskColor(customer.risk) }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Producers (Coaches) */}
                <section className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                  <h2 className="text-sm font-semibold text-slate-400 uppercase mb-4 flex items-center gap-2">
                    <span>🏃</span> Producers
                    <span className="text-xs text-slate-500">({data.producers.length})</span>
                  </h2>
                  <div className="space-y-2">
                    {data.producers.map(producer => (
                      <div
                        key={producer.id}
                        onClick={() => handleObjectClick('producer', producer)}
                        className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${
                          selectedObject?.id === producer.id
                            ? 'border-amber-500 bg-slate-800'
                            : 'border-transparent bg-slate-800/50 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{producer.name}</div>
                            <div className="text-xs text-slate-400">
                              CE: {'⭐'.repeat(Math.floor(producer.ce))} ({producer.ce})
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-400">{producer.contracts} contracts</div>
                            <div className="text-xs text-slate-500">{producer.slots.length} slots</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* TimeSlots */}
                <section className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                  <h2 className="text-sm font-semibold text-slate-400 uppercase mb-4 flex items-center gap-2">
                    <span>🕐</span> TimeSlots
                    <span className="text-xs text-slate-500">({data.timeSlots.length})</span>
                  </h2>
                  <div className="space-y-2">
                    {data.timeSlots.map(slot => (
                      <div
                        key={slot.id}
                        onClick={() => handleObjectClick('timeslot', slot)}
                        className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${
                          selectedObject?.id === slot.id
                            ? 'border-amber-500 bg-slate-800'
                            : 'border-transparent bg-slate-800/50 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{slot.time}</div>
                            <div className="text-xs text-slate-400">{slot.day}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">VV: {slot.vv}</span>
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getRiskColor(slot.status) }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'decisions' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Pending Decisions</h2>
              {data.decisions.filter(d => d.status === 'pending').map(decision => {
                const customer = data.customers.find(c => c.id === decision.customer);
                return (
                  <div
                    key={decision.id}
                    className="bg-slate-900 rounded-xl p-6 border-2 border-red-500/50"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-xs text-red-400 font-mono mb-1">Decision {decision.id}</div>
                        <div className="text-lg font-semibold">Trigger: {decision.trigger}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Owner: {decision.owner}</div>
                        <div className="text-sm text-amber-400">⏱️ {decision.deadline}</div>
                      </div>
                    </div>

                    <div className="bg-slate-800 rounded-lg p-4 mb-4">
                      <div className="text-sm text-slate-400 mb-2">Context</div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Customer:</span>{' '}
                          <span className="text-white">{customer?.student}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Slot:</span>{' '}
                          <span className="text-white">{decision.context.slot}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">VV:</span>{' '}
                          <span className={decision.context.vv < 1.5 ? 'text-red-400' : 'text-white'}>
                            {decision.context.vv}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-slate-400 mb-2">Options</div>
                    <div className="flex gap-2">
                      {decision.options.map(opt => (
                        <button
                          key={opt}
                          onClick={() => {
                            setSelectedObject(customer);
                            handleAction(opt);
                          }}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-all"
                        >
                          {ACTIONS[opt]?.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Immutable Decision Log</h2>
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="text-left p-3 text-slate-400">Time</th>
                      <th className="text-left p-3 text-slate-400">Decision</th>
                      <th className="text-left p-3 text-slate-400">Action</th>
                      <th className="text-left p-3 text-slate-400">Owner</th>
                      <th className="text-left p-3 text-slate-400">Basis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.map((log, i) => (
                      <tr key={i} className="border-t border-slate-800">
                        <td className="p-3 text-slate-400 font-mono text-xs">{log.time}</td>
                        <td className="p-3 font-mono">{log.decision}</td>
                        <td className="p-3">{log.action}</td>
                        <td className="p-3">{log.owner}</td>
                        <td className="p-3 text-xs text-slate-400">{log.basis.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>

        {/* 사이드 패널 - Object Detail */}
        {selectedObject && (
          <aside className="w-96 bg-slate-900 border-l border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">
                {selectedType === 'customer' && '👤 Customer'}
                {selectedType === 'producer' && '🏃 Producer'}
                {selectedType === 'timeslot' && '🕐 TimeSlot'}
              </h3>
              <button
                onClick={() => setSelectedObject(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Properties */}
            <div className="mb-6">
              <div className="text-xs text-slate-400 uppercase mb-2">Properties</div>
              <div className="bg-slate-800 rounded-lg p-4 space-y-2">
                {selectedType === 'customer' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Name</span>
                      <span>{selectedObject.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Student</span>
                      <span>{selectedObject.student}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">State</span>
                      <span
                        className="px-2 py-0.5 rounded text-xs"
                        style={{ backgroundColor: CONTRACT_STATES[selectedObject.state]?.color + '30' }}
                      >
                        {selectedObject.state}: {CONTRACT_STATES[selectedObject.state]?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">VV</span>
                      <span className={selectedObject.vv < 1.5 ? 'text-red-400' : selectedObject.vv < 2.0 ? 'text-yellow-400' : 'text-green-400'}>
                        {selectedObject.vv}
                      </span>
                    </div>
                  </>
                )}
                {selectedType === 'producer' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Name</span>
                      <span>{selectedObject.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">CE Score</span>
                      <span>{selectedObject.ce}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Active Contracts</span>
                      <span>{selectedObject.contracts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Slots</span>
                      <span>{selectedObject.slots.length}</span>
                    </div>
                  </>
                )}
                {selectedType === 'timeslot' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Time</span>
                      <span>{selectedObject.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Days</span>
                      <span>{selectedObject.day}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">CLF</span>
                      <span className={selectedObject.clf > 0.85 ? 'text-red-400' : 'text-green-400'}>
                        {(selectedObject.clf * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">VV</span>
                      <span className={selectedObject.vv < 1.5 ? 'text-red-400' : 'text-green-400'}>
                        {selectedObject.vv}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div>
              <div className="text-xs text-slate-400 uppercase mb-2">Actions</div>
              <div className="space-y-2">
                {selectedType === 'customer' && (
                  <>
                    <button
                      onClick={() => handleAction('apply_makeup')}
                      className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-all"
                    >
                      <div className="font-medium">보강 정책 적용</div>
                      <div className="text-xs text-slate-400">Apply Makeup Policy</div>
                    </button>
                    <button
                      onClick={() => handleAction('contact_parent')}
                      className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-all"
                    >
                      <div className="font-medium">학부모 연락</div>
                      <div className="text-xs text-slate-400">Contact Parent</div>
                    </button>
                    <button
                      onClick={() => handleAction('discount_offer')}
                      className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-all"
                    >
                      <div className="font-medium">할인 제안</div>
                      <div className="text-xs text-slate-400">Discount Offer</div>
                    </button>
                  </>
                )}
                {selectedType === 'producer' && (
                  <>
                    <button
                      onClick={() => handleAction('reassign_coach')}
                      className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-all"
                    >
                      <div className="font-medium">슬롯 재배치</div>
                      <div className="text-xs text-slate-400">Move to Different Slot</div>
                    </button>
                  </>
                )}
                {selectedType === 'timeslot' && (
                  <>
                    <button
                      onClick={() => handleAction('reassign_coach')}
                      className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-all"
                    >
                      <div className="font-medium">코치 재배치</div>
                      <div className="text-xs text-slate-400">Reassign Coach</div>
                    </button>
                    <button
                      onClick={() => handleAction('reduce_capacity')}
                      className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-all"
                    >
                      <div className="font-medium">정원 축소</div>
                      <div className="text-xs text-slate-400">Reduce Capacity</div>
                    </button>
                    <button
                      onClick={() => handleAction('kill_slot')}
                      className="w-full p-3 bg-red-900/50 hover:bg-red-900 rounded-lg text-left transition-all border border-red-500/30"
                    >
                      <div className="font-medium text-red-400">슬롯 폐지</div>
                      <div className="text-xs text-red-400/70">Kill Slot</div>
                    </button>
                  </>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* State Transition Modal */}
      {showTransition && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-2xl p-6 w-[500px] border border-slate-700">
            <h3 className="text-xl font-bold mb-4">State Transition</h3>

            {showTransition.from && (
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 text-center">
                  <div className="text-xs text-slate-400 mb-1">From</div>
                  <div
                    className="px-4 py-2 rounded-lg inline-block"
                    style={{ backgroundColor: CONTRACT_STATES[showTransition.from]?.color + '30' }}
                  >
                    {showTransition.from}: {CONTRACT_STATES[showTransition.from]?.name}
                  </div>
                </div>
                <div className="text-2xl text-amber-400">→</div>
                <div className="flex-1 text-center">
                  <div className="text-xs text-slate-400 mb-1">To</div>
                  <div className="px-4 py-2 bg-amber-500/30 rounded-lg inline-block">
                    Action Applied
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-800 rounded-lg p-4 mb-6">
              <div className="text-sm text-slate-400 mb-2">Action</div>
              <div className="text-lg font-semibold">{showTransition.action?.label}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Expected Impact (7d)</div>
                <div className="text-xl font-bold text-green-400">{showTransition.action?.impact}</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Blast Radius</div>
                <div className="text-sm">
                  <span className="text-amber-400">{showTransition.action?.blast?.contracts}</span> contracts,{' '}
                  <span className="text-amber-400">{showTransition.action?.blast?.slots}</span> slots
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={approveTransition}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-all"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => setShowTransition(null)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
