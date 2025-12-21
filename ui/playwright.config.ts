/**
 * AUTUS Visual QA — Playwright Configuration
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  
  /* 타임아웃 */
  timeout: 30000,
  expect: {
    timeout: 5000,
    toMatchSnapshot: {
      // Track A는 maxDiffPixels: 0 (테스트에서 개별 설정)
      // Track B는 maxDiffPixels: 10368 (0.5%)
      threshold: 0.1,
    },
  },
  
  /* 병렬 실행 비활성화 (일관성 유지) */
  fullyParallel: false,
  workers: 1,
  
  /* 재시도 없음 (결정론적) */
  retries: 0,
  
  /* 리포터 */
  reporter: [
    ["html", { outputFolder: "../playwright-report" }],
    ["json", { outputFile: "../playwright-report/results.json" }],
    ["list"],
  ],
  
  /* 스크린샷 저장 */
  use: {
    /* 베이스 URL */
    baseURL: process.env.BASE_URL || "http://localhost:8000",
    
    /* 스크린샷 모드 */
    screenshot: "only-on-failure",
    
    /* 트레이스 (디버깅용) */
    trace: "on-first-retry",
  },
  
  /* 프로젝트 정의 */
  projects: [
    {
      name: "golden-track-a",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        colorScheme: "dark",
        locale: "en-US",
      },
      testMatch: /visual\.spec\.ts/,
      testIgnore: /track-b/,
    },
    {
      name: "golden-track-b",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        colorScheme: "dark",
        locale: "en-US",
      },
      testMatch: /visual\.spec\.ts/,
    },
  ],
  
  /* 스냅샷 디렉토리 */
  snapshotDir: "./snapshots",
  
  /* 출력 디렉토리 */
  outputDir: "../test-results",
});
