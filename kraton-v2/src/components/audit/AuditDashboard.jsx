/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔍 KRATON Audit Dashboard
 * 정밀 감사 및 개선 로드맵 통합 대시보드
 * 
 * 1. Perception Audit - 시스템 인지력 진단
 * 2. FSD Physics Calibration - 판단 엔진 성능 측정
 * 3. V-Curve Validation - 가치 창출 곡선 검증
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock API 호출 함수
const fetchPerceptionAudit = async () => ({
  summary: {
    total_logs: 847,
    audit_period: '30일',
    data_quality_score: 78,
    perception_accuracy: 0.72,
  },
  tag_analysis: {
    critical_tag_ratio: 0.42,
    irrelevant_tag_ratio: 0.08,
    top_critical_tags: [
      { tag: 's:-20', count: 45, impact: '위험' },
      { tag: 'psych_cost', count: 38, impact: '위험' },
      { tag: 's:+20', count: 112, impact: '긍정' },
      { tag: 'M:+15', count: 89, impact: '긍정' },
    ],
    tags_to_remove: ['기타', 'etc', 'normal'],
  },
  vectorization_quality: {
    extraction_accuracy: 0.85,
    successful_extractions: 720,
  },
  voice_to_data: {
    total_voice_inputs: 156,
    conversion_success_rate: 0.78,
    avg_confidence_score: 0.72,
  },
  refinement_score: {
    s_index_coverage: 0.65,
    m_score_coverage: 0.58,
    bond_strength_coverage: 0.45,
    overall_refinement: 0.56,
  },
  recommendations: [
    '📊 s(t) 만족도 데이터 입력이 부족합니다. 감정 태그 사용을 독려하세요.',
    '🗑️ 무의미 태그 3개를 삭제하여 데이터 정밀도를 높이세요.',
  ],
});

const fetchPhysicsCalibration = async () => ({
  summary: {
    total_predictions: 156,
    prediction_accuracy: 0.82,
    current_formula: 'R(t) = Σ(w_i × ΔM_i) / s(t)^α',
  },
  confusion_matrix: {
    true_positive: 28,
    false_positive: 8,
    true_negative: 112,
    false_negative: 8,
    precision: 0.78,
    recall: 0.78,
    f1_score: 0.78,
  },
  weight_analysis: {
    current_w_i: [1.0, 1.2, 1.4, 1.6, 1.8],
    current_alpha: 1.5,
    optimized_w_i: [1.0, 1.25, 1.5, 1.75, 2.0],
    optimized_alpha: 1.65,
    improvement_expected: 12,
  },
  latency_metrics: {
    avg_input_to_dashboard_ms: 450,
    p95_latency_ms: 680,
    target_achieved: true,
    bottleneck_points: [
      { stage: 'Claude API', avg_ms: 200 },
      { stage: 'Webhook', avg_ms: 150 },
      { stage: 'Supabase', avg_ms: 50 },
    ],
  },
  priority_accuracy: {
    critical_accuracy: 0.92,
    high_accuracy: 0.85,
    medium_accuracy: 0.72,
  },
  recommendations: [
    '🔧 가중치 최적화 적용 권장: w_i = [1.0, 1.25, 1.5, 1.75, 2.0]',
    '✅ CRITICAL 정확도가 92%로 양호합니다.',
  ],
});

const fetchValueValidation = async () => ({
  summary: {
    v_index_accuracy: 98,
    sync_health: 'HEALTHY',
    automation_efficiency: 71,
    security_score: 95,
  },
  v_index_sync: {
    system_v_index: 3630000000,
    ledger_v_index: 3580000000,
    variance_percentage: 1.4,
    sync_status: 'MINOR_DRIFT',
  },
  global_integration: {
    korea: { connected: true, data_freshness_seconds: 180 },
    philippines: { connected: true, data_freshness_seconds: 240 },
    cross_region_latency_ms: 150,
  },
  automation_analysis: {
    total_workflows: 6,
    active_workflows: 6,
    time_saved_hours: 142,
    acceleration_score: 71,
    bottleneck_workflows: [
      { name: 'Active Shield', avg_execution_ms: 3200, failure_rate: 0.05 },
      { name: 'Neural Pipeline', avg_execution_ms: 2500, failure_rate: 0.02 },
    ],
  },
  security_audit: {
    pii_exposure_risk: 'LOW',
    encryption_status: true,
    rls_enabled: true,
    security_gaps: ['보안 갭 없음'],
  },
  value_metrics: {
    total_mint: 285000000,
    total_tax: 180000000,
    net_v_creation: 105000000,
    t_saved_value: 4970000,
    roi_percentage: 61,
  },
  recommendations: [
    '📊 V-Index 미세 오차(1.4%)가 있습니다. 동기화 주기를 30분으로 단축하세요.',
    '✅ V-Curve가 정상 작동 중입니다.',
  ],
});

