/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Pressure Map View v2.5
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * "결정을 미루면 손해가 확정되는 지점만 표시하는 레이더"
 * 
 * UI가 말하는 것:
 * - PRESSURING 항목
 * - 마감일
 * - 비용 유형
 * - 예상 비용
 * 
 * UI가 말하지 않는 것:
 * ❌ 해결책
 * ❌ 시뮬레이션  
 * ❌ 확률
 * ❌ 예측
 * ❌ 애니메이션
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import {
  PressureCalculator,
  ACADEMY_THRESHOLDS,
  ACADEMY_EXPOSURE_WEIGHTS,
  SAMPLE_ACADEMY_DATA,
  PRESSURE_STATES,
  ACADEMY_NODE_DEFINITIONS,
  ACADEMY_ACTIVE_NODES,
  PressureItem,
  PressureResult,
} from '../../engine';

// ═══════════════════════════════════════════════════════════════════════════════
// Specialist Card Component
// ═══════════════════════════════════════════════════════════════════════════════

interface SpecialistCardProps {
  item: PressureItem;
  onSelect: () => void;
  isSelected: boolean;
}

const SpecialistCard: React.FC<SpecialistCardProps> = ({ item, onSelect, isSelected }) => {
  const stateConfig = PRESSURE_STATES[item.state];
  const nodeDef = ACADEMY_NODE_DEFINITIONS[item.nodeId];
  
  return (
    <div
      onClick={onSelect}
      style={{
        padding: '20px',
        backgroundColor: isSelected ? stateConfig.bgColor : 'rgba(0,0,0,0.3)',
        borderRadius: '12px',
        border: `2px solid ${isSelected ? stateConfig.color : 'transparent'}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{
          fontSize: '24px',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: stateConfig.bgColor,
          borderRadius: '8px',
        }}>
          {stateConfig.symbol}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '10px', 
            color: stateConfig.color, 
            fontWeight: 700,
            letterSpacing: '1px',
            marginBottom: '4px',
          }}>
            {stateConfig.name.toUpperCase()}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
            {item.title}
          </div>
        </div>
      </div>
      
      {/* Value & Threshold */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderRadius: '8px',
        }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
            현재 값
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: stateConfig.color }}>
            {formatValue(item.value, item.threshold.unit)}
          </div>
        </div>
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderRadius: '8px',
        }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
            임계값
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
            {formatValue(item.threshold.warning, item.threshold.unit)}
          </div>
        </div>
      </div>
      
      {/* Cost Types */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {item.costTypes.map(ct => (
          <span key={ct.id} style={{
            padding: '4px 10px',
            backgroundColor: `${ct.color}20`,
            borderRadius: '4px',
            fontSize: '11px',
            color: ct.color,
            fontWeight: 500,
          }}>
            {ct.symbol} {ct.name}
          </span>
        ))}
      </div>
      
      {/* Deadline & Loss */}
      <div style={{
        padding: '16px',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: '8px',
        borderLeft: `3px solid ${stateConfig.color}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>마감</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: item.horizon.color }}>
            {item.horizon.symbol} {item.deadline}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>예상 손실</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>
            월 {(item.estimatedLoss / 10000).toLocaleString()}만원
          </span>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Detail Panel Component
// ═══════════════════════════════════════════════════════════════════════════════

interface DetailPanelProps {
  item: PressureItem;
  onClose: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ item, onClose }) => {
  const stateConfig = PRESSURE_STATES[item.state];
  const nodeDef = ACADEMY_NODE_DEFINITIONS[item.nodeId];
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '420px',
      backgroundColor: '#0a0a0a',
      borderLeft: '1px solid rgba(255,255,255,0.1)',
      padding: '24px',
      overflowY: 'auto',
      zIndex: 1000,
    }}>
      {/* Close Button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'none',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        ×
      </button>
      
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{
          fontSize: '32px',
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: stateConfig.bgColor,
          borderRadius: '12px',
        }}>
          {stateConfig.symbol}
        </div>
        <div>
          <div style={{ 
            fontSize: '12px', 
            color: stateConfig.color, 
            fontWeight: 700,
            letterSpacing: '2px',
            marginBottom: '4px',
          }}>
            {stateConfig.name.toUpperCase()}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>
            {item.title}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
            {item.nodeId} | {nodeDef?.category}
          </div>
        </div>
      </div>
      
      {/* Main Message */}
      <div style={{
        padding: '20px',
        backgroundColor: stateConfig.bgColor,
        borderRadius: '12px',
        marginBottom: '24px',
        borderLeft: `4px solid ${stateConfig.color}`,
      }}>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>
          {item.message}
        </div>
      </div>
      
      {/* Pressure Formula */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          fontSize: '10px', 
          color: 'rgba(255,255,255,0.4)', 
          letterSpacing: '2px',
          marginBottom: '12px',
        }}>
          PRESSURE 계산
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
        }}>
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
              Delay Time
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
              {item.delayTime}일
            </div>
          </div>
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
              Exposure
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
              {(item.exposure * 100).toFixed(0)}%
            </div>
          </div>
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
              Difficulty
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>
              {(item.recoveryDifficulty * 100).toFixed(0)}%
            </div>
          </div>
        </div>
        <div style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: stateConfig.bgColor,
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '10px', color: stateConfig.color, marginBottom: '4px' }}>
            Pressure Score
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: stateConfig.color }}>
            {item.pressure.toFixed(2)}
          </div>
        </div>
      </div>
      
      {/* Expected Loss */}
      <div style={{
        padding: '20px',
        backgroundColor: 'rgba(239,68,68,0.1)',
        borderRadius: '12px',
        marginBottom: '24px',
        border: '1px solid rgba(239,68,68,0.3)',
      }}>
        <div style={{ 
          fontSize: '10px', 
          color: 'rgba(255,255,255,0.4)', 
          letterSpacing: '2px',
          marginBottom: '8px',
        }}>
          미루면 발생하는 비용
        </div>
        <div style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444' }}>
          월 {(item.estimatedLoss / 10000).toLocaleString()}만원
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
          연 {(item.estimatedLoss * 12 / 10000).toLocaleString()}만원
        </div>
      </div>
      
      {/* Recommendations */}
      <div>
        <div style={{ 
          fontSize: '10px', 
          color: 'rgba(255,255,255,0.4)', 
          letterSpacing: '2px',
          marginBottom: '12px',
        }}>
          확인 필요 사항
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {item.recommendations.map((rec, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.7)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>☐</span>
              {rec}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Summary Panel Component
// ═══════════════════════════════════════════════════════════════════════════════

interface SummaryPanelProps {
  result: PressureResult;
  academyData: typeof SAMPLE_ACADEMY_DATA;
}

const SummaryPanel: React.FC<SummaryPanelProps> = ({ result, academyData }) => {
  return (
    <div style={{
      padding: '24px',
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: '16px',
      marginBottom: '24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Left: Academy Info */}
        <div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
            {academyData.name}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
            학생 {academyData.students}명 | 강사 {academyData.teachers}명 | 
            월매출 {(academyData.monthlyRevenue / 10000).toLocaleString()}만원
          </div>
        </div>
        
        {/* Right: State Summary */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '28px', 
              fontWeight: 700, 
              color: PRESSURE_STATES.IRREVERSIBLE.color,
            }}>
              {result.irreversibleCount}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
              {PRESSURE_STATES.IRREVERSIBLE.symbol} IRREVERSIBLE
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '28px', 
              fontWeight: 700, 
              color: PRESSURE_STATES.PRESSURING.color,
            }}>
              {result.pressuringCount}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
              {PRESSURE_STATES.PRESSURING.symbol} PRESSURING
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '28px', 
              fontWeight: 700, 
              color: PRESSURE_STATES.IGNORABLE.color,
            }}>
              {result.ignorableCount}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
              {PRESSURE_STATES.IGNORABLE.symbol} IGNORABLE
            </div>
          </div>
        </div>
      </div>
      
      {/* Situation */}
      <div style={{
        marginTop: '16px',
        padding: '12px 16px',
        backgroundColor: 'rgba(239,68,68,0.1)',
        borderRadius: '8px',
        borderLeft: '3px solid #ef4444',
      }}>
        <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 500 }}>
          ⚠️ 상황: {academyData.situation}
        </div>
      </div>
      
      {/* Total Loss */}
      <div style={{
        marginTop: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: '8px',
      }}>
        <div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
            미루면 발생 가능한 총 비용
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>
            월 {(result.totalEstimatedLoss / 10000).toLocaleString()}만원
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
            연간 환산
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
            {(result.totalEstimatedLoss * 12 / 100000000).toFixed(1)}억원
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

