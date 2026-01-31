/**
 * 🤖 MoltBot Bridge - Telegram → Mac → Cursor/Claude
 *
 * 모바일에서 텔레그램으로 명령 → Mac에서 받아서 처리
 */

import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================
// 설정
// ============================================
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN 환경변수가 필요합니다!');
  process.exit(1);
}
const AUTHORIZED_USERS = ['seho', 'oseho', 'Ohseho81']; // 허용된 사용자
const COMMANDS_FILE = path.join(__dirname, 'commands.json');
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

function saveCommand(command) {
  let commands = [];
  if (fs.existsSync(COMMANDS_FILE)) {
    commands = JSON.parse(fs.readFileSync(COMMANDS_FILE, 'utf-8'));
  }
  commands.push({
    ...command,
    timestamp: new Date().toISOString(),
    status: 'pending'
  });
  fs.writeFileSync(COMMANDS_FILE, JSON.stringify(commands, null, 2));
}

function getCommands() {
  if (!fs.existsSync(COMMANDS_FILE)) return [];
  return JSON.parse(fs.readFileSync(COMMANDS_FILE, 'utf-8'));
}

function updateCommandStatus(index, status, result = null) {
  const commands = getCommands();
  if (commands[index]) {
    commands[index].status = status;
    if (result) commands[index].result = result;
    fs.writeFileSync(COMMANDS_FILE, JSON.stringify(commands, null, 2));
  }
}

// ============================================
// 명령어 핸들러
// ============================================

// /start - 시작
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || msg.from.first_name;

  log(`[START] User: ${username} (${chatId})`);

  bot.sendMessage(chatId, `
🤖 *MoltBot Bridge 활성화!*

안녕하세요, ${username}님!
모바일에서 AUTUS 개발 명령을 내릴 수 있습니다.

*사용 가능한 명령:*
/dev [내용] - 개발 요청
/status - 현재 상태 확인
/deploy - 배포 실행
/build - 빌드 실행
/git [명령] - Git 명령어
/help - 도움말

예시: /dev 올댓바스켓에 새 기능 추가해줘
  `, { parse_mode: 'Markdown' });
});

// /help - 도움말
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, `
📚 *MoltBot 명령어 가이드*

🔧 *개발 명령*
/dev [요청] - Claude/Cursor에 개발 요청
/build - 프로젝트 빌드
/deploy - Vercel 배포

📊 *상태 확인*
/status - 시스템 상태
/log - 최근 로그
/pending - 대기 중인 작업

🔄 *Git 명령*
/git status - 깃 상태
/git pull - 풀 받기
/git push - 푸시하기

🏀 *올댓바스켓*
/atb status - 앱 상태
/atb students - 학생 수

💡 *팁*
명령어 없이 메시지만 보내도 개발 요청으로 처리됩니다!
  `, { parse_mode: 'Markdown' });
});

// /dev - 개발 요청
bot.onText(/\/dev (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || 'unknown';
  const request = match[1];

  log(`[DEV] ${username}: ${request}`);

  const command = {
    type: 'dev',
    user: username,
    chatId: chatId,
    request: request,
  };

  saveCommand(command);

  bot.sendMessage(chatId, `
✅ *개발 요청 접수!*

📝 요청: ${request}
👤 요청자: ${username}
⏰ 시간: ${new Date().toLocaleString('ko-KR')}

Cursor/Claude가 작업을 시작합니다...
완료되면 알려드릴게요! 🚀
  `, { parse_mode: 'Markdown' });
});

// /status - 상태 확인
bot.onText(/\/status/, (msg) => {
  const commands = getCommands();
  const pending = commands.filter(c => c.status === 'pending').length;
  const completed = commands.filter(c => c.status === 'completed').length;

  bot.sendMessage(msg.chat.id, `
📊 *MoltBot 상태*

🟢 봇 상태: 온라인
📥 대기 중: ${pending}개
✅ 완료됨: ${completed}개
🕐 가동 시간: ${process.uptime().toFixed(0)}초

💻 Mac 연결: 활성
🔗 Cursor: 대기 중
  `, { parse_mode: 'Markdown' });
});

// /build - 빌드
bot.onText(/\/build/, (msg) => {
  const chatId = msg.chat.id;

  log(`[BUILD] Requested by ${msg.from.username}`);

  bot.sendMessage(chatId, '🔨 빌드 시작...');

  exec('cd ~/Desktop/autus/kraton-v2 && npm run build', (error, stdout, stderr) => {
    if (error) {
      bot.sendMessage(chatId, `❌ 빌드 실패!\n\n${stderr.slice(-500)}`);
      return;
    }
    bot.sendMessage(chatId, `✅ *빌드 성공!*\n\n${stdout.slice(-300)}`, { parse_mode: 'Markdown' });
  });
});

