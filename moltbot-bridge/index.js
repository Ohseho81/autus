/**
 * 🤖 MoltBot Bridge v2 - AUTUS 학원 관리 봇
 *
 * 변경사항:
 * - Claude Code CLI 의존성 제거 (인증 문제 해결)
 * - Anthropic API 직접 호출 (안정적)
 * - Brain API 통합 유지
 */

import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { setupCoworkCommands, pushNotification, COWORK_TASKS, enqueue } from './cowork-handler.js';
import workflowAdapter from './workflow-handler.js';
import {
  setupOrchestratorCommands,
  parseCommand,
  formatActiveTasksList,
  detectSignal,
  scoreAgents,
  buildChain,
  formatRouting,
  AGENTS,
} from './task-orchestrator.js';
import { setupDataCommands, isAvailable as isSupabaseAvailable } from './supabase-queries.js';
import { setupOnlysamShadowCommands, isOnlysamConfigured } from './onlysam-shadow.js';
import { setupStudentUploadCommands } from './student-upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================
// 설정
// ============================================
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN 환경변수가 필요합니다!');
  process.exit(1);
}

const AUTUS_DIR = process.env.AUTUS_DIR || path.join(process.env.HOME, 'Desktop/autus');
const BRAIN_URL = process.env.MOLTBOT_BRAIN_URL || 'http://localhost:3030';
const LOG_FILE = path.join(__dirname, 'moltbot.log');

// 봇 생성
const bot = new TelegramBot(TOKEN, { polling: true });


// ============================================
// 유틸리티
// ============================================
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

async function callBrainAPI(endpoint, method = 'GET', body = null) {
  try {
    const url = BRAIN_URL + endpoint;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    log(`[BRAIN API ERROR] ${error.message}`);
    return null;
  }
}

// ============================================
// 메시지 응답 (Brain API 기반)
// ============================================
async function handleMessage(chatId, prompt) {
  log(`[MSG] Prompt: ${prompt.slice(0, 100)}...`);

  // 키워드 기반 자동 응답
  const lowerPrompt = prompt.toLowerCase();

  // 학생/위험 관련
  if (lowerPrompt.includes('위험') || lowerPrompt.includes('학생') || lowerPrompt.includes('이탈')) {
    const data = await callBrainAPI('/api/moltbot/students/at-risk');
    if (data?.students?.length > 0) {
      const list = data.students.slice(0, 5).map((s, i) =>
        `${i + 1}. ${s.name || s.id} (출석 ${s.attendance_rate || 0}%)`
      ).join('\n');
      bot.sendMessage(chatId, `⚠️ *위험 학생 ${data.count}명*\n\n${list}\n\n💡 /brain risk 로 전체 확인`, { parse_mode: 'Markdown' });
      return;
    }
  }

  // 대시보드/현황 관련
  if (lowerPrompt.includes('현황') || lowerPrompt.includes('대시보드') || lowerPrompt.includes('상태')) {
    const data = await callBrainAPI('/api/moltbot/dashboard');
    if (data) {
      bot.sendMessage(chatId, `📊 *현황*\n\n위험 학생: ${data.at_risk?.length || 0}명\n오늘 출석: ${data.today_attendance?.length || 0}개 수업\n\n💡 /brain dashboard 로 상세 확인`, { parse_mode: 'Markdown' });
      return;
    }
  }

  // 규칙 관련
  if (lowerPrompt.includes('규칙') || lowerPrompt.includes('rule')) {
    bot.sendMessage(chatId, '📋 규칙 확인: /brain rules');
    return;
  }

  // 기본 응답
  bot.sendMessage(chatId, `
💡 *사용 가능한 명령어:*

/brain status - 시스템 상태
/brain dashboard - 대시보드
/brain risk - 위험 학생
/brain rules - 규칙 목록
/build - 빌드
/deploy - 배포
  `, { parse_mode: 'Markdown' });
}

// ============================================
// 명령어 핸들러
// ============================================

