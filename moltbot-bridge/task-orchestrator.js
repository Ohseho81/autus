/**
 * 🎯 Task Orchestrator - 6-Agent Routing System
 * 
 * 몰트봇의 두뇌 (P0 - Mobile Gateway):
 * 1. Signal Detection: 명령에서 신호 추출
 * 2. Agent Scoring: Score = Trigger(0.3) + Capability(0.5) + Constraint(0.2)
 * 3. Chain Building: Entry → Primary → Support → Auto-add
 * 4. Task Execution: 담당 에이전트에게 작업 배정
 * 5. Completion: 완료 확인 후 다음 단계 자동 진행
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeTask, COWORK_TASKS } from './cowork-handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TASKS_FILE = path.join(__dirname, 'active-tasks.json');
const HISTORY_FILE = path.join(__dirname, 'task-history.json');

// ============================================
// 6-Agent 정의 (CLAUDE.md 기반)
// ============================================
export const AGENTS = {
  MOLTBOT: {
    id: 'moltbot',
    code: 'P0',
    name: '몰트봇',
    emoji: '📱',
    triggers: ['모바일', '원격', '알림', '상태확인', 'status', 'notify'],
    can: ['remote_trigger', 'notification', 'status_check'],
    cannot: ['file_access', 'code_execution'],
    priority: 0,
  },
  CLAUDE_CODE: {
    id: 'claude_code',
    code: 'P1',
    name: 'Claude Code',
    emoji: '⌨️',
    triggers: ['코딩', '디버깅', '배포', 'git', '테스트', 'API', '빌드', 'code', 'build', 'test', 'deploy', 'debug'],
    can: ['code_write', 'code_execute', 'git_ops', 'deploy', 'test', 'debug'],
    cannot: ['browser_ui', 'document_creation'],
    priority: 1,
  },
  COWORK: {
    id: 'cowork',
    code: 'P2',
    name: 'Cowork',
    emoji: '🖥️',
    triggers: ['문서', '정리', '리포트', 'PPT', '엑셀', '분석', 'document', 'report', 'organize'],
    can: ['file_organize', 'document_create', 'research', 'sub_agents'],
    cannot: ['code_deploy', 'browser_control'],
    priority: 2,
  },
  CHROME: {
    id: 'chrome',
    code: 'P3',
    name: 'Chrome',
    emoji: '🌐',
    triggers: ['브라우저', '웹', 'UI테스트', '스크래핑', '모니터링', 'browser', 'web', 'ui', 'scrape'],
    can: ['web_navigate', 'form_fill', 'console_read', 'schedule'],
    cannot: ['file_system', 'code_execution'],
    priority: 3,
  },
  CLAUDE_AI: {
    id: 'claude_ai',
    code: 'P4',
    name: 'claude.ai',
    emoji: '💬',
    triggers: ['리서치', '전략', '아이디어', '설계', '아키텍처', 'research', 'strategy', 'idea', 'design', 'architect'],
    can: ['web_search', 'deep_research', 'memory', 'artifacts'],
    cannot: ['local_file', 'deploy'],
    priority: 4,
  },
  CONNECTORS: {
    id: 'connectors',
    code: 'P5',
    name: 'Connectors',
    emoji: '🔗',
    triggers: ['GitHub', 'Slack', 'Notion', 'Gmail', '캘린더', 'api', 'sync', 'webhook'],
    can: ['api_bridge', 'data_sync', 'service_integration'],
    cannot: ['standalone_execution', 'code_logic'],
    priority: 5,
  },
};

// 하위 호환성을 위한 ROLES alias
export const ROLES = {
  MOLTBOT: AGENTS.MOLTBOT,
  COWORK: AGENTS.COWORK,
  BRAIN: {
    id: 'brain',
    name: 'MoltBot Brain',
    emoji: '🧠',
    capabilities: ['student', 'risk', 'rule', 'dashboard', 'intervention'],
  },
  WORKFLOW: {
    id: 'workflow',
    name: '9단계 워크플로우',
    emoji: '🔄',
    capabilities: ['mission', 'phase', 'sense', 'analyze', 'design', 'measure'],
  },
  HUMAN: {
    id: 'human',
    name: '세호 (수동 확인)',
    emoji: '👤',
    capabilities: ['approval', 'decision', 'review', 'confirm'],
  },
  EXTERNAL: AGENTS.CONNECTORS,
};

// ============================================
// Signal Detection (신호 추출)
// ============================================
export function detectSignal(input) {
  const lowerInput = input.toLowerCase();
  
  const signal = {
    location: 'desktop', // mobile | desktop | browser | cloud
    type: 'code',        // code | document | research | automation | communication
    needs: [],           // deploy, test, debug, file_ops, web_nav, research, notify
    output: 'api',       // api | ui | document | notification | data
  };
  
  // Location 감지
  if (/모바일|폰|telegram|원격|remote/i.test(input)) signal.location = 'mobile';
  else if (/브라우저|웹|chrome|web/i.test(input)) signal.location = 'browser';
  else if (/클라우드|railway|vercel|supabase/i.test(input)) signal.location = 'cloud';
  
  // Type 감지
  if (/문서|보고서|리포트|ppt|엑셀|doc/i.test(input)) signal.type = 'document';
  else if (/리서치|조사|전략|분석|research/i.test(input)) signal.type = 'research';
  else if (/자동화|스케줄|cron|webhook/i.test(input)) signal.type = 'automation';
  else if (/알림|메시지|notify|slack/i.test(input)) signal.type = 'communication';
  
  // Needs 감지
  if (/배포|deploy|push|올려/i.test(input)) signal.needs.push('deploy');
  if (/테스트|test|검증/i.test(input)) signal.needs.push('test');
  if (/디버그|debug|버그|에러/i.test(input)) signal.needs.push('debug');
  if (/파일|file|저장|save/i.test(input)) signal.needs.push('file_ops');
  if (/브라우저|웹|ui|화면/i.test(input)) signal.needs.push('web_nav');
  if (/조사|research|찾아/i.test(input)) signal.needs.push('research');
  if (/알림|notify|알려/i.test(input)) signal.needs.push('notify');
  
  // Output 감지
  if (/ui|화면|페이지|컴포넌트/i.test(input)) signal.output = 'ui';
  else if (/문서|doc|report/i.test(input)) signal.output = 'document';
  else if (/알림|notification/i.test(input)) signal.output = 'notification';
  else if (/데이터|data|조회/i.test(input)) signal.output = 'data';
  
  return signal;
}

// ============================================
// Agent Scoring (에이전트 점수 계산)
// Score = Trigger(0.3) + Capability(0.5) + Constraint(0.2)
// ============================================
export function scoreAgents(input, signal) {
  const lowerInput = input.toLowerCase();
  const scores = {};
  
  for (const [key, agent] of Object.entries(AGENTS)) {
    let triggerScore = 0;
    let capabilityScore = 0;
    let constraintScore = 1; // 제약 없으면 1
    
    // Trigger 매칭 (0.3)
    for (const trigger of agent.triggers) {
      if (lowerInput.includes(trigger.toLowerCase())) {
        triggerScore = 1;
        break;
      }
    }
    
    // Capability 매칭 (0.5)
    const capabilityMatches = signal.needs.filter(need => {
      return agent.can.some(cap => cap.includes(need) || need.includes(cap));
    });
    capabilityScore = capabilityMatches.length / Math.max(signal.needs.length, 1);
    
    // Constraint 체크 (0.2) - cannot에 해당하면 감점
    for (const constraint of agent.cannot) {
      if (lowerInput.includes(constraint.replace('_', ' '))) {
        constraintScore = 0.3;
        break;
      }
    }
    
    const totalScore = (triggerScore * 0.3) + (capabilityScore * 0.5) + (constraintScore * 0.2);
    
    scores[key] = {
      agent,
      triggerScore,
      capabilityScore,
      constraintScore,
      totalScore: Math.round(totalScore * 100) / 100,
    };
  }
  
  return scores;
}

// ============================================
// Chain Building (에이전트 체인 구성)
// ============================================
export function buildChain(input, signal, scores) {
  const sortedAgents = Object.entries(scores)
    .sort((a, b) => b[1].totalScore - a[1].totalScore);
  
  const chain = [];
  
  // Rule 1: mobile context → 몰트봇 항상 첫 번째
  if (signal.location === 'mobile') {
    chain.push({ ...scores.MOLTBOT, role: 'entry' });
  }
  
  // Rule 2: 최고 Score 에이전트가 Primary
  const primary = sortedAgents[0];
  if (!chain.find(c => c.agent.id === primary[1].agent.id)) {
    chain.push({ ...primary[1], role: 'primary' });
  } else {
    chain[0].role = 'primary'; // 몰트봇이 이미 있으면 primary로
    const second = sortedAgents[1];
    chain.push({ ...second[1], role: 'support' });
  }
  
  // Rule 3: Score > 0.3 에이전트들 Support
  for (const [key, score] of sortedAgents.slice(1)) {
    if (score.totalScore > 0.3 && !chain.find(c => c.agent.id === score.agent.id)) {
      chain.push({ ...score, role: 'support' });
    }
  }
  
  // Rule 4: deploy → 몰트봇 알림 자동 추가
  if (signal.needs.includes('deploy') && !chain.find(c => c.agent.id === 'moltbot')) {
    chain.push({ ...scores.MOLTBOT, role: 'auto-notify' });
  }
  
  // Rule 5: UI 작업 → Chrome 검증 자동 추가
  if (signal.output === 'ui' && !chain.find(c => c.agent.id === 'chrome')) {
    chain.push({ ...scores.CHROME, role: 'auto-verify' });
  }
  
  // Rule 6: 외부 서비스 → Connectors 자동 추가
  if (signal.location === 'cloud' && !chain.find(c => c.agent.id === 'connectors')) {
    chain.push({ ...scores.CONNECTORS, role: 'auto-bridge' });
  }
  
  return chain;
}

// ============================================
// 작업 유형 정의
// ============================================
export const TASK_TYPES = {
  // 개발 작업
  BUILD: { id: 'build', name: '빌드', role: 'COWORK', coworkTask: 'build', autoNext: null },
  TEST: { id: 'test', name: '테스트', role: 'COWORK', coworkTask: 'test', autoNext: null },
  LINT: { id: 'lint', name: '린트', role: 'COWORK', coworkTask: 'lint', autoNext: null },
  DEPLOY: { id: 'deploy', name: '배포', role: 'COWORK', coworkTask: 'deploy', autoNext: null },
  
  // Git 작업
  GIT_STATUS: { id: 'git_status', name: 'Git 상태', role: 'COWORK', coworkTask: 'git-status', autoNext: null },
  GIT_PULL: { id: 'git_pull', name: 'Git Pull', role: 'COWORK', coworkTask: 'git-pull', autoNext: null },
  
  // 학원 관리
  CHECK_RISK: { id: 'check_risk', name: '위험 학생 확인', role: 'BRAIN', brainEndpoint: '/api/moltbot/students/at-risk', autoNext: null },
  CHECK_DASHBOARD: { id: 'check_dashboard', name: '대시보드 확인', role: 'BRAIN', brainEndpoint: '/api/moltbot/dashboard', autoNext: null },
  
  // 워크플로우
  START_MISSION: { id: 'start_mission', name: '미션 시작', role: 'WORKFLOW', workflowAction: 'start', autoNext: 'SENSE_PHASE' },
  SENSE_PHASE: { id: 'sense', name: 'SENSE (감지)', role: 'WORKFLOW', workflowAction: 'sense', autoNext: 'ANALYZE_PHASE' },
  ANALYZE_PHASE: { id: 'analyze', name: 'ANALYZE (분석)', role: 'WORKFLOW', workflowAction: 'analyze', autoNext: 'STRATEGIZE_PHASE' },
  ADVANCE_PHASE: { id: 'advance', name: '다음 단계', role: 'WORKFLOW', workflowAction: 'advance', autoNext: null },
  
  // 승인 필요
  APPROVE_DECISION: { id: 'approve', name: '의사결정 승인', role: 'HUMAN', requiresConfirm: true, autoNext: null },
  REVIEW_CODE: { id: 'review', name: '코드 리뷰', role: 'HUMAN', requiresConfirm: true, autoNext: 'DEPLOY' },
  
  // 복합 작업 (파이프라인)
  FULL_BUILD_DEPLOY: { 
    id: 'full_deploy', 
    name: '빌드 + 테스트 + 배포', 
    role: 'COWORK', 
    pipeline: ['BUILD', 'TEST', 'DEPLOY'],
    autoNext: null 
  },
  FULL_CHECK: {
    id: 'full_check',
    name: '전체 점검',
    role: 'COWORK',
    pipeline: ['LINT', 'TEST', 'GIT_STATUS'],
    autoNext: null
  },
};

// ============================================
// 명령어 → 작업 매핑 (NLU-lite)
// ============================================
const COMMAND_PATTERNS = [
  // 개발
  { patterns: ['빌드', 'build', '빌드해', '빌드하자'], taskType: 'BUILD' },
  { patterns: ['테스트', 'test', '테스트해', '테스트하자'], taskType: 'TEST' },
  { patterns: ['린트', 'lint', '검사'], taskType: 'LINT' },
  { patterns: ['배포', 'deploy', '푸시', 'push', '올려'], taskType: 'DEPLOY' },
  { patterns: ['상태', 'status', 'git status'], taskType: 'GIT_STATUS' },
  { patterns: ['풀', 'pull', '땡겨'], taskType: 'GIT_PULL' },
  
  // 복합
  { patterns: ['전체 빌드', '빌드하고 배포', '빌드 배포', 'build deploy'], taskType: 'FULL_BUILD_DEPLOY' },
  { patterns: ['전체 점검', '점검', 'check all'], taskType: 'FULL_CHECK' },
  
  // 학원
  { patterns: ['위험 학생', '위험', 'risk', '이탈'], taskType: 'CHECK_RISK' },
  { patterns: ['대시보드', 'dashboard', '현황', '상태'], taskType: 'CHECK_DASHBOARD' },
  
  // 워크플로우
  { patterns: ['미션 시작', 'mission start', '프로젝트 시작'], taskType: 'START_MISSION' },
  { patterns: ['다음 단계', 'advance', '진행', '넘어가'], taskType: 'ADVANCE_PHASE' },
  
  // 승인
  { patterns: ['승인', 'approve', '확인'], taskType: 'APPROVE_DECISION' },
  { patterns: ['리뷰', 'review', '검토'], taskType: 'REVIEW_CODE' },
];

// ============================================
// Task 상태 관리
// ============================================
let activeTasks = [];
let taskHistory = [];

function loadTasks() {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      activeTasks = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
    }
    if (fs.existsSync(HISTORY_FILE)) {
      taskHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch (e) {
    activeTasks = [];
    taskHistory = [];
  }
}

function saveTasks() {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(activeTasks, null, 2));
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(taskHistory.slice(-100), null, 2));
}

// ============================================
// 핵심 함수들
// ============================================

/**
 * 1. 명령 파싱 → 작업 유형 결정
 */
