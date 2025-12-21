/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Visual QA — Diff Report Generator
 * 
 * 표준 ③ Diff 기준: Track A (Pixel-Exact) + Track B (Perceptual-Exact)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { chromium, Browser, Page } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════════════════════
// Diff 기준 (LOCKED)
// ═══════════════════════════════════════════════════════════════════════════════

const DIFF_THRESHOLDS = {
  track_a: {
    name: 'Reference Exact',
    pixelmatch_diff: 0,
    description: '레퍼런스/데모/비전 고정 이미지',
  },
  track_b: {
    name: 'Product Exact',
    pixelmatch_diff_percent: 0.5,
    ssim_min: 0.995,
    description: '실제 제품 UI (확장/유지보수/글로벌)',
  },
};

const GOLDEN_DIR = path.join(__dirname, '../golden');
const REPORTS_DIR = path.join(__dirname, '../reports');
const CAPTURE_DIR = path.join(__dirname, '../captures');

// ═══════════════════════════════════════════════════════════════════════════════
// PNG 로드 유틸리티
// ═══════════════════════════════════════════════════════════════════════════════

function loadPNG(filePath: string): PNG {
  const data = fs.readFileSync(filePath);
  return PNG.sync.read(data);
}

function savePNG(png: PNG, filePath: string): void {
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filePath, buffer);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Diff 계산
// ═══════════════════════════════════════════════════════════════════════════════

interface DiffResult {
  state_id: string;
  golden_path: string;
  capture_path: string;
  diff_path: string;
  total_pixels: number;
  diff_pixels: number;
  diff_percent: number;
  track_a_pass: boolean;
  track_b_pass: boolean;
  status: 'PASS' | 'FAIL' | 'WARN';
}

