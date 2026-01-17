/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔐 Hash Utilities (클라이언트 사이드)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 증빙 무결성 검증을 위한 SHA-256 해시
 * Web Crypto API 사용 (서버 불필요)
 */

/**
 * SHA-256 해시 생성
 */
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 파일 해시 생성
 */
export async function sha256File(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 해시 검증
 */
export async function verifyHash(content: string, expectedHash: string): Promise<boolean> {
  const actualHash = await sha256(content);
  return actualHash === expectedHash;
}

/**
 * 짧은 해시 (표시용)
 */
export function shortHash(hash: string, length = 8): string {
  return hash.slice(0, length) + "…" + hash.slice(-4);
}
