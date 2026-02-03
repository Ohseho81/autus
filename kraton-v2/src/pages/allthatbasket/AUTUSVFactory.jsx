import React, { useState, useMemo, useEffect } from 'react';
import { VFactory, PHYSICS } from '../../core/VFactoryEngine';
import { AUTUSRuntime } from '../../core/AUTUSRuntime';
import AUTUSNav from '../../components/AUTUSNav';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS V-Factory Dashboard
 *
 * Owner의 V 목표 → Producer App 구조 → 역할별 V 기여 시각화
 *
 * 핵심 질문:
 * 1. Owner: "내 목표 V를 달성하려면?"
 * 2. App: "어떤 구조가 필요한가?"
 * 3. Role: "각 역할이 얼마나 기여하는가?"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export default function AUTUSVFactory() {
  const [isRuntimeConnected, setIsRuntimeConnected] = useState(false);

  // 런타임 연결 시도
  useEffect(() => {
    const connectRuntime = async () => {
      if (!AUTUSRuntime.isRunning) {
        await AUTUSRuntime.init({
          appName: '올댓바스켓',
          industry: 'education',
          vTarget: { monthly: 10000000, margin: 0.3 },
        });
      }
      setIsRuntimeConnected(AUTUSRuntime.isRunning);
    };
    connectRuntime();
  }, []);

  // Factory 인스턴스 (런타임 연결 시 런타임의 factory 사용)
  const [factory] = useState(() => {
    // 런타임이 이미 초기화되어 있으면 그것을 사용
    if (AUTUSRuntime.vFactory) {
      return AUTUSRuntime.vFactory;
    }

    // 아니면 새로 생성 (시뮬레이션 모드)
    const f = new VFactory({
      name: '올댓바스켓',
      industry: '교육',
      vTarget: { monthly: 10000000, margin: 0.3 },
    });

    // 멤버 추가
    f.addMember({ id: 'M1', name: '운영팀장', roleId: 'manager' });
    f.addMember({ id: 'M2', name: '코치A', roleId: 'producer' });
    f.addMember({ id: 'M3', name: '코치B', roleId: 'producer' });
    f.addMember({ id: 'M4', name: '코치C', roleId: 'producer' });

    // 시뮬레이션 데이터 추가
    for (let i = 0; i < 50; i++) {
      f.trackVContribution({
        id: `E_${i}`,
        type: ['수업', '상담', '출석'][Math.floor(Math.random() * 3)],
        roleId: ['manager', 'producer', 'producer', 'producer', 'system'][Math.floor(Math.random() * 5)],
        memberId: ['M1', 'M2', 'M3', 'M4'][Math.floor(Math.random() * 4)],
        action: 'complete',
        inputValue: 10000 + Math.random() * 30000,
        isPainResolution: Math.random() > 0.7,
      });
    }

    return f;
  });

  const [activeView, setActiveView] = useState('overview'); // overview, backwards, bottlenecks, ontology

  // 데이터 계산
  const dashboard = useMemo(() => factory.getDashboardData(), [factory]);
  const backwards = useMemo(() => factory.workBackwards(), [factory]);
  const theoretical = useMemo(() => factory.calculateTheoreticalMax(), [factory]);
  const suggestions = useMemo(() => factory.getOptimizationSuggestions(), [factory]);
  const ontology = useMemo(() => factory.getVOntology(), [factory]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0F',
      color: '#F8FAFC',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Global Nav */}
      <AUTUSNav />

      {/* Header */}
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid #1E1E2E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #F97316, #EF4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>
            🏭
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>
              V-Factory
              {isRuntimeConnected && (
                <span style={{
                  marginLeft: 8,
                  padding: '2px 6px',
                  background: '#10B98120',
                  color: '#10B981',
                  fontSize: 10,
                  borderRadius: 4,
                }}>
                  Runtime 연결됨
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, opacity: 0.5 }}>
              Amazon × Tesla × Palantir Engine
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { id: 'overview', label: '개요', icon: '📊' },
            { id: 'backwards', label: 'Working Backwards', icon: '🔙' },
            { id: 'bottlenecks', label: '병목 분석', icon: '🔍' },
            { id: 'ontology', label: 'V Ontology', icon: '🕸️' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              style={{
                padding: '8px 14px', borderRadius: 8,
                background: activeView === tab.id ? '#F9731630' : 'transparent',
                border: activeView === tab.id ? '1px solid #F97316' : '1px solid transparent',
                color: activeView === tab.id ? '#F97316' : '#6B7280',
                fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main style={{ padding: 24 }}>
        {activeView === 'overview' && (
          <OverviewView
            factory={factory}
            dashboard={dashboard}
            theoretical={theoretical}
          />
        )}

        {activeView === 'backwards' && (
          <BackwardsView backwards={backwards} factory={factory} />
        )}

        {activeView === 'bottlenecks' && (
          <BottlenecksView
            bottlenecks={dashboard.bottlenecks}
            suggestions={suggestions}
          />
        )}

        {activeView === 'ontology' && (
          <OntologyView ontology={ontology} />
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewView({ factory, dashboard, theoretical }) {
  const targetProgress = (dashboard.current.projected.monthly / dashboard.target.monthly) * 100;

  return (
    <div>
      {/* V 목표 vs 현재 */}
      <div style={{
        padding: 24, borderRadius: 16, marginBottom: 24,
        background: 'linear-gradient(135deg, #F9731620, #EF444410)',
        border: '1px solid #F9731640',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>👔 Owner V 목표</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>
              ₩{(dashboard.target.monthly / 1000000).toFixed(1)}M<span style={{ fontSize: 14, opacity: 0.5 }}>/월</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>📈 예상 달성</div>
            <div style={{
              fontSize: 32, fontWeight: 700,
              color: targetProgress >= 100 ? '#10B981' : targetProgress >= 80 ? '#F59E0B' : '#EF4444',
            }}>
              ₩{(dashboard.current.projected.monthly / 1000000).toFixed(1)}M
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            height: 8, borderRadius: 4, background: '#1A1A2E',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${Math.min(100, targetProgress)}%`,
              background: targetProgress >= 100 ? '#10B981' : targetProgress >= 80 ? '#F59E0B' : '#EF4444',
              transition: 'width 0.5s',
            }} />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 10, color: '#6B7280', marginTop: 4,
          }}>
            <span>0%</span>
            <span style={{
              color: targetProgress >= 100 ? '#10B981' : targetProgress >= 80 ? '#F59E0B' : '#EF4444',
              fontWeight: 600,
            }}>
              {targetProgress.toFixed(0)}% 달성 예상
            </span>
            <span>100%</span>
          </div>
        </div>

        {/* 효율성 지표 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <MetricCard
            label="시간당 V"
            value={`₩${(dashboard.current.hourly / 1000).toFixed(0)}k`}
            subValue={`목표: ₩${(dashboard.target.monthly / 22 / 8 / 1000).toFixed(0)}k`}
            color="#3B82F6"
          />
          <MetricCard
            label="현재 효율"
            value={dashboard.efficiency.current}
            subValue="이론적 최대 대비"
            color="#8B5CF6"
          />
          <MetricCard
            label="시너지"
            value={theoretical.synergy}
            subValue="역할 간 협업"
            color="#10B981"
          />
          <MetricCard
            label="병목 수"
            value={dashboard.bottlenecks.filter(b => b.severity === 'CRITICAL').length}
            subValue="Critical 병목"
            color={dashboard.bottlenecks.some(b => b.severity === 'CRITICAL') ? '#EF4444' : '#10B981'}
          />
        </div>
      </div>

      {/* 역할별 V 기여 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <div style={{
          padding: 20, borderRadius: 12,
          background: '#1A1A2E', border: '1px solid #2E2E3E',
        }}>
          <h3 style={{ fontSize: 14, opacity: 0.5, marginBottom: 16 }}>👥 역할별 V 기여</h3>

          {Object.entries(dashboard.byRole).map(([roleId, data]) => {
            const role = factory.roles.get(roleId);
            const share = data.total / Math.max(1, Object.values(dashboard.byRole).reduce((s, d) => s + d.total, 0));

            return (
              <div key={roleId} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>{role?.name || roleId}</span>
                  <span>₩{(data.total / 1000).toFixed(0)}k ({(share * 100).toFixed(0)}%)</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: '#0D0D12' }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    width: `${share * 100}%`,
                    background: roleId === 'producer' ? '#10B981' : roleId === 'manager' ? '#3B82F6' : '#6B7280',
                  }} />
                </div>
                <div style={{ fontSize: 10, color: '#6B7280', marginTop: 4 }}>
                  이벤트 {data.count}건 · 평균 ₩{(data.avg / 1000).toFixed(0)}k/건
                </div>
              </div>
            );
          })}
        </div>

        {/* 24시간 V 추이 */}
        <div style={{
          padding: 20, borderRadius: 12,
          background: '#1A1A2E', border: '1px solid #2E2E3E',
        }}>
          <h3 style={{ fontSize: 14, opacity: 0.5, marginBottom: 16 }}>📈 24시간 V 추이</h3>

          <div style={{ height: 150, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
            {dashboard.timeline.map((data, i) => {
              const maxV = Math.max(...dashboard.timeline.map(d => d.v), 1);
              const height = (data.v / maxV) * 100;

              return (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div
                    style={{
                      height: `${height}%`,
                      minHeight: 2,
                      background: i === new Date().getHours() ? '#F97316' : '#3B82F6',
                      borderRadius: '2px 2px 0 0',
                      opacity: data.v > 0 ? 1 : 0.3,
                    }}
                  />
                  {i % 4 === 0 && (
                    <div style={{ fontSize: 8, color: '#6B7280', marginTop: 4 }}>
                      {data.hour}시
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKING BACKWARDS VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function BackwardsView({ backwards, factory }) {
  return (
    <div>
      <div style={{
        padding: 20, borderRadius: 12, marginBottom: 24,
        background: '#3B82F610', border: '1px solid #3B82F630',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 24 }}>🔙</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Amazon Working Backwards</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>V 목표에서 필요한 활동량을 역산합니다</div>
          </div>
        </div>
      </div>

      {/* V 분해 */}
      <div style={{
        padding: 24, borderRadius: 12, marginBottom: 24,
        background: '#1A1A2E', border: '1px solid #2E2E3E',
      }}>
        <h3 style={{ fontSize: 14, opacity: 0.5, marginBottom: 20 }}>📊 V 목표 분해</h3>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', marginBottom: 24 }}>
          <VBox label="월 목표" value={`₩${(backwards.target.monthly / 1000000).toFixed(1)}M`} color="#F97316" />
          <Arrow />
          <VBox label="일 목표" value={`₩${(backwards.target.daily / 1000).toFixed(0)}k`} color="#F59E0B" />
          <Arrow />
          <VBox label="시간 목표" value={`₩${(backwards.target.hourly / 1000).toFixed(0)}k`} color="#10B981" />
        </div>

        {/* 역할별 필요량 */}
        <h4 style={{ fontSize: 12, opacity: 0.5, marginBottom: 12 }}>역할별 필요 활동량</h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {Object.entries(backwards.roleAllocation).map(([roleId, data]) => {
            const role = factory.roles.get(roleId);
            const isBottleneck = data.bottleneck;

            return (
              <div
                key={roleId}
                style={{
                  padding: 16, borderRadius: 10,
                  background: isBottleneck ? '#EF444420' : '#0D0D12',
                  border: `1px solid ${isBottleneck ? '#EF4444' : '#2E2E3E'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>
                    {roleId === 'producer' ? '🔧' : roleId === 'manager' ? '💼' : '⚙️'}
                  </span>
                  <span style={{ fontWeight: 600 }}>{role?.name || roleId}</span>
                  {isBottleneck && (
                    <span style={{
                      padding: '2px 6px', borderRadius: 4,
                      background: '#EF4444', color: 'white', fontSize: 9, fontWeight: 600,
                    }}>
                      병목
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 11, color: '#94A3B8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>V 분담률</span>
                    <span style={{ color: '#F8FAFC' }}>{data.share}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>시간당 V 목표</span>
                    <span style={{ color: '#F8FAFC' }}>₩{(data.hourlyVTarget / 1000).toFixed(0)}k</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>필요 이벤트</span>
                    <span style={{ color: '#F8FAFC' }}>{data.requiredEventsPerHour}/시간</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>현재 용량</span>
                    <span style={{ color: '#F8FAFC' }}>{data.currentCapacity}/시간</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>필요 가동률</span>
                    <span style={{
                      color: parseFloat(data.utilizationRequired) > 100 ? '#EF4444' :
                        parseFloat(data.utilizationRequired) > 85 ? '#F59E0B' : '#10B981',
                      fontWeight: 600,
                    }}>
                      {data.utilizationRequired}
                    </span>
                  </div>
                </div>

                {isBottleneck && (
                  <div style={{
                    marginTop: 12, padding: 8, borderRadius: 6,
                    background: '#EF444410', fontSize: 10, color: '#EF4444',
                  }}>
                    ⚠️ {data.gap}명 추가 필요
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 병목 요약 */}
      {backwards.bottlenecks.length > 0 && (
        <div style={{
          padding: 16, borderRadius: 12,
          background: '#EF444420', border: '1px solid #EF4444',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>⚠️ V 목표 달성 불가</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#FCA5A5' }}>
            {backwards.bottlenecks.map((bn, i) => (
              <li key={i}>
                {bn.role} 역할: {bn.additionalMembersNeeded}명 추가 필요
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTLENECKS VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function BottlenecksView({ bottlenecks, suggestions }) {
  return (
    <div>
      <div style={{
        padding: 20, borderRadius: 12, marginBottom: 24,
        background: '#EF444410', border: '1px solid #EF444430',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 24 }}>🔍</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Tesla First Principles</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>물리적 한계까지 병목을 식별하고 제거합니다</div>
          </div>
        </div>
      </div>

      {/* 물리 법칙 */}
      <div style={{
        padding: 16, borderRadius: 12, marginBottom: 24,
        background: '#1A1A2E', border: '1px solid #2E2E3E',
      }}>
        <h4 style={{ fontSize: 12, opacity: 0.5, marginBottom: 12 }}>⚡ 시스템 물리 법칙</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 11 }}>
          <div style={{ padding: 12, background: '#0D0D12', borderRadius: 8 }}>
            <div style={{ color: '#6B7280' }}>인당 최대 처리량</div>
            <div style={{ color: '#F8FAFC', fontWeight: 600 }}>
              {PHYSICS.MAX_EVENTS_PER_HOUR_PER_PERSON}/시간
            </div>
          </div>
          <div style={{ padding: 12, background: '#0D0D12', borderRadius: 8 }}>
            <div style={{ color: '#6B7280' }}>최대 자동화율</div>
            <div style={{ color: '#F8FAFC', fontWeight: 600 }}>
              {PHYSICS.MAX_AUTOMATION_RATE * 100}%
            </div>
          </div>
          <div style={{ padding: 12, background: '#0D0D12', borderRadius: 8 }}>
            <div style={{ color: '#6B7280' }}>문맥전환 비용</div>
            <div style={{ color: '#F8FAFC', fontWeight: 600 }}>
              -{PHYSICS.CONTEXT_SWITCH_COST * 100}%
            </div>
          </div>
        </div>
      </div>

      {/* 병목 목록 */}
      <div style={{
        padding: 20, borderRadius: 12, marginBottom: 24,
        background: '#1A1A2E', border: '1px solid #2E2E3E',
      }}>
        <h3 style={{ fontSize: 14, opacity: 0.5, marginBottom: 16 }}>🚨 식별된 병목</h3>

        {bottlenecks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#10B981' }}>
            ✅ 현재 Critical 병목이 없습니다
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {bottlenecks.map((bn, i) => (
              <div
                key={i}
                style={{
                  padding: 16, borderRadius: 10,
                  background: bn.severity === 'CRITICAL' ? '#EF444420' :
                    bn.severity === 'WARNING' ? '#F59E0B20' : '#3B82F620',
                  border: `1px solid ${bn.severity === 'CRITICAL' ? '#EF4444' :
                    bn.severity === 'WARNING' ? '#F59E0B' : '#3B82F6'}40`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                    background: bn.severity === 'CRITICAL' ? '#EF4444' :
                      bn.severity === 'WARNING' ? '#F59E0B' : '#3B82F6',
                    color: 'white',
                  }}>
                    {bn.severity}
                  </span>
                  <span style={{ fontWeight: 600 }}>{bn.type}</span>
                  {bn.roleId && <span style={{ color: '#6B7280' }}>({bn.roleId})</span>}
                </div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>
                  {bn.suggestion}
                </div>
                {bn.utilization && (
                  <div style={{ fontSize: 11, color: '#EF4444' }}>
                    현재 가동률: {bn.utilization}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 최적화 제안 */}
      <div style={{
        padding: 20, borderRadius: 12,
        background: '#10B98110', border: '1px solid #10B98130',
      }}>
        <h3 style={{ fontSize: 14, marginBottom: 16, color: '#10B981' }}>💡 최적화 제안</h3>

        {suggestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#6B7280' }}>
            현재 제안 사항이 없습니다
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {suggestions.map((sug, i) => (
              <div
                key={i}
                style={{
                  padding: 12, borderRadius: 8,
                  background: '#0D0D12',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div>
                  <span style={{
                    padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600,
                    background: sug.priority === 'HIGH' ? '#EF4444' : '#F59E0B',
                    color: 'white', marginRight: 8,
                  }}>
                    {sug.priority}
                  </span>
                  <span style={{ fontSize: 12 }}>{sug.description}</span>
                </div>
                <span style={{ fontSize: 11, color: '#10B981' }}>{sug.expectedImpact}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ONTOLOGY VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function OntologyView({ ontology }) {
  return (
    <div>
      <div style={{
        padding: 20, borderRadius: 12, marginBottom: 24,
        background: '#8B5CF610', border: '1px solid #8B5CF630',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 24 }}>🕸️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Palantir Ontology</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>V 기여도를 추적하여 모든 데이터를 연결합니다</div>
          </div>
        </div>
      </div>

      {/* V Flow Visualization */}
      <div style={{
        padding: 40, borderRadius: 12,
        background: '#1A1A2E', border: '1px solid #2E2E3E',
        minHeight: 400,
      }}>
        <svg width="100%" height="350" viewBox="0 0 800 350">
          {/* Owner */}
          <g transform="translate(400, 30)">
            <rect x="-60" y="-20" width="120" height="40" rx="8" fill="#F9731630" stroke="#F97316" strokeWidth="2" />
            <text x="0" y="5" textAnchor="middle" fill="#F97316" fontSize="14" fontWeight="600">
              👔 Owner
            </text>
          </g>

          {/* Arrow to App */}
          <line x1="400" y1="50" x2="400" y2="90" stroke="#F97316" strokeWidth="2" markerEnd="url(#arrow)" />
          <text x="420" y="75" fill="#6B7280" fontSize="10">V Target</text>

          {/* App */}
          <g transform="translate(400, 120)">
            <rect x="-80" y="-25" width="160" height="50" rx="10" fill="#3B82F620" stroke="#3B82F6" strokeWidth="2" />
            <text x="0" y="5" textAnchor="middle" fill="#3B82F6" fontSize="14" fontWeight="600">
              🏭 Producer App
            </text>
          </g>

          {/* Arrows to Roles */}
          <line x1="340" y1="145" x2="200" y2="200" stroke="#3B82F6" strokeWidth="2" />
          <line x1="400" y1="145" x2="400" y2="200" stroke="#10B981" strokeWidth="2" />
          <line x1="460" y1="145" x2="600" y2="200" stroke="#6B7280" strokeWidth="2" />

          {/* Manager */}
          <g transform="translate(200, 230)">
            <rect x="-50" y="-25" width="100" height="50" rx="8" fill="#3B82F620" stroke="#3B82F6" strokeWidth="2" />
            <text x="0" y="0" textAnchor="middle" fill="#3B82F6" fontSize="12" fontWeight="600">
              💼 관리자
            </text>
            <text x="0" y="15" textAnchor="middle" fill="#6B7280" fontSize="10">
              V: 30%
            </text>
          </g>

          {/* Producer */}
          <g transform="translate(400, 230)">
            <rect x="-50" y="-25" width="100" height="50" rx="8" fill="#10B98120" stroke="#10B981" strokeWidth="2" />
            <text x="0" y="0" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="600">
              🔧 생산자
            </text>
            <text x="0" y="15" textAnchor="middle" fill="#6B7280" fontSize="10">
              V: 50%
            </text>
          </g>

          {/* System */}
          <g transform="translate(600, 230)">
            <rect x="-50" y="-25" width="100" height="50" rx="8" fill="#6B728020" stroke="#6B7280" strokeWidth="2" />
            <text x="0" y="0" textAnchor="middle" fill="#6B7280" fontSize="12" fontWeight="600">
              ⚙️ 시스템
            </text>
            <text x="0" y="15" textAnchor="middle" fill="#6B7280" fontSize="10">
              V: 20%
            </text>
          </g>

          {/* Members */}
          <line x1="400" y1="255" x2="320" y2="300" stroke="#10B981" strokeWidth="1" opacity="0.5" />
          <line x1="400" y1="255" x2="400" y2="300" stroke="#10B981" strokeWidth="1" opacity="0.5" />
          <line x1="400" y1="255" x2="480" y2="300" stroke="#10B981" strokeWidth="1" opacity="0.5" />

          <circle cx="320" cy="315" r="15" fill="#10B98120" stroke="#10B981" />
          <text x="320" y="320" textAnchor="middle" fill="#10B981" fontSize="10">M2</text>

          <circle cx="400" cy="315" r="15" fill="#10B98120" stroke="#10B981" />
          <text x="400" y="320" textAnchor="middle" fill="#10B981" fontSize="10">M3</text>

          <circle cx="480" cy="315" r="15" fill="#10B98120" stroke="#10B981" />
          <text x="480" y="320" textAnchor="middle" fill="#10B981" fontSize="10">M4</text>

          <line x1="200" y1="255" x2="200" y2="300" stroke="#3B82F6" strokeWidth="1" opacity="0.5" />
          <circle cx="200" cy="315" r="15" fill="#3B82F620" stroke="#3B82F6" />
          <text x="200" y="320" textAnchor="middle" fill="#3B82F6" fontSize="10">M1</text>

          {/* Arrow marker */}
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#F97316" />
            </marker>
          </defs>
        </svg>
      </div>

      {/* Node Details */}
      <div style={{
        marginTop: 24,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
      }}>
        {ontology.nodes.filter(n => n.type !== 'OWNER' && n.type !== 'APP').map(node => (
          <div
            key={node.id}
            style={{
              padding: 12, borderRadius: 8,
              background: '#0D0D12', border: '1px solid #2E2E3E',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{node.label}</div>
            <div style={{ fontSize: 10, color: '#6B7280' }}>{node.type}</div>
            {node.vActual !== undefined && (
              <div style={{ fontSize: 14, fontWeight: 700, color: '#10B981', marginTop: 8 }}>
                ₩{(node.vActual / 1000).toFixed(0)}k
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function MetricCard({ label, value, subValue, color }) {
  return (
    <div style={{
      padding: 12, borderRadius: 8,
      background: color + '10', border: `1px solid ${color}30`,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 9, color: '#6B7280', marginTop: 2 }}>{subValue}</div>
    </div>
  );
}

function VBox({ label, value, color }) {
  return (
    <div style={{
      padding: 16, borderRadius: 10,
      background: color + '20', border: `2px solid ${color}`,
      textAlign: 'center', minWidth: 120,
    }}>
      <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function Arrow() {
  return (
    <div style={{ fontSize: 24, color: '#6B7280' }}>→</div>
  );
}
