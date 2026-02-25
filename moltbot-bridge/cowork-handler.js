/**
 * 🔗 Cowork Handler - Mac 로컬 ↔ Telegram 연동
 * 
 * 역할:
 * - Telegram에서 /cowork 명령 → Mac 로컬 작업 트리거
 * - 작업 큐 관리
 * - 완료 시 Telegram 푸시
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

// ============================================
// 설정
// ============================================
const AUTUS_DIR = process.env.AUTUS_DIR || path.join(process.env.HOME, 'Desktop/autus');
const QUEUE_FILE = path.join(__dirname, 'work-queue.json');
const LOG_FILE = path.join(__dirname, 'cowork.log');

// 작업 큐
let workQueue = [];
let isProcessing = false;

// ============================================
// 유틸리티
// ============================================
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

function saveQueue() {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(workQueue, null, 2));
}

function loadQueue() {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      workQueue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
    }
  } catch (e) {
    workQueue = [];
  }
}

// ============================================
// 작업 정의
// ============================================
export const COWORK_TASKS = {
  // 개발 관련
  'build': {
    name: '프로젝트 빌드',
    command: `cd ${AUTUS_DIR}/vercel-api && npm run build`,
    timeout: 120000,
    category: 'dev',
  },
  'test': {
    name: '테스트 실행',
    command: `cd ${AUTUS_DIR}/autus-ui-v1 && npm test -- --run`,
    timeout: 60000,
    category: 'dev',
  },
  'lint': {
    name: '린트 검사',
    command: `cd ${AUTUS_DIR}/autus-ui-v1 && npx tsc --noEmit`,
    timeout: 60000,
    category: 'dev',
  },
  'deploy': {
    name: 'Git 배포',
    command: `cd ${AUTUS_DIR} && git add -A && git commit -m "deploy: via MoltBot 📱" --allow-empty && git push origin main`,
    timeout: 60000,
    category: 'deploy',
  },
  
  // 서버 관련
  'start-brain': {
    name: 'MoltBot Brain 시작',
    command: `cd ${AUTUS_DIR}/moltbot-brain && npm start`,
    background: true,
    timeout: 10000,
    category: 'server',
  },
  'start-ui': {
    name: 'AUTUS UI 개발서버',
    command: `cd ${AUTUS_DIR}/autus-ui-v1 && npm run dev`,
    background: true,
    timeout: 10000,
    category: 'server',
  },
  'stop-all': {
    name: '모든 서버 중지',
    command: `pkill -f "vite" 2>/dev/null; pkill -f "moltbot-brain" 2>/dev/null; echo "Stopped"`,
    timeout: 5000,
    category: 'server',
  },
  
  // Git 관련
  'git-status': {
    name: 'Git 상태',
    command: `cd ${AUTUS_DIR} && git status --short`,
    timeout: 10000,
    category: 'git',
  },
  'git-pull': {
    name: 'Git Pull',
    command: `cd ${AUTUS_DIR} && git pull origin main`,
    timeout: 30000,
    category: 'git',
  },
  'git-log': {
    name: 'Git 로그 (최근 5개)',
    command: `cd ${AUTUS_DIR} && git log --oneline -5`,
    timeout: 10000,
    category: 'git',
  },
  
  // AUTUS 워크플로우 관련
  'workflow-status': {
    name: '9단계 워크플로우 상태',
    command: `cd ${AUTUS_DIR}/autus-ui-v1 && node -e "
      const { PHASES, PHASE_ORDER } = await import('./src/core/workflow.ts');
      console.log('=== AUTUS 9단계 워크플로우 ===');
      PHASE_ORDER.forEach((p, i) => {
        const phase = PHASES[p];
        console.log(\`\${i+1}. \${phase.name} (\${p}) - \${phase.leader.split(' ')[0]}\`);
      });
    "`,
    timeout: 10000,
    category: 'autus',
  },
  
  // 시스템 관련
  'disk': {
    name: '디스크 사용량',
    command: `df -h | head -5`,
    timeout: 5000,
    category: 'system',
  },
  'memory': {
    name: '메모리 사용량',
    command: `top -l 1 | head -10 | grep -E "PhysMem|CPU"`,
    timeout: 5000,
    category: 'system',
  },
  'processes': {
    name: 'Node 프로세스',
    command: `ps aux | grep -E "node|npm" | grep -v grep | head -10`,
    timeout: 5000,
    category: 'system',
  },
};

// ============================================
// 작업 실행
// ============================================
export async function executeTask(taskId, params = {}) {
  const task = COWORK_TASKS[taskId];
  if (!task) {
    return { success: false, error: `Unknown task: ${taskId}` };
  }

  log(`[TASK START] ${task.name} (${taskId})`);
  const startTime = Date.now();

  try {
    let command = task.command;
    
    // 파라미터 치환
    Object.entries(params).forEach(([key, value]) => {
      command = command.replace(`{{${key}}}`, value);
    });

    if (task.background) {
      // 백그라운드 실행
      const child = spawn('sh', ['-c', command], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      
      return {
        success: true,
        task: task.name,
        message: '백그라운드에서 시작됨',
        pid: child.pid,
        duration: Date.now() - startTime,
      };
    }

    // 포그라운드 실행
    const { stdout, stderr } = await execAsync(command, {
      timeout: task.timeout,
      maxBuffer: 1024 * 1024,
    });

    const duration = Date.now() - startTime;
    log(`[TASK DONE] ${task.name} (${duration}ms)`);

    return {
      success: true,
      task: task.name,
      output: (stdout || stderr || '(출력 없음)').trim().slice(-2000),
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`[TASK ERROR] ${task.name}: ${error.message}`);

    return {
      success: false,
      task: task.name,
      error: error.message,
      output: error.stdout || error.stderr || '',
      duration,
    };
  }
}

// ============================================
// 작업 큐
// ============================================
export function enqueue(taskId, params = {}, chatId = null, callback = null) {
  const job = {
    id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    taskId,
    params,
    chatId,
    callback,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  workQueue.push(job);
  saveQueue();
  log(`[QUEUE] Added: ${taskId} (${job.id})`);

  // 큐 처리 시작
  processQueue();

  return job;
}

async function processQueue() {
  if (isProcessing || workQueue.length === 0) return;

  isProcessing = true;

  while (workQueue.length > 0) {
    const job = workQueue.find(j => j.status === 'pending');
    if (!job) break;

    job.status = 'running';
    saveQueue();

    const result = await executeTask(job.taskId, job.params);
    
    job.status = result.success ? 'completed' : 'failed';
    job.result = result;
    job.completedAt = new Date().toISOString();
    saveQueue();

    // 콜백 실행
    if (job.callback) {
      try {
        await job.callback(result, job);
      } catch (e) {
        log(`[CALLBACK ERROR] ${e.message}`);
      }
    }

    // 완료된 작업 제거 (24시간 후)
    workQueue = workQueue.filter(j => 
      j.status === 'pending' || 
      j.status === 'running' ||
      (new Date() - new Date(j.completedAt)) < 24 * 60 * 60 * 1000
    );
    saveQueue();
  }

  isProcessing = false;
}

// ============================================
// Telegram 핸들러
// ============================================
export function setupCoworkCommands(bot, sendNotification) {
  // /cowork 메인 명령
  bot.onText(/\/cowork(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const args = match[1]?.split(' ') || ['help'];
    const command = args[0];
    const params = args.slice(1);

    log(`[COWORK] ${msg.from.username}: ${command}`);

    switch (command) {
      case 'help':
        sendHelp(bot, chatId);
        break;

      case 'list':
        sendTaskList(bot, chatId);
        break;

      case 'queue':
        sendQueueStatus(bot, chatId);
        break;

      case 'run': {
        const taskId = params[0];
        if (!taskId) {
          bot.sendMessage(chatId, '사용법: /cowork run [작업ID]\n\n💡 /cowork list 로 작업 목록 확인');
          return;
        }

        if (!COWORK_TASKS[taskId]) {
          bot.sendMessage(chatId, `❌ 알 수 없는 작업: ${taskId}\n\n💡 /cowork list 로 확인`);
          return;
        }

        bot.sendMessage(chatId, `🔄 *${COWORK_TASKS[taskId].name}* 시작...`, { parse_mode: 'Markdown' });

        // 콜백으로 결과 전송
        enqueue(taskId, {}, chatId, async (result) => {
          if (result.success) {
            bot.sendMessage(chatId, `✅ *${result.task}* 완료!\n\n⏱️ ${result.duration}ms\n\n\`\`\`\n${result.output?.slice(-1000) || result.message}\n\`\`\``, { parse_mode: 'Markdown' });
          } else {
            bot.sendMessage(chatId, `❌ *${result.task}* 실패\n\n${result.error}\n\n\`\`\`\n${result.output?.slice(-500)}\n\`\`\``, { parse_mode: 'Markdown' });
          }
        });
        break;
      }

      default:
        // 직접 작업 ID로 실행 시도
        if (COWORK_TASKS[command]) {
          bot.sendMessage(chatId, `🔄 *${COWORK_TASKS[command].name}* 시작...`, { parse_mode: 'Markdown' });
          
          enqueue(command, {}, chatId, async (result) => {
            if (result.success) {
              bot.sendMessage(chatId, `✅ *${result.task}* 완료!\n\n⏱️ ${result.duration}ms\n\n\`\`\`\n${result.output?.slice(-1000) || result.message}\n\`\`\``, { parse_mode: 'Markdown' });
            } else {
              bot.sendMessage(chatId, `❌ *${result.task}* 실패\n\n${result.error}`, { parse_mode: 'Markdown' });
            }
          });
        } else {
          bot.sendMessage(chatId, `❓ 알 수 없는 명령: ${command}\n\n/cowork help 로 확인`);
        }
    }
  });

  // 단축 명령어들
  const shortcuts = {
    '/build': 'build',
    '/test': 'test',
    '/lint': 'lint',
  };

  Object.entries(shortcuts).forEach(([cmd, taskId]) => {
    bot.onText(new RegExp(`^${cmd}$`), async (msg) => {
      const chatId = msg.chat.id;
      bot.sendMessage(chatId, `🔄 *${COWORK_TASKS[taskId].name}* 시작...`, { parse_mode: 'Markdown' });
      
      enqueue(taskId, {}, chatId, async (result) => {
        if (result.success) {
          bot.sendMessage(chatId, `✅ *${result.task}* 완료!\n\n⏱️ ${result.duration}ms\n\n\`\`\`\n${result.output?.slice(-1000)}\n\`\`\``, { parse_mode: 'Markdown' });
        } else {
          bot.sendMessage(chatId, `❌ *${result.task}* 실패\n\n${result.error}`, { parse_mode: 'Markdown' });
        }
      });
    });
  });
}

// ============================================
// UI 함수
// ============================================
function sendHelp(bot, chatId) {
  bot.sendMessage(chatId, `
🔗 *Cowork - Mac 로컬 작업 관리*

*명령어:*
/cowork list - 작업 목록
/cowork run [ID] - 작업 실행
/cowork queue - 큐 상태

*단축키:*
/build - 프로젝트 빌드
/test - 테스트 실행
/lint - 린트 검사
/deploy - Git 배포

*직접 실행:*
/cowork build
/cowork test
/cowork git-status
/cowork disk
  `, { parse_mode: 'Markdown' });
}

function sendTaskList(bot, chatId) {
  const categories = {};
  
  Object.entries(COWORK_TASKS).forEach(([id, task]) => {
    const cat = task.category || 'other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({ id, ...task });
  });

  let message = '📋 *작업 목록*\n\n';
  
  const categoryNames = {
    dev: '💻 개발',
    deploy: '🚀 배포',
    server: '🖥️ 서버',
    git: '📂 Git',
    autus: '🎯 AUTUS',
    system: '⚙️ 시스템',
  };

  Object.entries(categories).forEach(([cat, tasks]) => {
    message += `*${categoryNames[cat] || cat}*\n`;
    tasks.forEach(t => {
      message += `  \`${t.id}\` - ${t.name}\n`;
    });
    message += '\n';
  });

  message += '💡 /cowork run [ID] 로 실행';

  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

function sendQueueStatus(bot, chatId) {
  const pending = workQueue.filter(j => j.status === 'pending').length;
  const running = workQueue.filter(j => j.status === 'running').length;
  const completed = workQueue.filter(j => j.status === 'completed').length;
  const failed = workQueue.filter(j => j.status === 'failed').length;

  let message = `📊 *작업 큐 상태*\n\n`;
  message += `⏳ 대기: ${pending}\n`;
  message += `🔄 실행중: ${running}\n`;
  message += `✅ 완료: ${completed}\n`;
  message += `❌ 실패: ${failed}\n`;

  if (running > 0) {
    const runningJob = workQueue.find(j => j.status === 'running');
    message += `\n*현재 실행:*\n`;
    message += `  ${COWORK_TASKS[runningJob.taskId]?.name || runningJob.taskId}`;
  }

  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

// ============================================
// 푸시 알림 (Cowork → Telegram)
// ============================================
export async function pushNotification(bot, chatId, message, options = {}) {
  try {
    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      ...options,
    });
    log(`[PUSH] Sent to ${chatId}`);
    return true;
  } catch (error) {
    log(`[PUSH ERROR] ${error.message}`);
    return false;
  }
}

// ============================================
// 초기화
// ============================================
loadQueue();
log('🔗 Cowork Handler 초기화 완료');

export default {
  COWORK_TASKS,
  executeTask,
  enqueue,
  setupCoworkCommands,
  pushNotification,
};
