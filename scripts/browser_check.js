/**
 * 🏛️ AUTUS Browser Check
 * Puppeteer 기반 자동 페이지 점검
 * 
 * 점검 항목:
 * - 페이지 로드 상태
 * - JavaScript 콘솔 에러
 * - 네트워크 에러
 * - 스크린샷 캡처
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const PAGES = [
  { name: 'Portal', path: '/portal.html' },
  { name: 'K2 Operator', path: '/k2-operator.html' },
  { name: 'K10 Observer', path: '/k10-observer.html' },
  { name: 'Galaxy', path: '/galaxy.html' },
];

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

async function checkPages() {
  console.log('🚀 AUTUS Browser Check 시작\n');
  console.log('═'.repeat(60));
  
  // 스크린샷 폴더 생성
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = [];

  for (const page of PAGES) {
    console.log(`\n📄 ${page.name} (${page.path})`);
    console.log('─'.repeat(40));
    
    const result = await checkPage(browser, page);
    results.push(result);
    
    // 결과 출력
    console.log(`   상태: ${result.status}`);
    console.log(`   로드 시간: ${result.loadTime}ms`);
    
    if (result.consoleErrors.length > 0) {
      console.log(`   ❌ 콘솔 에러: ${result.consoleErrors.length}개`);
      result.consoleErrors.forEach(err => {
        console.log(`      - ${err.substring(0, 80)}...`);
      });
    } else {
      console.log(`   ✅ 콘솔 에러: 없음`);
    }
    
    if (result.networkErrors.length > 0) {
      console.log(`   ❌ 네트워크 에러: ${result.networkErrors.length}개`);
      result.networkErrors.forEach(err => {
        console.log(`      - ${err}`);
      });
    } else {
      console.log(`   ✅ 네트워크 에러: 없음`);
    }
    
    console.log(`   📸 스크린샷: ${result.screenshot}`);
  }

  await browser.close();

  // 최종 리포트
  console.log('\n' + '═'.repeat(60));
  console.log('📊 최종 리포트\n');
  
  const passed = results.filter(r => r.consoleErrors.length === 0 && r.networkErrors.length === 0);
  const failed = results.filter(r => r.consoleErrors.length > 0 || r.networkErrors.length > 0);
  
  console.log(`✅ 통과: ${passed.length}/${results.length}`);
  console.log(`❌ 실패: ${failed.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log('\n⚠️  문제 있는 페이지:');
    failed.forEach(r => {
      console.log(`   - ${r.name}: 콘솔 에러 ${r.consoleErrors.length}개, 네트워크 에러 ${r.networkErrors.length}개`);
    });
  }
  
  console.log('\n📁 스크린샷 저장 위치:', SCREENSHOT_DIR);
  console.log('═'.repeat(60));
  
  // JSON 리포트 저장
  const reportPath = path.join(SCREENSHOT_DIR, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📋 상세 리포트: ${reportPath}`);
  
  return results;
}

async function checkPage(browser, pageInfo) {
  const page = await browser.newPage();
  
  const consoleErrors = [];
  const networkErrors = [];
  
  // 콘솔 메시지 캡처
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  // 페이지 에러 캡처
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });
  
  // 네트워크 실패 캡처
  page.on('requestfailed', request => {
    networkErrors.push(`${request.failure().errorText}: ${request.url()}`);
  });
  
  const startTime = Date.now();
  let status = 'OK';
  
  try {
    await page.goto(`${BASE_URL}${pageInfo.path}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // 추가 대기 (동적 콘텐츠)
    await page.waitForTimeout(2000);
    
  } catch (error) {
    status = `ERROR: ${error.message}`;
  }
  
  const loadTime = Date.now() - startTime;
  
  // 스크린샷
  const screenshotName = `${pageInfo.name.replace(/\s+/g, '_').toLowerCase()}.png`;
  const screenshotPath = path.join(SCREENSHOT_DIR, screenshotName);
  
  await page.screenshot({
    path: screenshotPath,
    fullPage: true
  });
  
  await page.close();
  
  return {
    name: pageInfo.name,
    path: pageInfo.path,
    status,
    loadTime,
    consoleErrors,
    networkErrors,
    screenshot: screenshotName
  };
}

// 실행
checkPages().catch(console.error);
