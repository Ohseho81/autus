/**
 * Semantic Hash: 동일한 의미의 행동 패턴 감지
 * 
 * 예시:
 * - "김민수에게 알림톡 발송" + "이지은에게 알림톡 발송" 
 *   → 동일한 semantic_hash (이름 제거 후 해싱)
 * - 2회 이상 동일 해시 → 표준화 후보
 */

/**
 * 텍스트 정규화
 */
export function normalizeForHash(input) {
  return input
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
}

/**
 * SHA-256 해싱 (브라우저 호환)
 */
export async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Semantic Hash 생성
 */
export async function semanticHash(actionType, content) {
  const normalized = normalizeForHash(`${actionType}::${content}`);
  return sha256Hex(normalized);
}

/**
 * PII 마스킹 유틸리티
 */
export function maskPII(text) {
  return text
    // 한국 이름 패턴 (2-4글자)
    .replace(/[가-힣]{2,4}(?=\s*(학생|님|씨|선생|부모|엄마|아빠))/g, '[이름]')
    // 전화번호
    .replace(/\d{2,3}-?\d{3,4}-?\d{4}/g, '[전화]')
    // 이메일
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[이메일]');
}

/**
 * 간단한 해시 (동기 버전, 데모용)
 */
export function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}
