import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, '../public/autus-roles.png');
const outputDir = path.join(__dirname, '../public/icons');

// 출력 디렉토리 생성
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function extractIcons() {
  // 원본 이미지 정보 확인
  const metadata = await sharp(inputPath).metadata();
  console.log('원본 이미지 크기:', metadata.width, 'x', metadata.height);
  
  // 이미지 레이아웃: 3열 x 2행
  const cols = 3;
  const rows = 2;
  const iconWidth = Math.floor(metadata.width / cols);
  const iconHeight = Math.floor(metadata.height / rows);
  
  console.log('각 아이콘 크기:', iconWidth, 'x', iconHeight);
  
  // 역할별 위치 정의
  const icons = [
    { name: 'c-level', col: 0, row: 0 },
    { name: 'fsd', col: 1, row: 0 },
    { name: 'optimus', col: 2, row: 0 },
    { name: 'consumer', col: 0, row: 1 },
    { name: 'regulatory', col: 1, row: 1 },
    { name: 'partner', col: 2, row: 1 },
  ];
  
  // 아이콘 영역만 추출 (텍스트 부분 제외, 상단 60% 영역만)
  const iconOnlyHeight = Math.floor(iconHeight * 0.6);
  const topPadding = Math.floor(iconHeight * 0.05); // 상단 여백
  
  console.log('아이콘만 추출:', iconWidth, 'x', iconOnlyHeight);
  
  // 각 아이콘 추출
  for (const icon of icons) {
    const left = icon.col * iconWidth;
    const top = icon.row * iconHeight + topPadding;
    
    const outputPath = path.join(outputDir, `${icon.name}.png`);
    
    await sharp(inputPath)
      .extract({ left, top, width: iconWidth, height: iconOnlyHeight })
      .png()
      .toFile(outputPath);
    
    console.log(`✓ ${icon.name}.png 추출 완료`);
  }
  
  console.log('\n모든 아이콘 추출 완료!');
}

extractIcons().catch(console.error);
