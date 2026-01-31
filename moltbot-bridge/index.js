/**
 * 🤖 MoltBot Bridge - Telegram → Mac → Cursor/Claude
 *
 * 모바일에서 텔레그램으로 명령 → Claude Code CLI 실행 → 결과 반환
 */

import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================
// 설정
// ============================================
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN 환경변수가 필요합니다!');
  process.exit(1);
}

const AUTUS_DIR = path.join(process.env.HOME, 'Desktop/autus');
const COMMANDS_FILE = path.join(__dirname, 'commands.json');
const LOG_FILE = path.join(__dirname, 'moltbot.log');

// 봇 생성
const bot = new TelegramBot(TOKEN, { polling: true });

// 진행 중인 Claude 작업
let activeClaudeProcess = null;

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
  return commands.length - 1; // 인덱스 반환
}

function updateCommand(index, updates) {
  const commands = JSON.parse(fs.readFileSync(COMMANDS_FILE, 'utf-8'));
  if (commands[index]) {
    Object.assign(commands[index], updates);
    fs.writeFileSync(COMMANDS_FILE, JSON.stringify(commands, null, 2));
  }
}

// ============================================
// Claude Code CLI 실행
// ============================================
async function runClaudeCode(chatId, prompt, options = {}) {
  const { cwd = AUTUS_DIR, timeout = 300000 } = options;

  // 이미 실행 중인 작업이 있으면 알림
  if (activeClaudeProcess) {
    bot.sendMessage(chatId, '⏳ 이미 진행 중인 작업이 있습니다. 완료될 때까지 기다려주세요.');
    return;
  }

  log(`[CLAUDE] Starting: ${prompt.slice(0, 100)}...`);

  // 시작 알림
  const statusMsg = await bot.sendMessage(chatId, `
🤖 *Claude Code 실행 중...*

📝 요청: ${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}
⏳ 작업 진행 중...
  `, { parse_mode: 'Markdown' });

  return new Promise((resolve, reject) => {
    // Claude Code CLI 실행 (--print 옵션으로 결과만 출력)
    const claude = spawn('claude', ['-p', prompt, '--no-input'], {
      cwd,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    activeClaudeProcess = claude;
    let output = '';
    let lastUpdate = Date.now();

    // 타임아웃 설정
    const timeoutId = setTimeout(() => {
      claude.kill();
      bot.sendMessage(chatId, '⏰ 작업 시간 초과 (5분)');
      activeClaudeProcess = null;
    }, timeout);

    claude.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      log(`[CLAUDE OUT] ${text.slice(0, 200)}`);

      // 5초마다 진행 상황 업데이트
      if (Date.now() - lastUpdate > 5000) {
        lastUpdate = Date.now();
        bot.editMessageText(`
🤖 *Claude Code 작업 중...*

📝 요청: ${prompt.slice(0, 50)}...
⏳ 진행 중... (${Math.round(output.length / 1000)}KB 출력)
        `, {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: 'Markdown'
        }).catch(() => {});
      }
    });

    claude.stderr.on('data', (data) => {
      log(`[CLAUDE ERR] ${data.toString()}`);
    });

    claude.on('close', (code) => {
      clearTimeout(timeoutId);
      activeClaudeProcess = null;

      if (code === 0) {
        // 성공 - 결과 요약 전송
        const summary = output.length > 3000
          ? output.slice(-3000) + '\n\n... (앞부분 생략)'
          : output;

        bot.sendMessage(chatId, `
✅ *작업 완료!*

\`\`\`
${summary.slice(0, 3500)}
\`\`\`
        `, { parse_mode: 'Markdown' }).catch(() => {
          // Markdown 실패시 일반 텍스트로
          bot.sendMessage(chatId, `✅ 작업 완료!\n\n${summary.slice(0, 3500)}`);
        });

        resolve(output);
      } else {
        bot.sendMessage(chatId, `❌ 작업 실패 (코드: ${code})\n\n${output.slice(-500)}`);
        reject(new Error(`Claude exited with code ${code}`));
      }
    });

    claude.on('error', (error) => {
      clearTimeout(timeoutId);
      activeClaudeProcess = null;
      log(`[CLAUDE ERROR] ${error.message}`);
      bot.sendMessage(chatId, `❌ Claude 실행 오류: ${error.message}`);
      reject(error);
    });
  });
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
🤖 *MoltBot + Claude Code 연동!*

안녕하세요, ${username}님!
모바일에서 Claude Code에 직접 명령할 수 있습니다.

*사용 가능한 명령:*
/claude [요청] - Claude Code 실행 ⭐
/dev [내용] - 개발 요청 (저장)
/build - 프로젝트 빌드
/deploy - Git Push + Vercel 배포
/git [명령] - Git 명령어
/status - 상태 확인
/stop - 진행 중인 작업 중지

*예시:*
/claude 올댓바스켓에 통계 대시보드 추가해줘
/claude git status 확인하고 커밋해줘
  `, { parse_mode: 'Markdown' });
});

// /claude - Claude Code 직접 실행 ⭐
bot.onText(/\/claude (.+)/s, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];

  log(`[CLAUDE CMD] ${msg.from.username}: ${prompt.slice(0, 100)}`);

  try {
    await runClaudeCode(chatId, prompt);
  } catch (error) {
    log(`[CLAUDE FAIL] ${error.message}`);
  }
});

// /stop - 진행 중인 작업 중지
bot.onText(/\/stop/, (msg) => {
  if (activeClaudeProcess) {
    activeClaudeProcess.kill();
    activeClaudeProcess = null;
    bot.sendMessage(msg.chat.id, '🛑 작업이 중지되었습니다.');
  } else {
    bot.sendMessage(msg.chat.id, '진행 중인 작업이 없습니다.');
  }
});

// /dev - 개발 요청 (저장만)
bot.onText(/\/dev (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || 'unknown';
  const request = match[1];

  log(`[DEV] ${username}: ${request}`);

  const index = saveCommand({
    type: 'dev',
    user: username,
    chatId: chatId,
    request: request,
  });

  bot.sendMessage(chatId, `
✅ *개발 요청 저장됨*

📝 요청: ${request}
🔢 번호: #${index + 1}

💡 바로 실행하려면:
/claude ${request}
  `, { parse_mode: 'Markdown' });
});

// /status - 상태 확인
bot.onText(/\/status/, (msg) => {
  const isClaudeRunning = !!activeClaudeProcess;

  bot.sendMessage(msg.chat.id, `
📊 *MoltBot 상태*

🟢 봇: 온라인
${isClaudeRunning ? '🔄 Claude: 작업 중' : '⚪ Claude: 대기'}
🕐 가동: ${Math.round(process.uptime() / 60)}분
💻 경로: ${AUTUS_DIR}
  `, { parse_mode: 'Markdown' });
});

// /build - 빌드
bot.onText(/\/build/, (msg) => {
  const chatId = msg.chat.id;
  log(`[BUILD] Requested by ${msg.from.username}`);
  bot.sendMessage(chatId, '🔨 빌드 시작...');

  exec('cd ~/Desktop/autus/kraton-v2 && npm run build 2>&1 | tail -20', (error, stdout) => {
    if (error && !stdout.includes('built in')) {
      bot.sendMessage(chatId, `❌ 빌드 실패!\n\n\`\`\`\n${stdout.slice(-800)}\n\`\`\``, { parse_mode: 'Markdown' });
      return;
    }
    bot.sendMessage(chatId, `✅ *빌드 성공!*\n\n\`\`\`\n${stdout.slice(-500)}\n\`\`\``, { parse_mode: 'Markdown' });
  });
});