// /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || msg.from.first_name;

  log(`[START] User: ${username} (${chatId})`);

  bot.sendMessage(chatId, `
🤖 *MoltBot v2 - AUTUS 통합*

안녕하세요, ${username}님!

*🧠 학원 관리*
/brain status - 시스템 상태
/brain dashboard - 대시보드
/brain risk - 위험 학생 목록
/brain rules - 규칙 목록
/brain student [ID] - 학생 상세

*🗄️ Sovereign Ledger*
/data today - 오늘 현황
/data completion - 세션 완료율
/data risk - 이탈 위험 학생
/data vindex - V-Index 랭킹
/data features - 기능별 사용량
/data student [UUID] - 학생 상세
/data report [UUID] - 학부모 리포트
/data recent - 최근 활동

*💻 개발 도구*
/build - 프로젝트 빌드
/deploy - Git Push + 배포
/git [명령] - Git 명령어

*🔗 Cowork (Mac 로컬)*
/cowork list - 작업 목록
/cowork [작업ID] - 작업 실행
/test - 테스트 실행
/lint - 린트 검사

*🔄 9단계 워크플로우*
/workflow phases - 9단계 확인
/workflow start [ID] - 미션 시작
/workflow status - 현재 상태

*🎯 6-Agent Router*
/route [작업] - 에이전트 라우팅 분석
/do [명령] - 자연어 명령 실행
/tasks - 활성 작업 목록
/confirm - 작업 완료 확인

*📊 상태*
/status - 전체 상태

*📚 온리쌤 그림자 (7일 검증)*
/수업시작 - 수업 시작
/출석 [이름] - 출석
/결석 [이름] - 결석
/훈련전환 - 훈련 전환
/사고 - 사고 기록
/수업종료 - 수업 종료

*📎 학생 관리*
/upload\\_students - CSV 학생 일괄 등록

💡 일반 메시지 → AI 응답
  `, { parse_mode: 'Markdown' });
});

// /brain - MoltBot Brain 명령
bot.onText(/\/brain(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1]?.split(' ') || ['help'];
  const command = args[0];

  log(`[BRAIN] ${msg.from.username}: ${command}`);

  let response = '';

  switch (command) {
    case 'status': {
      const data = await callBrainAPI('/api/moltbot/health');
      if (data) {
        response = `
🧠 *MoltBot Brain 상태*

✅ 상태: ${data.status}
🕐 시간: ${new Date(data.timestamp).toLocaleString('ko-KR')}
📦 버전: ${data.version || '1.0.0'}
        `;
      } else {
        response = '❌ Brain 서버에 연결할 수 없습니다.\n\n💡 실행: cd ~/Desktop/autus/moltbot-brain && npm start';
      }
      break;
    }

    case 'dashboard': {
      const data = await callBrainAPI('/api/moltbot/dashboard');
      if (data) {
        response = `
📊 *MoltBot 대시보드*

*위험 학생:* ${data.at_risk?.length || 0}명
${(data.at_risk || []).slice(0, 5).map((s, i) =>
  `  ${i + 1}. ${s.name || s.id} (출석 ${s.attendance_rate}%)`
).join('\n') || '  없음'}

*오늘 출석:*
${(data.today_attendance || []).map(c =>
  `  • ${c.class_name}: ${c.present_count}/${c.total_students}명`
).join('\n') || '  수업 없음'}

*이번 달 수납:*
${data.monthly_payments ? `
  • 완납: ${data.monthly_payments.paid_count}건
  • 미납: ${data.monthly_payments.overdue_count}건
  • 수금액: ${(data.monthly_payments.collected_amount || 0).toLocaleString()}원
` : '  데이터 없음'}
        `;
      } else {
        response = '❌ 대시보드를 불러올 수 없습니다.';
      }
      break;
    }

    case 'risk': {
      const data = await callBrainAPI('/api/moltbot/students/at-risk');
      if (data) {
        response = `
⚠️ *위험 학생 목록* (${data.count}명)

${(data.students || []).slice(0, 10).map((s, i) => {
  const rate = s.attendance_rate || 0;
  const icon = rate < 60 ? '🔴' : rate < 70 ? '🟠' : '🟡';
  return `${i + 1}. ${icon} *${s.name || s.id}*
   출석: ${rate}% | 미수금: ${(s.total_outstanding || 0).toLocaleString()}원`;
}).join('\n\n') || '없음'}
        `;
      } else {
        response = '❌ 위험 학생 목록을 불러올 수 없습니다.';
      }
      break;
    }

    case 'rules': {
      const data = await callBrainAPI('/api/moltbot/rules');
      if (data) {
        response = `
📋 *규칙 목록*

${(data.rules || []).map(r =>
  `• *${r.id}* [${r.mode}]\n  ${r.name}`
).join('\n\n') || '규칙 없음'}
        `;
      } else {
        response = '❌ 규칙 목록을 불러올 수 없습니다.';
      }
      break;
    }

    case 'student': {
      const studentId = args[1];
      if (!studentId) {
        response = '사용법: /brain student [학생ID]';
      } else {
        const data = await callBrainAPI(`/api/moltbot/student?id=${studentId}`);
        if (data?.context) {
          const s = data.context.student;
          response = `
👤 *학생 상세*

📛 이름: ${s.data?.name || studentId}
📊 상태: ${s.state}
📈 출석률: ${s.data?.attendance_rate || 0}%
🔢 연속 결석: ${s.data?.consecutive_absent || 0}회
💰 미수금: ${(s.data?.total_outstanding || 0).toLocaleString()}원

*최근 개입:* ${data.interventions?.length || 0}건
          `;
        } else {
          response = `❌ 학생을 찾을 수 없습니다: ${studentId}`;
        }
      }
      break;
    }

    default:
      response = `
🧠 *Brain 명령어*

/brain status - 상태 확인
/brain dashboard - 대시보드
/brain risk - 위험 학생
/brain rules - 규칙 목록
/brain student [ID] - 학생 상세
      `;
  }

  bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
});

