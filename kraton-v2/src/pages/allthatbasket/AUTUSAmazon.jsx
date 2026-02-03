import React, { useState, useEffect, useRef } from 'react';

// 고객 로그 타입 정의
const CUSTOMER_LOGS = {
  browse: {
    id: 'browse',
    name: '탐색 로그',
    icon: '👁️',
    color: '#3B82F6',
    description: '고객이 무엇을 보는가',
    examples: ['페이지 뷰', '검색어', '체류시간', '스크롤 깊이', '클릭 패턴'],
    generates: ['recommendation', 'placement', 'search'],
    metric: { name: '전환율', impact: '+12%' }
  },
  purchase: {
    id: 'purchase',
    name: '구매 로그',
    icon: '💳',
    color: '#10B981',
    description: '고객이 무엇을 사는가',
    examples: ['구매 내역', '결제 방식', '구매 주기', '장바구니', '위시리스트'],
    generates: ['inventory', 'demand', 'pricing'],
    metric: { name: '매출', impact: '+23%' }
  },
  feedback: {
    id: 'feedback',
    name: '피드백 로그',
    icon: '⭐',
    color: '#F59E0B',
    description: '고객이 어떻게 평가하는가',
    examples: ['리뷰', '평점', '불만', '추천', 'NPS'],
    generates: ['quality', 'supplier', 'product'],
    metric: { name: '만족도', impact: '+8%' }
  },
  inquiry: {
    id: 'inquiry',
    name: '문의 로그',
    icon: '💬',
    color: '#8B5CF6',
    description: '고객이 무엇을 묻는가',
    examples: ['고객센터', 'FAQ 조회', '챗봇', '이메일', '전화'],
    generates: ['service', 'faq', 'training'],
    metric: { name: '응답시간', impact: '-35%' }
  },
  usage: {
    id: 'usage',
    name: '이용 로그',
    icon: '📊',
    color: '#EC4899',
    description: '고객이 어떻게 사용하는가',
    examples: ['기능 사용', '세션 패턴', '디바이스', '시간대', '빈도'],
    generates: ['ux', 'feature', 'optimization'],
    metric: { name: 'DAU', impact: '+18%' }
  },
  churn: {
    id: 'churn',
    name: '이탈 로그',
    icon: '🚪',
    color: '#EF4444',
    description: '고객이 왜 떠나는가',
    examples: ['이탈 시점', '마지막 행동', '경쟁사 이동', '불만 사유', '휴면'],
    generates: ['retention', 'winback', 'prevention'],
    metric: { name: '이탈률', impact: '-27%' }
  }
};

// 로그에서 생성되는 프로세스
const GENERATED_PROCESSES = {
  recommendation: { name: '추천 시스템', icon: '🎯', source: 'browse', role: 'operator' },
  placement: { name: '상품 배치', icon: '📍', source: 'browse', role: 'operator' },
  search: { name: '검색 최적화', icon: '🔍', source: 'browse', role: 'operator' },
  inventory: { name: '재고 관리', icon: '📦', source: 'purchase', role: 'operator' },
  demand: { name: '수요 예측', icon: '📈', source: 'purchase', role: 'owner' },
  pricing: { name: '가격 최적화', icon: '💰', source: 'purchase', role: 'owner' },
  quality: { name: '품질 개선', icon: '✨', source: 'feedback', role: 'provider' },
  supplier: { name: '공급자 평가', icon: '🏭', source: 'feedback', role: 'owner' },
  product: { name: '상품 개발', icon: '🆕', source: 'feedback', role: 'provider' },
  service: { name: '서비스 개선', icon: '🛠️', source: 'inquiry', role: 'operator' },
  faq: { name: 'FAQ 자동생성', icon: '❓', source: 'inquiry', role: 'operator' },
  training: { name: '직원 교육', icon: '📚', source: 'inquiry', role: 'provider' },
  ux: { name: 'UX 개선', icon: '🎨', source: 'usage', role: 'provider' },
  feature: { name: '기능 우선순위', icon: '⚡', source: 'usage', role: 'owner' },
  optimization: { name: '성능 최적화', icon: '🚀', source: 'usage', role: 'operator' },
  retention: { name: '리텐션 전략', icon: '🔄', source: 'churn', role: 'owner' },
  winback: { name: '윈백 캠페인', icon: '💌', source: 'churn', role: 'operator' },
  prevention: { name: '이탈 방지', icon: '🛡️', source: 'churn', role: 'operator' }
};

