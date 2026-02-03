/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🌐 AUTUS UNIVERSAL - 범용 비즈니스 프레임워크
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 모든 산업에 적용 가능한 AUTUS 가치 교환 모델
 *
 * 내부 4역할 (Core):
 *   - Customer → 💰 Payment (지불)
 *   - Provider → 📦 Value (가치/서비스)
 *   - Operator → ⚙️ Process (운영)
 *   - Owner → ✅ Decision (결정)
 *
 * 외부 8요소 (External):
 *   - 정부, 금융, 공급, 채널, 물류, 파트너, 인프라, 커뮤니티
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from 'react';

// ============================================
// 산업별 매핑 데이터
// ============================================
const INDUSTRIES = {
  basketball: {
    name: '농구 아카데미',
    icon: '🏀',
    internal: {
      customer: { name: '학부모', value: '💰 수강료', desc: '자녀 교육비 지불' },
      provider: { name: '코치', value: '📹 훈련영상', desc: '기술 지도 및 피드백' },
      operator: { name: '관리자', value: '📅 스케줄', desc: '일정 및 운영 관리' },
      owner: { name: '원장님', value: '✅ 승인', desc: '최종 의사결정' },
    },
    external: {
      government: { name: '체육회', items: ['시설 허가', '안전 점검', '세금'] },
      finance: { name: '카드사/PG', items: ['결제 처리', '정산', '보험'] },
      supply: { name: '스포츠용품', items: ['농구공', '유니폼', '장비'] },
      channel: { name: 'SNS/포털', items: ['인스타그램', '네이버', '카카오'] },
      logistics: { name: '시설', items: ['체육관 임대', '셔틀버스'] },
      partner: { name: '대회/협회', items: ['리그 참가', '자격증', '제휴'] },
      infra: { name: '인프라', items: ['인터넷', '전기', 'CCTV'] },
      community: { name: '학부모회', items: ['입소문', '리뷰', '추천'] },
    }
  },
  hospital: {
    name: '병원',
    icon: '🏥',
    internal: {
      customer: { name: '환자', value: '💰 진료비', desc: '의료 서비스 비용' },
      provider: { name: '의사', value: '💊 치료', desc: '진단 및 치료' },
      operator: { name: '간호사', value: '📋 케어', desc: '환자 관리 및 스케줄' },
      owner: { name: '원장', value: '✅ 승인', desc: '병원 운영 결정' },
    },
    external: {
      government: { name: '보건복지부', items: ['의료 허가', '건강보험', '감사'] },
      finance: { name: '건강보험공단', items: ['보험 청구', '수가', '심사'] },
      supply: { name: '의료기기사', items: ['의약품', '장비', '소모품'] },
      channel: { name: '병원앱/포털', items: ['네이버예약', '굿닥', '똑닥'] },
      logistics: { name: '물류', items: ['의약품 배송', '검체 운송'] },
      partner: { name: '제약사/협회', items: ['임상시험', '학회', 'MOU'] },
      infra: { name: '시설', items: ['건물', '의료폐기물', '전력'] },
      community: { name: '환자회', items: ['후기', '커뮤니티', '소개'] },
    }
  },
  restaurant: {
    name: '레스토랑',
    icon: '🍽️',
    internal: {
      customer: { name: '손님', value: '💰 식대', desc: '음식 주문 및 결제' },
      provider: { name: '셰프', value: '🍳 음식', desc: '요리 제공' },
      operator: { name: '매니저', value: '📋 예약', desc: '예약 및 홀 관리' },
      owner: { name: '사장', value: '✅ 결정', desc: '메뉴, 가격, 운영' },
    },
    external: {
      government: { name: '위생청', items: ['영업허가', '위생점검', '세금'] },
      finance: { name: 'POS/PG', items: ['결제', '정산', '대출'] },
      supply: { name: '식자재', items: ['농산물', '육류', '주류'] },
      channel: { name: '배달앱', items: ['배민', '쿠팡이츠', '네이버'] },
      logistics: { name: '배달', items: ['라이더', '포장재'] },
      partner: { name: '제휴', items: ['신용카드 할인', '멤버십'] },
      infra: { name: '시설', items: ['임대료', '가스', '전기'] },
      community: { name: '리뷰', items: ['망고플레이트', '블로그', '인스타'] },
    }
  },
  itCompany: {
    name: 'IT 회사',
    icon: '💻',
    internal: {
      customer: { name: '클라이언트', value: '💰 계약금', desc: '프로젝트 비용' },
      provider: { name: '개발자', value: '💻 코드', desc: '소프트웨어 개발' },
      operator: { name: 'PM', value: '📊 일정', desc: '프로젝트 관리' },
      owner: { name: 'CEO', value: '✅ 승인', desc: '사업 방향 결정' },
    },
    external: {
      government: { name: '정부/규제', items: ['개인정보보호', '인증', '세금'] },
      finance: { name: '투자/은행', items: ['투자 유치', '대출', '회계'] },
      supply: { name: '클라우드/SaaS', items: ['AWS', 'Figma', 'Slack'] },
      channel: { name: '마케팅', items: ['LinkedIn', 'Clutch', 'PR'] },
      logistics: { name: '배포', items: ['CI/CD', '서버', 'CDN'] },
      partner: { name: '협력사', items: ['외주', '에이전시', 'MOU'] },
      infra: { name: '인프라', items: ['사무실', '인터넷', '보안'] },
      community: { name: '커뮤니티', items: ['개발자 생태계', '컨퍼런스'] },
    }
  },
  fitness: {
    name: '피트니스',
    icon: '💪',
    internal: {
      customer: { name: '회원', value: '💰 회비', desc: '멤버십 결제' },
      provider: { name: '트레이너', value: '💪 운동', desc: 'PT 및 지도' },
      operator: { name: '프론트', value: '📋 예약', desc: '회원 관리' },
      owner: { name: '대표', value: '✅ 결정', desc: '센터 운영' },
    },
    external: {
      government: { name: '체육시설법', items: ['신고', '안전', '세금'] },
      finance: { name: '결제/보험', items: ['멤버십 결제', '상해보험'] },
      supply: { name: '장비업체', items: ['기구', '매트', '소모품'] },
      channel: { name: '앱/SNS', items: ['인스타', '네이버', '카카오'] },
      logistics: { name: '배송', items: ['보충제', '운동복'] },
      partner: { name: '협회/제휴', items: ['자격증', '대회', '기업복지'] },
      infra: { name: '시설', items: ['건물', '샤워실', '주차장'] },
      community: { name: '회원커뮤니티', items: ['후기', '소개', '챌린지'] },
    }
  },
  realEstate: {
    name: '부동산',
    icon: '🏢',
    internal: {
      customer: { name: '매수자', value: '💰 계약금', desc: '부동산 구매' },
      provider: { name: '중개사', value: '🏠 매물', desc: '매물 소개 및 계약' },
      operator: { name: '사무장', value: '📋 서류', desc: '서류 및 일정 관리' },
      owner: { name: '대표', value: '✅ 승인', desc: '중개 승인' },
    },
    external: {
      government: { name: '국토부', items: ['중개허가', '실거래가', '세금'] },
      finance: { name: '은행', items: ['대출', '담보', '등기'] },
      supply: { name: '정보', items: ['부동산114', '호갱노노', '직방'] },
      channel: { name: '플랫폼', items: ['네이버부동산', '다방', '직방'] },
      logistics: { name: '이사', items: ['이사업체', '인테리어'] },
      partner: { name: '법무사/협회', items: ['등기', '세무', '중개협회'] },
      infra: { name: '사무실', items: ['임대료', '통신', '간판'] },
      community: { name: '지역주민', items: ['입소문', '후기', '추천'] },
    }
  },
};

