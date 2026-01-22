/**
 * AUTUS PWA Icon Generator
 * 
 * 이 스크립트는 SVG 기반 PWA 아이콘을 생성합니다.
 * 실행: node scripts/generate-icons.js
 * 
 * 또는 온라인 도구 사용:
 * - https://www.favicon-generator.org
 * - https://realfavicongenerator.net
 * - https://maskable.app/editor
 */

const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../public/icons');

// 아이콘 크기 목록
const sizes = [32, 72, 96, 128, 144, 152, 167, 180, 192, 384, 512];

// SVG 아이콘 생성 함수
function generateSVGIcon(size, maskable = false) {
  const padding = maskable ? size * 0.1 : 0; // Maskable: 10% 패딩
  const innerSize = size - padding * 2;
  const centerX = size / 2;
  const centerY = size / 2;
  
  // 번개 아이콘 경로 (AUTUS 로고)
  const boltScale = innerSize / 24;
  const boltPath = `
    M${centerX + (-5 * boltScale)} ${centerY + (-9 * boltScale)}
    L${centerX + (-9 * boltScale)} ${centerY + (2 * boltScale)}
    L${centerX + (-2 * boltScale)} ${centerY + (2 * boltScale)}
    L${centerX + (-4 * boltScale)} ${centerY + (9 * boltScale)}
    L${centerX + (5 * boltScale)} ${centerY + (-2 * boltScale)}
    L${centerX + (-2 * boltScale)} ${centerY + (-2 * boltScale)}
    Z
  `.replace(/\s+/g, ' ').trim();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a15"/>
      <stop offset="50%" style="stop-color:#05050a"/>
      <stop offset="100%" style="stop-color:#0a0a15"/>
    </linearGradient>
    <linearGradient id="bolt-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0ea5e9"/>
      <stop offset="100%" style="stop-color:#06b6d4"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="${size * 0.02}" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg-gradient)"/>
  
  <!-- Bolt Icon -->
  <path d="${boltPath}" fill="url(#bolt-gradient)" filter="url(#glow)"/>
</svg>`;
}

// PNG 대신 SVG 파일 생성 (브라우저가 SVG도 지원)
function generateIcons() {
  // 디렉토리 생성
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }
  
  console.log('🎨 AUTUS PWA 아이콘 생성 중...\n');
  
  // 일반 아이콘 생성
  sizes.forEach(size => {
    const svg = generateSVGIcon(size, false);
    const filename = `icon-${size}.svg`;
    fs.writeFileSync(path.join(ICONS_DIR, filename), svg);
    console.log(`  ✅ ${filename}`);
  });
  
  // Maskable 아이콘 생성
  [192, 512].forEach(size => {
    const svg = generateSVGIcon(size, true);
    const filename = `icon-${size}-maskable.svg`;
    fs.writeFileSync(path.join(ICONS_DIR, filename), svg);
    console.log(`  ✅ ${filename} (maskable)`);
  });
  
  // Safari Pinned Tab 아이콘
  const safariSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path d="M5 2L2 9h4l-1 5 6-7H7l2-5z" fill="#0ea5e9"/>
</svg>`;
  fs.writeFileSync(path.join(ICONS_DIR, 'safari-pinned-tab.svg'), safariSvg);
  console.log('  ✅ safari-pinned-tab.svg');
  
  console.log('\n✨ 아이콘 생성 완료!');
  console.log('\n📝 참고: PNG 아이콘이 필요하면 다음 도구를 사용하세요:');
  console.log('   - https://realfavicongenerator.net');
  console.log('   - https://maskable.app/editor');
}

// 실행
generateIcons();