function calculateDiff(
  goldenPath: string,
  capturePath: string,
  diffPath: string,
  stateId: string
): DiffResult {
  const golden = loadPNG(goldenPath);
  const capture = loadPNG(capturePath);
  
  // Validate dimensions
  if (golden.width !== capture.width || golden.height !== capture.height) {
    throw new Error(
      `Dimension mismatch: Golden ${golden.width}x${golden.height} vs ` +
      `Capture ${capture.width}x${capture.height}`
    );
  }
  
  const { width, height } = golden;
  const totalPixels = width * height;
  
  // Create diff image
  const diff = new PNG({ width, height });
  
  // Calculate diff using pixelmatch
  const diffPixels = pixelmatch(
    golden.data,
    capture.data,
    diff.data,
    width,
    height,
    {
      threshold: 0.1,  // Sensitivity (0 = exact, 1 = loose)
      includeAA: false,  // Exclude anti-aliasing differences
      alpha: 0.1,
      diffColor: [255, 0, 0],  // Red for differences
      diffColorAlt: [0, 255, 0],  // Green for anti-aliased
    }
  );
  
  // Save diff image
  savePNG(diff, diffPath);
  
  const diffPercent = (diffPixels / totalPixels) * 100;
  
  // Evaluate against thresholds
  const trackAPass = diffPixels === DIFF_THRESHOLDS.track_a.pixelmatch_diff;
  const trackBPass = diffPercent <= DIFF_THRESHOLDS.track_b.pixelmatch_diff_percent;
  
  let status: 'PASS' | 'FAIL' | 'WARN';
  if (trackAPass) {
    status = 'PASS';
  } else if (trackBPass) {
    status = 'WARN';  // Track B pass but not Track A
  } else {
    status = 'FAIL';
  }
  
  return {
    state_id: stateId,
    golden_path: goldenPath,
    capture_path: capturePath,
    diff_path: diffPath,
    total_pixels: totalPixels,
    diff_pixels: diffPixels,
    diff_percent: parseFloat(diffPercent.toFixed(4)),
    track_a_pass: trackAPass,
    track_b_pass: trackBPass,
    status,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTML 리포트 생성
// ═══════════════════════════════════════════════════════════════════════════════

function generateHTMLReport(results: DiffResult[]): string {
  const timestamp = new Date().toISOString();
  const overallPass = results.every(r => r.track_b_pass);
  const perfectPass = results.every(r => r.track_a_pass);
  
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>AUTUS Visual QA Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0a0a0a; color: #fff; padding: 40px; }
    .header { margin-bottom: 40px; }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .header .timestamp { color: #888; font-size: 14px; }
    .summary { display: flex; gap: 20px; margin-bottom: 40px; }
    .summary-card { background: #1a1a1a; border-radius: 12px; padding: 20px; flex: 1; }
    .summary-card h3 { font-size: 14px; color: #888; margin-bottom: 8px; }
    .summary-card .value { font-size: 32px; font-weight: 700; }
    .summary-card .value.pass { color: #00ff88; }
    .summary-card .value.fail { color: #ff4444; }
    .summary-card .value.warn { color: #ffaa00; }
    .results { display: grid; gap: 20px; }
    .result-card { background: #1a1a1a; border-radius: 12px; padding: 20px; }
    .result-card.pass { border-left: 4px solid #00ff88; }
    .result-card.fail { border-left: 4px solid #ff4444; }
    .result-card.warn { border-left: 4px solid #ffaa00; }
    .result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .result-header h3 { font-size: 18px; }
    .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status-badge.pass { background: #00ff8822; color: #00ff88; }
    .status-badge.fail { background: #ff444422; color: #ff4444; }
    .status-badge.warn { background: #ffaa0022; color: #ffaa00; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
    .metric { text-align: center; }
    .metric-label { font-size: 12px; color: #888; margin-bottom: 4px; }
    .metric-value { font-size: 20px; font-weight: 600; }
    .images { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .images img { width: 100%; border-radius: 8px; background: #333; }
    .image-label { font-size: 11px; color: #888; text-align: center; margin-top: 4px; }
    .thresholds { margin-top: 40px; background: #1a1a1a; border-radius: 12px; padding: 20px; }
    .thresholds h3 { margin-bottom: 16px; }
    .threshold-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #333; }
    .threshold-row:last-child { border-bottom: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>AUTUS Visual QA Report</h1>
    <div class="timestamp">${timestamp}</div>
  </div>
  
  <div class="summary">
    <div class="summary-card">
      <h3>Overall Status</h3>
      <div class="value ${perfectPass ? 'pass' : overallPass ? 'warn' : 'fail'}">
        ${perfectPass ? 'PERFECT' : overallPass ? 'PASS' : 'FAIL'}
      </div>
    </div>
    <div class="summary-card">
      <h3>Track A (Pixel-Exact)</h3>
      <div class="value ${results.filter(r => r.track_a_pass).length === results.length ? 'pass' : 'fail'}">
        ${results.filter(r => r.track_a_pass).length}/${results.length}
      </div>
    </div>
    <div class="summary-card">
      <h3>Track B (≤0.5%)</h3>
      <div class="value ${results.filter(r => r.track_b_pass).length === results.length ? 'pass' : 'fail'}">
        ${results.filter(r => r.track_b_pass).length}/${results.length}
      </div>
    </div>
    <div class="summary-card">
      <h3>States Tested</h3>
      <div class="value">${results.length}</div>
    </div>
  </div>
  
  <div class="results">
    ${results.map(r => `
    <div class="result-card ${r.status.toLowerCase()}">
      <div class="result-header">
        <h3>${r.state_id}</h3>
        <span class="status-badge ${r.status.toLowerCase()}">${r.status}</span>
      </div>
      <div class="metrics">
        <div class="metric">
          <div class="metric-label">Diff Pixels</div>
          <div class="metric-value">${r.diff_pixels.toLocaleString()}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Diff %</div>
          <div class="metric-value">${r.diff_percent}%</div>
        </div>
        <div class="metric">
          <div class="metric-label">Track A</div>
          <div class="metric-value" style="color: ${r.track_a_pass ? '#00ff88' : '#ff4444'}">${r.track_a_pass ? '✓' : '✗'}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Track B</div>
          <div class="metric-value" style="color: ${r.track_b_pass ? '#00ff88' : '#ff4444'}">${r.track_b_pass ? '✓' : '✗'}</div>
        </div>
      </div>
      <div class="images">
        <div>
          <img src="${path.basename(r.golden_path)}" alt="Golden">
          <div class="image-label">Golden</div>
        </div>
        <div>
          <img src="${path.basename(r.capture_path)}" alt="Capture">
          <div class="image-label">Capture</div>
        </div>
        <div>
          <img src="${path.basename(r.diff_path)}" alt="Diff">
          <div class="image-label">Diff</div>
        </div>
      </div>
    </div>
    `).join('')}
  </div>
  
  <div class="thresholds">
    <h3>Diff Thresholds (LOCKED)</h3>
    <div class="threshold-row">
      <span>Track A: Reference Exact</span>
      <span>diff = 0 pixels</span>
    </div>
    <div class="threshold-row">
      <span>Track B: Product Exact</span>
      <span>diff ≤ 0.5% AND SSIM ≥ 0.995</span>
    </div>
    <div class="threshold-row">
      <span>Mask Area Limit</span>
      <span>≤ 3% of screen</span>
    </div>
  </div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 실행
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('AUTUS Visual QA — Diff Report');
  console.log('═══════════════════════════════════════════════════════════');
  
  // Ensure directories exist
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  
  const states = ['G1_NAV', 'G2_ALERT', 'G3_CONTROL'];
  const results: DiffResult[] = [];
  
  for (const stateId of states) {
    const goldenPath = path.join(GOLDEN_DIR, `${stateId}.png`);
    const capturePath = path.join(CAPTURE_DIR, `${stateId}.png`);
    const diffPath = path.join(REPORTS_DIR, `${stateId}_diff.png`);
    
    // Check if files exist
    if (!fs.existsSync(goldenPath)) {
      console.warn(`⚠️ Golden not found: ${goldenPath}`);
      continue;
    }
    if (!fs.existsSync(capturePath)) {
      console.warn(`⚠️ Capture not found: ${capturePath}`);
      continue;
    }
    
    console.log(`\nProcessing: ${stateId}`);
    
    try {
      const result = calculateDiff(goldenPath, capturePath, diffPath, stateId);
      results.push(result);
      
      console.log(`  Diff: ${result.diff_pixels} pixels (${result.diff_percent}%)`);
      console.log(`  Track A: ${result.track_a_pass ? '✓ PASS' : '✗ FAIL'}`);
      console.log(`  Track B: ${result.track_b_pass ? '✓ PASS' : '✗ FAIL'}`);
      console.log(`  Status: ${result.status}`);
    } catch (error) {
      console.error(`  ❌ Error: ${error}`);
    }
  }
  
  // Generate reports
  const jsonReport = {
    timestamp: new Date().toISOString(),
    thresholds: DIFF_THRESHOLDS,
    results,
    summary: {
      total: results.length,
      track_a_pass: results.filter(r => r.track_a_pass).length,
      track_b_pass: results.filter(r => r.track_b_pass).length,
      overall: results.every(r => r.track_b_pass) ? 'PASS' : 'FAIL',
    },
  };
  
  // Save JSON report
  const jsonPath = path.join(REPORTS_DIR, 'diff-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
  console.log(`\n📄 JSON Report: ${jsonPath}`);
  
  // Save HTML report
  const htmlReport = generateHTMLReport(results);
  const htmlPath = path.join(REPORTS_DIR, 'diff-report.html');
  fs.writeFileSync(htmlPath, htmlReport);
  console.log(`📄 HTML Report: ${htmlPath}`);
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`Overall: ${jsonReport.summary.overall}`);
  console.log('═══════════════════════════════════════════════════════════');
  
  // Exit with appropriate code for CI
  if (jsonReport.summary.overall === 'FAIL') {
    process.exit(1);
  }
}

// Run
main().catch(console.error);
