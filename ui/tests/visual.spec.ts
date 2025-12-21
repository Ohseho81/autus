/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Visual QA — Playwright Tests
 * 
 * 환경 고정: 1920×1080, DPR=1, zoom=100%
 * Golden Set: G1_NAV, G2_ALERT, G3_CONTROL
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════════════════════
// 환경 설정 (LOCKED)
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_URL = process.env.BASE_URL || "http://localhost:8000/frontend/tesla-nav.html";
const VIEWPORT = { width: 1920, height: 1080 };
const FIXTURES_DIR = path.join(__dirname, "../fixtures");

test.use({
  viewport: VIEWPORT,
  deviceScaleFactor: 1,  // DPR = 1
  colorScheme: "dark",
  locale: "en-US",
});

// ═══════════════════════════════════════════════════════════════════════════════
// 헬퍼 함수
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fixture JSON을 window.__AUTUS_GOLDEN__에 주입
 */
async function injectFixture(page: any, fixtureName: string): Promise<void> {
  const fixturePath = path.join(FIXTURES_DIR, fixtureName);
  const json = fs.readFileSync(fixturePath, "utf-8");
  
  await page.addInitScript((data: string) => {
    (window as any).__AUTUS_GOLDEN__ = JSON.parse(data);
  }, json);
}

/**
 * 애니메이션 비활성화 (일관된 캡처를 위해)
 */
async function disableAnimations(page: any): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}

/**
 * 줌 100% 강제
 */
async function forceZoom100(page: any): Promise<void> {
  await page.evaluate(() => {
    document.documentElement.style.zoom = "100%";
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Golden Tests
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("Golden Set Visual Tests", () => {
  
  test("G1_NAV — 기본 내비 상태", async ({ page }) => {
    // Fixture 주입
    await injectFixture(page, "golden.nav.json");
    
    // 페이지 로드
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    
    // 환경 고정
    await forceZoom100(page);
    await disableAnimations(page);
    
    // 안정화 대기
    await page.waitForTimeout(500);
    
    // 스크린샷 비교
    expect(await page.screenshot({ fullPage: true }))
      .toMatchSnapshot("G1_NAV.png", {
        maxDiffPixels: 0,  // Track A: Pixel-Exact
      });
  });

  test("G2_ALERT — 위험 경고 상태", async ({ page }) => {
    // NAV 베이스 + ALERT 오버라이드
    await injectFixture(page, "golden.nav.json");
    
    // ALERT 데이터 추가 주입
    const alertJson = fs.readFileSync(
      path.join(FIXTURES_DIR, "golden.alert.json"),
      "utf-8"
    );
    
    await page.addInitScript((alertData: string) => {
      const base = (window as any).__AUTUS_GOLDEN__ || {};
      const alert = JSON.parse(alertData);
      (window as any).__AUTUS_GOLDEN__ = { ...base, ...alert };
    }, alertJson);
    
    // 페이지 로드
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    
    // 환경 고정
    await forceZoom100(page);
    await disableAnimations(page);
    
    // 안정화 대기
    await page.waitForTimeout(500);
    
    // 스크린샷 비교
    expect(await page.screenshot({ fullPage: true }))
      .toMatchSnapshot("G2_ALERT.png", {
        maxDiffPixels: 0,  // Track A: Pixel-Exact
      });
  });

  test("G3_CONTROL — 조작 집중 상태", async ({ page }) => {
    // Fixture 주입
    await injectFixture(page, "golden.control.json");
    
    // 페이지 로드
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    
    // 환경 고정
    await forceZoom100(page);
    await disableAnimations(page);
    
    // 안정화 대기
    await page.waitForTimeout(500);
    
    // 스크린샷 비교
    expect(await page.screenshot({ fullPage: true }))
      .toMatchSnapshot("G3_CONTROL.png", {
        maxDiffPixels: 0,  // Track A: Pixel-Exact
      });
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// Track B Tests (Product Standard: ≤0.5%)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("Track B — Product Standard", () => {
  
  test("G1_NAV (Track B: ≤0.5%)", async ({ page }) => {
    await injectFixture(page, "golden.nav.json");
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await forceZoom100(page);
    await disableAnimations(page);
    await page.waitForTimeout(500);
    
    // Track B: 0.5% = 1920*1080*0.005 = 10,368 pixels
    expect(await page.screenshot({ fullPage: true }))
      .toMatchSnapshot("G1_NAV.png", {
        maxDiffPixels: 10368,  // Track B: ≤0.5%
      });
  });

  test("G2_ALERT (Track B: ≤0.5%)", async ({ page }) => {
    await injectFixture(page, "golden.nav.json");
    const alertJson = fs.readFileSync(
      path.join(FIXTURES_DIR, "golden.alert.json"),
      "utf-8"
    );
    await page.addInitScript((alertData: string) => {
      const base = (window as any).__AUTUS_GOLDEN__ || {};
      const alert = JSON.parse(alertData);
      (window as any).__AUTUS_GOLDEN__ = { ...base, ...alert };
    }, alertJson);
    
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await forceZoom100(page);
    await disableAnimations(page);
    await page.waitForTimeout(500);
    
    expect(await page.screenshot({ fullPage: true }))
      .toMatchSnapshot("G2_ALERT.png", {
        maxDiffPixels: 10368,  // Track B: ≤0.5%
      });
  });

  test("G3_CONTROL (Track B: ≤0.5%)", async ({ page }) => {
    await injectFixture(page, "golden.control.json");
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await forceZoom100(page);
    await disableAnimations(page);
    await page.waitForTimeout(500);
    
    expect(await page.screenshot({ fullPage: true }))
      .toMatchSnapshot("G3_CONTROL.png", {
        maxDiffPixels: 10368,  // Track B: ≤0.5%
      });
  });

});
