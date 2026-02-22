#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔍 하드코딩 라벨 검사 스크립트
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 실행: node scripts/checkHardcodedLabels.js
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

// ════════════════════════════════════════════════════════════════════════════════
// 설정
// ════════════════════════════════════════════════════════════════════════════════

const FORBIDDEN_STRINGS = [
  // 단어 라벨 (L 레이어로 대체해야 함)
  '학생', '학부모', '수업', '코치', '출석', '퇴원', '온리쌤', '농구',
  '건축주', '현장소장', '시공', '환자', '진료', '내원', '회원', '트레이너',
  
  // 문장 조합 (T 레이어로 대체해야 함)
  '오늘의 수업', '오늘의 프로젝트', '오늘의 진료',
  '학생 목록', '환자 목록', '회원 목록',
  '수업 시작', '수업 종료', '진료 시작', '작업 시작',
  '학생 관리', '환자 관리', '학생 등록', '환자 등록',
  '🏀 온리쌤',
];

const SCAN_DIRECTORIES = ['src/screens', 'src/components'];
const EXCLUDED_DIRECTORIES = ['src/config', 'src/context', 'src/hooks', 'src/__tests__', 'node_modules'];
const EXCLUDED_FILES = ['industryConfig.ts', 'labelMap.ts', 'IndustryContext.tsx', 'useIndustry.ts', 'textMap.ts'];

// ════════════════════════════════════════════════════════════════════════════════
// 유틸리티 함수
// ════════════════════════════════════════════════════════════════════════════════

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  
  const files = fs.readdirSync(dirPath);
  
  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    
    if (EXCLUDED_DIRECTORIES.some(exc => fullPath.includes(exc))) return;
    
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (!EXCLUDED_FILES.includes(file)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });
  
  return arrayOfFiles;
}

function isInExcludedContext(line) {
  const trimmed = line.trim();
  
  // 주석
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return true;
  // import 문
  if (trimmed.startsWith('import ')) return true;
  // 타입 정의
  if (trimmed.startsWith('type ') || trimmed.startsWith('interface ')) return true;
  // console.log
  if (trimmed.includes('console.')) return true;
  // Mock 데이터
  if (trimmed.includes('mockData') || trimmed.includes('Mock') || line.includes('mock')) return true;
  
  return false;
}

function findForbiddenStrings(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];
  
  lines.forEach((line, index) => {
    if (isInExcludedContext(line)) return;
    
    FORBIDDEN_STRINGS.forEach((forbidden) => {
      if (line.includes(forbidden)) {
        violations.push({
          line: index + 1,
          text: line.trim().substring(0, 80),
          forbidden,
        });
      }
    });
  });
  
  return violations;
}

// ════════════════════════════════════════════════════════════════════════════════
// 메인 실행
// ════════════════════════════════════════════════════════════════════════════════

console.log('🔍 하드코딩 라벨 검사 시작...\n');

const rootPath = path.resolve(__dirname, '..');
let totalViolations = 0;
const violationsByFile = {};

SCAN_DIRECTORIES.forEach((dir) => {
  const fullDirPath = path.join(rootPath, dir);
  const files = getAllFiles(fullDirPath);
  
  files.forEach((filePath) => {
    const violations = findForbiddenStrings(filePath);
    
    if (violations.length > 0) {
      const relativePath = path.relative(rootPath, filePath);
      violationsByFile[relativePath] = violations;
      totalViolations += violations.length;
    }
  });
});

// 결과 출력
console.log('═'.repeat(60));

if (totalViolations > 0) {
  Object.entries(violationsByFile).forEach(([file, violations]) => {
    console.log(`\n❌ ${file} (${violations.length}개):`);
    violations.forEach(v => {
      console.log(`   Line ${v.line}: "${v.forbidden}"`);
      console.log(`   > ${v.text}`);
    });
  });
  
  console.log('\n' + '═'.repeat(60));
  console.log(`\n❌ 총 ${totalViolations}개 하드코딩 라벨 발견 (${Object.keys(violationsByFile).length}개 파일)`);
  console.log('\n💡 해결 방법:');
  console.log('   1. const { config } = useIndustryConfig();');
  console.log('   2. config.labels.entity, L.entity(config), T.todayService(config) 등 사용');
  process.exit(1);
} else {
  console.log('\n✅ 하드코딩 라벨 없음! Universal App 준비 완료.');
  process.exit(0);
}
