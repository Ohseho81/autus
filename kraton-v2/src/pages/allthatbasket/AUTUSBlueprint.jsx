import React, { useState, useMemo, useCallback } from 'react';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Blueprint - 산업 기반 소비자-생산자 프레임워크
 *
 * 흐름:
 * 1. 전체 틀 (소비자-생산자-환경) 미리 정의
 * 2. 산업 선택 (객관식/주관식)
 * 3. 상품 정의 (기본 + 추가 + 삭제)
 * 4. 생산 흐름 자동 생성
 * 5. 실시간 V값 계산
 * 6. 소비자/생산자 상수 입력
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 산업 템플릿 (기본 상품 + 생산 흐름)
// ═══════════════════════════════════════════════════════════════════════════════

const INDUSTRY_TEMPLATES = {
  basketball_academy: {
    id: 'basketball_academy',
    name: '농구 아카데미',
    icon: '🏀',
    products: [
      { id: 'lesson', name: '레슨', unit: '회', basePrice: 50000, mintRate: 0.8 },
      { id: 'camp', name: '캠프', unit: '일', basePrice: 150000, mintRate: 0.9 },
      { id: 'private', name: '개인레슨', unit: '시간', basePrice: 80000, mintRate: 0.95 },
    ],
    producers: [
      { role: 'coach', name: '코치', produces: ['lesson', 'camp', 'private'] },
      { role: 'manager', name: '매니저', produces: [] },
    ],
    environment: ['facility', 'equipment', 'schedule'],
  },
  restaurant: {
    id: 'restaurant',
    name: '레스토랑',
    icon: '🍽️',
    products: [
      { id: 'meal', name: '식사', unit: '인분', basePrice: 15000, mintRate: 0.6 },
      { id: 'course', name: '코스요리', unit: '세트', basePrice: 80000, mintRate: 0.7 },
      { id: 'catering', name: '케이터링', unit: '건', basePrice: 500000, mintRate: 0.5 },
    ],
    producers: [
      { role: 'chef', name: '셰프', produces: ['meal', 'course', 'catering'] },
      { role: 'server', name: '서버', produces: [] },
    ],
    environment: ['kitchen', 'hall', 'inventory'],
  },
  clinic: {
    id: 'clinic',
    name: '의원/클리닉',
    icon: '🏥',
    products: [
      { id: 'consultation', name: '진료', unit: '건', basePrice: 50000, mintRate: 0.9 },
      { id: 'procedure', name: '시술', unit: '건', basePrice: 200000, mintRate: 0.8 },
      { id: 'program', name: '프로그램', unit: '회', basePrice: 100000, mintRate: 0.85 },
    ],
    producers: [
      { role: 'doctor', name: '의사', produces: ['consultation', 'procedure', 'program'] },
      { role: 'nurse', name: '간호사', produces: [] },
    ],
    environment: ['room', 'equipment', 'medicine'],
  },
  education: {
    id: 'education',
    name: '교육/학원',
    icon: '📚',
    products: [
      { id: 'class', name: '수업', unit: '회', basePrice: 30000, mintRate: 0.75 },
      { id: 'tutoring', name: '과외', unit: '시간', basePrice: 60000, mintRate: 0.9 },
      { id: 'material', name: '교재', unit: '권', basePrice: 20000, mintRate: 0.4 },
    ],
    producers: [
      { role: 'teacher', name: '강사', produces: ['class', 'tutoring'] },
      { role: 'admin', name: '행정', produces: ['material'] },
    ],
    environment: ['classroom', 'material', 'system'],
  },
  fitness: {
    id: 'fitness',
    name: '피트니스',
    icon: '💪',
    products: [
      { id: 'membership', name: '회원권', unit: '월', basePrice: 100000, mintRate: 0.3 },
      { id: 'pt', name: 'PT', unit: '회', basePrice: 70000, mintRate: 0.85 },
      { id: 'gx', name: 'GX수업', unit: '회', basePrice: 20000, mintRate: 0.6 },
    ],
    producers: [
      { role: 'trainer', name: '트레이너', produces: ['pt', 'gx'] },
      { role: 'staff', name: '스태프', produces: ['membership'] },
    ],
    environment: ['gym', 'locker', 'equipment'],
  },
  saas: {
    id: 'saas',
    name: 'SaaS/IT서비스',
    icon: '💻',
    products: [
      { id: 'subscription', name: '구독', unit: '월', basePrice: 50000, mintRate: 0.2 },
      { id: 'setup', name: '셋업', unit: '건', basePrice: 500000, mintRate: 0.7 },
      { id: 'support', name: '지원', unit: '시간', basePrice: 100000, mintRate: 0.8 },
    ],
    producers: [
      { role: 'developer', name: '개발자', produces: ['subscription', 'setup'] },
      { role: 'support', name: '서포트', produces: ['support'] },
    ],
    environment: ['server', 'code', 'docs'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// V값 계산 엔진: V = (M - T) × (1 + s)^t
// ═══════════════════════════════════════════════════════════════════════════════

const calculateV = (mint, tax, synergy, time) => {
  if (mint <= 0) return 0;
  return (mint - tax) * Math.pow(1 + synergy, time);
};

const calculateProductV = (product, quantity, consumerConst, producerConst, envConst) => {
  const baseValue = product.basePrice * quantity;
  const mint = baseValue * product.mintRate * producerConst;
  const tax = baseValue * (1 - product.mintRate) * 0.5; // 원가
  const synergy = (consumerConst + producerConst + envConst) / 3 - 1; // 평균 시너지
  const time = 1; // 단위 기간
  return {
    mint,
    tax,
    synergy,
    v: calculateV(mint, tax, synergy, time),
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AUTUSBlueprint() {
  const [step, setStep] = useState(0); // 0: 산업선택, 1: 상품정의, 2: 상수입력, 3: 대시보드
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [customIndustry, setCustomIndustry] = useState('');
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: '', unit: '건', basePrice: 10000, mintRate: 0.7 });

  // 상수
  const [consumers, setConsumers] = useState([]);
  const [producers, setProducers] = useState([]);
  const [consumerConst, setConsumerConst] = useState(1.0);
  const [producerConst, setProducerConst] = useState(1.0);
  const [envConst, setEnvConst] = useState(1.0);

  // 실시간 거래
  const [transactions, setTransactions] = useState([]);

  // 산업 선택
  const handleSelectIndustry = (industry) => {
    setSelectedIndustry(industry);
    setProducts([...industry.products]);
    setProducers(industry.producers.map(p => ({ ...p, count: 1, efficiency: 1.0 })));
    setStep(1);
  };

  // 커스텀 산업 생성
  const handleCustomIndustry = () => {
    if (!customIndustry.trim()) return;
    const custom = {
      id: 'custom',
      name: customIndustry,
      icon: '🏢',
      products: [],
      producers: [{ role: 'producer', name: '생산자', produces: [] }],
      environment: ['facility', 'resource'],
    };
    handleSelectIndustry(custom);
  };

  // 상품 추가
  const handleAddProduct = () => {
    if (!newProduct.name.trim()) return;
    const product = {
      ...newProduct,
      id: `custom_${Date.now()}`,
    };
    setProducts([...products, product]);
    setNewProduct({ name: '', unit: '건', basePrice: 10000, mintRate: 0.7 });
  };

  // 상품 삭제
  const handleRemoveProduct = (id) => {
    setProducts(products.filter(p => p.id !== id));
  };

  // 거래 추가
  const handleAddTransaction = (productId, quantity, consumerId, producerId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const vCalc = calculateProductV(product, quantity, consumerConst, producerConst, envConst);
    const tx = {
      id: `TX_${Date.now()}`,
      ts: Date.now(),
      productId,
      productName: product.name,
      quantity,
      consumerId,
      producerId,
      ...vCalc,
    };
    setTransactions([tx, ...transactions]);
  };

  // 총 V값 계산
  const totalV = useMemo(() => {
    return transactions.reduce((sum, tx) => sum + tx.v, 0);
  }, [transactions]);

  // 평균 시너지
  const avgSynergy = useMemo(() => {
    if (transactions.length === 0) return 0;
    return transactions.reduce((sum, tx) => sum + tx.synergy, 0) / transactions.length;
  }, [transactions]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0A0A0F 0%, #1A1A2E 100%)',
      color: '#F8FAFC',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid #2E2E3E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>⚡</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>AUTUS Blueprint</div>
            <div style={{ fontSize: 11, opacity: 0.5 }}>소비자-생산자 프레임워크</div>
          </div>
        </div>
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            style={{
              padding: '8px 16px', borderRadius: 8,
              background: 'rgba(255,255,255,0.1)', border: 'none',
              color: '#94A3B8', fontSize: 12, cursor: 'pointer',
            }}
          >
            ← 이전
          </button>
        )}
      </header>

      {/* Progress */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #1E1E2E' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['산업 선택', '상품 정의', '상수 입력', '대시보드'].map((label, i) => (
            <div
              key={i}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8,
                background: step === i ? '#F9731620' : step > i ? '#10B98120' : '#1A1A2E',
                border: `1px solid ${step === i ? '#F97316' : step > i ? '#10B981' : '#2E2E3E'}`,
                textAlign: 'center', fontSize: 12,
                color: step >= i ? '#F8FAFC' : '#6B7280',
              }}
            >
              {step > i ? '✓' : i + 1}. {label}
            </div>
          ))}
        </div>
      </div>

      <main style={{ padding: 24 }}>
        {/* Step 0: 산업 선택 */}
        {step === 0 && (
          <IndustrySelector
            industries={INDUSTRY_TEMPLATES}
            customIndustry={customIndustry}
            setCustomIndustry={setCustomIndustry}
            onSelect={handleSelectIndustry}
            onCustom={handleCustomIndustry}
          />
        )}

        {/* Step 1: 상품 정의 */}
        {step === 1 && (
          <ProductDefinition
            industry={selectedIndustry}
            products={products}
            newProduct={newProduct}
            setNewProduct={setNewProduct}
            onAdd={handleAddProduct}
            onRemove={handleRemoveProduct}
            onNext={() => setStep(2)}
          />
        )}

        {/* Step 2: 상수 입력 */}
        {step === 2 && (
          <ConstantInput
            consumers={consumers}
            setConsumers={setConsumers}
            producers={producers}
            setProducers={setProducers}
            consumerConst={consumerConst}
            setConsumerConst={setConsumerConst}
            producerConst={producerConst}
            setProducerConst={setProducerConst}
            envConst={envConst}
            setEnvConst={setEnvConst}
            onNext={() => setStep(3)}
          />
        )}

        {/* Step 3: 대시보드 */}
        {step === 3 && (
          <Dashboard
            industry={selectedIndustry}
            products={products}
            consumers={consumers}
            producers={producers}
            consumerConst={consumerConst}
            producerConst={producerConst}
            envConst={envConst}
            transactions={transactions}
            totalV={totalV}
            avgSynergy={avgSynergy}
            onTransaction={handleAddTransaction}
          />
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 0: 산업 선택
// ═══════════════════════════════════════════════════════════════════════════════

function IndustrySelector({ industries, customIndustry, setCustomIndustry, onSelect, onCustom }) {
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>산업을 선택하세요</h2>
      <p style={{ opacity: 0.6, marginBottom: 24, fontSize: 14 }}>
        사업 분야를 선택하면 기본 상품과 생산 구조가 자동으로 설정됩니다.
      </p>

      {/* 산업 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {Object.values(industries).map(ind => (
          <button
            key={ind.id}
            onClick={() => onSelect(ind)}
            style={{
              padding: 24, borderRadius: 16,
              background: '#1A1A2E',
              border: '2px solid #2E2E3E',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#F97316'}
            onMouseOut={e => e.currentTarget.style.borderColor = '#2E2E3E'}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>{ind.icon}</div>
            <div style={{ fontWeight: 700, color: '#F8FAFC', marginBottom: 4 }}>{ind.name}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>
              {ind.products.length}개 상품 · {ind.producers.length}개 역할
            </div>
          </button>
        ))}
      </div>

      {/* 커스텀 입력 */}
      <div style={{
        padding: 24, borderRadius: 16,
        background: '#1A1A2E', border: '2px dashed #2E2E3E',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>🔧 다른 산업 직접 입력</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            placeholder="산업명 입력 (예: 미용실, 세탁소...)"
            value={customIndustry}
            onChange={e => setCustomIndustry(e.target.value)}
            style={{
              flex: 1, padding: '12px 16px',
              background: '#0D0D12', border: '1px solid #2E2E3E', borderRadius: 8,
              color: '#F8FAFC', fontSize: 14,
            }}
            onKeyDown={e => e.key === 'Enter' && onCustom()}
          />
          <button
            onClick={onCustom}
            style={{
              padding: '12px 24px', borderRadius: 8,
              background: '#3B82F6', border: 'none',
              color: 'white', fontWeight: 600, cursor: 'pointer',
            }}
          >
            생성
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: 상품 정의
// ═══════════════════════════════════════════════════════════════════════════════

function ProductDefinition({ industry, products, newProduct, setNewProduct, onAdd, onRemove, onNext }) {
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        {industry.icon} {industry.name} - 상품 정의
      </h2>
      <p style={{ opacity: 0.6, marginBottom: 24, fontSize: 14 }}>
        소비자에게 제공할 상품을 정의하세요. 추가/삭제할 수 있습니다.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* 현재 상품 */}
        <section>
          <h3 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>📦 상품 목록</h3>
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {products.map(product => (
              <div key={product.id} style={{
                padding: 16, borderRadius: 12, marginBottom: 8,
                background: '#1A1A2E', border: '1px solid #2E2E3E',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{product.name}</div>
                  <div style={{ fontSize: 12, color: '#94A3B8' }}>
                    {product.basePrice.toLocaleString()}원/{product.unit} · Mint Rate: {(product.mintRate * 100).toFixed(0)}%
                  </div>
                </div>
                <button
                  onClick={() => onRemove(product.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 6,
                    background: '#EF444420', border: '1px solid #EF444440',
                    color: '#EF4444', fontSize: 11, cursor: 'pointer',
                  }}
                >
                  삭제
                </button>
              </div>
            ))}
            {products.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', opacity: 0.4 }}>
                상품을 추가하세요
              </div>
            )}
          </div>
        </section>

        {/* 상품 추가 */}
        <section>
          <h3 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>➕ 신규 상품 추가</h3>
          <div style={{
            padding: 20, borderRadius: 12,
            background: '#1A1A2E', border: '1px solid #2E2E3E',
          }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#94A3B8', display: 'block', marginBottom: 4 }}>상품명</label>
              <input
                placeholder="상품명"
                value={newProduct.name}
                onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: '#0D0D12', border: '1px solid #2E2E3E', borderRadius: 6,
                  color: '#F8FAFC', fontSize: 13,
                }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#94A3B8', display: 'block', marginBottom: 4 }}>단위</label>
                <select
                  value={newProduct.unit}
                  onChange={e => setNewProduct(p => ({ ...p, unit: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 12px',
                    background: '#0D0D12', border: '1px solid #2E2E3E', borderRadius: 6,
                    color: '#F8FAFC', fontSize: 13,
                  }}
                >
                  <option value="건">건</option>
                  <option value="회">회</option>
                  <option value="시간">시간</option>
                  <option value="월">월</option>
                  <option value="개">개</option>
                  <option value="인분">인분</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94A3B8', display: 'block', marginBottom: 4 }}>기본가격</label>
                <input
                  type="number"
                  value={newProduct.basePrice}
                  onChange={e => setNewProduct(p => ({ ...p, basePrice: Number(e.target.value) }))}
                  style={{
                    width: '100%', padding: '10px 12px',
                    background: '#0D0D12', border: '1px solid #2E2E3E', borderRadius: 6,
                    color: '#F8FAFC', fontSize: 13,
                  }}
                />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#94A3B8', display: 'block', marginBottom: 4 }}>
                Mint Rate (가치 생성률): {(newProduct.mintRate * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.1" max="1" step="0.05"
                value={newProduct.mintRate}
                onChange={e => setNewProduct(p => ({ ...p, mintRate: Number(e.target.value) }))}
                style={{ width: '100%' }}
              />
            </div>
            <button
              onClick={onAdd}
              style={{
                width: '100%', padding: '12px', borderRadius: 8,
                background: '#10B981', border: 'none',
                color: 'white', fontWeight: 600, cursor: 'pointer',
              }}
            >
              상품 추가
            </button>
          </div>
        </section>
      </div>

      {/* 다음 */}
      <div style={{ marginTop: 32, textAlign: 'right' }}>
        <button
          onClick={onNext}
          disabled={products.length === 0}
          style={{
            padding: '14px 32px', borderRadius: 12,
            background: products.length > 0 ? '#F97316' : '#2E2E3E',
            border: 'none',
            color: 'white', fontWeight: 700, fontSize: 15, cursor: products.length > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          다음: 소비자/생산자 상수 입력 →
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2: 상수 입력
// ═══════════════════════════════════════════════════════════════════════════════

function ConstantInput({
  consumers, setConsumers,
  producers, setProducers,
  consumerConst, setConsumerConst,
  producerConst, setProducerConst,
  envConst, setEnvConst,
  onNext
}) {
  const [newConsumer, setNewConsumer] = useState('');
  const [newProducer, setNewProducer] = useState('');

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>소비자/생산자 상수 입력</h2>
      <p style={{ opacity: 0.6, marginBottom: 24, fontSize: 14 }}>
        V = (M - T) × (1 + s)^t 공식의 상수를 설정합니다.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
        {/* 소비자 */}
        <section>
          <h3 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>👤 소비자</h3>
          <div style={{
            padding: 16, borderRadius: 12,
            background: '#1A1A2E', border: '1px solid #3B82F640',
          }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                placeholder="소비자 추가"
                value={newConsumer}
                onChange={e => setNewConsumer(e.target.value)}
                style={{
                  flex: 1, padding: '8px 12px',
                  background: '#0D0D12', border: '1px solid #2E2E3E', borderRadius: 6,
                  color: '#F8FAFC', fontSize: 12,
                }}
              />
              <button
                onClick={() => { setConsumers([...consumers, { id: Date.now(), name: newConsumer }]); setNewConsumer(''); }}
                style={{
                  padding: '8px 12px', borderRadius: 6,
                  background: '#3B82F6', border: 'none',
                  color: 'white', fontSize: 12, cursor: 'pointer',
                }}
              >
                +
              </button>
            </div>
            <div style={{ maxHeight: 150, overflow: 'auto', marginBottom: 12 }}>
              {consumers.map(c => (
                <div key={c.id} style={{
                  padding: 8, borderRadius: 6, marginBottom: 4,
                  background: '#0D0D12', fontSize: 12,
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>{c.name}</span>
                  <button onClick={() => setConsumers(consumers.filter(x => x.id !== c.id))} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}>×</button>
                </div>
              ))}
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#94A3B8' }}>소비자 상수: {consumerConst.toFixed(2)}</label>
              <input
                type="range" min="0.5" max="2" step="0.1"
                value={consumerConst}
                onChange={e => setConsumerConst(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </section>

        {/* 생산자 */}
        <section>
          <h3 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>🔧 생산자</h3>
          <div style={{
            padding: 16, borderRadius: 12,
            background: '#1A1A2E', border: '1px solid #10B98140',
          }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                placeholder="생산자 추가"
                value={newProducer}
                onChange={e => setNewProducer(e.target.value)}
                style={{
                  flex: 1, padding: '8px 12px',
                  background: '#0D0D12', border: '1px solid #2E2E3E', borderRadius: 6,
                  color: '#F8FAFC', fontSize: 12,
                }}
              />
              <button
                onClick={() => { setProducers([...producers, { id: Date.now(), name: newProducer, role: 'custom' }]); setNewProducer(''); }}
                style={{
                  padding: '8px 12px', borderRadius: 6,
                  background: '#10B981', border: 'none',
                  color: 'white', fontSize: 12, cursor: 'pointer',
                }}
              >
                +
              </button>
            </div>
            <div style={{ maxHeight: 150, overflow: 'auto', marginBottom: 12 }}>
              {producers.map(p => (
                <div key={p.id || p.role} style={{
                  padding: 8, borderRadius: 6, marginBottom: 4,
                  background: '#0D0D12', fontSize: 12,
                }}>
                  {p.name}
                </div>
              ))}
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#94A3B8' }}>생산자 상수: {producerConst.toFixed(2)}</label>
              <input
                type="range" min="0.5" max="2" step="0.1"
                value={producerConst}
                onChange={e => setProducerConst(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </section>

        {/* 환경 */}
        <section>
          <h3 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>🌍 환경</h3>
          <div style={{
            padding: 16, borderRadius: 12,
            background: '#1A1A2E', border: '1px solid #F59E0B40',
          }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#94A3B8' }}>환경 상수: {envConst.toFixed(2)}</label>
              <input
                type="range" min="0.5" max="2" step="0.1"
                value={envConst}
                onChange={e => setEnvConst(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>
              <div>• 시설 상태</div>
              <div>• 장비 품질</div>
              <div>• 시스템 효율</div>
            </div>
          </div>
        </section>
      </div>

      {/* V 공식 미리보기 */}
      <div style={{
        marginTop: 24, padding: 20, borderRadius: 12,
        background: 'linear-gradient(135deg, #F59E0B20, #EF444420)',
        border: '1px solid #F59E0B40',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8 }}>Value Formula</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B' }}>
          V = (M - T) × (1 + {((consumerConst + producerConst + envConst) / 3 - 1).toFixed(2)})^t
        </div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>
          Synergy = (Consumer {consumerConst} + Producer {producerConst} + Env {envConst}) / 3 - 1
        </div>
      </div>

      {/* 다음 */}
      <div style={{ marginTop: 32, textAlign: 'right' }}>
        <button
          onClick={onNext}
          style={{
            padding: '14px 32px', borderRadius: 12,
            background: '#F97316', border: 'none',
            color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}
        >
          대시보드로 이동 →
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3: 대시보드
// ═══════════════════════════════════════════════════════════════════════════════

function Dashboard({
  industry, products, consumers, producers,
  consumerConst, producerConst, envConst,
  transactions, totalV, avgSynergy,
  onTransaction
}) {
  const [selectedProduct, setSelectedProduct] = useState(products[0]?.id);
  const [quantity, setQuantity] = useState(1);

  const handleTransaction = () => {
    if (!selectedProduct) return;
    onTransaction(selectedProduct, quantity, 'consumer', 'producer');
    setQuantity(1);
  };

  return (
    <div>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            {industry.icon} {industry.name} 대시보드
          </h2>
          <div style={{ fontSize: 12, opacity: 0.5 }}>
            소비자 {consumers.length}명 · 생산자 {producers.length}명 · 상품 {products.length}개
          </div>
        </div>
        <div style={{
          padding: '12px 24px', borderRadius: 12,
          background: totalV >= 0 ? '#10B98120' : '#EF444420',
          border: `1px solid ${totalV >= 0 ? '#10B981' : '#EF4444'}`,
        }}>
          <div style={{ fontSize: 11, opacity: 0.6 }}>Total V</div>
          <div style={{
            fontSize: 28, fontWeight: 700,
            color: totalV >= 0 ? '#10B981' : '#EF4444',
          }}>
            ₩{Math.abs(totalV).toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* 좌: 프레임워크 시각화 */}
        <section>
          <h3 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>🔄 소비자-생산자 프레임워크</h3>
          <div style={{
            padding: 24, borderRadius: 12,
            background: '#1A1A2E', border: '1px solid #2E2E3E',
          }}>
            {/* 시각화 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              {/* 소비자 */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: '#3B82F620', border: '2px solid #3B82F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, margin: '0 auto 8px',
                }}>
                  👤
                </div>
                <div style={{ fontWeight: 600 }}>소비자</div>
                <div style={{ fontSize: 11, color: '#3B82F6' }}>×{consumerConst.toFixed(1)}</div>
              </div>

              {/* 화살표 + 상품 */}
              <div style={{ flex: 1, padding: '0 20px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
                  {products.slice(0, 4).map(p => (
                    <span key={p.id} style={{
                      padding: '4px 10px', borderRadius: 20,
                      background: '#F9731620', border: '1px solid #F97316',
                      fontSize: 11, color: '#F97316',
                    }}>
                      {p.name}
                    </span>
                  ))}
                </div>
                <div style={{ textAlign: 'center', color: '#F97316', fontSize: 20 }}>→ V →</div>
              </div>

              {/* 생산자 */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: '#10B98120', border: '2px solid #10B981',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, margin: '0 auto 8px',
                }}>
                  🔧
                </div>
                <div style={{ fontWeight: 600 }}>생산자</div>
                <div style={{ fontSize: 11, color: '#10B981' }}>×{producerConst.toFixed(1)}</div>
              </div>
            </div>

            {/* 환경 */}
            <div style={{
              padding: 12, borderRadius: 8,
              background: '#F59E0B10', border: '1px dashed #F59E0B40',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: 20, marginRight: 8 }}>🌍</span>
              환경 상수: ×{envConst.toFixed(1)}
            </div>
          </div>

          {/* 거래 생성 */}
          <h3 style={{ fontSize: 14, opacity: 0.5, marginTop: 24, marginBottom: 12 }}>➕ 거래 생성</h3>
          <div style={{
            padding: 16, borderRadius: 12,
            background: '#1A1A2E', border: '1px solid #2E2E3E',
            display: 'flex', gap: 12, alignItems: 'flex-end',
          }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>상품</label>
              <select
                value={selectedProduct}
                onChange={e => setSelectedProduct(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: '#0D0D12', border: '1px solid #2E2E3E', borderRadius: 6,
                  color: '#F8FAFC', fontSize: 13,
                }}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.basePrice.toLocaleString()}원)</option>
                ))}
              </select>
            </div>
            <div style={{ width: 100 }}>
              <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4 }}>수량</label>
              <input
                type="number" min="1"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: '#0D0D12', border: '1px solid #2E2E3E', borderRadius: 6,
                  color: '#F8FAFC', fontSize: 13,
                }}
              />
            </div>
            <button
              onClick={handleTransaction}
              style={{
                padding: '10px 20px', borderRadius: 6,
                background: '#F97316', border: 'none',
                color: 'white', fontWeight: 600, cursor: 'pointer',
              }}
            >
              거래 실행
            </button>
          </div>
        </section>

        {/* 우: 거래 로그 + 지표 */}
        <section>
          <h3 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>📊 실시간 V값</h3>

          {/* 지표 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div style={{
              padding: 12, borderRadius: 8, textAlign: 'center',
              background: '#3B82F620', border: '1px solid #3B82F640',
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#3B82F6' }}>{transactions.length}</div>
              <div style={{ fontSize: 10, opacity: 0.6 }}>거래 수</div>
            </div>
            <div style={{
              padding: 12, borderRadius: 8, textAlign: 'center',
              background: '#F59E0B20', border: '1px solid #F59E0B40',
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#F59E0B' }}>{(avgSynergy * 100).toFixed(0)}%</div>
              <div style={{ fontSize: 10, opacity: 0.6 }}>평균 시너지</div>
            </div>
          </div>

          {/* 거래 로그 */}
          <h3 style={{ fontSize: 14, opacity: 0.5, marginBottom: 12 }}>📜 거래 로그</h3>
          <div style={{
            background: '#0D0D12', borderRadius: 8, padding: 12,
            maxHeight: 300, overflow: 'auto',
          }}>
            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', opacity: 0.4, padding: 20 }}>
                거래를 생성하세요
              </div>
            ) : (
              transactions.map(tx => (
                <div key={tx.id} style={{
                  padding: 10, borderRadius: 6, marginBottom: 6,
                  background: '#1A1A2E',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{tx.productName} ×{tx.quantity}</span>
                    <span style={{
                      color: tx.v >= 0 ? '#10B981' : '#EF4444',
                      fontWeight: 700,
                    }}>
                      V: ₩{tx.v.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>
                    M:{tx.mint.toLocaleString()} T:{tx.tax.toLocaleString()} s:{(tx.synergy * 100).toFixed(0)}%
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
