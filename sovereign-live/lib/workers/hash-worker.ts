/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔧 Web Worker - Hash 연산 오프로드
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 메인 스레드 블로킹 방지
 */

self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;

  if (type === "sha256") {
    const enc = new TextEncoder().encode(data);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    const hash = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    
    self.postMessage({ type: "sha256", result: hash });
  }

  if (type === "sha256File") {
    const buf = await crypto.subtle.digest("SHA-256", data);
    const hash = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    
    self.postMessage({ type: "sha256File", result: hash });
  }
};

export {};