export function parseCommand(input) {
  const lowerInput = input.toLowerCase();
  
  for (const { patterns, taskType } of COMMAND_PATTERNS) {
    for (const pattern of patterns) {
      if (lowerInput.includes(pattern)) {
        return {
          taskType,
          taskConfig: TASK_TYPES[taskType],
          confidence: 0.9,
          matchedPattern: pattern,
        };
      }
    }
  }
  
  return null; // 매칭 실패
}

/**
 * 2. 작업 생성 및 담당자 배정
 */
export function createTask(taskType, params = {}, chatId = null) {
  const config = TASK_TYPES[taskType];
  if (!config) return null;
  
  const role = ROLES[config.role];
  
  const task = {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: taskType,
    name: config.name,
    role: config.role,
    roleName: role.name,
    roleEmoji: role.emoji,
    status: 'pending', // pending → assigned → running → waiting_confirm → completed/failed
    params,
    chatId,
    pipeline: config.pipeline || null,
    pipelineIndex: 0,
    autoNext: config.autoNext,
    requiresConfirm: config.requiresConfirm || false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    result: null,
    history: [],
  };
  
  task.history.push({ status: 'created', at: task.createdAt });
  activeTasks.push(task);
  saveTasks();
  
  return task;
}

/**
 * 3. 작업 실행 (담당자에게 전달)
 */