// ============================================
// 색상 팔레트
// ============================================
const COLORS = {
  customer: { bg: '#22c55e', light: '#dcfce7', text: '#166534' },
  provider: { bg: '#f97316', light: '#ffedd5', text: '#9a3412' },
  operator: { bg: '#3b82f6', light: '#dbeafe', text: '#1e40af' },
  owner: { bg: '#1f2937', light: '#f3f4f6', text: '#111827' },
  // 외부 요소
  government: { bg: '#dc2626', icon: '🏛️' },
  finance: { bg: '#7c3aed', icon: '🏦' },
  supply: { bg: '#0891b2', icon: '📦' },
  channel: { bg: '#ec4899', icon: '📢' },
  logistics: { bg: '#84cc16', icon: '🚚' },
  partner: { bg: '#f59e0b', icon: '🤝' },
  infra: { bg: '#6366f1', icon: '🏢' },
  community: { bg: '#14b8a6', icon: '👥' },
};

// ============================================
// 메인 컴포넌트
// ============================================
export default function AUTUSUniversal() {
  const [selectedIndustry, setSelectedIndustry] = useState('basketball');
  const [selectedElement, setSelectedElement] = useState(null);
  const [hoveredElement, setHoveredElement] = useState(null);

  const industry = INDUSTRIES[selectedIndustry];

  // 외부 요소 위치 계산 (원형 배치)
  const getExternalPosition = (index, total) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const radius = 200;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  const externalKeys = Object.keys(industry.external);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* 헤더 */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '24px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'white',
          borderRadius: '16px',
          padding: '20px 32px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}>
              🌐
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>
                AUTUS Universal
              </h1>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
                모든 산업에 적용 가능한 가치 교환 프레임워크
              </p>
            </div>
          </div>

          {/* 산업 선택 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>산업 선택:</span>
            <select
              value={selectedIndustry}
              onChange={(e) => {
                setSelectedIndustry(e.target.value);
                setSelectedElement(null);
              }}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '15px',
                fontWeight: '500',
                background: 'white',
                cursor: 'pointer',
                minWidth: '180px',
              }}
            >
              {Object.entries(INDUSTRIES).map(([key, ind]) => (
                <option key={key} value={key}>
                  {ind.icon} {ind.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 400px',
        gap: '24px',
      }}>
        {/* 좌측: 다이어그램 */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          position: 'relative',
          minHeight: '600px',
        }}>
          {/* 산업 타이틀 */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#f3f4f6',
            borderRadius: '8px',
          }}>
            <span style={{ fontSize: '24px' }}>{industry.icon}</span>
            <span style={{ fontWeight: '600', color: '#374151' }}>{industry.name}</span>
          </div>

          {/* 다이어그램 영역 */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '520px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {/* 외부 요소 연결선 */}
            <svg style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}>
              {externalKeys.map((key, index) => {
                const pos = getExternalPosition(index, externalKeys.length);
                return (
                  <line
                    key={key}
                    x1="50%"
                    y1="50%"
                    x2={`calc(50% + ${pos.x}px)`}
                    y2={`calc(50% + ${pos.y}px)`}
                    stroke={hoveredElement === key ? COLORS[key].bg : '#e5e7eb'}
                    strokeWidth={hoveredElement === key ? 2 : 1}
                    strokeDasharray="4,4"
                    style={{ transition: 'all 0.3s' }}
                  />
                );
              })}
            </svg>

            {/* 외부 요소들 (원형 배치) */}
            {externalKeys.map((key, index) => {
              const pos = getExternalPosition(index, externalKeys.length);
              const ext = industry.external[key];
              const isHovered = hoveredElement === key;
              const isSelected = selectedElement === key;

              return (
                <div
                  key={key}
                  onClick={() => setSelectedElement(key)}
                  onMouseEnter={() => setHoveredElement(key)}
                  onMouseLeave={() => setHoveredElement(null)}
                  style={{
                    position: 'absolute',
                    left: `calc(50% + ${pos.x}px)`,
                    top: `calc(50% + ${pos.y}px)`,
                    transform: 'translate(-50%, -50%)',
                    width: isHovered || isSelected ? '100px' : '80px',
                    height: isHovered || isSelected ? '100px' : '80px',
                    borderRadius: '50%',
                    background: isSelected ? COLORS[key].bg : 'white',
                    border: `2px solid ${COLORS[key].bg}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: isHovered || isSelected
                      ? `0 8px 24px ${COLORS[key].bg}40`
                      : '0 2px 8px rgba(0,0,0,0.1)',
                    zIndex: isHovered || isSelected ? 10 : 1,
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{COLORS[key].icon}</span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '600',
                    color: isSelected ? 'white' : COLORS[key].bg,
                    marginTop: '4px',
                    textAlign: 'center',
                  }}>
                    {ext.name}
                  </span>
                </div>
              );
            })}

            {/* 중앙: 내부 4역할 */}
            <div style={{
              position: 'relative',
              width: '280px',
              height: '280px',
              borderRadius: '50%',
              background: '#f9fafb',
              border: '3px solid #e5e7eb',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              padding: '20px',
              gap: '12px',
            }}>
              {/* Customer */}
              <div
                onClick={() => setSelectedElement('customer')}
                style={{
                  background: COLORS.customer.bg,
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  transform: selectedElement === 'customer' ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: selectedElement === 'customer'
                    ? '0 8px 24px rgba(34,197,94,0.4)'
                    : 'none',
                }}
              >
                <span style={{ fontSize: '11px', color: 'white', opacity: 0.9 }}>Customer</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>
                  {industry.internal.customer.name}
                </span>
                <span style={{ fontSize: '18px', marginTop: '4px' }}>💰</span>
              </div>

              {/* Provider */}
              <div
                onClick={() => setSelectedElement('provider')}
                style={{
                  background: COLORS.provider.bg,
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  transform: selectedElement === 'provider' ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: selectedElement === 'provider'
                    ? '0 8px 24px rgba(249,115,22,0.4)'
                    : 'none',
                }}
              >
                <span style={{ fontSize: '11px', color: 'white', opacity: 0.9 }}>Provider</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>
                  {industry.internal.provider.name}
                </span>
                <span style={{ fontSize: '18px', marginTop: '4px' }}>📦</span>
              </div>

              {/* Operator */}
              <div
                onClick={() => setSelectedElement('operator')}
                style={{
                  background: COLORS.operator.bg,
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  transform: selectedElement === 'operator' ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: selectedElement === 'operator'
                    ? '0 8px 24px rgba(59,130,246,0.4)'
                    : 'none',
                }}
              >
                <span style={{ fontSize: '11px', color: 'white', opacity: 0.9 }}>Operator</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>
                  {industry.internal.operator.name}
                </span>
                <span style={{ fontSize: '18px', marginTop: '4px' }}>⚙️</span>
              </div>

              {/* Owner */}
              <div
                onClick={() => setSelectedElement('owner')}
                style={{
                  background: COLORS.owner.bg,
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  transform: selectedElement === 'owner' ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: selectedElement === 'owner'
                    ? '0 8px 24px rgba(31,41,55,0.4)'
                    : 'none',
                }}
              >
                <span style={{ fontSize: '11px', color: 'white', opacity: 0.9 }}>Owner</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>
                  {industry.internal.owner.name}
                </span>
                <span style={{ fontSize: '18px', marginTop: '4px' }}>✅</span>
              </div>

              {/* 중앙 AUTUS 로고 */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'white',
                border: '2px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '700',
                color: '#6b7280',
              }}>
                AUTUS
              </div>
            </div>
          </div>
        </div>

        {/* 우측: 상세 정보 패널 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          {/* 선택된 요소 상세 */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>
              {selectedElement ? '📋 상세 정보' : '👆 요소를 선택하세요'}
            </h3>

            {selectedElement && (
              <div>
                {/* 내부 역할 선택됨 */}
                {['customer', 'provider', 'operator', 'owner'].includes(selectedElement) && (
                  <div style={{
                    padding: '20px',
                    borderRadius: '12px',
                    background: COLORS[selectedElement].light,
                    border: `2px solid ${COLORS[selectedElement].bg}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '32px' }}>
                        {selectedElement === 'customer' ? '💰' :
                         selectedElement === 'provider' ? '📦' :
                         selectedElement === 'operator' ? '⚙️' : '✅'}
                      </span>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
                          {selectedElement}
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: COLORS[selectedElement].text }}>
                          {industry.internal[selectedElement].name}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      padding: '12px',
                      background: 'white',
                      borderRadius: '8px',
                      marginBottom: '12px',
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                        제공 가치
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: COLORS[selectedElement].bg }}>
                        {industry.internal[selectedElement].value}
                      </div>
                    </div>
                    <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
                      {industry.internal[selectedElement].desc}
                    </p>
                  </div>
                )}

                {/* 외부 요소 선택됨 */}
                {Object.keys(COLORS).filter(k => !['customer', 'provider', 'operator', 'owner'].includes(k))
                  .includes(selectedElement) && (
                  <div style={{
                    padding: '20px',
                    borderRadius: '12px',
                    background: '#f9fafb',
                    border: `2px solid ${COLORS[selectedElement].bg}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: COLORS[selectedElement].bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                      }}>
                        {COLORS[selectedElement].icon}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
                          외부 요소
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#374151' }}>
                          {industry.external[selectedElement].name}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      관련 항목
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {industry.external[selectedElement].items.map((item, i) => (
                        <span key={i} style={{
                          padding: '6px 12px',
                          background: 'white',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#374151',
                          border: '1px solid #e5e7eb',
                        }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 범용 공식 */}
          <div style={{
            background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
            borderRadius: '16px',
            padding: '24px',
            color: 'white',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', opacity: 0.9 }}>
              🔄 AUTUS 범용 공식
            </h3>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              lineHeight: '2',
              opacity: 0.8,
            }}>
              <div><span style={{ color: '#22c55e' }}>Customer</span> → 💰 Payment</div>
              <div><span style={{ color: '#f97316' }}>Provider</span> → 📦 Value</div>
              <div><span style={{ color: '#3b82f6' }}>Operator</span> → ⚙️ Process</div>
              <div><span style={{ color: '#9ca3af' }}>Owner</span> → ✅ Decision</div>
            </div>
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '12px',
              opacity: 0.7,
            }}>
              + 8개 외부 요소가 비즈니스를 둘러싼다
            </div>
          </div>

          {/* 외부 요소 레전드 */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              🌐 외부 요소 (8)
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}>
              {externalKeys.map(key => (
                <div
                  key={key}
                  onClick={() => setSelectedElement(key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: selectedElement === key ? `${COLORS[key].bg}15` : '#f9fafb',
                    border: `1px solid ${selectedElement === key ? COLORS[key].bg : '#e5e7eb'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span>{COLORS[key].icon}</span>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>
                    {industry.external[key].name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 하단 푸터 */}
      <div style={{
        maxWidth: '1400px',
        margin: '24px auto 0',
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: '12px',
      }}>
        AUTUS × Brand OS Factory · 모든 산업을 하나의 프레임워크로
      </div>
    </div>
  );
}
