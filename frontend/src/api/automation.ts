/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🤖 AUTUS Automation API Client
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 업무 자동화 MVP v0.1 API 클라이언트
 * - 할 일 우선순위 정렬
 * - 회의록 결정 추출
 * - 일일 보고서 생성
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface Task {
  id: string;
  content: string;
  quadrant: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  urgency_score: number;
  importance_score: number;
  priority_score: number;
  created_at: string;
  status: string;
}

export interface PrioritizeResult {
  prioritized: Task[];
  summary: {
    total_tasks: number;
    quadrant_distribution: Record<string, number>;
    top_priority: string | null;
  };
}

export interface Decision {
  id: string;
  content: string;
  assignee: string | null;
  deadline: string | null;
  deadline_text: string;
  confidence: number;
}

export interface MeetingResult {
  meeting_id: string;
  decisions: Decision[];
  summary: string;
  decision_count: number;
  analyzed_at: string;
}

export interface CompletedTask {
  id: string;
  content: string;
  category: string;
  estimated_hours: number;
}

export interface ReportResult {
  report_id: string;
  date: string;
  completed_tasks: CompletedTask[];
  tomorrow_plan: string[];
  issues: string[];
  total_hours: number;
  report_text: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: {
    processing_time_ms: number;
    [key: string]: any;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 할 일 우선순위 자동 정렬
 */
export async function prioritizeTasks(tasks: string[]): Promise<ApiResponse<PrioritizeResult>> {
  const response = await fetch(`${API_BASE}/automation/prioritize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks })
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * 회의록 핵심 결정 추출
 */
export async function extractMeetingDecisions(
  text: string, 
  maxDecisions: number = 5
): Promise<ApiResponse<MeetingResult>> {
  const response = await fetch(`${API_BASE}/automation/meeting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, max_decisions: maxDecisions })
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * 일일 보고서 자동 생성
 */
export async function generateDailyReport(
  completed: string[],
  tomorrow?: string[],
  issues?: string[]
): Promise<ApiResponse<ReportResult>> {
  const response = await fetch(`${API_BASE}/automation/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed, tomorrow, issues })
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * 자동화 엔진 상태 확인
 */
export async function getAutomationStatus(): Promise<any> {
  const response = await fetch(`${API_BASE}/automation/status`);
  return response.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Offline Fallback (IndexedDB 기반)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 오프라인 모드용 로컬 우선순위 정렬
 */
export function prioritizeTasksOffline(tasks: string[]): PrioritizeResult {
  const URGENT_KEYWORDS = ['오늘', '긴급', '즉시', 'ASAP', '마감', '내일'];
  const IMPORTANT_KEYWORDS = ['중요', '필수', '프로젝트', '클라이언트', '발표', '제출'];
  
  const analyzed = tasks.map((content, idx) => {
    const contentLower = content.toLowerCase();
    
    let urgency = 0;
    let importance = 0;
    
    URGENT_KEYWORDS.forEach(kw => {
      if (contentLower.includes(kw.toLowerCase())) urgency += 0.2;
    });
    
    IMPORTANT_KEYWORDS.forEach(kw => {
      if (contentLower.includes(kw.toLowerCase())) importance += 0.15;
    });
    
    urgency = Math.min(1, urgency);
    importance = Math.min(1, importance);
    
    let quadrant: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 'Q4';
    if (urgency >= 0.5 && importance >= 0.5) quadrant = 'Q1';
    else if (importance >= 0.5) quadrant = 'Q2';
    else if (urgency >= 0.5) quadrant = 'Q3';
    
    const quadrantWeight = { Q1: 1000, Q2: 100, Q3: 10, Q4: 1 };
    const priority_score = quadrantWeight[quadrant] + urgency * 50 + importance * 30;
    
    return {
      id: `task-${idx}-${Date.now()}`,
      content,
      quadrant,
      urgency_score: urgency,
      importance_score: importance,
      priority_score,
      created_at: new Date().toISOString(),
      status: 'pending'
    };
  });
  
  analyzed.sort((a, b) => b.priority_score - a.priority_score);
  
  const distribution: Record<string, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  analyzed.forEach(t => distribution[t.quadrant]++);
  
  return {
    prioritized: analyzed,
    summary: {
      total_tasks: analyzed.length,
      quadrant_distribution: distribution,
      top_priority: analyzed[0]?.content || null
    }
  };
}

/**
 * 오프라인 모드용 회의록 추출
 */
export function extractMeetingDecisionsOffline(text: string): MeetingResult {
  const sentences = text.split(/[.。!?]\s*|\n+/).filter(s => s.trim());
  
  const decisionKeywords = ['하기로', '확정', '결정', '합의', '완료', '진행', '담당'];
  const assigneePattern = /([가-힣]{2,4})(님|씨|대리|과장|차장|부장|팀장)/;
  
  const decisions: Decision[] = [];
  
  sentences.forEach((sentence, idx) => {
    const hasDecision = decisionKeywords.some(kw => sentence.includes(kw));
    if (!hasDecision) return;
    
    const assigneeMatch = sentence.match(assigneePattern);
    const assignee = assigneeMatch ? assigneeMatch[1] : null;
    
    let deadline: string | null = null;
    let deadline_text = '';
    
    if (sentence.includes('내일')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      deadline = tomorrow.toISOString().split('T')[0];
      deadline_text = '내일';
    } else if (sentence.includes('다음 주') || sentence.includes('다음주')) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      deadline = nextWeek.toISOString().split('T')[0];
      deadline_text = '다음 주';
    }
    
    decisions.push({
      id: `dec-${idx}-${Date.now()}`,
      content: sentence.trim(),
      assignee,
      deadline,
      deadline_text,
      confidence: 0.7
    });
  });
  
  return {
    meeting_id: `mtg-${Date.now()}`,
    decisions: decisions.slice(0, 5),
    summary: `📋 핵심 결정 ${decisions.length}건`,
    decision_count: decisions.length,
    analyzed_at: new Date().toISOString()
  };
}

/**
 * 오프라인 모드용 보고서 생성
 */
export function generateDailyReportOffline(
  completed: string[],
  tomorrow?: string[],
  issues?: string[]
): ReportResult {
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  
  const CATEGORY_KEYWORDS: Record<string, string[]> = {
    '개발': ['개발', '코딩', '코드', '구현', '버그', '배포'],
    '미팅': ['미팅', '회의', '콜', '화상'],
    '문서': ['문서', '작성', '보고서', '제안서'],
    '기타': []
  };
  
  const completedTasks: CompletedTask[] = completed.map((content, idx) => {
    let category = '기타';
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => content.includes(kw))) {
        category = cat;
        break;
      }
    }
    
    // 시간 추정
    let hours = 1.0;
    const timeMatch = content.match(/(\d+(?:\.\d+)?)\s*(시간|h|hr)/);
    if (timeMatch) hours = parseFloat(timeMatch[1]);
    else if (content.includes('미팅') || content.includes('회의')) hours = 1.0;
    else if (content.includes('개발') || content.includes('구현')) hours = 2.5;
    
    return {
      id: `task-${idx}-${Date.now()}`,
      content,
      category,
      estimated_hours: hours
    };
  });
  
  const totalHours = completedTasks.reduce((sum, t) => sum + t.estimated_hours, 0);
  
  let reportText = `📊 ${dateStr} 일일 보고서\n\n▸ 오늘 완료\n`;
  completedTasks.forEach(t => {
    reportText += `  • ${t.content} (${t.estimated_hours}h)\n`;
  });
  reportText += `\n  총 ${totalHours.toFixed(1)}시간 투자`;
  
  if (tomorrow && tomorrow.length > 0) {
    reportText += '\n\n▸ 내일 계획\n';
    tomorrow.forEach(item => {
      reportText += `  • ${item}\n`;
    });
  }
  
  reportText += '\n\n▸ 이슈\n';
  if (issues && issues.length > 0) {
    issues.forEach(issue => {
      reportText += `  • ${issue}\n`;
    });
  } else {
    reportText += '  • 없음\n';
  }
  
  return {
    report_id: `rpt-${Date.now()}`,
    date: today.toISOString().split('T')[0],
    completed_tasks: completedTasks,
    tomorrow_plan: tomorrow || [],
    issues: issues || [],
    total_hours: totalHours,
    report_text: reportText
  };
}
