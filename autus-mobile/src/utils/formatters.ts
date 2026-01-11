/**
 * AUTUS Mobile - Formatting Utilities
 */

import { Node } from '../types';

/**
 * 노드 값 포맷팅 (단위별)
 */
export const formatNodeValue = (node: Node): string => {
  const v = node.value;
  const id = node.id;
  
  // 금액 노드
  if (['n01', 'n02', 'n03', 'n04', 'n06', 'n07', 'n27', 'n28'].includes(id)) {
    if (v >= 100000000) return (v / 100000000).toFixed(1) + '억';
    if (v >= 10000000) return (v / 10000000).toFixed(1) + '천만';
    if (v >= 10000) return (v / 10000).toFixed(0) + '만';
    return v.toLocaleString();
  }
  
  // 런웨이 (주)
  if (id === 'n05') return v + '주';
  
  // 시간 노드
  if (['n09', 'n12', 'n13'].includes(id)) return v.toFixed(1) + 'h';
  
  // HRV (ms)
  if (id === 'n10') return v + 'ms';
  
  // 퍼센트 노드
  if (['n08', 'n17', 'n19', 'n24', 'n26', 'n31', 'n33', 'n34', 'n35'].includes(id)) {
    return v + '%';
  }
  
  // 리드 (주당)
  if (id === 'n29') return v + '/주';
  
  // 기본
  return String(v);
};

/**
 * 숫자를 3자리 콤마 포맷
 */
export const formatNumber = (n: number): string => {
  return n.toLocaleString('ko-KR');
};

/**
 * 소수점 포맷 (자릿수 지정)
 */
export const formatDecimal = (n: number, digits: number = 2): string => {
  return n.toFixed(digits);
};

/**
 * 퍼센트 포맷
 */
export const formatPercent = (n: number): string => {
  return (n * 100).toFixed(0) + '%';
};

/**
 * 날짜 포맷 (상대 시간)
 */
export const formatRelativeTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  
  return date.toLocaleDateString('ko-KR');
};

/**
 * 날짜 포맷 (YYYY.MM.DD)
 */
export const formatDate = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * 시간 포맷 (HH:MM)
 */
export const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};
