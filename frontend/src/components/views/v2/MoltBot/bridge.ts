/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌉 Kraton-Cursor Bridge
 * Kraton이 Cursor/VS Code에 직접 명령을 전달하는 브릿지
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface CursorCommand {
  id: string;
  timestamp: string;
  type: 'edit' | 'create' | 'delete' | 'run' | 'write' | 'read';
  instruction: string;
  targetFile?: string;
  code?: string;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// 브릿지 서버 엔드포인트
const BRIDGE_SERVER = 'http://localhost:18790';
const COMMAND_ENDPOINT = '/api/kraton/command';
const COMMAND_FILE_PATH = '.kraton/commands/';

/**
 * 브릿지 서버 상태 확인
 */
export async function checkBridgeServer(): Promise<boolean> {
  try {
    const response = await fetch(`${BRIDGE_SERVER}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 파일 직접 쓰기 (브릿지 서버 경유)
 */
export async function writeFileDirect(filePath: string, content: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${BRIDGE_SERVER}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'write', file: filePath, content }),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, error: '브릿지 서버 연결 실패. node scripts/kraton-bridge-server.js 실행 필요' };
  }
}

/**
 * 파일 직접 수정 (브릿지 서버 경유)
 */
export async function editFileDirect(
  filePath: string, 
  oldString: string, 
  newString: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${BRIDGE_SERVER}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'edit', file: filePath, oldString, newString }),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, error: '브릿지 서버 연결 실패' };
  }
}

/**
 * 파일 읽기 (브릿지 서버 경유)
 */
export async function readFileDirect(filePath: string): Promise<{ success: boolean; result?: string; error?: string }> {
  try {
    const response = await fetch(`${BRIDGE_SERVER}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'read', file: filePath }),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, error: '브릿지 서버 연결 실패' };
  }
}

/**
 * Kraton → Cursor 명령 전송
 */
export async function sendToCursor(command: Omit<CursorCommand, 'id' | 'timestamp' | 'status'>): Promise<{ success: boolean; commandId: string }> {
  const fullCommand: CursorCommand = {
    ...command,
    id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    status: 'pending',
  };

  // 방법 1: API 서버로 전송 (서버가 있을 경우)
  try {
    const response = await fetch(COMMAND_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullCommand),
    });
    
    if (response.ok) {
      return { success: true, commandId: fullCommand.id };
    }
  } catch (e) {
    console.log('API 서버 없음, localStorage 방식 사용');
  }

  // 방법 2: localStorage에 저장 (Cursor Rule이 감지)
  const commands = JSON.parse(localStorage.getItem('kraton_commands') || '[]');
  commands.push(fullCommand);
  localStorage.setItem('kraton_commands', JSON.stringify(commands));

  // 방법 3: 클립보드에 명령 복사 (수동 실행용)
  const clipboardText = formatCommandForCursor(fullCommand);
  try {
    await navigator.clipboard.writeText(clipboardText);
  } catch (e) {
    console.log('클립보드 복사 실패');
  }

  return { success: true, commandId: fullCommand.id };
}

/**
 * Cursor에서 실행할 수 있는 형식으로 변환
 */
function formatCommandForCursor(command: CursorCommand): string {
  return `@Cursor 명령 실행 요청

## 명령 ID: ${command.id}
## 유형: ${command.type}
## 우선순위: ${command.priority}

### 지시사항
${command.instruction}

${command.targetFile ? `### 대상 파일\n${command.targetFile}\n` : ''}
${command.code ? `### 코드\n\`\`\`typescript\n${command.code}\n\`\`\`\n` : ''}

---
*이 명령은 Kraton이 생성했습니다. Cursor AI에게 붙여넣어 실행하세요.*
`;
}

/**
 * UI 개선 명령 생성 헬퍼
 */
export function createUICommand(
  instruction: string,
  targetFile?: string,
  code?: string
): Omit<CursorCommand, 'id' | 'timestamp' | 'status'> {
  return {
    type: 'edit',
    instruction,
    targetFile,
    code,
    priority: 'normal',
  };
}

/**
 * 명령 상태 확인
 */
export function getCommandStatus(commandId: string): CursorCommand | null {
  const commands = JSON.parse(localStorage.getItem('kraton_commands') || '[]');
  return commands.find((c: CursorCommand) => c.id === commandId) || null;
}

/**
 * 완료된 명령 마킹
 */
export function markCommandCompleted(commandId: string): void {
  const commands = JSON.parse(localStorage.getItem('kraton_commands') || '[]');
  const updated = commands.map((c: CursorCommand) => 
    c.id === commandId ? { ...c, status: 'completed' } : c
  );
  localStorage.setItem('kraton_commands', JSON.stringify(updated));
}

export default { sendToCursor, createUICommand, getCommandStatus, markCommandCompleted };