export async function executeTaskByRole(task, bot, brainUrl = 'http://localhost:3030') {
  task.status = 'running';
  task.updatedAt = new Date().toISOString();
  task.history.push({ status: 'running', at: task.updatedAt });
  saveTasks();
  
  const config = TASK_TYPES[task.type];
  let result = null;
  
  try {
    switch (task.role) {
      case 'COWORK': {
        // Cowork 작업 실행
        if (config.coworkTask) {
          result = await executeTask(config.coworkTask, task.params);
        } else if (task.pipeline && task.pipelineIndex < task.pipeline.length) {
          // 파이프라인 실행
          const currentStep = task.pipeline[task.pipelineIndex];
          const stepConfig = TASK_TYPES[currentStep];
          result = await executeTask(stepConfig.coworkTask, task.params);
        }
        break;
      }
      
      case 'BRAIN': {
        // Brain API 호출
        const response = await fetch(brainUrl + config.brainEndpoint);
        if (response.ok) {
          result = { success: true, data: await response.json() };
        } else {
          result = { success: false, error: 'Brain API 오류' };
        }
        break;
      }
      
      case 'WORKFLOW': {
        // Workflow API 호출
        const endpoint = `/api/workflow/${config.workflowAction}`;
        const response = await fetch(brainUrl + endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task.params),
        });
        if (response.ok) {
          result = { success: true, data: await response.json() };
        } else {
          result = { success: false, error: 'Workflow API 오류' };
        }
        break;
      }
      
      case 'HUMAN': {
        // 사람의 확인 필요 → waiting_confirm 상태로
        task.status = 'waiting_confirm';
        task.updatedAt = new Date().toISOString();
        task.history.push({ status: 'waiting_confirm', at: task.updatedAt });
        saveTasks();
        
        return {
          task,
          needsConfirm: true,
          message: `👤 *${task.name}* 확인 필요\n\n✅ /confirm ${task.id} - 완료\n❌ /reject ${task.id} - 취소`,
        };
      }
      
      case 'EXTERNAL': {
        // 외부 서비스 (추후 구현)
        result = { success: false, error: '외부 서비스 연동 미구현' };
        break;
      }
    }
    
    task.result = result;
    
    // 파이프라인 처리
    if (task.pipeline && result?.success) {
      task.pipelineIndex++;
      if (task.pipelineIndex < task.pipeline.length) {
        // 다음 파이프라인 단계
        task.status = 'running';
        saveTasks();
        return executeTaskByRole(task, bot, brainUrl);
      }
    }
    
    // 완료 처리
    if (result?.success) {
      task.status = 'completed';
    } else {
      task.status = 'failed';
    }
    
    task.updatedAt = new Date().toISOString();
    task.history.push({ status: task.status, at: task.updatedAt, result });
    saveTasks();
    
    return { task, result };
    
  } catch (error) {
    task.status = 'failed';
    task.result = { success: false, error: error.message };
    task.updatedAt = new Date().toISOString();
    task.history.push({ status: 'failed', at: task.updatedAt, error: error.message });
    saveTasks();
    
    return { task, result: task.result };
  }
}

