/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Golden Set Capture Script
 * 
 * G1_NAV, G2_ALERT, G3_CONTROL 3장 캡처
 * 환경: 1920×1080, DPR=1, sRGB, Chromium
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 캡처 환경 (LOCKED)
const CAPTURE_ENV = {
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  colorScheme: 'dark' as const,
  locale: 'en-US',
  timezoneId: 'Europe/London',
};

// Golden 상태 데이터
const GOLDEN_STATES = {
  G1_NAV: {
    mode: 'NAV',
    time: '10:21 AM',
    tempC: 17,
    speed: { value: 20, unit: 'MPH' },
    gear: 'D',
    batteryMiles: 315,
    network: '4G',
    route: {
      distanceMi: 22.8,
      etaMin: 37,
      arrival: '10:58 PM',
    },
    media: {
      title: 'Alpha Omega',
      artist: 'Karnivool',
      album: 'Asymmetry',
      progress: 0.45,
      isPlaying: true,
    },
  },
  G2_ALERT: {
    mode: 'ALERT',
    time: '10:21 AM',
    tempC: 17,
    speed: { value: 20, unit: 'MPH' },
    gear: 'D',
    batteryMiles: 315,
    alert: {
      code: 'FRICTION_BOTTLENECK',
      level: 'WARN',
      message: 'System taking over for route safety adjustment',
      value: 0.78,
    },
    route: {
      distanceMi: 22.8,
      etaMin: 37,
    },
    media: {
      title: 'Alpha Omega',
      artist: 'Karnivool',
      album: 'Asymmetry',
      progress: 0.45,
      isPlaying: true,
    },
  },
  G3_CONTROL: {
    mode: 'CONTROL',
    time: '10:21 AM',
    tempC: 17,
    speed: { value: 20, unit: 'MPH' },
    gear: 'D',
    batteryMiles: 315,
    leftPanel: { expanded: true, activeApp: 'Navigate' },
    maneuverCard: { collapsed: true },
    route: {
      distanceMi: 22.8,
      etaMin: 37,
    },
    media: {
      title: 'Alpha Omega',
      artist: 'Karnivool',
      album: 'Asymmetry',
      progress: 0.45,
      isPlaying: true,
    },
  },
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:8000/frontend/tesla-nav.html';
const GOLDEN_DIR = path.join(__dirname, '../../golden');

async function disableAnimations(page: Page): Promise<void> {
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

async function injectState(page: Page, stateData: object): Promise<void> {
  await page.addInitScript((data) => {
    (window as any).__AUTUS_GOLDEN__ = data;
  }, stateData);
}

async function captureGolden(
  browser: Browser,
  stateId: string,
  stateData: object
): Promise<void> {
  console.log(`\n📸 Capturing ${stateId}...`);
  
  const context = await browser.newContext({
    viewport: CAPTURE_ENV.viewport,
    deviceScaleFactor: CAPTURE_ENV.deviceScaleFactor,
    colorScheme: CAPTURE_ENV.colorScheme,
    locale: CAPTURE_ENV.locale,
    timezoneId: CAPTURE_ENV.timezoneId,
  });
  
  const page = await context.newPage();
  
  // State 주입
  await injectState(page, stateData);
  
  // 페이지 로드
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  
  // 애니메이션 비활성화
  await disableAnimations(page);
  
  // Zoom 100% 강제
  await page.evaluate(() => {
    document.documentElement.style.zoom = '100%';
  });
  
  // 안정화 대기
  await page.waitForTimeout(500);
  
  // 스크린샷 캡처
  const screenshotPath = path.join(GOLDEN_DIR, `${stateId}.png`);
  await page.screenshot({
    path: screenshotPath,
    fullPage: false,
    clip: { x: 0, y: 0, width: 1920, height: 1080 },
  });
  
  console.log(`   ✅ Saved: ${screenshotPath}`);
  
  await context.close();
}

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('  AUTUS Golden Set Capture');
  console.log('  Resolution: 1920×1080 | DPR: 1 | Color: sRGB');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  
  // Golden 디렉토리 생성
  if (!fs.existsSync(GOLDEN_DIR)) {
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  }
  
  // 브라우저 시작
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--force-device-scale-factor=1',
      '--force-color-profile=srgb',
      '--disable-gpu-vsync',
    ],
  });
  
  console.log('\n🚀 Browser launched (Chromium)');
  console.log(`📍 Target: ${BASE_URL}`);
  
  try {
    // G1_NAV
    await captureGolden(browser, 'G1_NAV', GOLDEN_STATES.G1_NAV);
    
    // G2_ALERT
    await captureGolden(browser, 'G2_ALERT', GOLDEN_STATES.G2_ALERT);
    
    // G3_CONTROL
    await captureGolden(browser, 'G3_CONTROL', GOLDEN_STATES.G3_CONTROL);
    
    console.log('\n═══════════════════════════════════════════════════════════════════════════════');
    console.log('  ✅ Golden Set Complete (3/3)');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log(`\nFiles saved to: ${GOLDEN_DIR}`);
    console.log('  - G1_NAV.png');
    console.log('  - G2_ALERT.png');
    console.log('  - G3_CONTROL.png');
    
    // 버전 정보 저장
    const versionInfo = {
      version: 'v1.0.0',
      created: new Date().toISOString(),
      environment: CAPTURE_ENV,
      states: Object.keys(GOLDEN_STATES),
    };
    
    fs.writeFileSync(
      path.join(GOLDEN_DIR, 'VERSION.json'),
      JSON.stringify(versionInfo, null, 2)
    );
    console.log('\n📋 VERSION.json created (v1.0.0 LOCKED)');
    
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
