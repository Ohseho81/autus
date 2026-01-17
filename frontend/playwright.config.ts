/**
 * AUTUS Playwright E2E 테스트 설정
 * ================================
 * - 멀티 브라우저 테스트
 * - 모바일/데스크톱 뷰포트
 * - 접근성 테스트
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // 테스트 디렉토리
  testDir: './e2e',
  
  // 테스트 파일 패턴
  testMatch: '**/*.spec.ts',
  
  // 병렬 실행
  fullyParallel: true,
  
  // CI 환경에서 재시도
  retries: process.env.CI ? 2 : 0,
  
  // 워커 수
  workers: process.env.CI ? 1 : undefined,
  
  // 리포터
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],
  
  // 전역 설정
  use: {
    // 기본 URL
    baseURL: 'http://localhost:3000',
    
    // 스크린샷
    screenshot: 'only-on-failure',
    
    // 비디오
    video: 'retain-on-failure',
    
    // 트레이스
    trace: 'on-first-retry',
    
    // 타임아웃
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  // 프로젝트 (브라우저/디바이스)
  projects: [
    // 데스크톱 브라우저
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // 모바일 디바이스
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
    
    // 태블릿
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro 11'] },
    },
    
    // 접근성 테스트 (axe-core)
    {
      name: 'accessibility',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/*.a11y.spec.ts',
    },
  ],
  
  // 개발 서버
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // 기존 서버 재사용
    timeout: 120000,
  },
  
  // 타임아웃
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
});
