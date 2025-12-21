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
    // URL 파라미터로 모드 전환
    await page.goto(`${BASE_URL}?mode=NAV`, { waitUntil: "networkidle" });
    
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
    // URL 파라미터로 모드 전환
    await page.goto(`${BASE_URL}?mode=ALERT`, { waitUntil: "networkidle" });
    
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
    // URL 파라미터로 모드 전환
    await page.goto(`${BASE_URL}?mode=CONTROL`, { waitUntil: "networkidle" });
    
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
    await page.goto(`${BASE_URL}?mode=NAV`, { waitUntil: "networkidle" });
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
    await page.goto(`${BASE_URL}?mode=ALERT`, { waitUntil: "networkidle" });
    await forceZoom100(page);
    await disableAnimations(page);
    await page.waitForTimeout(500);
    
    expect(await page.screenshot({ fullPage: true }))
      .toMatchSnapshot("G2_ALERT.png", {
        maxDiffPixels: 10368,  // Track B: ≤0.5%
      });
  });

  test("G3_CONTROL (Track B: ≤0.5%)", async ({ page }) => {
    await page.goto(`${BASE_URL}?mode=CONTROL`, { waitUntil: "networkidle" });
    await forceZoom100(page);
    await disableAnimations(page);
    await page.waitForTimeout(500);
    
    expect(await page.screenshot({ fullPage: true }))
      .toMatchSnapshot("G3_CONTROL.png", {
        maxDiffPixels: 10368,  // Track B: ≤0.5%
      });
  });

});
