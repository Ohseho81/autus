/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 72 매트릭스 뷰 (v2.0 실체화된 구조)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 72 = 6 물리법칙 × 12 개체성질
 * 
 * 각 셀: [법칙 × 성질]의 비즈니스 의미 표시
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import {
  PHYSICS_LAWS,
  PHYSICS_LAW_LIST,
  ENTITY_PROPERTIES,
  ENTITY_PROPERTY_LIST,
  ALL_72_NODES,
  Node72,
  STOCK_PROPERTIES,
  FLOW_PROPERTIES,
  RELATION_PROPERTIES,
  PHYSICS_72_SUMMARY,
} from '../../engine/Physics72Definition';

// ═══════════════════════════════════════════════════════════════════════════════
// Types & Constants
// ═══════════════════════════════════════════════════════════════════════════════

type ViewMode = 'matrix' | 'detail' | 'interaction';

const PROPERTY_CATEGORY_COLORS = {
  STOCK: '#3b82f6',    // 파랑
  FLOW: '#10b981',     // 초록
  RELATION: '#f59e0b', // 주황
};

// ═══════════════════════════════════════════════════════════════════════════════
// Sub Components
// ═══════════════════════════════════════════════════════════════════════════════

const NodeCell: React.FC<{
  node: Node72;
  isSelected: boolean;
  onClick: () => void;
}> = ({ node, isSelected, onClick }) => (
  <div
    onClick={onClick}
    style={{
      padding: '6px 4px',
      backgroundColor: isSelected ? `${node.law.color}30` : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isSelected ? node.law.color : 'rgba(255,255,255,0.05)'}`,
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      minHeight: '50px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.backgroundColor = `${node.law.color}15`;
      e.currentTarget.style.borderColor = `${node.law.color}50`;
    }}
    onMouseLeave={e => {
      e.currentTarget.style.backgroundColor = isSelected ? `${node.law.color}30` : 'rgba(255,255,255,0.02)';
      e.currentTarget.style.borderColor = isSelected ? node.law.color : 'rgba(255,255,255,0.05)';
    }}
  >
    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
      {node.id}
    </div>
    <div style={{ 
      fontSize: '10px', 
      fontWeight: 600, 
      color: node.law.color,
      textAlign: 'center',
      lineHeight: 1.2,
      marginTop: '2px',
    }}>
      {node.property.name}<br/>{node.law.name}
    </div>
  </div>
);

const NodeDetailPanel: React.FC<{ node: Node72 }> = ({ node }) => (
  <div style={{
    padding: '20px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: '12px',
    border: `1px solid ${node.law.color}30`,
  }}>
    {/* Header */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: `linear-gradient(135deg, ${node.law.color}, ${node.property.color})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
      }}>
        {node.property.symbol}
      </div>
      <div>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
          {node.id} | {node.dbColumn}
        </div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: node.law.color }}>
          {node.nameKo}
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
          {node.law.symbol} {node.law.name} × {node.property.symbol} {node.property.name}
        </div>
      </div>
    </div>
    
    {/* Definition */}
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', marginBottom: '6px' }}>
        정의
      </div>
      <div style={{
        padding: '12px',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: '8px',
        fontSize: '13px',
        color: 'rgba(255,255,255,0.8)',
        lineHeight: 1.6,
      }}>
        {node.definition}
      </div>
    </div>
    
    {/* Formula (계산식) */}
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', marginBottom: '6px' }}>
        계산식
      </div>
      <div style={{
        padding: '12px',
        backgroundColor: `${node.law.color}10`,
        borderRadius: '8px',
        borderLeft: `3px solid ${node.law.color}`,
        fontSize: '14px',
        color: node.law.color,
        fontWeight: 600,
        fontFamily: 'monospace',
      }}>
        📐 {node.formula}
      </div>
    </div>
    
    {/* DB Column */}
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', marginBottom: '6px' }}>
        DB 컬럼
      </div>
      <div style={{
        padding: '12px',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: '8px',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.7)',
        fontFamily: 'monospace',
      }}>
        💾 {node.dbColumn}
      </div>
    </div>
    
    {/* Law & Property Info */}
    <div style={{
      marginTop: '20px',
      padding: '16px',
      backgroundColor: 'rgba(255,255,255,0.02)',
      borderRadius: '8px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
    }}>
      {/* Law Info */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span style={{ fontSize: '16px' }}>{node.law.symbol}</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: node.law.color }}>{node.law.name}</span>
        </div>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
          {node.law.definition}
        </div>
        <div style={{ 
          marginTop: '8px',
          fontSize: '11px', 
          color: node.law.color, 
          fontFamily: 'monospace',
          fontWeight: 600,
        }}>
          {node.law.formula}
        </div>
      </div>
      
      {/* Property Info */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span style={{ fontSize: '16px' }}>{node.property.symbol}</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: node.property.color }}>{node.property.name}</span>
          <span style={{
            padding: '2px 6px',
            backgroundColor: `${PROPERTY_CATEGORY_COLORS[node.property.category]}20`,
            borderRadius: '4px',
            fontSize: '8px',
            color: PROPERTY_CATEGORY_COLORS[node.property.category],
          }}>
            {node.property.category}
          </span>
        </div>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
          {node.property.definition}
        </div>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export const Matrix72View: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<Node72 | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [filterLaw, setFilterLaw] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  
  // 필터링된 노드
  const filteredNodes = useMemo(() => {
    let result = ALL_72_NODES;
    if (filterLaw) {
      result = result.filter(n => n.law.id === filterLaw);
    }
    if (filterCategory) {
      result = result.filter(n => n.property.category === filterCategory);
    }
    return result;
  }, [filterLaw, filterCategory]);
  
  return (
    <div style={{
      minHeight: '100%',
      height: '100%',
      backgroundColor: '#030308',
      color: '#fff',
      fontFamily: '"SF Pro Display", -apple-system, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6, #10b981)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
          }}>⚖️</div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '2px' }}>
              72 MATRIX
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
              6 물리법칙 × 12 개체성질 = 72 비즈니스 노드
            </div>
          </div>
        </div>
        
        {/* View Mode Toggle */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['matrix', 'detail'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '8px 16px',
                backgroundColor: viewMode === mode ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${viewMode === mode ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '8px',
                color: viewMode === mode ? '#3b82f6' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {mode === 'matrix' ? '📊 매트릭스' : '📋 상세'}
            </button>
          ))}
        </div>
      </header>
      
      <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT: Filters */}
        <aside style={{
          width: '200px',
          padding: '16px',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          overflowY: 'auto',
        }}>
          {/* Law Filter */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', marginBottom: '10px' }}>
              물리 법칙 (6)
            </div>
            {PHYSICS_LAW_LIST.map(law => (
              <div
                key={law.id}
                onClick={() => setFilterLaw(filterLaw === law.id ? null : law.id)}
                style={{
                  padding: '10px 12px',
                  marginBottom: '6px',
                  backgroundColor: filterLaw === law.id ? `${law.color}20` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${filterLaw === law.id ? law.color : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '16px' }}>{law.symbol}</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: law.color }}>{law.name}</div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>{law.nameEn}</div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Category Filter */}
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', marginBottom: '10px' }}>
              성질 카테고리 (3)
            </div>
            {(['STOCK', 'FLOW', 'RELATION'] as const).map(cat => {
              const props = cat === 'STOCK' ? STOCK_PROPERTIES :
                           cat === 'FLOW' ? FLOW_PROPERTIES : RELATION_PROPERTIES;
              const label = cat === 'STOCK' ? '자산 (Stock)' :
                           cat === 'FLOW' ? '흐름 (Flow)' : '관계 (Relation)';
              return (
                <div
                  key={cat}
                  onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
                  style={{
                    padding: '10px 12px',
                    marginBottom: '6px',
                    backgroundColor: filterCategory === cat ? `${PROPERTY_CATEGORY_COLORS[cat]}20` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${filterCategory === cat ? PROPERTY_CATEGORY_COLORS[cat] : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: PROPERTY_CATEGORY_COLORS[cat] }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                    {props.map(p => p.symbol).join(' ')}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Reset Filter */}
          {(filterLaw || filterCategory) && (
            <button
              onClick={() => { setFilterLaw(null); setFilterCategory(null); }}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '10px',
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              🔄 필터 초기화
            </button>
          )}
          
          {/* Summary */}
          <div style={{
            marginTop: '20px',
            padding: '12px',
            backgroundColor: 'rgba(255,255,255,0.02)',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>
              {filteredNodes.length}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
              / 72 노드
            </div>
          </div>
        </aside>
        
        {/* CENTER: Matrix or List */}
        <section style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
        }}>
          {viewMode === 'matrix' ? (
            <>
              {/* Matrix Header (개체성질) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '80px repeat(12, 1fr)',
                gap: '4px',
                marginBottom: '4px',
                position: 'sticky',
                top: 0,
                backgroundColor: '#030308',
                zIndex: 10,
                paddingBottom: '8px',
              }}>
                <div /> {/* 빈 코너 */}
                {ENTITY_PROPERTY_LIST.map(prop => (
                  <div key={prop.id} style={{
                    textAlign: 'center',
                    padding: '8px 4px',
                    backgroundColor: `${PROPERTY_CATEGORY_COLORS[prop.category]}10`,
                    borderRadius: '4px',
                  }}>
                    <div style={{ fontSize: '14px' }}>{prop.symbol}</div>
                    <div style={{ fontSize: '9px', color: prop.color, fontWeight: 600 }}>{prop.name}</div>
                  </div>
                ))}
              </div>
              
              {/* Matrix Rows (물리법칙) */}
              {PHYSICS_LAW_LIST.map(law => (
                <div key={law.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '80px repeat(12, 1fr)',
                  gap: '4px',
                  marginBottom: '4px',
                }}>
                  {/* Row Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px',
                    backgroundColor: `${law.color}10`,
                    borderRadius: '4px',
                  }}>
                    <span style={{ fontSize: '16px' }}>{law.symbol}</span>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: law.color }}>{law.name}</div>
                      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)' }}>{law.nameEn}</div>
                    </div>
                  </div>
                  
                  {/* Cells */}
                  {ENTITY_PROPERTY_LIST.map(prop => {
                    const node = ALL_72_NODES.find(n => n.law.id === law.id && n.property.id === prop.id);
                    if (!node) return <div key={prop.id} />;
                    
                    const isFiltered = filteredNodes.includes(node);
                    
                    return (
                      <div
                        key={prop.id}
                        style={{ opacity: isFiltered ? 1 : 0.2 }}
                      >
                        <NodeCell
                          node={node}
                          isSelected={selectedNode?.id === node.id}
                          onClick={() => setSelectedNode(node)}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          ) : (
            /* Detail List View */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {filteredNodes.map(node => (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  style={{
                    padding: '14px',
                    backgroundColor: selectedNode?.id === node.id ? `${node.law.color}15` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${selectedNode?.id === node.id ? node.law.color : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: `linear-gradient(135deg, ${node.law.color}, ${node.property.color})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                    }}>
                      {node.property.symbol}
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                        {node.id}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: node.law.color }}>
                        {node.nameKo}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                    {node.definition}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        
        {/* RIGHT: Selected Node Detail */}
        {selectedNode && (
          <aside style={{
            width: '380px',
            padding: '16px',
            borderLeft: '1px solid rgba(255,255,255,0.05)',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px' }}>
                NODE DETAIL
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  fontSize: '18px',
                }}
              >×</button>
            </div>
            
            <NodeDetailPanel node={selectedNode} />
          </aside>
        )}
      </main>
    </div>
  );
};

export default Matrix72View;
