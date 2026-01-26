/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚨 CRISIS RESPONSE MODULE - Optimus Public Opinion & Crisis Management
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Opinion Shaper 흡수 모듈
 * - 실시간 여론 모니터링
 * - 위기 감지 및 알림
 * - AI 기반 대응 콘텐츠 생성
 * - 대응 실행 및 모니터링
 */

import React, { useState, useEffect, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// CONSTANTS
// ============================================

const SEVERITY_CONFIG = {
  critical: { color: '#FF4444', bg: 'bg-red-500/20', label: '🔴 긴급', priority: 1 },
  high: { color: '#FF8800', bg: 'bg-orange-500/20', label: '🟠 높음', priority: 2 },
  medium: { color: '#FFCC00', bg: 'bg-yellow-500/20', label: '🟡 중간', priority: 3 },
  low: { color: '#00CC66', bg: 'bg-emerald-500/20', label: '🟢 낮음', priority: 4 },
};

const CRISIS_TYPES = {
  negative_review: { icon: '⭐', label: '부정 리뷰', channel: 'Review Sites' },
  social_media: { icon: '📱', label: 'SNS 이슈', channel: 'Social Media' },
  news_article: { icon: '📰', label: '뉴스 기사', channel: 'News/Press' },
  complaint: { icon: '📞', label: '고객 불만', channel: 'Customer Service' },
  legal_issue: { icon: '⚖️', label: '법적 이슈', channel: 'Legal' },
  pr_crisis: { icon: '🎙️', label: 'PR 위기', channel: 'Public Relations' },
  misinformation: { icon: '❌', label: '허위정보', channel: 'Various' },
};

const RESPONSE_CHANNELS = [
  { id: 'x', name: 'X (Twitter)', icon: '𝕏' },
  { id: 'instagram', name: 'Instagram', icon: '📷' },
  { id: 'facebook', name: 'Facebook', icon: '👤' },
  { id: 'naver', name: 'Naver Blog', icon: '🇳' },
  { id: 'press', name: 'Press Release', icon: '📰' },
  { id: 'direct', name: 'Direct Contact', icon: '📧' },
];

// ============================================
// MOCK DATA
// ============================================

const generateMockCrises = () => [
  {
    id: 'crisis-1',
    type: 'social_media',
    severity: 'critical',
    source: 'X (Twitter)',
    sourceUrl: 'https://x.com/user/status/123',
    originalContent: '이 학원 수업료만 비싸고 실력은 안 늘어요. 환불도 안 해줌. 절대 비추',
    detectedAt: new Date(Date.now() - 1800000).toISOString(),
    sentimentScore: -0.85,
    reachEstimate: 15400,
    engagements: { likes: 342, retweets: 89, comments: 56 },
    status: 'pending',
    aiAnalysis: {
      mainIssues: ['수업료 불만', '실력 향상 미흡', '환불 정책'],
      urgencyReason: '높은 도달률, 리트윗 증가 추세',
      recommendedTone: '공감 + 해결 의지',
    },
    suggestedResponses: [
      {
        id: 'resp-1a',
        tone: 'empathetic',
        content: '소중한 피드백 감사합니다. 불편을 드려 죄송합니다. DM으로 상세 내용 공유해주시면 담당자가 직접 연락드리겠습니다. 🙏',
        confidence: 0.92,
      },
      {
        id: 'resp-1b',
        tone: 'professional',
        content: '안녕하세요, [학원명]입니다. 말씀하신 부분 확인 후 개선하겠습니다. 1:1 상담 신청: [링크]',
        confidence: 0.85,
      },
    ],
  },
  {
    id: 'crisis-2',
    type: 'negative_review',
    severity: 'high',
    source: 'Google Reviews',
    sourceUrl: 'https://maps.google.com/review/123',
    originalContent: '★☆☆☆☆ 선생님이 자주 바뀌고 커리큘럼이 일관성이 없어요',
    detectedAt: new Date(Date.now() - 7200000).toISOString(),
    sentimentScore: -0.72,
    reachEstimate: 2300,
    engagements: { helpful: 28 },
    status: 'analyzing',
    aiAnalysis: {
      mainIssues: ['강사 이직률', '커리큘럼 일관성'],
      urgencyReason: '리뷰 플랫폼 노출, 도움됨 클릭 증가',
      recommendedTone: '사과 + 개선 약속',
    },
    suggestedResponses: [
      {
        id: 'resp-2a',
        tone: 'apologetic',
        content: '소중한 리뷰 감사합니다. 말씀하신 부분 깊이 반성하고 있습니다. 현재 강사 안정화 및 커리큘럼 표준화 작업을 진행 중입니다.',
        confidence: 0.88,
      },
    ],
  },
  {
    id: 'crisis-3',
    type: 'news_article',
    severity: 'medium',
    source: '교육일보',
    sourceUrl: 'https://news.example.com/article/456',
    originalContent: '[단독] 사교육비 급등...학원들 "물가 상승 반영" vs 학부모 "부담 가중"',
    detectedAt: new Date(Date.now() - 14400000).toISOString(),
    sentimentScore: -0.45,
    reachEstimate: 8700,
    engagements: { views: 8700, comments: 124 },
    status: 'monitoring',
    aiAnalysis: {
      mainIssues: ['가격 정책', '업계 이미지'],
      urgencyReason: '언론 보도, 댓글 여론 형성 중',
      recommendedTone: '중립적 입장 표명',
    },
    suggestedResponses: [],
  },
  {
    id: 'crisis-4',
    type: 'complaint',
    severity: 'low',
    source: 'Customer Service',
    sourceUrl: null,
    originalContent: '수업 시간 변경 요청했는데 아직 연락이 없어요',
    detectedAt: new Date(Date.now() - 3600000).toISOString(),
    sentimentScore: -0.35,
    reachEstimate: 1,
    engagements: {},
    status: 'responded',
    responseContent: '안녕하세요! 시간 변경 확정되었습니다. 다음 주 월요일 3시로 배정되었습니다.',
    respondedAt: new Date(Date.now() - 1800000).toISOString(),
    outcome: 'positive',
  },
];

const generateMockSentimentData = () => ({
  overall: 0.68,
  change24h: -0.05,
  channels: [
    { name: 'X', score: 0.45, volume: 234, trend: 'down' },
    { name: 'Instagram', score: 0.82, volume: 567, trend: 'up' },
    { name: 'Naver', score: 0.71, volume: 189, trend: 'stable' },
    { name: 'Google', score: 0.58, volume: 89, trend: 'down' },
  ],
  keywords: [
    { word: '선생님', sentiment: 0.75, count: 89 },
    { word: '수업', sentiment: 0.62, count: 156 },
    { word: '가격', sentiment: 0.35, count: 67 },
    { word: '성적', sentiment: 0.81, count: 45 },
    { word: '환불', sentiment: 0.12, count: 23 },
  ],
});

// ============================================
// COMPONENTS
// ============================================

// 실시간 감정 대시보드
const SentimentDashboard = memo(function SentimentDashboard({ data }) {
  return (
    <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/50">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <span className="text-purple-400">📊</span>
        실시간 여론 감정 분석
      </h3>
      
      {/* Overall Score */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#374151" strokeWidth="8" />
            <circle 
              cx="50" cy="50" r="45" fill="none" 
              stroke={data.overall >= 0.6 ? '#10B981' : data.overall >= 0.4 ? '#F59E0B' : '#EF4444'}
              strokeWidth="8"
              strokeDasharray={`${data.overall * 283} 283`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{(data.overall * 100).toFixed(0)}</span>
            <span className="text-xs text-gray-500">Overall</span>
          </div>
        </div>
        
        <div className="flex-1">
          <div className={`text-sm ${data.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {data.change24h >= 0 ? '↑' : '↓'} {Math.abs(data.change24h * 100).toFixed(1)}% 24시간
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {data.channels.map(ch => (
              <div key={ch.name} className="flex items-center gap-2 text-xs">
                <span className="text-gray-400">{ch.name}</span>
                <span className={ch.trend === 'up' ? 'text-emerald-400' : ch.trend === 'down' ? 'text-red-400' : 'text-gray-500'}>
                  {ch.trend === 'up' ? '↑' : ch.trend === 'down' ? '↓' : '→'}
                </span>
                <span className="text-white">{(ch.score * 100).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Keywords */}
      <div className="border-t border-gray-700/50 pt-4">
        <h4 className="text-gray-400 text-xs mb-2">주요 키워드 감정</h4>
        <div className="flex flex-wrap gap-2">
          {data.keywords.map(kw => (
            <span 
              key={kw.word}
              className="px-2 py-1 rounded-lg text-xs flex items-center gap-1"
              style={{
                backgroundColor: kw.sentiment >= 0.6 ? 'rgba(16, 185, 129, 0.2)' : 
                                kw.sentiment >= 0.4 ? 'rgba(245, 158, 11, 0.2)' : 
                                'rgba(239, 68, 68, 0.2)',
                color: kw.sentiment >= 0.6 ? '#10B981' : 
                       kw.sentiment >= 0.4 ? '#F59E0B' : '#EF4444',
              }}
            >
              {kw.word}
              <span className="opacity-60">({kw.count})</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});

// 위기 카드
const CrisisCard = memo(function CrisisCard({ crisis, onAction, isExpanded, onToggle }) {
  const typeConfig = CRISIS_TYPES[crisis.type] || {};
  const severityConfig = SEVERITY_CONFIG[crisis.severity] || SEVERITY_CONFIG.medium;
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [customResponse, setCustomResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const timeAgo = (date) => {
    const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    return `${Math.floor(hours / 24)}일 전`;
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setCustomResponse('AI가 생성한 맞춤 대응: 안녕하세요, 소중한 의견 감사합니다. 말씀하신 부분에 대해 깊이 공감하며, 빠른 시일 내에 개선할 것을 약속드립니다.');
    setIsGenerating(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border transition-all ${
        isExpanded ? 'bg-gray-800/80 border-gray-600' : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
      }`}
    >
      {/* Header */}
      <div 
        className="p-4 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{typeConfig.icon}</span>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityConfig.bg}`}
                      style={{ color: severityConfig.color }}>
                  {severityConfig.label}
                </span>
                <span className="text-gray-500 text-xs">{typeConfig.label}</span>
                <span className="text-gray-600 text-xs">• {crisis.source}</span>
              </div>
              <p className="text-white text-sm line-clamp-2">{crisis.originalContent}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>📍 {timeAgo(crisis.detectedAt)}</span>
                <span>👁 {crisis.reachEstimate.toLocaleString()} 도달</span>
                {crisis.sentimentScore && (
                  <span className={crisis.sentimentScore < -0.5 ? 'text-red-400' : 'text-yellow-400'}>
                    감정: {(crisis.sentimentScore * 100).toFixed(0)}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {crisis.status === 'pending' && (
              <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs animate-pulse">
                대응 필요
              </span>
            )}
            {crisis.status === 'analyzing' && (
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                분석 중
              </span>
            )}
            {crisis.status === 'responded' && (
              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                ✓ 대응 완료
              </span>
            )}
            {crisis.status === 'monitoring' && (
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                모니터링
              </span>
            )}
            <span className="text-gray-500">{isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-700/50 pt-4">
              {/* AI Analysis */}
              {crisis.aiAnalysis && (
                <div className="mb-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <h4 className="text-purple-400 text-sm font-medium mb-2">🤖 AI 분석</h4>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500">주요 이슈</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {crisis.aiAnalysis.mainIssues.map((issue, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-gray-800 text-gray-300 rounded">
                            {issue}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">긴급성 이유</span>
                      <p className="text-gray-300 mt-1">{crisis.aiAnalysis.urgencyReason}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">권장 톤</span>
                      <p className="text-cyan-400 mt-1">{crisis.aiAnalysis.recommendedTone}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Suggested Responses */}
              {crisis.suggestedResponses && crisis.suggestedResponses.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-gray-400 text-sm mb-2">💬 AI 추천 대응</h4>
                  <div className="space-y-2">
                    {crisis.suggestedResponses.map((resp) => (
                      <div 
                        key={resp.id}
                        onClick={() => setSelectedResponse(resp.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedResponse === resp.id 
                            ? 'bg-cyan-500/10 border-cyan-500/50' 
                            : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500 capitalize">{resp.tone}</span>
                          <span className="text-xs text-emerald-400">{(resp.confidence * 100).toFixed(0)}% 적합</span>
                        </div>
                        <p className="text-white text-sm">{resp.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Response */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-gray-400 text-sm">✏️ 직접 작성 / AI 생성</h4>
                  <button
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                    className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? '생성 중...' : '🤖 AI 생성'}
                  </button>
                </div>
                <textarea
                  value={customResponse}
                  onChange={(e) => setCustomResponse(e.target.value)}
                  placeholder="대응 내용을 입력하거나 AI로 생성하세요..."
                  className="w-full h-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm resize-none focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Response Channel Selection */}
              <div className="mb-4">
                <h4 className="text-gray-400 text-sm mb-2">📢 대응 채널</h4>
                <div className="flex flex-wrap gap-2">
                  {RESPONSE_CHANNELS.map(ch => (
                    <button
                      key={ch.id}
                      className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 hover:border-gray-600 hover:text-white transition-colors flex items-center gap-1"
                    >
                      <span>{ch.icon}</span>
                      <span>{ch.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onAction(crisis.id, 'respond', selectedResponse || customResponse)}
                  disabled={!selectedResponse && !customResponse}
                  className="flex-1 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg font-medium hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  📤 대응 발송
                </button>
                <button
                  onClick={() => onAction(crisis.id, 'escalate')}
                  className="px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors"
                >
                  ⬆️ 에스컬레이션
                </button>
                <button
                  onClick={() => onAction(crisis.id, 'monitor')}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  👁 모니터링
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// 통계 카드
const StatsCard = memo(function StatsCard({ icon, label, value, subValue, color = 'cyan' }) {
  return (
    <div className={`bg-gray-800/50 rounded-xl p-4 border border-gray-700/50`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-gray-400 text-sm">{label}</span>
      </div>
      <div className={`text-2xl font-bold text-${color}-400`}>{value}</div>
      {subValue && <div className="text-xs text-gray-500 mt-1">{subValue}</div>}
    </div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function CrisisResponseModule() {
  const [crises, setCrises] = useState(generateMockCrises);
  const [sentimentData, setSentimentData] = useState(generateMockSentimentData);
  const [expandedCrisis, setExpandedCrisis] = useState(null);
  const [filter, setFilter] = useState('all');
  const [isAutoMode, setIsAutoMode] = useState(false);

  // 실시간 업데이트 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      setSentimentData(prev => ({
        ...prev,
        overall: Math.max(0, Math.min(1, prev.overall + (Math.random() - 0.5) * 0.02)),
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCrisisAction = useCallback((crisisId, action, data) => {
    setCrises(prev => prev.map(c => {
      if (c.id !== crisisId) return c;
      
      switch (action) {
        case 'respond':
          return {
            ...c,
            status: 'responded',
            responseContent: data,
            respondedAt: new Date().toISOString(),
          };
        case 'escalate':
          return { ...c, severity: 'critical', status: 'pending' };
        case 'monitor':
          return { ...c, status: 'monitoring' };
        default:
          return c;
      }
    }));
    setExpandedCrisis(null);
  }, []);

  // 필터링된 위기
  const filteredCrises = crises.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'pending') return c.status === 'pending' || c.status === 'analyzing';
    if (filter === 'responded') return c.status === 'responded';
    return c.severity === filter;
  });

  // 통계
  const stats = {
    total: crises.length,
    pending: crises.filter(c => c.status === 'pending').length,
    critical: crises.filter(c => c.severity === 'critical').length,
    avgResponseTime: '23분',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">🚨</span>
            Public Opinion & Crisis Response
          </h1>
          <p className="text-gray-400 mt-1">Optimus · Opinion Shaper 흡수 모듈 · 실시간 여론 대응</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAutoMode(!isAutoMode)}
            className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${
              isAutoMode 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
          >
            {isAutoMode ? '🤖 자동 모드 ON' : '👤 수동 모드'}
          </button>
          <button className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition-colors">
            ⚙️ 설정
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard icon="📋" label="총 감지" value={stats.total} subValue="오늘" color="white" />
        <StatsCard icon="⏳" label="대응 대기" value={stats.pending} subValue="즉시 처리 필요" color="orange" />
        <StatsCard icon="🔴" label="긴급 이슈" value={stats.critical} subValue="최우선 대응" color="red" />
        <StatsCard icon="⚡" label="평균 대응시간" value={stats.avgResponseTime} subValue="목표: 30분" color="emerald" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Crisis List */}
        <div className="col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: '전체' },
              { id: 'pending', label: '대응 대기' },
              { id: 'critical', label: '긴급' },
              { id: 'responded', label: '완료' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  filter === f.id 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Crisis Cards */}
          <div className="space-y-3">
            {filteredCrises
              .sort((a, b) => SEVERITY_CONFIG[a.severity].priority - SEVERITY_CONFIG[b.severity].priority)
              .map(crisis => (
                <CrisisCard
                  key={crisis.id}
                  crisis={crisis}
                  isExpanded={expandedCrisis === crisis.id}
                  onToggle={() => setExpandedCrisis(expandedCrisis === crisis.id ? null : crisis.id)}
                  onAction={handleCrisisAction}
                />
              ))}
            
            {filteredCrises.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                필터된 결과가 없습니다
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <SentimentDashboard data={sentimentData} />
          
          {/* Quick Actions */}
          <div className="bg-gray-800/50 rounded-2xl p-5 border border-gray-700/50">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="text-emerald-400">⚡</span>
              빠른 액션
            </h3>
            <div className="space-y-2">
              <button className="w-full py-2 px-3 bg-gray-700/50 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors text-left flex items-center gap-2">
                <span>📝</span> 새 모니터링 키워드 추가
              </button>
              <button className="w-full py-2 px-3 bg-gray-700/50 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors text-left flex items-center gap-2">
                <span>📊</span> 주간 리포트 생성
              </button>
              <button className="w-full py-2 px-3 bg-gray-700/50 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors text-left flex items-center gap-2">
                <span>🔔</span> 알림 규칙 설정
              </button>
              <button className="w-full py-2 px-3 bg-gray-700/50 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors text-left flex items-center gap-2">
                <span>👥</span> FSD에 보고
              </button>
            </div>
          </div>

          {/* Auto Response Log */}
          {isAutoMode && (
            <div className="bg-emerald-500/10 rounded-2xl p-5 border border-emerald-500/20">
              <h3 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
                <span>🤖</span>
                자동 대응 로그
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-emerald-400">✓</span>
                  <span>저위험 문의 3건 자동 응답</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-emerald-400">✓</span>
                  <span>긍정 멘션 12건 자동 감사 응답</span>
                </div>
                <div className="flex items-center gap-2 text-yellow-400">
                  <span>⚠️</span>
                  <span>중위험 이슈 2건 검토 대기</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