// /deploy - 배포
bot.onText(/\/deploy/, (msg) => {
  const chatId = msg.chat.id;
  log(`[DEPLOY] Requested by ${msg.from.username}`);
  bot.sendMessage(chatId, '🚀 배포 시작...');

  exec('cd ~/Desktop/autus && git add -A && git commit -m "deploy: via MoltBot 📱" --allow-empty && git push origin main 2>&1', (error, stdout, stderr) => {
    const output = stdout + stderr;
    if (output.includes('Everything up-to-date') || output.includes('main -> main')) {
      bot.sendMessage(chatId, `✅ *배포 완료!*\n\nhttps://autus-ai.com`, { parse_mode: 'Markdown' });
    } else if (error) {
      bot.sendMessage(chatId, `❌ 배포 실패\n\n${output.slice(-500)}`);
    } else {
      bot.sendMessage(chatId, `✅ *배포 완료!*\n\nhttps://autus-ai.com`, { parse_mode: 'Markdown' });
    }
  });
});

// /git - Git 명령
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

  exec(`cd ~/Desktop/autus && git ${gitCmd} 2>&1`, (error, stdout) => {
    const output = stdout || '(출력 없음)';
    bot.sendMessage(chatId, `📂 *git ${gitCmd}*\n\n\`\`\`\n${output.slice(-1500)}\n\`\`\``, { parse_mode: 'Markdown' });
  });
});

// /help - 도움말
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, `
📚 *MoltBot 명령어*

⭐ *Claude Code (핵심)*
/claude [요청] - Claude에게 직접 명령
/stop - 진행 중인 작업 중지

🔧 *개발*
/build - 빌드
/deploy - 배포

📂 *Git*
/git status
/git pull
/git push

📊 *상태*
/status - 봇 상태

💡 *팁*
그냥 메시지를 보내면 자동으로 Claude에게 전달됩니다!
  `, { parse_mode: 'Markdown' });
});

// 일반 메시지 → Claude Code 실행
bot.on('message', async (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    const chatId = msg.chat.id;
    const prompt = msg.text;

    log(`[MSG→CLAUDE] ${msg.from.username}: ${prompt.slice(0, 100)}`);

    try {
      await runClaudeCode(chatId, prompt);
    } catch (error) {
      log(`[MSG→CLAUDE FAIL] ${error.message}`);
    }
  }
});

// ============================================
// 시작
// ============================================
log('🤖 MoltBot Bridge 시작!');
console.log(`
╔═══════════════════════════════════════════╗
║   🤖 MoltBot + Claude Code Bridge        ║
╠═══════════════════════════════════════════╣
║  Telegram: @autus_seho_bot               ║
║  Claude: 🟢 Ready                         ║
║  Path: ${AUTUS_DIR}
╚═══════════════════════════════════════════╝
`);

bot.on('polling_error', (error) => {
  log(`[ERROR] ${error.message}`);
});

process.on('uncaughtException', (error) => {
  log(`[FATAL] ${error.message}`);
  activeClaudeProcess = null;
});
