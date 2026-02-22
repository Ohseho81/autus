/**
 * 앱 설정 테이블 초기화 스크립트
 * 
 * 사용법: node scripts/setup-app-config.js
 */

const SUPABASE_URL = 'https://pphzvnaedmzcvpxjulti.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.log('❌ SUPABASE_SERVICE_KEY 환경변수가 필요합니다.');
  console.log('');
  console.log('📋 대신 Supabase Dashboard에서 직접 실행하세요:');
  console.log('');
  console.log('1. https://supabase.com/dashboard 접속');
  console.log('2. 프로젝트 선택 → SQL Editor');
  console.log('3. 아래 SQL 복사 후 실행:');
  console.log('');
  console.log('─'.repeat(60));
  console.log(`
-- 앱 실시간 설정 테이블
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- 기본 설정값
INSERT INTO app_config (key, value) VALUES
  ('theme', '{"primary": "#FF6B2C", "background": "#000000", "card": "#1C1C1E"}'),
  ('labels', '{"coach": "코치님", "student": "학생", "gratitude": "감사", "attendance": "출석"}'),
  ('home_greeting', '{"text": "오늘도 감동을 만들어 보세요.", "emoji": "🏀"}'),
  ('features', '{"show_gratitude": true, "show_market": true, "show_compatibility": true}'),
  ('buttons', '{"attendance_all": "전체 출석", "submit": "수업 완료"}')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read config" ON app_config FOR SELECT USING (true);
CREATE POLICY "Anyone can update config" ON app_config FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert config" ON app_config FOR INSERT WITH CHECK (true);
  `);
  console.log('─'.repeat(60));
  process.exit(0);
}

// Service Key가 있으면 직접 실행
async function setup() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const configs = [
    { key: 'theme', value: { primary: '#FF6B2C', background: '#000000', card: '#1C1C1E' } },
    { key: 'labels', value: { coach: '코치님', student: '학생', gratitude: '감사', attendance: '출석' } },
    { key: 'home_greeting', value: { text: '오늘도 감동을 만들어 보세요.', emoji: '🏀' } },
    { key: 'features', value: { show_gratitude: true, show_market: true, show_compatibility: true } },
    { key: 'buttons', value: { attendance_all: '전체 출석', submit: '수업 완료' } },
  ];
  
  for (const config of configs) {
    const { error } = await supabase
      .from('app_config')
      .upsert({ key: config.key, value: config.value, updated_by: 'setup_script' });
    
    if (error) {
      console.log(`❌ ${config.key}: ${error.message}`);
    } else {
      console.log(`✅ ${config.key} 설정 완료`);
    }
  }
  
  console.log('\n🎉 설정 완료!');
}

setup().catch(console.error);