// 역할 정의
const ROLES = {
  customer: { name: 'Customer', korean: '고객', icon: '👤', color: '#3B82F6' },
  provider: { name: 'Provider', korean: '제공자', icon: '📦', color: '#10B981' },
  operator: { name: 'Operator', korean: '운영자', icon: '⚙️', color: '#F59E0B' },
  owner: { name: 'Owner', korean: '의사결정자', icon: '👑', color: '#8B5CF6' }
};

// 산업별 매핑
const INDUSTRY_MAPPINGS = {
  basketball: {
    name: '농구 아카데미',
    icon: '🏀',
    customer: '학부모/학생',
    provider: '코치',
    operator: '매니저',
    owner: '원장',
    logTemplates: {
      browse: ['코치 프로필 조회', '수업 일정 검색', '시설 사진 열람', '후기 탐색'],
      purchase: ['3개월 등록', '1개월 연장', '용품 구매', '캠프 신청'],
      feedback: ['수업 평점 5점', '코치 추천', '시설 불만', '개선 요청'],
      inquiry: ['수업 문의', '환불 요청', '일정 변경', '레벨 상담'],
      usage: ['출석 체크인', '앱 로그인', '영상 시청', '일정 확인'],
      churn: ['3주 미출석', '환불 요청', '타학원 문의', '휴원 신청']
    }
  },
  ecommerce: {
    name: 'E-Commerce',
    icon: '🛒',
    customer: '구매자',
    provider: '판매자',
    operator: '물류팀',
    owner: 'CEO',
    logTemplates: {
      browse: ['상품 검색', '카테고리 탐색', '리뷰 확인', '가격 비교'],
      purchase: ['즉시 구매', '장바구니 결제', '재구매', '선물 주문'],
      feedback: ['상품 리뷰', '배송 평가', '반품 사유', '추천 공유'],
      inquiry: ['배송 조회', '교환 문의', '사이즈 문의', '재입고 알림'],
      usage: ['앱 실행', '찜하기', '알림 확인', '포인트 조회'],
      churn: ['장바구니 이탈', '결제 취소', '앱 삭제', '구독 해지']
    }
  },
  saas: {
    name: 'SaaS 플랫폼',
    icon: '💻',
    customer: '사용자',
    provider: '개발팀',
    operator: '고객성공팀',
    owner: 'PM',
    logTemplates: {
      browse: ['기능 탐색', '문서 조회', '데모 시청', '가격표 확인'],
      purchase: ['Pro 업그레이드', '팀 플랜 구독', '연간 결제', '추가 시트'],
      feedback: ['기능 요청', '버그 리포트', 'NPS 응답', '사용 후기'],
      inquiry: ['기술 지원', 'API 문의', '연동 도움', '권한 설정'],
      usage: ['대시보드 접속', 'API 호출', '리포트 생성', '팀 초대'],
      churn: ['다운그레이드', '구독 취소', '경쟁사 전환', '미접속 30일']
    }
  }
};

// 실시간 로그 생성기
const generateRandomLog = (industry) => {
  const logTypes = Object.keys(CUSTOMER_LOGS);
  const randomType = logTypes[Math.floor(Math.random() * logTypes.length)];
  const templates = INDUSTRY_MAPPINGS[industry].logTemplates[randomType];
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

  return {
    id: Date.now() + Math.random(),
    type: randomType,
    message: randomTemplate,
    timestamp: new Date(),
    processed: false
  };
};

