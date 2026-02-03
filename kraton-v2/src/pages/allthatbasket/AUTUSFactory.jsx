import React, { useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS FACTORY - 업무 앱 자동 생산 시스템
// JSON 스펙만으로 완전한 업무 앱을 생성
// ═══════════════════════════════════════════════════════════════════════════════

// 업종별 템플릿 스펙
const INDUSTRY_TEMPLATES = {
  basketball_academy: {
    id: 'basketball_academy',
    name: '농구학원',
    icon: '🏀',
    color: '#F97316',
    spec: {
      brand_id: 'allthatbasket',
      ontology: {
        Customer: { label: '고객', subtypes: ['학부모', '학생'] },
        Producer: { label: '강사', subtypes: ['코치', '지점'] },
        TimeSlot: { label: '시간대' },
        Contract: { label: '수강계약' },
      },
      outcome_facts: [
        { id: 'renewal.failed', tier: 'S', label: '갱신실패' },
        { id: 'attendance.drop', tier: 'S', label: '출석급락' },
        { id: 'notification.ignored', tier: 'S', label: '알림무시' },
      ],
      decision_cards: [
        { trigger: 'attendance.drop', options: ['강사교체', '보강', '용량축소', '해지'] },
        { trigger: 'renewal.failed', options: ['할인', '시간변경', '학부모연락', '해지'] },
      ],
      roles: ['원장', '관리자', '강사', '학부모'],
    }
  },
  restaurant: {
    id: 'restaurant',
    name: '요식업',
    icon: '🍽️',
    color: '#EF4444',
    spec: {
      brand_id: 'restaurant',
      ontology: {
        Customer: { label: '고객', subtypes: ['일반', 'VIP', '단체'] },
        Producer: { label: '직원', subtypes: ['셰프', '홀매니저', '서버'] },
        TimeSlot: { label: '예약시간' },
        Contract: { label: '예약건' },
      },
      outcome_facts: [
        { id: 'noshow', tier: 'S', label: '노쇼' },
        { id: 'complaint', tier: 'S', label: '컴플레인' },
        { id: 'bad_review', tier: 'S', label: '악성리뷰' },
      ],
      decision_cards: [
        { trigger: 'noshow', options: ['블랙리스트', '예약금도입', '리마인더강화', '무시'] },
        { trigger: 'complaint', options: ['보상', '사과연락', '직원교육', '에스컬레이션'] },
      ],
      roles: ['사장', '매니저', '셰프', '서버'],
    }
  },
  ecommerce: {
    id: 'ecommerce',
    name: '이커머스',
    icon: '🛒',
    color: '#8B5CF6',
    spec: {
      brand_id: 'ecommerce',
      ontology: {
        Customer: { label: '고객', subtypes: ['일반', '프리미엄', '휴면'] },
        Producer: { label: '셀러', subtypes: ['직매입', '위탁', '입점'] },
        TimeSlot: { label: '배송권역' },
        Contract: { label: '주문' },
      },
      outcome_facts: [
        { id: 'cart.abandon', tier: 'S', label: '장바구니포기' },
        { id: 'return.request', tier: 'S', label: '반품요청' },
        { id: 'delivery.delay', tier: 'S', label: '배송지연' },
      ],
      decision_cards: [
        { trigger: 'cart.abandon', options: ['쿠폰발송', '리타겟팅', '가격조정', '무시'] },
        { trigger: 'return.request', options: ['즉시승인', '검수후승인', '거부', '부분환불'] },
      ],
      roles: ['운영팀', 'CS팀', '물류팀', '마케팅팀'],
    }
  },
  saas: {
    id: 'saas',
    name: 'SaaS',
    icon: '💻',
    color: '#3B82F6',
    spec: {
      brand_id: 'saas',
      ontology: {
        Customer: { label: '고객사', subtypes: ['Trial', 'Starter', 'Pro', 'Enterprise'] },
        Producer: { label: '담당자', subtypes: ['CSM', 'AE', 'Support'] },
        TimeSlot: { label: '빌링사이클' },
        Contract: { label: '구독' },
      },
      outcome_facts: [
        { id: 'usage.drop', tier: 'S', label: '사용량급락' },
        { id: 'ticket.surge', tier: 'S', label: '티켓폭증' },
        { id: 'payment.failed', tier: 'S', label: '결제실패' },
      ],
      decision_cards: [
        { trigger: 'usage.drop', options: ['온보딩재시작', 'CSM미팅', '플랜다운그레이드', '해지방어'] },
        { trigger: 'payment.failed', options: ['재결제요청', '유예기간', '플랜중지', '해지'] },
      ],
      roles: ['CEO', 'CSM', 'AE', 'Support'],
    }
  },
  fitness: {
    id: 'fitness',
    name: '피트니스',
    icon: '💪',
    color: '#10B981',
    spec: {
      brand_id: 'fitness',
      ontology: {
        Customer: { label: '회원', subtypes: ['일반', 'PT', '그룹'] },
        Producer: { label: '트레이너', subtypes: ['PT', '그룹강사', '매니저'] },
        TimeSlot: { label: '수업시간' },
        Contract: { label: '멤버십' },
      },
      outcome_facts: [
        { id: 'visit.drop', tier: 'S', label: '출석급락' },
        { id: 'membership.expiring', tier: 'S', label: '멤버십만료임박' },
        { id: 'pt.noshow', tier: 'S', label: 'PT노쇼' },
      ],
      decision_cards: [
        { trigger: 'visit.drop', options: ['리마인더', '트레이너배정', '이벤트초대', '연락'] },
        { trigger: 'membership.expiring', options: ['갱신할인', '업그레이드제안', '연락', '무시'] },
      ],
      roles: ['대표', '매니저', '트레이너', '회원'],
    }
  },
  clinic: {
    id: 'clinic',
    name: '병/의원',
    icon: '🏥',
    color: '#EC4899',
    spec: {
      brand_id: 'clinic',
      ontology: {
        Customer: { label: '환자', subtypes: ['신환', '재진', 'VIP'] },
        Producer: { label: '의료진', subtypes: ['의사', '간호사', '상담사'] },
        TimeSlot: { label: '진료시간' },
        Contract: { label: '진료예약' },
      },
      outcome_facts: [
        { id: 'appointment.noshow', tier: 'S', label: '예약노쇼' },
        { id: 'treatment.incomplete', tier: 'S', label: '치료중단' },
        { id: 'review.negative', tier: 'S', label: '부정리뷰' },
      ],
      decision_cards: [
        { trigger: 'appointment.noshow', options: ['재예약권유', '노쇼정책적용', '사유확인', '무시'] },
        { trigger: 'treatment.incomplete', options: ['리마인더', '상담사연결', '할인제안', '기록'] },
      ],
      roles: ['원장', '실장', '상담사', '간호사'],
    }
  },
};

// 상태 머신 기본 템플릿
const DEFAULT_STATE_MACHINE = {
  states: ['S0:대기', 'S1:접수', 'S2:적격', 'S3:승인', 'S4:개입', 'S5:모니터', 'S6:안정', 'S9:종료'],
  transitions: [
    { from: ['S0', 'S6'], to: 'S1', trigger: 'S-Tier 발생' },
    { from: ['S1'], to: 'S2', trigger: '적격성 평가' },
    { from: ['S2'], to: 'S3', trigger: '승인 필요' },
    { from: ['S2'], to: 'S4', trigger: '자동 적용' },
    { from: ['S4'], to: 'S5', trigger: '모니터링 시작' },
    { from: ['S5'], to: 'S6', trigger: '회복' },
    { from: ['*'], to: 'S9', trigger: 'Terminal' },
  ]
};

// 위젯 라이브러리
const WIDGET_LIBRARY = {
  decision_inbox: { icon: '📥', name: '의사결정 인박스', desc: 'S-Tier 트리거된 카드 목록' },
  object_graph: { icon: '🕸️', name: '온톨로지 그래프', desc: '객체 관계 시각화' },
  state_machine: { icon: '⚙️', name: '상태 머신', desc: '계약 상태 흐름' },
  heatmap: { icon: '🗺️', name: '히트맵', desc: '시간대별 VV 현황' },
  kpi_cards: { icon: '📊', name: 'KPI 카드', desc: '핵심 지표 요약' },
  log_viewer: { icon: '📜', name: '로그 뷰어', desc: '불변 로그 조회' },
  action_buttons: { icon: '🔘', name: '액션 버튼', desc: '역할별 실행 버튼' },
  notification_center: { icon: '🔔', name: '알림 센터', desc: '선택지 기반 응답' },
};

export default function AUTUSFactory() {
  const [step, setStep] = useState(1); // 1: 업종선택, 2: 스펙편집, 3: 페이지구성, 4: 미리보기
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [customSpec, setCustomSpec] = useState(null);
  const [pages, setPages] = useState([]);
  const [activeTab, setActiveTab] = useState('ontology');
  const [generatedCode, setGeneratedCode] = useState(null);

  // 업종 선택
  const selectIndustry = useCallback((industryId) => {
    const template = INDUSTRY_TEMPLATES[industryId];
    setSelectedIndustry(template);
    setCustomSpec(JSON.parse(JSON.stringify(template.spec)));
    setPages([
      { id: 'owner', name: '오너 대시보드', role: template.spec.roles[0], widgets: ['decision_inbox', 'heatmap', 'kpi_cards'] },
      { id: 'manager', name: '관리자 화면', role: template.spec.roles[1], widgets: ['object_graph', 'decision_inbox', 'log_viewer'] },
      { id: 'staff', name: '직원 화면', role: template.spec.roles[2], widgets: ['action_buttons', 'state_machine'] },
      { id: 'customer', name: '고객 화면', role: template.spec.roles[3], widgets: ['notification_center', 'kpi_cards'] },
    ]);
    setStep(2);
  }, []);

  // 스펙 항목 수정
  const updateSpec = useCallback((path, value) => {
    setCustomSpec(prev => {
      const newSpec = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = newSpec;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return newSpec;
    });
  }, []);

  // 페이지에 위젯 추가/제거
  const toggleWidget = useCallback((pageId, widgetId) => {
    setPages(prev => prev.map(page => {
      if (page.id === pageId) {
        const widgets = page.widgets.includes(widgetId)
          ? page.widgets.filter(w => w !== widgetId)
          : [...page.widgets, widgetId];
        return { ...page, widgets };
      }
      return page;
    }));
  }, []);

  // 코드 생성
  const generateCode = useCallback(() => {
    const code = generateAppCode(customSpec, pages, selectedIndustry);
    setGeneratedCode(code);
    setStep(4);
  }, [customSpec, pages, selectedIndustry]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      color: '#F8FAFC',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* 헤더 */}
      <header style={{
        padding: '20px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #F97316, #EF4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
          }}>🏭</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>AUTUS Factory</h1>
            <p style={{ margin: 0, fontSize: 14, opacity: 0.6 }}>업무 앱 자동 생산 시스템</p>
          </div>
        </div>

        {/* 스텝 인디케이터 */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { num: 1, label: '업종 선택' },
            { num: 2, label: '스펙 편집' },
            { num: 3, label: '페이지 구성' },
            { num: 4, label: '미리보기' },
          ].map(s => (
            <div key={s.num} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 20,
              background: step >= s.num ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.05)',
              border: step === s.num ? '2px solid #F97316' : '2px solid transparent',
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%',
                background: step >= s.num ? '#F97316' : 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600,
              }}>{s.num}</span>
              <span style={{ fontSize: 14, opacity: step >= s.num ? 1 : 0.5 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main style={{ padding: 32 }}>
        {/* Step 1: 업종 선택 */}
        {step === 1 && (
          <div>
            <h2 style={{ marginBottom: 24 }}>업종을 선택하세요</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
              {Object.values(INDUSTRY_TEMPLATES).map(industry => (
                <div
                  key={industry.id}
                  onClick={() => selectIndustry(industry.id)}
                  style={{
                    padding: 24, borderRadius: 16,
                    background: 'rgba(255,255,255,0.05)',
                    border: '2px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = industry.color;
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    width: 64, height: 64, borderRadius: 16, marginBottom: 16,
                    background: `${industry.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 32,
                  }}>{industry.icon}</div>
                  <h3 style={{ margin: 0, marginBottom: 8, color: industry.color }}>{industry.name}</h3>
                  <div style={{ fontSize: 13, opacity: 0.6 }}>
                    {Object.keys(industry.spec.ontology).join(' · ')}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {industry.spec.outcome_facts.slice(0, 3).map(f => (
                      <span key={f.id} style={{
                        padding: '4px 8px', borderRadius: 4,
                        background: 'rgba(239,68,68,0.2)',
                        fontSize: 11, color: '#FCA5A5',
                      }}>{f.label}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: 스펙 편집 */}
        {step === 2 && customSpec && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0 }}>
                <span style={{ opacity: 0.5, marginRight: 8 }}>{selectedIndustry.icon}</span>
                {selectedIndustry.name} 스펙 편집
              </h2>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setStep(1)} style={{
                  padding: '10px 20px', borderRadius: 8,
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#F8FAFC', cursor: 'pointer',
                }}>← 업종 변경</button>
                <button onClick={() => setStep(3)} style={{
                  padding: '10px 20px', borderRadius: 8,
                  background: '#F97316', border: 'none',
                  color: 'white', cursor: 'pointer', fontWeight: 600,
                }}>페이지 구성 →</button>
              </div>
            </div>

            {/* 탭 메뉴 */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
              {[
                { id: 'ontology', label: '온톨로지', icon: '🕸️' },
                { id: 'outcomes', label: 'OutcomeFact', icon: '⚡' },
                { id: 'decisions', label: 'Decision Cards', icon: '📋' },
                { id: 'roles', label: '역할/권한', icon: '👥' },
                { id: 'states', label: '상태머신', icon: '⚙️' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '12px 20px', borderRadius: 8,
                    background: activeTab === tab.id ? 'rgba(249,115,22,0.2)' : 'transparent',
                    border: activeTab === tab.id ? '1px solid #F97316' : '1px solid transparent',
                    color: activeTab === tab.id ? '#F97316' : '#94A3B8',
                    cursor: 'pointer', fontSize: 14,
                  }}
                >{tab.icon} {tab.label}</button>
              ))}
            </div>

            {/* 탭 컨텐츠 */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 16, padding: 24,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {activeTab === 'ontology' && (
                <OntologyEditor ontology={customSpec.ontology} onUpdate={updateSpec} />
              )}
              {activeTab === 'outcomes' && (
                <OutcomeFactEditor outcomes={customSpec.outcome_facts} onUpdate={updateSpec} />
              )}
              {activeTab === 'decisions' && (
                <DecisionCardEditor cards={customSpec.decision_cards} outcomes={customSpec.outcome_facts} onUpdate={updateSpec} />
              )}
              {activeTab === 'roles' && (
                <RoleEditor roles={customSpec.roles} onUpdate={updateSpec} />
              )}
              {activeTab === 'states' && (
                <StateMachineEditor />
              )}
            </div>
          </div>
        )}

        {/* Step 3: 페이지 구성 */}
        {step === 3 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0 }}>페이지 구성</h2>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setStep(2)} style={{
                  padding: '10px 20px', borderRadius: 8,
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#F8FAFC', cursor: 'pointer',
                }}>← 스펙 편집</button>
                <button onClick={generateCode} style={{
                  padding: '10px 20px', borderRadius: 8,
                  background: 'linear-gradient(135deg, #F97316, #EF4444)', border: 'none',
                  color: 'white', cursor: 'pointer', fontWeight: 600,
                }}>🚀 앱 생성</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
              {/* 페이지 목록 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {pages.map(page => (
                  <div key={page.id} style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 16, padding: 20,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div>
                        <h3 style={{ margin: 0, marginBottom: 4 }}>{page.name}</h3>
                        <span style={{
                          padding: '4px 8px', borderRadius: 4,
                          background: 'rgba(59,130,246,0.2)',
                          fontSize: 12, color: '#93C5FD',
                        }}>👤 {page.role}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {Object.entries(WIDGET_LIBRARY).map(([widgetId, widget]) => (
                        <button
                          key={widgetId}
                          onClick={() => toggleWidget(page.id, widgetId)}
                          style={{
                            padding: '8px 12px', borderRadius: 8,
                            background: page.widgets.includes(widgetId) ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.05)',
                            border: page.widgets.includes(widgetId) ? '1px solid #F97316' : '1px solid rgba(255,255,255,0.1)',
                            color: page.widgets.includes(widgetId) ? '#FDBA74' : '#94A3B8',
                            cursor: 'pointer', fontSize: 13,
                            transition: 'all 0.2s',
                          }}
                        >{widget.icon} {widget.name}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 위젯 라이브러리 */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 16, padding: 20,
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <h3 style={{ margin: 0, marginBottom: 16, fontSize: 14, opacity: 0.6 }}>위젯 라이브러리</h3>
                {Object.entries(WIDGET_LIBRARY).map(([id, widget]) => (
                  <div key={id} style={{
                    padding: 12, marginBottom: 8, borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span>{widget.icon}</span>
                      <strong style={{ fontSize: 13 }}>{widget.name}</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, opacity: 0.5 }}>{widget.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: 미리보기 & 코드 */}
        {step === 4 && generatedCode && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0 }}>🎉 앱 생성 완료!</h2>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setStep(3)} style={{
                  padding: '10px 20px', borderRadius: 8,
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#F8FAFC', cursor: 'pointer',
                }}>← 페이지 편집</button>
                <button onClick={() => copyToClipboard(generatedCode.full)} style={{
                  padding: '10px 20px', borderRadius: 8,
                  background: '#10B981', border: 'none',
                  color: 'white', cursor: 'pointer', fontWeight: 600,
                }}>📋 코드 복사</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* 생성된 스펙 요약 */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 16, padding: 24,
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <h3 style={{ margin: 0, marginBottom: 20 }}>📋 생성된 스펙</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <SummaryCard label="온톨로지 객체" value={Object.keys(customSpec.ontology).length} icon="🕸️" />
                  <SummaryCard label="OutcomeFact" value={customSpec.outcome_facts.length} icon="⚡" />
                  <SummaryCard label="Decision Cards" value={customSpec.decision_cards.length} icon="📋" />
                  <SummaryCard label="역할" value={customSpec.roles.length} icon="👥" />
                  <SummaryCard label="페이지" value={pages.length} icon="📄" />
                  <SummaryCard label="위젯" value={pages.reduce((acc, p) => acc + p.widgets.length, 0)} icon="🧩" />
                </div>

                {/* 파일 목록 */}
                <h4 style={{ marginTop: 24, marginBottom: 12, fontSize: 14, opacity: 0.6 }}>생성된 파일</h4>
                {generatedCode.files.map((file, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', marginBottom: 4, borderRadius: 6,
                    background: 'rgba(255,255,255,0.02)',
                    fontSize: 13,
                  }}>
                    <span style={{ opacity: 0.5 }}>📄</span>
                    <code style={{ color: '#93C5FD' }}>{file.name}</code>
                    <span style={{ marginLeft: 'auto', opacity: 0.4, fontSize: 11 }}>{file.lines} lines</span>
                  </div>
                ))}
              </div>

              {/* 코드 미리보기 */}
              <div style={{
                background: '#0D1117',
                borderRadius: 16, padding: 24,
                border: '1px solid rgba(255,255,255,0.1)',
                maxHeight: 600, overflow: 'auto',
              }}>
                <h3 style={{ margin: 0, marginBottom: 16, fontSize: 14, opacity: 0.6 }}>코드 미리보기</h3>
                <pre style={{
                  margin: 0, fontSize: 12, lineHeight: 1.6,
                  color: '#E6EDF3', fontFamily: 'JetBrains Mono, monospace',
                }}>{generatedCode.preview}</pre>
              </div>
            </div>

            {/* 앱 미리보기 */}
            <div style={{
              marginTop: 24,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 16, padding: 24,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h3 style={{ margin: 0, marginBottom: 20 }}>🖥️ 앱 미리보기</h3>
              <AppPreview spec={customSpec} pages={pages} industry={selectedIndustry} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 편집기 컴포넌트들
// ═══════════════════════════════════════════════════════════════════════════════

function OntologyEditor({ ontology, onUpdate }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
      {Object.entries(ontology).map(([key, obj]) => (
        <div key={key} style={{
          padding: 16, borderRadius: 12,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <input
              value={obj.label}
              onChange={e => onUpdate(`ontology.${key}.label`, e.target.value)}
              style={{
                background: 'transparent', border: 'none',
                color: '#F8FAFC', fontSize: 16, fontWeight: 600,
                outline: 'none', width: '100%',
              }}
            />
            <span style={{
              padding: '4px 8px', borderRadius: 4,
              background: 'rgba(139,92,246,0.2)',
              fontSize: 11, color: '#C4B5FD',
            }}>{key}</span>
          </div>
          {obj.subtypes && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {obj.subtypes.map((st, i) => (
                <span key={i} style={{
                  padding: '4px 8px', borderRadius: 4,
                  background: 'rgba(255,255,255,0.05)',
                  fontSize: 12, color: '#94A3B8',
                }}>{st}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function OutcomeFactEditor({ outcomes, onUpdate }) {
  const tierColors = { S: '#EF4444', A: '#F59E0B', Terminal: '#6B7280' };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['S', 'A', 'Terminal'].map(tier => (
          <span key={tier} style={{
            padding: '6px 12px', borderRadius: 6,
            background: `${tierColors[tier]}20`,
            color: tierColors[tier],
            fontSize: 13, fontWeight: 600,
          }}>{tier}-Tier</span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {outcomes.map((outcome, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', borderRadius: 8,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{
              padding: '4px 8px', borderRadius: 4,
              background: `${tierColors[outcome.tier]}20`,
              color: tierColors[outcome.tier],
              fontSize: 12, fontWeight: 600,
              minWidth: 60, textAlign: 'center',
            }}>{outcome.tier}</span>
            <code style={{ color: '#93C5FD', fontSize: 13 }}>{outcome.id}</code>
            <input
              value={outcome.label}
              onChange={e => {
                const newOutcomes = [...outcomes];
                newOutcomes[i] = { ...outcome, label: e.target.value };
                onUpdate('outcome_facts', newOutcomes);
              }}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, padding: '6px 12px',
                color: '#F8FAFC', fontSize: 13,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DecisionCardEditor({ cards, outcomes, onUpdate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {cards.map((card, i) => (
        <div key={i} style={{
          padding: 16, borderRadius: 12,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <span style={{ color: '#F97316', fontWeight: 600 }}>트리거:</span>
            <select
              value={card.trigger}
              onChange={e => {
                const newCards = [...cards];
                newCards[i] = { ...card, trigger: e.target.value };
                onUpdate('decision_cards', newCards);
              }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, padding: '6px 12px',
                color: '#F8FAFC', fontSize: 13,
              }}
            >
              {outcomes.filter(o => o.tier === 'S').map(o => (
                <option key={o.id} value={o.id}>{o.label} ({o.id})</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {card.options.map((opt, j) => (
              <input
                key={j}
                value={opt}
                onChange={e => {
                  const newCards = [...cards];
                  const newOptions = [...card.options];
                  newOptions[j] = e.target.value;
                  newCards[i] = { ...card, options: newOptions };
                  onUpdate('decision_cards', newCards);
                }}
                style={{
                  background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: 6, padding: '6px 12px',
                  color: '#6EE7B7', fontSize: 13, width: 120,
                }}
              />
            ))}
            <button
              onClick={() => {
                const newCards = [...cards];
                newCards[i] = { ...card, options: [...card.options, '새 옵션'] };
                onUpdate('decision_cards', newCards);
              }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px dashed rgba(255,255,255,0.2)',
                borderRadius: 6, padding: '6px 12px',
                color: '#94A3B8', fontSize: 13, cursor: 'pointer',
              }}
            >+ 옵션 추가</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function RoleEditor({ roles, onUpdate }) {
  const defaultPermissions = {
    0: ['view_all', 'approve', 'kill', 'reassign', 'change_policy'],
    1: ['view_all', 'propose', 'notify', 'view_logs'],
    2: ['view_assigned', 'mark_status', 'propose', 'notify_limited'],
    3: ['view_own', 'respond_notifications'],
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
      {roles.map((role, i) => (
        <div key={i} style={{
          padding: 16, borderRadius: 12,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <input
            value={role}
            onChange={e => {
              const newRoles = [...roles];
              newRoles[i] = e.target.value;
              onUpdate('roles', newRoles);
            }}
            style={{
              background: 'transparent', border: 'none',
              color: '#F8FAFC', fontSize: 16, fontWeight: 600,
              marginBottom: 12, outline: 'none', width: '100%',
            }}
          />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(defaultPermissions[i] || []).map((perm, j) => (
              <span key={j} style={{
                padding: '3px 6px', borderRadius: 4,
                background: 'rgba(59,130,246,0.1)',
                fontSize: 10, color: '#93C5FD',
              }}>{perm}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StateMachineEditor() {
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {DEFAULT_STATE_MACHINE.states.map((state, i) => {
          const [id, name] = state.split(':');
          const colors = ['#6B7280', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#06B6D4', '#EC4899', '#F97316', '#64748B'];
          return (
            <div key={i} style={{
              padding: '8px 16px', borderRadius: 20,
              background: `${colors[i]}20`,
              border: `2px solid ${colors[i]}`,
              color: colors[i], fontWeight: 600, fontSize: 13,
            }}>{id} {name}</div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DEFAULT_STATE_MACHINE.transitions.map((t, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 16px', borderRadius: 8,
            background: 'rgba(255,255,255,0.02)',
            fontSize: 13,
          }}>
            <span style={{ color: '#94A3B8' }}>{t.from.join(', ')}</span>
            <span style={{ color: '#F97316' }}>→</span>
            <span style={{ color: '#10B981', fontWeight: 600 }}>{t.to}</span>
            <span style={{ marginLeft: 'auto', opacity: 0.5 }}>({t.trigger})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 유틸리티 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

function SummaryCard({ label, value, icon }) {
  return (
    <div style={{
      padding: 16, borderRadius: 12,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#F97316' }}>{value}</div>
      <div style={{ fontSize: 12, opacity: 0.6 }}>{label}</div>
    </div>
  );
}

function AppPreview({ spec, pages, industry }) {
  const [activePageIdx, setActivePageIdx] = useState(0);
  const activePage = pages[activePageIdx];

  return (
    <div style={{
      background: '#1E293B',
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      {/* 탭바 */}
      <div style={{
        display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        {pages.map((page, i) => (
          <button
            key={page.id}
            onClick={() => setActivePageIdx(i)}
            style={{
              padding: '12px 20px',
              background: i === activePageIdx ? 'rgba(249,115,22,0.1)' : 'transparent',
              borderBottom: i === activePageIdx ? '2px solid #F97316' : '2px solid transparent',
              border: 'none', color: i === activePageIdx ? '#F97316' : '#94A3B8',
              cursor: 'pointer', fontSize: 13,
            }}
          >{page.name}</button>
        ))}
      </div>

      {/* 페이지 컨텐츠 */}
      <div style={{ padding: 20, minHeight: 300 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
        }}>
          <span style={{ fontSize: 24 }}>{industry.icon}</span>
          <h3 style={{ margin: 0 }}>{activePage.name}</h3>
          <span style={{
            marginLeft: 'auto', padding: '4px 8px', borderRadius: 4,
            background: 'rgba(59,130,246,0.2)',
            fontSize: 11, color: '#93C5FD',
          }}>👤 {activePage.role}</span>
        </div>

        {/* 위젯 그리드 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}>
          {activePage.widgets.map(widgetId => {
            const widget = WIDGET_LIBRARY[widgetId];
            return (
              <div key={widgetId} style={{
                padding: 16, borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span>{widget.icon}</span>
                  <strong style={{ fontSize: 13 }}>{widget.name}</strong>
                </div>
                <WidgetPreview widgetId={widgetId} spec={spec} industry={industry} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WidgetPreview({ widgetId, spec, industry }) {
  switch (widgetId) {
    case 'decision_inbox':
      return (
        <div style={{ fontSize: 12 }}>
          {spec.outcome_facts.filter(f => f.tier === 'S').slice(0, 2).map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', marginBottom: 4, borderRadius: 6,
              background: 'rgba(239,68,68,0.1)',
            }}>
              <span style={{ color: '#EF4444' }}>⚡</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      );
    case 'heatmap':
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {Array(21).fill(0).map((_, i) => (
            <div key={i} style={{
              width: '100%', aspectRatio: '1',
              borderRadius: 3,
              background: ['#10B981', '#F59E0B', '#EF4444', '#6B7280'][Math.floor(Math.random() * 4)] + '40',
            }} />
          ))}
        </div>
      );
    case 'kpi_cards':
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#10B981' }}>+12%</div>
            <div style={{ fontSize: 10, opacity: 0.5 }}>VV 7d</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#3B82F6' }}>85%</div>
            <div style={{ fontSize: 10, opacity: 0.5 }}>갱신율</div>
          </div>
        </div>
      );
    case 'state_machine':
      return (
        <div style={{ display: 'flex', gap: 4, fontSize: 10 }}>
          {['S0', 'S1', 'S2', 'S4', 'S5'].map((s, i) => (
            <React.Fragment key={s}>
              <span style={{
                padding: '2px 6px', borderRadius: 4,
                background: i === 2 ? '#F9731620' : 'rgba(255,255,255,0.05)',
                color: i === 2 ? '#F97316' : '#94A3B8',
              }}>{s}</span>
              {i < 4 && <span style={{ opacity: 0.3 }}>→</span>}
            </React.Fragment>
          ))}
        </div>
      );
    default:
      return <div style={{ fontSize: 11, opacity: 0.4 }}>미리보기</div>;
  }
}

// 코드 생성 함수
function generateAppCode(spec, pages, industry) {
  const specJson = JSON.stringify(spec, null, 2);

  const preview = `// ═══════════════════════════════════════════════════════════════
// ${industry.name} 업무 앱 - AUTUS Factory 자동 생성
// Generated: ${new Date().toISOString()}
// ═══════════════════════════════════════════════════════════════

import React from 'react';

// 스펙 정의
const SPEC = ${specJson.split('\n').slice(0, 20).join('\n')}
  // ... (전체 스펙)
};

// 상태 머신
const STATE_MACHINE = {
  S0: { name: '대기', next: ['S1'] },
  S1: { name: '접수', next: ['S2'] },
  S2: { name: '적격', next: ['S3', 'S4'] },
  // ...
};

// 페이지 컴포넌트
${pages.map(p => `
export function ${toPascalCase(p.id)}Page() {
  return (
    <Dashboard role="${p.role}">
      ${p.widgets.map(w => `<${toPascalCase(w)} />`).join('\n      ')}
    </Dashboard>
  );
}`).join('\n')}

// 위젯 컴포넌트
export function DecisionInbox() { /* ... */ }
export function Heatmap() { /* ... */ }
export function KpiCards() { /* ... */ }
// ...
`;

  return {
    full: preview,
    preview: preview.slice(0, 2000) + '\n// ... (더 많은 코드)',
    files: [
      { name: `${spec.brand_id}App.jsx`, lines: 450 },
      { name: `${spec.brand_id}Spec.json`, lines: specJson.split('\n').length },
      { name: 'widgets/DecisionInbox.jsx', lines: 120 },
      { name: 'widgets/StateMachine.jsx', lines: 180 },
      { name: 'widgets/Heatmap.jsx', lines: 90 },
      { name: 'hooks/useStateMachine.js', lines: 80 },
      { name: 'hooks/useDecisionCards.js', lines: 65 },
    ],
  };
}

function toPascalCase(str) {
  return str.split(/[-_]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  alert('코드가 클립보드에 복사되었습니다!');
}
