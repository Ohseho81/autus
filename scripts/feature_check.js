/**
 * 🏛️ AUTUS Feature Check
 * 각 페이지 기능 상세 점검
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots', 'features');

async function runChecks() {
  console.log('🔍 AUTUS 기능 점검 시작\n');
  console.log('═'.repeat(70));

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const results = {
    portal: await checkPortal(browser),
    k2: await checkK2(browser),
    k10: await checkK10(browser),
    galaxy: await checkGalaxy(browser),
    api: await checkAPI()
  };

  await browser.close();

  // 최종 리포트
  printReport(results);
  
  // 저장
  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'feature_report.json'),
    JSON.stringify(results, null, 2)
  );

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PORTAL CHECK
// ═══════════════════════════════════════════════════════════════════════════════

async function checkPortal(browser) {
  console.log('\n📄 [1/4] Portal 기능 점검');
  console.log('─'.repeat(50));

  const page = await browser.newPage();
  const checks = {};

  try {
    await page.goto(`${BASE_URL}/portal.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // 1. 헤더 존재
    checks.header = await page.$('.header') !== null;
    console.log(`   ${checks.header ? '✅' : '❌'} 헤더 존재`);

    // 2. Gate Constitution 섹션
    checks.gateConstitution = await page.$('.gate-constitution, .constitution') !== null ||
                              (await page.content()).includes('GATE') ||
                              (await page.content()).includes('CONSTITUTION');
    console.log(`   ${checks.gateConstitution ? '✅' : '❌'} Gate Constitution 섹션`);

    // 3. Nodes 패널
    checks.nodesPanel = await page.$('.nodes-panel, .nodes, #nodes') !== null ||
                        (await page.content()).includes('NODES');
    console.log(`   ${checks.nodesPanel ? '✅' : '❌'} Nodes 패널`);

    // 4. K2/K10 탭
    checks.viewTabs = await page.$('.view-tabs, .view-tab') !== null ||
                      (await page.content()).includes('K2') ||
                      (await page.content()).includes('K10');
    console.log(`   ${checks.viewTabs ? '✅' : '❌'} K2/K10 탭`);

    // 5. API 연결 상태
    const content = await page.content();
    checks.apiConnection = content.includes('READY') || content.includes('operational') || 
                          content.includes('ONLINE') || !content.includes('OFFLINE');
    console.log(`   ${checks.apiConnection ? '✅' : '❌'} API 연결 상태`);

    // 6. 숫자/예측 표시 여부 (K2 헌법: 숫자 전면 차단)
    // Portal은 K5이므로 숫자 표시 가능
    checks.hasMetrics = content.includes('Entropy') || content.includes('entropy') ||
                        content.includes('9.2') || content.includes('7.5');
    console.log(`   ${checks.hasMetrics ? '✅' : '⚠️'} 메트릭 표시 (K5 허용)`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'portal_check.png'), fullPage: true });

  } catch (e) {
    console.log(`   ❌ 에러: ${e.message}`);
    checks.error = e.message;
  }

  await page.close();
  return checks;
}

// ═══════════════════════════════════════════════════════════════════════════════
// K2 OPERATOR CHECK
// ═══════════════════════════════════════════════════════════════════════════════

async function checkK2(browser) {
  console.log('\n📄 [2/4] K2 Operator 기능 점검');
  console.log('─'.repeat(50));

  const page = await browser.newPage();
  const checks = {};

  try {
    await page.goto(`${BASE_URL}/k2-operator.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const content = await page.content();

    // 1. STABLE/DRIFTING/LOCKED 상태 표시
    checks.stateIndicator = content.includes('STABLE') || content.includes('DRIFTING') || content.includes('LOCKED');
    console.log(`   ${checks.stateIndicator ? '✅' : '❌'} 상태 표시 (STABLE/DRIFTING/LOCKED)`);

    // 2. SCALE LOCK: K2 표시
    checks.scaleLock = content.includes('K2') || content.includes('SCALE');
    console.log(`   ${checks.scaleLock ? '✅' : '❌'} Scale Lock K2`);

    // 3. 버튼 2개만 (EXECUTE, REPORT BLOCKAGE)
    const buttons = await page.$$('button, .btn, [role="button"]');
    const buttonTexts = await Promise.all(buttons.map(b => b.evaluate(el => el.textContent)));
    const actionButtons = buttonTexts.filter(t => 
      t.includes('EXECUTE') || t.includes('REPORT') || t.includes('BLOCKAGE')
    );
    checks.twoButtonsOnly = actionButtons.length <= 2;
    console.log(`   ${checks.twoButtonsOnly ? '✅' : '❌'} 버튼 ≤ 2개 (현재: ${actionButtons.length}개)`);

    // 4. 숫자/예측 없음 (K2 헌법)
    const hasNumbers = /\d+\.\d+/.test(content) && 
                       (content.includes('예측') || content.includes('forecast') || content.includes('%'));
    checks.noForecast = !hasNumbers;
    console.log(`   ${checks.noForecast ? '✅' : '❌'} 숫자/예측 없음`);

    // 5. Gate 표시
    checks.gateDisplay = content.includes('GATE') || content.includes('OPEN') || content.includes('RING');
    console.log(`   ${checks.gateDisplay ? '✅' : '❌'} Gate 상태 표시`);

    // 6. Apply 버튼 없음
    checks.noApplyButton = !content.includes('>Apply<') && !content.includes('>APPLY<');
    console.log(`   ${checks.noApplyButton ? '✅' : '❌'} Apply 버튼 없음`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'k2_check.png'), fullPage: true });

  } catch (e) {
    console.log(`   ❌ 에러: ${e.message}`);
    checks.error = e.message;
  }

  await page.close();
  return checks;
}

// ═══════════════════════════════════════════════════════════════════════════════
// K10 OBSERVER CHECK
// ═══════════════════════════════════════════════════════════════════════════════

async function checkK10(browser) {
  console.log('\n📄 [3/4] K10 Observer 기능 점검');
  console.log('─'.repeat(50));

  const page = await browser.newPage();
  const checks = {};

  try {
    await page.goto(`${BASE_URL}/k10-observer.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const content = await page.content();

    // 1. OBSERVING 상태
    checks.observingState = content.includes('OBSERVING') || content.includes('OBSERVER');
    console.log(`   ${checks.observingState ? '✅' : '❌'} OBSERVING 상태`);

    // 2. NO APPLY 표시
    checks.noApplyMessage = content.includes('NO APPLY') || content.includes('AUTO CLOSURE');
    console.log(`   ${checks.noApplyMessage ? '✅' : '❌'} "NO APPLY" 메시지`);

    // 3. CAUSAL NETWORK (K6+)
    checks.causalNetwork = content.includes('CAUSAL') || content.includes('NETWORK') || content.includes('K6');
    console.log(`   ${checks.causalNetwork ? '✅' : '❌'} Causal Network (K6+)`);

    // 4. AFTERIMAGE LOG
    checks.afterimageLog = content.includes('AFTERIMAGE') || content.includes('IMMUTABLE');
    console.log(`   ${checks.afterimageLog ? '✅' : '❌'} Afterimage Log`);

    // 5. hypothesis only 입력
    checks.hypothesisInput = content.includes('hypothesis') || content.includes('What if');
    console.log(`   ${checks.hypothesisInput ? '✅' : '❌'} Hypothesis 입력`);

    // 6. Apply 버튼 없음
    checks.noApplyButton = !content.includes('>Apply<') && !content.includes('>APPLY<') &&
                           content.includes('NO APPLY BUTTON');
    console.log(`   ${checks.noApplyButton ? '✅' : '❌'} Apply 버튼 없음 확인 메시지`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'k10_check.png'), fullPage: true });

  } catch (e) {
    console.log(`   ❌ 에러: ${e.message}`);
    checks.error = e.message;
  }

  await page.close();
  return checks;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GALAXY CHECK
// ═══════════════════════════════════════════════════════════════════════════════

async function checkGalaxy(browser) {
  console.log('\n📄 [4/4] Galaxy 기능 점검');
  console.log('─'.repeat(50));

  const page = await browser.newPage();
  const checks = {};

  try {
    await page.goto(`${BASE_URL}/galaxy.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const content = await page.content();

    // 1. 미래예측 탭
    checks.forecastTab = content.includes('미래예측') || content.includes('예측');
    console.log(`   ${checks.forecastTab ? '✅' : '❌'} 미래예측 탭`);

    // 2. 자동화 탭
    checks.automationTab = content.includes('자동화');
    console.log(`   ${checks.automationTab ? '✅' : '❌'} 자동화 탭`);

    // 3. 업무 탭
    checks.taskTab = content.includes('업무');
    console.log(`   ${checks.taskTab ? '✅' : '❌'} 업무 탭`);

    // 4. 시스템 상태 표시
    checks.systemStatus = content.includes('시스템') || content.includes('%') || content.includes('위험');
    console.log(`   ${checks.systemStatus ? '✅' : '❌'} 시스템 상태`);

    // 5. 업무별 예측
    checks.taskPrediction = content.includes('업무별') || content.includes('신뢰도');
    console.log(`   ${checks.taskPrediction ? '✅' : '❌'} 업무별 예측`);

    // 6. ENTROPY 태그
    checks.entropyTag = content.includes('ENTROPY') || content.includes('엔트로피');
    console.log(`   ${checks.entropyTag ? '✅' : '❌'} Entropy 태그`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'galaxy_check.png'), fullPage: true });

  } catch (e) {
    console.log(`   ❌ 에러: ${e.message}`);
    checks.error = e.message;
  }

  await page.close();
  return checks;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API CHECK
// ═══════════════════════════════════════════════════════════════════════════════

async function checkAPI() {
  console.log('\n📡 [API] 백엔드 API 점검');
  console.log('─'.repeat(50));

  const checks = {};
  const http = require('http');

  const endpoints = [
    { path: '/', name: 'Root' },
    { path: '/status', name: 'Status' },
    { path: '/nodes', name: 'Nodes' },
    { path: '/presets', name: 'Presets' },
    { path: '/health', name: 'Health' },
    { path: '/docs', name: 'Docs' }
  ];

  for (const ep of endpoints) {
    try {
      const result = await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:8000${ep.path}`, { timeout: 5000 }, (res) => {
          resolve({ status: res.statusCode, ok: res.statusCode < 400 });
        });
        req.on('error', reject);
        req.on('timeout', () => reject(new Error('timeout')));
      });
      checks[ep.name.toLowerCase()] = result.ok;
      console.log(`   ${result.ok ? '✅' : '❌'} ${ep.name} (${ep.path}) - ${result.status}`);
    } catch (e) {
      checks[ep.name.toLowerCase()] = false;
      console.log(`   ❌ ${ep.name} (${ep.path}) - ${e.message}`);
    }
  }

  return checks;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT
// ═══════════════════════════════════════════════════════════════════════════════

function printReport(results) {
  console.log('\n' + '═'.repeat(70));
  console.log('📊 최종 기능 점검 리포트\n');

  const sections = [
    { name: 'Portal', data: results.portal },
    { name: 'K2 Operator', data: results.k2 },
    { name: 'K10 Observer', data: results.k10 },
    { name: 'Galaxy', data: results.galaxy },
    { name: 'API', data: results.api }
  ];

  let totalPass = 0;
  let totalFail = 0;

  for (const section of sections) {
    const items = Object.entries(section.data).filter(([k]) => k !== 'error');
    const passed = items.filter(([, v]) => v === true).length;
    const failed = items.filter(([, v]) => v === false).length;
    
    totalPass += passed;
    totalFail += failed;

    const status = failed === 0 ? '✅' : '⚠️';
    console.log(`${status} ${section.name}: ${passed}/${items.length} 통과`);
  }

  console.log('\n' + '─'.repeat(40));
  console.log(`📈 전체: ${totalPass}/${totalPass + totalFail} 통과 (${Math.round(totalPass/(totalPass+totalFail)*100)}%)`);
  console.log('═'.repeat(70));
}

// Run
runChecks().catch(console.error);