function formatValue(value: number, unit?: string): string {
  if (unit === 'KRW') {
    return `${(value / 10000).toLocaleString()}만원`;
  }
  if (typeof value === 'number' && Math.abs(value) < 10) {
    if (Math.abs(value) < 1) {
      return `${(value * 100).toFixed(1)}%`;
    }
    return value.toFixed(2);
  }
  return value.toLocaleString();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export const PressureMapView: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<PressureItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'pressuring' | 'irreversible'>('all');
  
  // Calculate pressure using sample data
  const calculator = useMemo(() => 
    new PressureCalculator(ACADEMY_THRESHOLDS, ACADEMY_EXPOSURE_WEIGHTS),
    []
  );
  
  const result = useMemo(() => 
    calculator.analyze(
      SAMPLE_ACADEMY_DATA.nodeValues,
      'sample-academy',
      'academy',
      SAMPLE_ACADEMY_DATA.deadlines,
      SAMPLE_ACADEMY_DATA.monthlyRevenue
    ),
    [calculator]
  );
  
  // Filter items
  const filteredItems = useMemo(() => {
    if (filter === 'pressuring') return result.pressuringItems;
    if (filter === 'irreversible') return result.irreversibleItems;
    return result.items;
  }, [result, filter]);
  
  return (
    <div style={{
      minHeight: '100%',
      height: '100%',
      backgroundColor: '#0a0a0a',
      color: '#fff',
    }}>
      {/* Header */}
      <header style={{
        padding: '24px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
            🎯 Pressure Map
          </h1>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0 0' }}>
            결정을 미루면 손해가 확정되는 지점만 표시하는 레이더
          </p>
        </div>
        
        {/* Filter */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'pressuring', 'irreversible'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: filter === f ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: filter === f ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {f === 'all' ? '전체' : f === 'pressuring' ? '🟡 압박' : '🔴 비가역'}
              ({f === 'all' ? result.items.length : f === 'pressuring' ? result.pressuringCount : result.irreversibleCount})
            </button>
          ))}
        </div>
      </header>
      
      {/* Main Content */}
      <main style={{ padding: '24px 32px' }}>
        {/* Summary */}
        <SummaryPanel result={result} academyData={SAMPLE_ACADEMY_DATA} />
        
        {/* Cards Grid */}
        {filteredItems.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px',
          }}>
            {filteredItems.map(item => (
              <SpecialistCard
                key={item.nodeId}
                item={item}
                isSelected={selectedItem?.nodeId === item.nodeId}
                onSelect={() => setSelectedItem(item)}
              />
            ))}
          </div>
        ) : (
          <div style={{
            padding: '60px',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.3)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🟢</div>
            <div style={{ fontSize: '18px', fontWeight: 600 }}>모든 지표 정상</div>
            <div style={{ fontSize: '13px', marginTop: '8px' }}>
              압박 중인 항목이 없습니다
            </div>
          </div>
        )}
      </main>
      
      {/* Detail Panel */}
      {selectedItem && (
        <DetailPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
};

export default PressureMapView;
