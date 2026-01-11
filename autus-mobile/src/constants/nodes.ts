/**
 * AUTUS Mobile - 36 Nodes Data
 */

import { Node } from '../types';

export const INITIAL_NODES: Record<string, Node> = {
  // L1: 💰 재무 (8개)
  n01: { id: 'n01', name: '현금', icon: '💵', layer: 'L1', active: true, value: 25000000, pressure: 0.45, state: 'PRESSURING' },
  n02: { id: 'n02', name: '수입', icon: '📈', layer: 'L1', active: false, value: 8000000, pressure: 0.20, state: 'IGNORABLE' },
  n03: { id: 'n03', name: '지출', icon: '📉', layer: 'L1', active: false, value: 6500000, pressure: 0.35, state: 'PRESSURING' },
  n04: { id: 'n04', name: '부채', icon: '💳', layer: 'L1', active: false, value: 30000000, pressure: 0.25, state: 'IGNORABLE' },
  n05: { id: 'n05', name: '런웨이', icon: '⏱️', layer: 'L1', active: true, value: 9, pressure: 0.75, state: 'IRREVERSIBLE' },
  n06: { id: 'n06', name: '예비비', icon: '🛡️', layer: 'L1', active: true, value: 5000000, pressure: 0.85, state: 'IRREVERSIBLE' },
  n07: { id: 'n07', name: '미수금', icon: '📄', layer: 'L1', active: false, value: 8000000, pressure: 0.15, state: 'IGNORABLE' },
  n08: { id: 'n08', name: '마진', icon: '💹', layer: 'L1', active: false, value: 18, pressure: 0.28, state: 'IGNORABLE' },
  
  // L2: ❤️ 생체 (6개)
  n09: { id: 'n09', name: '수면', icon: '😴', layer: 'L2', active: true, value: 5.0, pressure: 0.55, state: 'PRESSURING' },
  n10: { id: 'n10', name: 'HRV', icon: '💓', layer: 'L2', active: true, value: 32, pressure: 0.60, state: 'PRESSURING' },
  n11: { id: 'n11', name: '활동량', icon: '🏃', layer: 'L2', active: false, value: 35, pressure: 0.25, state: 'IGNORABLE' },
  n12: { id: 'n12', name: '연속작업', icon: '⌨️', layer: 'L2', active: false, value: 4.5, pressure: 0.42, state: 'PRESSURING' },
  n13: { id: 'n13', name: '휴식간격', icon: '☕', layer: 'L2', active: false, value: 2.5, pressure: 0.33, state: 'PRESSURING' },
  n14: { id: 'n14', name: '병가', icon: '🏥', layer: 'L2', active: false, value: 0, pressure: 0.00, state: 'IGNORABLE' },
  
  // L3: ⚙️ 운영 (8개)
  n15: { id: 'n15', name: '마감', icon: '📅', layer: 'L3', active: true, value: 7, pressure: 0.58, state: 'PRESSURING' },
  n16: { id: 'n16', name: '지연', icon: '⏰', layer: 'L3', active: true, value: 5, pressure: 0.25, state: 'IGNORABLE' },
  n17: { id: 'n17', name: '가동률', icon: '⚡', layer: 'L3', active: false, value: 78, pressure: 0.22, state: 'IGNORABLE' },
  n18: { id: 'n18', name: '태스크', icon: '📋', layer: 'L3', active: true, value: 38, pressure: 0.58, state: 'PRESSURING' },
  n19: { id: 'n19', name: '오류율', icon: '🐛', layer: 'L3', active: false, value: 3.2, pressure: 0.28, state: 'IGNORABLE' },
  n20: { id: 'n20', name: '처리속도', icon: '🚀', layer: 'L3', active: false, value: 15, pressure: 0.30, state: 'PRESSURING' },
  n21: { id: 'n21', name: '재고', icon: '📦', layer: 'L3', active: false, value: 18, pressure: 0.20, state: 'IGNORABLE' },
  n22: { id: 'n22', name: '의존도', icon: '🔗', layer: 'L3', active: false, value: 35, pressure: 0.22, state: 'IGNORABLE' },
  
  // L4: 👥 고객 (7개)
  n23: { id: 'n23', name: '고객수', icon: '👤', layer: 'L4', active: true, value: 45, pressure: 0.30, state: 'PRESSURING' },
  n24: { id: 'n24', name: '이탈률', icon: '🚪', layer: 'L4', active: true, value: 7, pressure: 0.48, state: 'PRESSURING' },
  n25: { id: 'n25', name: 'NPS', icon: '⭐', layer: 'L4', active: false, value: 32, pressure: 0.24, state: 'IGNORABLE' },
  n26: { id: 'n26', name: '반복구매', icon: '🔄', layer: 'L4', active: false, value: 22, pressure: 0.30, state: 'PRESSURING' },
  n27: { id: 'n27', name: 'CAC', icon: '💰', layer: 'L4', active: false, value: 85000, pressure: 0.28, state: 'IGNORABLE' },
  n28: { id: 'n28', name: 'LTV', icon: '💎', layer: 'L4', active: false, value: 280000, pressure: 0.25, state: 'IGNORABLE' },
  n29: { id: 'n29', name: '리드', icon: '📥', layer: 'L4', active: true, value: 6, pressure: 0.20, state: 'IGNORABLE' },
  
  // L5: 🌍 외부 (7개)
  n30: { id: 'n30', name: '직원', icon: '👥', layer: 'L5', active: false, value: 5, pressure: 0.15, state: 'IGNORABLE' },
  n31: { id: 'n31', name: '이직률', icon: '🚶', layer: 'L5', active: false, value: 12, pressure: 0.18, state: 'IGNORABLE' },
  n32: { id: 'n32', name: '경쟁자', icon: '🎯', layer: 'L5', active: false, value: 5, pressure: 0.22, state: 'IGNORABLE' },
  n33: { id: 'n33', name: '시장성장', icon: '📊', layer: 'L5', active: false, value: 8, pressure: 0.20, state: 'IGNORABLE' },
  n34: { id: 'n34', name: '환율', icon: '💱', layer: 'L5', active: false, value: 5, pressure: 0.18, state: 'IGNORABLE' },
  n35: { id: 'n35', name: '금리', icon: '🏦', layer: 'L5', active: false, value: 4.5, pressure: 0.25, state: 'IGNORABLE' },
  n36: { id: 'n36', name: '규제', icon: '📜', layer: 'L5', active: false, value: 1, pressure: 0.10, state: 'IGNORABLE' },
};