// /deploy - 배포
bot.onText(/\/deploy/, (msg) => {
  const chatId = msg.chat.id;

  log(`[DEPLOY] Requested by ${msg.from.username}`);

  bot.sendMessage(chatId, '🚀 배포 시작...');

  exec('cd ~/Desktop/autus && git add -A && git commit -m "deploy: via MoltBot" && git push origin main', (error, stdout, stderr) => {
    if (error && !stderr.includes('nothing to commit')) {
      bot.sendMessage(chatId, `❌ 배포 실패!\n\n${stderr.slice(-500)}`);
      return;
    }
    bot.sendMessage(chatId, `✅ *배포 완료!*\n\nVercel에서 자동 빌드 중...\nhttps://autus-ai.com`, { parse_mode: 'Markdown' });
  });
});

// /git - Git 명령
bot.onText(/\/git (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const gitCmd = match[1];

  log(`[GIT] ${gitCmd}`);

  // 보안: 허용된 명령만 실행
  const allowed = ['status', 'pull', 'push', 'log --oneline -5', 'diff --stat'];
  if (!allowed.some(a => gitCmd.startsWith(a.split(' ')[0]))) {
    bot.sendMessage(chatId, '⚠️ 허용되지 않은 Git 명령입니다.');
    return;
  }

  exec(`cd ~/Desktop/autus && git ${gitCmd}`, (error, stdout, stderr) => {
    const output = stdout || stderr || '(출력 없음)';
    bot.sendMessage(chatId, `📂 *git ${gitCmd}*\n\n\`\`\`\n${output.slice(-1000)}\n\`\`\``, { parse_mode: 'Markdown' });
  });
});

// /pending - 대기 중인 작업
bot.onText(/\/pending/, (msg) => {
  const commands = getCommands().filter(c => c.status === 'pending');

  if (commands.length === 0) {
    bot.sendMessage(msg.chat.id, '✅ 대기 중인 작업이 없습니다!');
    return;
  }

  const list = commands.map((c, i) => `${i + 1}. [${c.type}] ${c.request?.slice(0, 50) || 'N/A'}`).join('\n');
  bot.sendMessage(msg.chat.id, `📋 *대기 중인 작업 (${commands.length}개)*\n\n${list}`, { parse_mode: 'Markdown' });
});

// 일반 메시지 → 개발 요청으로 처리
bot.on('message', (msg) => {
  // 명령어가 아닌 일반 메시지만 처리
  if (msg.text && !msg.text.startsWith('/')) {
    const chatId = msg.chat.id;
    const username = msg.from.username || 'unknown';
    const request = msg.text;

    log(`[MSG] ${username}: ${request}`);

    const command = {
      type: 'dev',
      user: username,
      chatId: chatId,
      request: request,
    };

    saveCommand(command);

    bot.sendMessage(chatId, `
📝 *개발 요청으로 접수됨*

"${request.slice(0, 100)}${request.length > 100 ? '...' : ''}"

작업이 시작되면 알려드릴게요! ⏳
    `, { parse_mode: 'Markdown' });
  }
});

// ============================================
// 알림 함수 (외부에서 호출 가능)
// ============================================
export async function notifyUser(chatId, message) {
  return bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

export async function notifyCompletion(chatId, taskDescription, result) {
  return bot.sendMessage(chatId, `
✅ *작업 완료!*

📋 작업: ${taskDescription}
📊 결과: ${result}

🔗 확인: https://autus-ai.com
  `, { parse_mode: 'Markdown' });
}

// ============================================
// 시작
// ============================================
log('🤖 MoltBot Bridge 시작!');
console.log(`
╔═══════════════════════════════════════════╗
║     🤖 MoltBot Bridge for AUTUS          ║
╠═══════════════════════════════════════════╣
║  Telegram: @autus_seho_bot               ║
║  Status: 🟢 Online                        ║
║  Listening for commands...                ║
╚═══════════════════════════════════════════╝
`);

// 에러 핸들링
bot.on('polling_error', (error) => {
  log(`[ERROR] Polling error: ${error.message}`);
});

process.on('uncaughtException', (error) => {
  log(`[FATAL] ${error.message}`);
});