export default function AUTUSAmazon() {
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [industry, setIndustry] = useState('basketball');
  const [animatingFlows, setAnimatingFlows] = useState([]);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [logHistory, setLogHistory] = useState([]);
  const [processActivity, setProcessActivity] = useState({});
  const [showMetrics, setShowMetrics] = useState(true);
  const logHistoryRef = useRef(null);

  // 실시간 로그 생성
  useEffect(() => {
    if (!isAutoPlay) return;

    const interval = setInterval(() => {
      const newLog = generateRandomLog(industry);

      setLogHistory(prev => {
        const updated = [newLog, ...prev].slice(0, 20);
        return updated;
      });

      // 로그 타입 선택 및 애니메이션
      setSelectedLog(newLog.type);
      const generates = CUSTOMER_LOGS[newLog.type].generates;
      setAnimatingFlows(generates);

      // 프로세스 활성화 카운트 증가
      setProcessActivity(prev => {
        const updated = { ...prev };
        generates.forEach(p => {
          updated[p] = (updated[p] || 0) + 1;
        });
        return updated;
      });

      // 1초 후 처리 완료 표시
      setTimeout(() => {
        setLogHistory(prev =>
          prev.map(log =>
            log.id === newLog.id ? { ...log, processed: true } : log
          )
        );
      }, 1000);

    }, 2000);

    return () => clearInterval(interval);
  }, [isAutoPlay, industry]);

  // 로그 선택 핸들러
  const handleLogSelect = (logKey) => {
    setSelectedLog(logKey);
    setSelectedProcess(null);
    setAnimatingFlows(CUSTOMER_LOGS[logKey].generates);
  };

  // 프로세스 선택 핸들러
  const handleProcessSelect = (processKey) => {
    setSelectedProcess(processKey);
  };

  // 역할에 해당하는 프로세스 필터
  const getProcessesByRole = (role) => {
    return Object.entries(GENERATED_PROCESSES)
      .filter(([_, process]) => process.role === role)
      .map(([key, process]) => ({ key, ...process }));
  };

  const currentIndustry = INDUSTRY_MAPPINGS[industry];
  const totalLogs = logHistory.length;
  const processedLogs = logHistory.filter(l => l.processed).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* 헤더 */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-3xl">📊</span>
                AUTUS Amazon System
              </h1>
              {isAutoPlay && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-600/20 border border-green-500/50 rounded-full">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-sm text-green-400">Live</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* 메트릭 토글 */}
              <button
                onClick={() => setShowMetrics(!showMetrics)}
                className={`px-3 py-2 rounded-lg text-sm transition-all ${
                  showMetrics ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                📈 메트릭
              </button>

              {/* 산업 선택 */}
              <select
                value={industry}
                onChange={(e) => {
                  setIndustry(e.target.value);
                  setLogHistory([]);
                  setProcessActivity({});
                }}
                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              >
                {Object.entries(INDUSTRY_MAPPINGS).map(([key, ind]) => (
                  <option key={key} value={key}>
                    {ind.icon} {ind.name}
                  </option>
                ))}
              </select>

              {/* 자동 재생 */}
              <button
                onClick={() => setIsAutoPlay(!isAutoPlay)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  isAutoPlay
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                {isAutoPlay ? '⏸️ 정지' : '▶️ 실시간 시뮬레이션'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* 메인 시스템 (왼쪽 8칸) */}
          <div className="col-span-8 space-y-4">
            {/* LAYER 1: 고객 */}
            <div className="text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg shadow-blue-500/30">
                <span className="text-3xl">👤</span>
                <div className="text-left">
                  <div className="font-bold">Customer</div>
                  <div className="text-blue-200 text-sm">{currentIndustry.customer}</div>
                </div>
              </div>
            </div>

            {/* 연결선 */}
            <div className="flex justify-center">
              <div className="w-0.5 h-6 bg-gradient-to-b from-blue-500 to-slate-600"></div>
            </div>

            {/* LAYER 2: 고객 로그 */}
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
              <div className="text-center mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Customer Logs
                </span>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {Object.entries(CUSTOMER_LOGS).map(([key, log]) => {
                  const isActive = selectedLog === key;
                  const logCount = logHistory.filter(l => l.type === key).length;

                  return (
                    <div
                      key={key}
                      onClick={() => handleLogSelect(key)}
                      className={`relative p-3 rounded-xl cursor-pointer transition-all border-2 ${
                        isActive
                          ? 'border-white bg-slate-700 scale-105'
                          : 'border-transparent bg-slate-700/50 hover:bg-slate-700 hover:border-slate-500'
                      }`}
                      style={{
                        boxShadow: isActive ? `0 0 20px ${log.color}40` : 'none'
                      }}
                    >
                      {logCount > 0 && (
                        <div
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                          style={{ backgroundColor: log.color }}
                        >
                          {logCount}
                        </div>
                      )}
                      <div className="text-center">
                        <div className="text-2xl mb-1">{log.icon}</div>
                        <div className="font-semibold text-xs">{log.name}</div>
                        {showMetrics && (
                          <div
                            className="text-xs mt-1 font-mono"
                            style={{ color: log.metric.impact.startsWith('+') ? '#10B981' : '#EF4444' }}
                          >
                            {log.metric.impact}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 선택된 로그 상세 */}
              {selectedLog && (
                <div className="mt-3 p-3 bg-slate-900/50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{CUSTOMER_LOGS[selectedLog].icon}</span>
                      <div>
                        <div className="font-bold" style={{ color: CUSTOMER_LOGS[selectedLog].color }}>
                          {CUSTOMER_LOGS[selectedLog].name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {CUSTOMER_LOGS[selectedLog].description}
                        </div>
                      </div>
                    </div>
                    {showMetrics && (
                      <div className="text-right">
                        <div className="text-xs text-slate-400">{CUSTOMER_LOGS[selectedLog].metric.name}</div>
                        <div
                          className="font-bold"
                          style={{
                            color: CUSTOMER_LOGS[selectedLog].metric.impact.startsWith('+') ? '#10B981' : '#EF4444'
                          }}
                        >
                          {CUSTOMER_LOGS[selectedLog].metric.impact}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 연결선 with 흐름 */}
            <div className="flex justify-center relative">
              <div className="w-0.5 h-6 bg-gradient-to-b from-slate-600 to-amber-500"></div>
              {animatingFlows.length > 0 && (
                <div className="absolute top-1/2 -translate-y-1/2 flex gap-1">
                  {animatingFlows.map((flow, i) => (
                    <span
                      key={flow}
                      className="text-sm animate-bounce"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      {GENERATED_PROCESSES[flow]?.icon}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* LAYER 3: 생성되는 프로세스 */}
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
              <div className="text-center mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Generated Processes
                </span>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {Object.entries(GENERATED_PROCESSES).map(([key, process]) => {
                  const isAnimating = animatingFlows.includes(key);
                  const isSelected = selectedProcess === key;
                  const activity = processActivity[key] || 0;

                  return (
                    <div
                      key={key}
                      onClick={() => handleProcessSelect(key)}
                      className={`relative p-2 rounded-lg cursor-pointer transition-all border ${
                        isSelected
                          ? 'border-white bg-slate-600 scale-105'
                          : isAnimating
                          ? 'border-green-500 bg-green-900/30'
                          : 'border-transparent bg-slate-700/30 hover:bg-slate-700'
                      }`}
                    >
                      {activity > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-[10px] flex items-center justify-center font-bold">
                          {activity}
                        </div>
                      )}
                      <div className="text-center">
                        <div className={`text-xl ${isAnimating ? 'animate-pulse' : ''}`}>
                          {process.icon}
                        </div>
                        <div className="text-[10px] mt-1 leading-tight">{process.name}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 연결선 */}
            <div className="flex justify-center">
              <div className="w-0.5 h-6 bg-gradient-to-b from-amber-500 to-purple-500"></div>
            </div>

            {/* LAYER 4: 역할 */}
            <div className="grid grid-cols-3 gap-4">
              {['provider', 'operator', 'owner'].map((roleKey) => {
                const role = ROLES[roleKey];
                const processes = getProcessesByRole(roleKey);
                const activeCount = processes.filter(p => animatingFlows.includes(p.key)).length;

                return (
                  <div
                    key={roleKey}
                    className={`p-4 rounded-xl border transition-all ${
                      activeCount > 0
                        ? 'border-green-500/50 bg-green-900/20'
                        : 'border-slate-600 bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${role.color}30` }}
                      >
                        {role.icon}
                      </span>
                      <div>
                        <div className="font-bold text-sm">{role.name}</div>
                        <div className="text-xs" style={{ color: role.color }}>
                          {currentIndustry[roleKey]}
                        </div>
                      </div>
                      {activeCount > 0 && (
                        <span className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {processes.slice(0, 4).map((process) => {
                        const isActive = animatingFlows.includes(process.key);
                        const activity = processActivity[process.key] || 0;

                        return (
                          <div
                            key={process.key}
                            className={`flex items-center gap-2 p-1.5 rounded text-xs ${
                              isActive ? 'bg-green-900/50 text-green-300' : 'bg-slate-900/50'
                            }`}
                          >
                            <span>{process.icon}</span>
                            <span className="flex-1 truncate">{process.name}</span>
                            {activity > 0 && (
                              <span className="text-amber-400 font-mono">{activity}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 실시간 로그 히스토리 (오른쪽 4칸) */}
          <div className="col-span-4">
            <div className="sticky top-24">
              {/* 로그 히스토리 */}
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
                <div className="p-3 border-b border-slate-700 flex items-center justify-between">
                  <span className="font-semibold text-sm flex items-center gap-2">
                    📜 실시간 로그
                    {isAutoPlay && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
                  </span>
                  <span className="text-xs text-slate-400">
                    {processedLogs}/{totalLogs} 처리됨
                  </span>
                </div>

                <div
                  ref={logHistoryRef}
                  className="h-[400px] overflow-y-auto p-2 space-y-2"
                >
                  {logHistory.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                      <div className="text-center">
                        <div className="text-4xl mb-2">▶️</div>
                        <div>"실시간 시뮬레이션" 버튼을 눌러</div>
                        <div>로그 생성을 시작하세요</div>
                      </div>
                    </div>
                  ) : (
                    logHistory.map((log, index) => {
                      const logType = CUSTOMER_LOGS[log.type];
                      return (
                        <div
                          key={log.id}
                          className={`p-2 rounded-lg border transition-all ${
                            log.processed
                              ? 'bg-slate-900/30 border-slate-700/50 opacity-60'
                              : 'bg-slate-700/50 border-slate-600 animate-pulse'
                          }`}
                          style={{
                            borderLeftWidth: '3px',
                            borderLeftColor: logType.color
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-lg">{logType.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">{log.message}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{log.timestamp.toLocaleTimeString()}</span>
                                {log.processed ? (
                                  <span className="text-green-400">✓ 처리됨</span>
                                ) : (
                                  <span className="text-amber-400">처리중...</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 통계 요약 */}
              {totalLogs > 0 && (
                <div className="mt-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="text-xs font-semibold text-slate-400 mb-3 uppercase">로그 분포</div>
                  <div className="space-y-2">
                    {Object.entries(CUSTOMER_LOGS).map(([key, log]) => {
                      const count = logHistory.filter(l => l.type === key).length;
                      const percentage = totalLogs > 0 ? (count / totalLogs) * 100 : 0;

                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-sm">{log.icon}</span>
                          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: log.color
                              }}
                            ></div>
                          </div>
                          <span className="text-xs text-slate-400 w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 프로세스 활성화 랭킹 */}
              {Object.keys(processActivity).length > 0 && (
                <div className="mt-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="text-xs font-semibold text-slate-400 mb-3 uppercase">Top 프로세스</div>
                  <div className="space-y-1">
                    {Object.entries(processActivity)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([key, count], index) => {
                        const process = GENERATED_PROCESSES[key];
                        return (
                          <div key={key} className="flex items-center gap-2 text-sm">
                            <span className="w-4 text-slate-500">{index + 1}</span>
                            <span>{process.icon}</span>
                            <span className="flex-1 truncate">{process.name}</span>
                            <span className="text-amber-400 font-mono">{count}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 핵심 원칙 */}
        <div className="mt-8 p-6 bg-gradient-to-r from-amber-900/20 to-orange-900/20 rounded-2xl border border-amber-700/30">
          <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
            <span>💡</span> Amazon System 핵심 원칙
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: '📝', title: 'Log Everything', desc: '모든 고객 행동을 기록' },
              { icon: '🔄', title: 'Process Generation', desc: '로그에서 프로세스 자동 생성' },
              { icon: '🎯', title: 'Role Assignment', desc: '프로세스를 역할에 배분' },
              { icon: '📊', title: 'Feedback Loop', desc: '결과가 다시 로그로 순환' }
            ].map((item, i) => (
              <div key={i} className="p-3 bg-slate-900/50 rounded-xl">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="font-semibold text-sm">{item.title}</div>
                <div className="text-xs text-slate-400">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 데이터 흐름 */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full text-xs">
            <span>👤 Customer</span>
            <span className="text-blue-400">→</span>
            <span>📊 Logs</span>
            <span className="text-amber-400">→</span>
            <span>⚡ Processes</span>
            <span className="text-purple-400">→</span>
            <span>👥 Roles</span>
            <span className="text-green-400">→</span>
            <span>📈 Results</span>
            <span className="text-slate-400">→</span>
            <span className="text-blue-400">🔄 Back</span>
          </div>
        </div>
      </div>
    </div>
  );
}