// /status
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;

  // Brain 상태 확인
  let brainStatus = '❌ 오프라인';
  try {
    const brainHealth = await callBrainAPI('/api/moltbot/health');
    if (brainHealth) brainStatus = '✅ 온라인';
  } catch (e) {}

  const sbStatus = isSupabaseAvailable() ? '✅ 연결됨' : '❌ 미설정';

  bot.sendMessage(chatId, `
📊 *MoltBot v2 상태*

*🤖 Bot:*
🟢 텔레그램: 온라인
🕐 가동: ${Math.round(process.uptime() / 60)}분

*🧠 Brain:*
${brainStatus}

*🗄️ Sovereign Ledger:*
${sbStatus}

*📂 경로:*
${AUTUS_DIR}
  `, { parse_mode: 'Markdown' });
});

// /build
bot.onText(/\/build/, (msg) => {
  const chatId = msg.chat.id;
  log(`[BUILD] Requested by ${msg.from.username}`);
  bot.sendMessage(chatId, '🔨 빌드 시작...');

  exec(`cd ${AUTUS_DIR}/kraton-v2 && npm run build 2>&1 | tail -20`, (error, stdout) => {
    if (error && !stdout.includes('built in')) {
      bot.sendMessage(chatId, `❌ 빌드 실패!\n\n\`\`\`\n${stdout.slice(-800)}\n\`\`\``, { parse_mode: 'Markdown' });
      return;
    }
    bot.sendMessage(chatId, `✅ *빌드 성공!*\n\n\`\`\`\n${stdout.slice(-500)}\n\`\`\``, { parse_mode: 'Markdown' });
  });
});

// /deploy
bot.onText(/\/deploy/, (msg) => {
  const chatId = msg.chat.id;
  log(`[DEPLOY] Requested by ${msg.from.username}`);
  bot.sendMessage(chatId, '🚀 배포 시작...');

  exec(`cd ${AUTUS_DIR} && git add -A && git commit -m "deploy: via MoltBot 📱" --allow-empty && git push origin main 2>&1`, (error, stdout, stderr) => {
    const output = stdout + stderr;
    if (output.includes('Everything up-to-date') || output.includes('main -> main')) {
      bot.sendMessage(chatId, `✅ *배포 완료!*`, { parse_mode: 'Markdown' });
    } else if (error) {
      bot.sendMessage(chatId, `❌ 배포 실패\n\n${output.slice(-500)}`);
    } else {
      bot.sendMessage(chatId, `✅ *배포 완료!*`, { parse_mode: 'Markdown' });
    }
  });
});

// /git
bot.onText(/\/git (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const gitCmd = match[1];
  log(`[GIT] ${gitCmd}`);

  const allowed = ['status', 'pull', 'push', 'log', 'diff', 'branch', 'checkout'];
  const cmdBase = gitCmd.split(' ')[0];
  if (!allowed.includes(cmdBase)) {
    bot.sendMessage(chatId, '⚠️ 허용되지 않은 Git 명령입니다.');
    return;
  }

  exec(`cd ${AUTUS_DIR} && git ${gitCmd} 2>&1`, (error, stdout) => {
    const output = stdout || '(출력 없음)';
    bot.sendMessage(chatId, `📂 *git ${gitCmd}*\n\n\`\`\`\n${output.slice(-1500)}\n\`\`\``, { parse_mode: 'Markdown' });
  });
});

