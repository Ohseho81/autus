/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Visual QA — Golden Capture Script (Playwright)
 * 
 * 표준 ② 캡처 환경: 1920×1080, DPR=1, Zoom=100%, sRGB
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════════════════════
// 표준 환경 설정 (LOCKED)
// ═══════════════════════════════════════════════════════════════════════════════

const CAPTURE_ENV = {
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,  // DPR = 1
  colorScheme: 'dark' as const,
  locale: 'ko-KR',
  timezoneId: 'Asia/Seoul',
};

const GOLDEN_DIR = path.join(__dirname, '../golden');
const REPORTS_DIR = path.join(__dirname, '../reports');

// State fixtures
const STATES = ['G1_NAV', 'G2_ALERT', 'G3_CONTROL'];

// ═══════════════════════════════════════════════════════════════════════════════
// 상태 주입 함수
// ═══════════════════════════════════════════════════════════════════════════════

interface StateData {
  id: string;
  data: Record<string, unknown>;
  layers: Record<string, boolean>;
  alert?: Record<string, unknown>;
  control_panel?: Record<string, unknown>;
}

async function injectState(page: Page, stateId: string): Promise<void> {
  // Load fixtures
  const fixturesPath = path.join(GOLDEN_DIR, 'state-fixtures.json');
  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));
  const state = fixtures.states[stateId] as StateData;
  
  if (!state) {
    throw new Error(`State ${stateId} not found in fixtures`);
  }
  
  // Inject state data into window
  await page.evaluate((stateData) => {
    // @ts-ignore
    window.__AUTUS_STATE__ = stateData;
    
    // Dispatch state change event
    window.dispatchEvent(new CustomEvent('autus:state-change', {
      detail: stateData
    }));
  }, state);
  
  // Wait for UI to stabilize
  await page.waitForTimeout(500);
  
  // Verify state was applied
  const appliedState = await page.evaluate(() => {
    // @ts-ignore
    return window.__AUTUS_STATE__?.id;
  });
  
  if (appliedState !== stateId) {
    console.warn(`Warning: State ${stateId} may not have been fully applied`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 캡처 함수
// ═══════════════════════════════════════════════════════════════════════════════

async function captureGolden(
  page: Page,
  stateId: string,
  outputPath: string
): Promise<void> {
  // Inject state
  await injectState(page, stateId);
  
  // Wait for animations to complete
  await page.waitForTimeout(1000);
  
  // Disable animations for consistent capture
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `
  });
  
  // Capture screenshot
  await page.screenshot({
    path: outputPath,
    type: 'png',
    fullPage: false,
  });
  
  console.log(`✅ Captured: ${outputPath}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 실행
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('AUTUS Visual QA — Golden Capture');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Environment: ${JSON.stringify(CAPTURE_ENV)}`);
  console.log('');
  
  // Ensure directories exist
  if (!fs.existsSync(GOLDEN_DIR)) {
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  }
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  
  // Launch browser
  const browser: Browser = await chromium.launch({
    headless: true,
  });
  
  const context: BrowserContext = await browser.newContext({
    ...CAPTURE_ENV,
    // Force sRGB color space
    colorScheme: 'dark',
  });
  
  const page: Page = await context.newPage();
  
  // Target URL (tesla-nav.html)
  const targetUrl = process.env.TARGET_URL || 'http://localhost:8000/frontend/tesla-nav.html';
  
  console.log(`Target: ${targetUrl}`);
  console.log('');
  
  try {
    // Navigate to target
    await page.goto(targetUrl, { waitUntil: 'networkidle' });
    
    // Verify page loaded
    const title = await page.title();
    console.log(`Page loaded: ${title}`);
    
    // Capture all states
    for (const stateId of STATES) {
      const outputPath = path.join(GOLDEN_DIR, `${stateId}.png`);
      await captureGolden(page, stateId, outputPath);
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ All Golden captures complete');
    console.log('═══════════════════════════════════════════════════════════');
    
    // Generate metadata
    const metadata = {
      captured_at: new Date().toISOString(),
      environment: CAPTURE_ENV,
      target_url: targetUrl,
      states: STATES,
      browser: await browser.version(),
    };
    
    fs.writeFileSync(
      path.join(GOLDEN_DIR, 'capture-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
  } catch (error) {
    console.error('❌ Capture failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run
main().catch(console.error);