/**
 * 4. 작업 완료 확인 및 다음 단계 진행
 */
export async function confirmTask(taskId, bot, brainUrl) {
  const task = activeTasks.find(t => t.id === taskId);
  if (!task) return null;
  
  task.status = 'completed';
  task.updatedAt = new Date().toISOString();
  task.history.push({ status: 'confirmed', at: task.updatedAt });
  saveTasks();
  
  // 자동 다음 단계 체크
  if (task.autoNext) {
    const nextTask = createTask(task.autoNext, task.params, task.chatId);
    return {
      completed: task,
      next: nextTask,
      message: `✅ *${task.name}* 완료!\n\n⏭️ 다음: *${nextTask.name}* (${nextTask.roleEmoji} ${nextTask.roleName})`,
    };
  }
  
  // 히스토리로 이동
  activeTasks = activeTasks.filter(t => t.id !== taskId);
  taskHistory.push(task);
  saveTasks();
  
  return {
    completed: task,
    next: null,
    message: `✅ *${task.name}* 완료!`,
  };
}

/**
 * 5. 작업 거절
 */
export function rejectTask(taskId, reason = '') {
  const task = activeTasks.find(t => t.id === taskId);
  if (!task) return null;
  
  task.status = 'rejected';
  task.updatedAt = new Date().toISOString();
  task.history.push({ status: 'rejected', at: task.updatedAt, reason });
  
  activeTasks = activeTasks.filter(t => t.id !== taskId);
  taskHistory.push(task);
  saveTasks();
  
  return task;
}

