import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, '../public/icons');

async function makeTransparent() {
  const icons = ['c-level', 'fsd', 'optimus', 'consumer', 'regulatory', 'partner'];
  
  for (const iconName of icons) {
    const inputPath = path.join(iconsDir, `${iconName}.png`);
    const outputPath = path.join(iconsDir, `${iconName}-transparent.png`);
    
    // 이미지 로드
    const image = sharp(inputPath);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    
    // 새 버퍼 생성 (RGBA)
    const rgba = Buffer.alloc(info.width * info.height * 4);
    
    // 배경색 임계값 (어두운 배경 제거)
    const threshold = 35; // RGB 각 채널이 이 값 이하면 투명 처리
    
    for (let i = 0; i < info.width * info.height; i++) {
      const srcIdx = i * info.channels;
      const dstIdx = i * 4;
      
      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];
      
      // 어두운 배경색 감지 (거의 검은색)
      const isDarkBackground = r < threshold && g < threshold && b < threshold;
      
      rgba[dstIdx] = r;
      rgba[dstIdx + 1] = g;
      rgba[dstIdx + 2] = b;
      rgba[dstIdx + 3] = isDarkBackground ? 0 : 255; // 투명 또는 불투명
    }
    
    // 투명 배경 이미지 저장
    await sharp(rgba, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    })
    .png()
    .toFile(outputPath);
    
    console.log(`✓ ${iconName}-transparent.png 생성 완료`);
  }
  
  console.log('\n모든 아이콘 배경 투명화 완료!');
}

makeTransparent().catch(console.error);