// 점수 게이지 컴포넌트
const ScoreGauge = memo(function ScoreGauge({ score, label, color = 'cyan' }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 transform -rotate-90">
          <circle
            cx="56"
            cy="56"
            r={radius}
            stroke="#374151"
            strokeWidth="8"
            fill="none"
          />
          <motion.circle
            cx="56"
            cy="56"
            r={radius}
            stroke={`var(--${color})`}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              strokeDasharray: circumference,
              stroke: color === 'cyan' ? '#06b6d4' : 
                     color === 'emerald' ? '#10b981' : 
                     color === 'yellow' ? '#eab308' : '#ef4444',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-white">{score}</span>
        </div>
      </div>
      <span className="text-gray-400 text-sm mt-2">{label}</span>
    </div>
  );
});

// 상태 배지 컴포넌트
const StatusBadge = memo(function StatusBadge({ status }) {
  const colors = {
    HEALTHY: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    WARNING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
    SYNCHRONIZED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    MINOR_DRIFT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    MAJOR_DRIFT: 'bg-red-500/20 text-red-400 border-red-500/30',
    LOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    HIGH: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[status] || colors.HEALTHY}`}>
      {status}
    </span>
  );
});

// Confusion Matrix 컴포넌트
const ConfusionMatrix = memo(function ConfusionMatrix({ matrix }) {
  return (
    <div className="grid grid-cols-3 gap-1 text-center text-sm">
      <div></div>
      <div className="text-gray-500 text-xs">예측 위험</div>
      <div className="text-gray-500 text-xs">예측 안전</div>
      
      <div className="text-gray-500 text-xs text-right pr-2">실제 이탈</div>
      <div className="p-2 bg-emerald-500/20 rounded">
        <span className="text-emerald-400 font-bold">{matrix.true_positive}</span>
        <span className="text-gray-500 text-xs block">TP</span>
      </div>
      <div className="p-2 bg-red-500/20 rounded">
        <span className="text-red-400 font-bold">{matrix.false_negative}</span>
        <span className="text-gray-500 text-xs block">FN</span>
      </div>
      
      <div className="text-gray-500 text-xs text-right pr-2">실제 유지</div>
      <div className="p-2 bg-yellow-500/20 rounded">
        <span className="text-yellow-400 font-bold">{matrix.false_positive}</span>
        <span className="text-gray-500 text-xs block">FP</span>
      </div>
      <div className="p-2 bg-emerald-500/20 rounded">
        <span className="text-emerald-400 font-bold">{matrix.true_negative}</span>
        <span className="text-gray-500 text-xs block">TN</span>
      </div>
    </div>
  );
});

// 메인 컴포넌트
export default function AuditDashboard() {
  const [activeTab, setActiveTab] = useState('perception');
  const [perceptionData, setPerceptionData] = useState(null);
  const [physicsData, setPhysicsData] = useState(null);
  const [valueData, setValueData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [perception, physics, value] = await Promise.all([
        fetchPerceptionAudit(),
        fetchPhysicsCalibration(),
        fetchValueValidation(),
      ]);
      setPerceptionData(perception);
      setPhysicsData(physics);
      setValueData(value);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-cyan-400 text-lg">🔍 시스템 감사 중...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'perception', label: '1. Perception Audit', icon: '👁️', color: 'purple' },
    { id: 'physics', label: '2. Physics Calibration', icon: '⚙️', color: 'cyan' },
    { id: 'value', label: '3. V-Curve Validation', icon: '📈', color: 'emerald' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">🔍</span>
              KRATON 정밀 감사
            </h1>
            <p className="text-gray-400 mt-1">Check → Tune-up → Upgrade</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-gray-400 text-sm">종합 점수</p>
              <p className="text-2xl font-bold text-cyan-400">
                {Math.round((perceptionData.summary.data_quality_score + 
                  physicsData.summary.prediction_accuracy * 100 + 
                  valueData.summary.v_index_accuracy) / 3)}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? `bg-${tab.color}-500/20 text-${tab.color}-400 border border-${tab.color}-500/50`
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'perception' && (
            <motion.div
              key="perception"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Perception Summary */}
              <div className="grid grid-cols-4 gap-4">
                <ScoreGauge 
                  score={perceptionData.summary.data_quality_score} 
                  label="데이터 품질" 
                  color="purple" 
                />
                <ScoreGauge 
                  score={Math.round(perceptionData.tag_analysis.critical_tag_ratio * 100)} 
                  label="결정적 태그 비중" 
                  color="cyan" 
                />
                <ScoreGauge 
                  score={Math.round(perceptionData.vectorization_quality.extraction_accuracy * 100)} 
                  label="벡터화 정확도" 
                  color="emerald" 
                />
                <ScoreGauge 
                  score={Math.round(perceptionData.voice_to_data.conversion_success_rate * 100)} 
                  label="Voice 변환율" 
                  color="yellow" 
                />
              </div>

              {/* Tag Analysis */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-800/30 rounded-xl border border-purple-500/30 p-4">
                  <h3 className="text-purple-400 font-medium mb-4">🏷️ 결정적 태그 분석</h3>
                  <div className="space-y-2">
                    {perceptionData.tag_analysis.top_critical_tags.map((tag, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-900/50 rounded">
                        <span className={`px-2 py-1 rounded text-xs ${
                          tag.impact === '위험' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {tag.tag}
                        </span>
                        <span className="text-gray-400">{tag.count}회</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
                  <h3 className="text-white font-medium mb-4">📊 정제 점수 (Refinement)</h3>
                  <div className="space-y-4">
                    {[
                      { label: 's(t) 만족도', value: perceptionData.refinement_score.s_index_coverage },
                      { label: 'M 성과', value: perceptionData.refinement_score.m_score_coverage },
                      { label: 'Bond 유대', value: perceptionData.refinement_score.bond_strength_coverage },
                    ].map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">{item.label}</span>
                          <span className="text-white">{Math.round(item.value * 100)}%</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.value * 100}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full bg-purple-500 rounded-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-gray-800/30 rounded-xl border border-yellow-500/30 p-4">
                <h3 className="text-yellow-400 font-medium mb-3">💡 개선 권장사항</h3>
                <ul className="space-y-2">
                  {perceptionData.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-gray-300 text-sm">{rec}</li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {activeTab === 'physics' && (
            <motion.div
              key="physics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Physics Summary */}
              <div className="grid grid-cols-4 gap-4">
                <ScoreGauge 
                  score={Math.round(physicsData.confusion_matrix.f1_score * 100)} 
                  label="F1 Score" 
                  color="cyan" 
                />
                <ScoreGauge 
                  score={Math.round(physicsData.confusion_matrix.precision * 100)} 
                  label="Precision" 
                  color="emerald" 
                />
                <ScoreGauge 
                  score={Math.round(physicsData.confusion_matrix.recall * 100)} 
                  label="Recall" 
                  color="yellow" 
                />
                <ScoreGauge 
                  score={Math.round(physicsData.priority_accuracy.critical_accuracy * 100)} 
                  label="CRITICAL 정확도" 
                  color="purple" 
                />
              </div>

              {/* Confusion Matrix & Weight */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-800/30 rounded-xl border border-cyan-500/30 p-4">
                  <h3 className="text-cyan-400 font-medium mb-4">📊 Confusion Matrix</h3>
                  <ConfusionMatrix matrix={physicsData.confusion_matrix} />
                </div>

                <div className="bg-gray-800/30 rounded-xl border border-emerald-500/30 p-4">
                  <h3 className="text-emerald-400 font-medium mb-4">⚙️ Weight 최적화</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-500 text-xs mb-1">현재 w_i</p>
                      <p className="text-white font-mono">[{physicsData.weight_analysis.current_w_i.join(', ')}]</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs mb-1">최적화 w_i</p>
                      <p className="text-emerald-400 font-mono">[{physicsData.weight_analysis.optimized_w_i.join(', ')}]</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">α (만족도 민감도)</span>
                      <span className="text-white">{physicsData.weight_analysis.current_alpha} → <span className="text-emerald-400">{physicsData.weight_analysis.optimized_alpha}</span></span>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-lg">
                      <p className="text-emerald-400 text-sm">예상 개선: +{physicsData.weight_analysis.improvement_expected}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Latency */}
              <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium">⏱️ Latency Check</h3>
                  <StatusBadge status={physicsData.latency_metrics.target_achieved ? 'HEALTHY' : 'WARNING'} />
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{physicsData.latency_metrics.avg_input_to_dashboard_ms}ms</p>
                    <p className="text-gray-500 text-xs">평균 지연</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{physicsData.latency_metrics.p95_latency_ms}ms</p>
                    <p className="text-gray-500 text-xs">P95</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-400">500ms</p>
                    <p className="text-gray-500 text-xs">목표</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {physicsData.latency_metrics.bottleneck_points.map((point, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{point.stage}</span>
                      <span className="text-white">{point.avg_ms}ms</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-gray-800/30 rounded-xl border border-yellow-500/30 p-4">
                <h3 className="text-yellow-400 font-medium mb-3">💡 개선 권장사항</h3>
                <ul className="space-y-2">
                  {physicsData.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-gray-300 text-sm">{rec}</li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {activeTab === 'value' && (
            <motion.div
              key="value"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Value Summary */}
              <div className="grid grid-cols-4 gap-4">
                <ScoreGauge 
                  score={valueData.summary.v_index_accuracy} 
                  label="V-Index 정확도" 
                  color="emerald" 
                />
                <ScoreGauge 
                  score={valueData.summary.automation_efficiency} 
                  label="자동화 효율" 
                  color="cyan" 
                />
                <ScoreGauge 
                  score={valueData.summary.security_score} 
                  label="보안 점수" 
                  color="purple" 
                />
                <ScoreGauge 
                  score={valueData.value_metrics.roi_percentage} 
                  label="ROI" 
                  color="yellow" 
                />
              </div>

              {/* V-Index Sync & Global */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-800/30 rounded-xl border border-emerald-500/30 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-emerald-400 font-medium">📊 V-Index 동기화</h3>
                    <StatusBadge status={valueData.v_index_sync.sync_status} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">시스템 V-Index</span>
                      <span className="text-white">₩{(valueData.v_index_sync.system_v_index / 1e9).toFixed(2)}B</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">장부 V-Index</span>
                      <span className="text-white">₩{(valueData.v_index_sync.ledger_v_index / 1e9).toFixed(2)}B</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">오차율</span>
                      <span className={valueData.v_index_sync.variance_percentage > 2 ? 'text-yellow-400' : 'text-emerald-400'}>
                        {valueData.v_index_sync.variance_percentage}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/30 rounded-xl border border-cyan-500/30 p-4">
                  <h3 className="text-cyan-400 font-medium mb-4">🌐 글로벌 통합</h3>
                  <div className="space-y-4">
                    {['korea', 'philippines'].map(region => (
                      <div key={region} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{region === 'korea' ? '🇰🇷' : '🇵🇭'}</span>
                          <span className="text-white capitalize">{region}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            valueData.global_integration[region].connected ? 'bg-emerald-500' : 'bg-red-500'
                          }`} />
                          <span className="text-gray-400 text-sm">
                            {valueData.global_integration[region].data_freshness_seconds}초 전
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-700">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">지역 간 지연</span>
                        <span className="text-white">{valueData.global_integration.cross_region_latency_ms}ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Automation & Security */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-800/30 rounded-xl border border-purple-500/30 p-4">
                  <h3 className="text-purple-400 font-medium mb-4">🤖 자동화 분석</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                      <p className="text-2xl font-bold text-white">{valueData.automation_analysis.time_saved_hours}h</p>
                      <p className="text-gray-500 text-xs">절감 시간</p>
                    </div>
                    <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                      <p className="text-2xl font-bold text-emerald-400">₩{(valueData.value_metrics.t_saved_value / 1e6).toFixed(1)}M</p>
                      <p className="text-gray-500 text-xs">절감 비용</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {valueData.automation_analysis.bottleneck_workflows.map((wf, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm p-2 bg-gray-900/50 rounded">
                        <span className="text-gray-400">{wf.name}</span>
                        <span className="text-white">{wf.avg_execution_ms}ms</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-medium">🔒 보안 감사</h3>
                    <StatusBadge status={valueData.security_audit.pii_exposure_risk} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">암호화</span>
                      <span className={valueData.security_audit.encryption_status ? 'text-emerald-400' : 'text-red-400'}>
                        {valueData.security_audit.encryption_status ? '✅ 활성' : '❌ 비활성'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">RLS</span>
                      <span className={valueData.security_audit.rls_enabled ? 'text-emerald-400' : 'text-red-400'}>
                        {valueData.security_audit.rls_enabled ? '✅ 활성' : '❌ 비활성'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">PII 노출 위험</span>
                      <span className="text-emerald-400">{valueData.security_audit.pii_exposure_risk}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-gray-800/30 rounded-xl border border-yellow-500/30 p-4">
                <h3 className="text-yellow-400 font-medium mb-3">💡 개선 권장사항</h3>
                <ul className="space-y-2">
                  {valueData.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-gray-300 text-sm">{rec}</li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