// /help
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, `
📚 *MoltBot v2 명령어*

🧠 *학원 관리*
/brain status - 상태
/brain dashboard - 대시보드
/brain risk - 위험 학생
/brain rules - 규칙
/brain student [ID] - 학생 상세

🗄️ *Sovereign Ledger*
/data today - 오늘 현황
/data completion - 완료율
/data risk - 이탈 위험
/data vindex - V-Index 랭킹
/data features - 기능 사용량
/data student [UUID] - 학생 V-Index
/data report [UUID] - 학부모 리포트
/data recent - 최근 활동

💻 *개발 도구*
/build - 빌드
/deploy - 배포
/git [명령] - Git

🔗 *Cowork (Mac 로컬)*
/cowork list - 작업 목록
/cowork [작업ID] - 작업 실행
/test - 테스트 실행
/lint - 린트 검사
/cowork queue - 큐 상태

🔄 *9단계 워크플로우*
/workflow phases - 9단계 확인
/workflow templates - 미션 템플릿
/workflow start [ID] - 미션 시작
/workflow status - 현재 상태
/workflow advance - 다음 단계

🎯 *6-Agent Task Router (핵심)*
/route [작업] - 에이전트 라우팅 분석
/do [명령] - 자연어로 작업 실행
/tasks - 활성 작업 목록
/tasks history - 작업 히스토리
/confirm - 완료 확인
/reject - 작업 거절

📊 *상태*
/status - 전체 상태

📚 *온리쌤 그림자*
/수업시작 /출석 [이름] /결석 [이름] /훈련전환 /사고 /수업종료

📎 *학생 관리*
/upload\\_students - CSV 학생 일괄 등록

💡 일반 메시지 → AI 응답
  `, { parse_mode: 'Markdown' });
});

// 일반 메시지 → 6-Agent Router 또는 자동 응답
bot.on('message', async (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    const chatId = msg.chat.id;
    const prompt = msg.text;

    log(`[MSG] ${msg.from.username}: ${prompt.slice(0, 100)}`);

    // 1. 6-Agent Router로 먼저 라우팅 분석
    const signal = detectSignal(prompt);
    const scores = scoreAgents(prompt, signal);
    const chain = buildChain(prompt, signal, scores);
    
    const primary = chain.find(c => c.role === 'primary' || c.role === 'entry');
    
    // 작업 신호가 강하면 (Score > 0.5) 라우팅 제안
    if (primary && primary.totalScore > 0.5) {
      const parsed = parseCommand(prompt);
      if (parsed) {
        // 실행 가능한 작업
        bot.sendMessage(chatId, `
🎯 *작업 감지*

${primary.agent.emoji} Primary: *${primary.agent.name}*
📊 Score: ${primary.totalScore}

/route ${prompt} → 상세 분석
/do ${prompt} → 바로 실행
        `, { parse_mode: 'Markdown' });
        return;
      }
    }

    // 2. 기존 자동 응답
    await handleMessage(chatId, prompt);
  }
});

// ============================================
// Cowork 핸들러 설정
// ============================================
setupCoworkCommands(bot, (chatId, message, options) => {
  bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...options });
});
log('🔗 Cowork 핸들러 연결됨');

// ============================================
// Workflow 핸들러 설정
// ============================================
workflowAdapter.setupWorkflowCommands(bot);
log('🔄 Workflow 핸들러 연결됨');

// ============================================
// Task Orchestrator 설정
// ============================================
setupOrchestratorCommands(bot, BRAIN_URL);
log('🎯 Task Orchestrator 연결됨');

// ============================================
// Supabase Direct Query 설정
// ============================================
setupDataCommands(bot);
if (isSupabaseAvailable()) {
  log('🗄️ Supabase Sovereign Ledger: 연결됨');
} else {
  log('⚠️ Supabase 미설정 - /data 명령어 제한됨');
}

// ============================================
// 온리쌤 그림자 운영 (몰트봇 → session_timelines)
// ============================================
setupOnlysamShadowCommands(bot);
if (isOnlysamConfigured()) {
  log('📚 온리쌤 그림자: /수업시작 /출석 /결석 /훈련전환 /사고 /수업종료');
} else {
  log('⚠️ 온리쌤 미설정 - ONLYSAM_SUPABASE_URL, ONLYSAM_SERVICE_KEY 또는 SUPABASE_* 사용');
}

// ============================================
// Student CSV Upload
// ============================================
setupStudentUploadCommands(bot);
log('📎 Student Upload: /upload_students');

// ============================================
// 시작
// ============================================
log('🤖 MoltBot v2 시작!');
console.log(`
╔═══════════════════════════════════════════╗
║   🤖 MoltBot v2 - AUTUS 학원 관리         ║
╠═══════════════════════════════════════════╣
║  Telegram: ✅ 연결됨                       ║
║  Brain: ${BRAIN_URL}
║  Path: ${AUTUS_DIR}
╚═══════════════════════════════════════════╝
`);

bot.on('polling_error', (error) => {
  // 409 Conflict 무시 (다른 인스턴스 충돌)
  if (error.code === 'ETELEGRAM' && error.response?.statusCode === 409) {
    log('[WARN] 다른 봇 인스턴스가 실행 중일 수 있습니다.');
    return;
  }
  log(`[ERROR] ${error.message}`);
});

process.on('uncaughtException', (error) => {
  log(`[FATAL] ${error.message}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  log('[SHUTDOWN] MoltBot 종료');
  bot.stopPolling();
  process.exit(0);
});