/**
 * 현재 활성 작업 조회
 */
export function getActiveTasks() {
  return activeTasks;
}

/**
 * 작업 히스토리 조회
 */
export function getTaskHistory(limit = 10) {
  return taskHistory.slice(-limit);
}

// ============================================
// 6-Agent Routing 포맷
// ============================================

export function formatRouting(input, signal, scores, chain) {
  let message = `🎯 *Task Router*\n\n`;
  message += `📝 명령: "${input}"\n\n`;
  
  // Signal
  message += `🔍 *Signal Detection*\n`;
  message += `  • location: ${signal.location}\n`;
  message += `  • type: ${signal.type}\n`;
  message += `  • needs: [${signal.needs.join(', ')}]\n`;
  message += `  • output: ${signal.output}\n\n`;
  
  // Chain
  message += `📍 *Agent Chain*\n`;
  chain.forEach((item, i) => {
    const roleEmoji = {
      entry: '🚪',
      primary: '🎯',
      support: '🤝',
      'auto-notify': '🔔',
      'auto-verify': '✅',
      'auto-bridge': '🔗',
    };
    message += `  ${i + 1}. ${item.agent.emoji} ${item.agent.name} (${roleEmoji[item.role]} ${item.role})\n`;
    message += `     Score: ${item.totalScore}\n`;
  });
  
  // Primary Agent Instructions
  const primary = chain.find(c => c.role === 'primary' || c.role === 'entry');
  if (primary) {
    message += `\n💡 *Primary: ${primary.agent.emoji} ${primary.agent.name}*\n`;
    
    switch (primary.agent.id) {
      case 'moltbot':
        message += `  → 몰트봇이 처리합니다\n`;
        break;
      case 'claude_code':
        message += `  → Cursor/Claude Code에서 실행하세요\n`;
        break;
      case 'cowork':
        message += `  → Cowork (Mac Desktop)에서 실행하세요\n`;
        break;
      case 'chrome':
        message += `  → Chrome 브라우저에서 실행하세요\n`;
        break;
      case 'claude_ai':
        message += `  → claude.ai에서 리서치하세요\n`;
        break;
      case 'connectors':
        message += `  → API/Webhook 연동이 필요합니다\n`;
        break;
    }
  }
  
  return message;
}

// ============================================
// Telegram UI 포맷
// ============================================

export function formatTaskStatus(task) {
  const statusEmoji = {
    pending: '⏳',
    assigned: '📋',
    running: '🔄',
    waiting_confirm: '👤',
    completed: '✅',
    failed: '❌',
    rejected: '🚫',
  };
  
  let message = `${statusEmoji[task.status]} *${task.name}*\n\n`;
  message += `📍 담당: ${task.roleEmoji} ${task.roleName}\n`;
  message += `🆔 ID: \`${task.id}\`\n`;
  message += `📊 상태: ${task.status}\n`;
  
  if (task.pipeline) {
    message += `\n📦 *파이프라인:*\n`;
    task.pipeline.forEach((step, i) => {
      const stepConfig = TASK_TYPES[step];
      const icon = i < task.pipelineIndex ? '✅' : i === task.pipelineIndex ? '🔄' : '⬜';
      message += `  ${icon} ${stepConfig.name}\n`;
    });
  }
  
  if (task.result?.output) {
    message += `\n📝 결과:\n\`\`\`\n${task.result.output.slice(-500)}\n\`\`\``;
  }
  
  if (task.status === 'waiting_confirm') {
    message += `\n\n✅ /confirm ${task.id}\n❌ /reject ${task.id}`;
  }
  
  return message;
}

export function formatActiveTasksList() {
  if (activeTasks.length === 0) {
    return '📋 활성 작업이 없습니다.';
  }
  
  let message = '📋 *활성 작업*\n\n';
  
  activeTasks.forEach((task, i) => {
    const statusEmoji = {
      pending: '⏳',
      running: '🔄',
      waiting_confirm: '👤',
    };
    message += `${i + 1}. ${statusEmoji[task.status] || '⬜'} *${task.name}*\n`;
    message += `   ${task.roleEmoji} ${task.roleName}\n`;
    message += `   \`${task.id}\`\n\n`;
  });
  
  return message;
}

// ============================================
// Telegram 명령어 핸들러 설정
// ============================================

export function setupOrchestratorCommands(bot, brainUrl = 'http://localhost:3030') {
  
  // /route [작업] - 6-Agent 라우팅 분석
  bot.onText(/\/route(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1];
    
    if (!input) {
      bot.sendMessage(chatId, `
🎯 *6-Agent Task Router*

사용법: /route [작업 설명]

예시:
  /route 빌드하고 배포해
  /route 위험 학생 리포트 만들어
  /route 대시보드 UI 테스트해

Signal → Score → Route → Chain
      `, { parse_mode: 'Markdown' });
      return;
    }
    
    // 1. Signal Detection
    const signal = detectSignal(input);
    
    // 2. Agent Scoring
    const scores = scoreAgents(input, signal);
    
    // 3. Chain Building
    const chain = buildChain(input, signal, scores);
    
    // 4. 결과 출력
    const message = formatRouting(input, signal, scores, chain);
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    
    // 5. Primary가 몰트봇이면 자동 실행 제안
    const primary = chain.find(c => c.role === 'primary' || c.role === 'entry');
    if (primary && primary.agent.id === 'moltbot') {
      bot.sendMessage(chatId, `\n💡 몰트봇이 Primary입니다.\n/do ${input}\n으로 바로 실행할 수 있습니다.`);
    }
  });
  
  // /do [명령] - 자연어 명령 처리
  bot.onText(/\/do(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1];
    
    if (!input) {
      bot.sendMessage(chatId, `
🎯 *Task Orchestrator*

사용법: /do [명령]

예시:
  /do 빌드해
  /do 테스트하고 배포해
  /do 위험 학생 확인
  /do 미션 시작

명령을 분석해서 담당자에게 자동 배정합니다.
      `, { parse_mode: 'Markdown' });
      return;
    }
    
    // 1. 명령 파싱
    const parsed = parseCommand(input);
    
    if (!parsed) {
      bot.sendMessage(chatId, `❓ 명령을 이해하지 못했습니다: "${input}"\n\n/tasks help 로 가능한 작업 확인`);
      return;
    }
    
    // 2. 작업 생성
    const task = createTask(parsed.taskType, {}, chatId);
    
    bot.sendMessage(chatId, `
🎯 *작업 생성*

📌 ${task.name}
${task.roleEmoji} 담당: ${task.roleName}
${task.pipeline ? `📦 파이프라인: ${task.pipeline.length}단계` : ''}

⏳ 실행 중...
    `, { parse_mode: 'Markdown' });
    
    // 3. 실행
    const result = await executeTaskByRole(task, bot, brainUrl);
    
    // 4. 결과 전송
    if (result.needsConfirm) {
      bot.sendMessage(chatId, result.message, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, formatTaskStatus(result.task), { parse_mode: 'Markdown' });
      
      // 5. 자동 다음 단계 체크
      if (result.task.status === 'completed' && result.task.autoNext) {
        const confirmResult = await confirmTask(result.task.id, bot, brainUrl);
        if (confirmResult.next) {
          bot.sendMessage(chatId, confirmResult.message, { parse_mode: 'Markdown' });
          // 다음 작업 자동 실행
          const nextResult = await executeTaskByRole(confirmResult.next, bot, brainUrl);
          bot.sendMessage(chatId, formatTaskStatus(nextResult.task), { parse_mode: 'Markdown' });
        }
      }
    }
  });
  
  // /tasks - 활성 작업 목록
  bot.onText(/\/tasks(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const cmd = match[1] || 'list';
    
    switch (cmd) {
      case 'list':
        bot.sendMessage(chatId, formatActiveTasksList(), { parse_mode: 'Markdown' });
        break;
      
      case 'history': {
        const history = getTaskHistory(5);
        if (history.length === 0) {
          bot.sendMessage(chatId, '📜 작업 히스토리가 없습니다.');
          return;
        }
        let message = '📜 *최근 작업*\n\n';
        history.forEach((t, i) => {
          const icon = t.status === 'completed' ? '✅' : t.status === 'failed' ? '❌' : '🚫';
          message += `${i + 1}. ${icon} ${t.name} (${new Date(t.updatedAt).toLocaleString('ko-KR')})\n`;
        });
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        break;
      }
      
      case 'help':
        let helpMsg = '📋 *가능한 작업 유형*\n\n';
        Object.entries(TASK_TYPES).forEach(([key, config]) => {
          const role = ROLES[config.role];
          helpMsg += `• \`${key}\` - ${config.name} (${role.emoji})\n`;
        });
        helpMsg += '\n💡 /do [명령] 으로 실행';
        bot.sendMessage(chatId, helpMsg, { parse_mode: 'Markdown' });
        break;
      
      default:
        bot.sendMessage(chatId, '사용법: /tasks [list|history|help]');
    }
  });
  
  // /confirm [task_id] - 작업 완료 확인
  bot.onText(/\/confirm(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const taskId = match[1];
    
    if (!taskId) {
      const waiting = activeTasks.filter(t => t.status === 'waiting_confirm');
      if (waiting.length === 0) {
        bot.sendMessage(chatId, '👤 확인 대기 중인 작업이 없습니다.');
        return;
      }
      if (waiting.length === 1) {
        const result = await confirmTask(waiting[0].id, bot, brainUrl);
        bot.sendMessage(chatId, result.message, { parse_mode: 'Markdown' });
        return;
      }
      bot.sendMessage(chatId, formatActiveTasksList() + '\n💡 /confirm [ID] 로 확인');
      return;
    }
    
    const result = await confirmTask(taskId, bot, brainUrl);
    if (!result) {
      bot.sendMessage(chatId, `❌ 작업을 찾을 수 없습니다: ${taskId}`);
      return;
    }
    
    bot.sendMessage(chatId, result.message, { parse_mode: 'Markdown' });
    
    // 다음 작업 자동 실행
    if (result.next) {
      const nextResult = await executeTaskByRole(result.next, bot, brainUrl);
      bot.sendMessage(chatId, formatTaskStatus(nextResult.task), { parse_mode: 'Markdown' });
    }
  });
  
  // /reject [task_id] - 작업 거절
  bot.onText(/\/reject(?:\s+(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const taskId = match[1];
    
    if (!taskId) {
      bot.sendMessage(chatId, '사용법: /reject [작업ID]');
      return;
    }
    
    const task = rejectTask(taskId);
    if (!task) {
      bot.sendMessage(chatId, `❌ 작업을 찾을 수 없습니다: ${taskId}`);
      return;
    }
    
    bot.sendMessage(chatId, `🚫 *${task.name}* 거절됨`, { parse_mode: 'Markdown' });
  });
}

// ============================================
// 초기화
// ============================================
loadTasks();
console.log('🎯 Task Orchestrator 초기화 완료');

export default {
  // 6-Agent System
  AGENTS,
  ROLES,
  detectSignal,
  scoreAgents,
  buildChain,
  formatRouting,
  // Task Management
  TASK_TYPES,
  parseCommand,
  createTask,
  executeTaskByRole,
  confirmTask,
  rejectTask,
  getActiveTasks,
  getTaskHistory,
  setupOrchestratorCommands,
};
