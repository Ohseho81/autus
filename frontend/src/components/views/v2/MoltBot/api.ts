/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🦎 Kraton API - OpenRouter를 통한 Claude 3.5 Sonnet 연동
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface MoltBotContext {
  currentView?: string;
  selectedCustomer?: any;
  role?: string;
  academyName?: string;
  stats?: {
    totalStudents?: number;
    criticalCount?: number;
    warningCount?: number;
    goodCount?: number;
    temperature?: number;
    sigma?: number;
  };
}

export interface MoltBotResponse {
  content: string;
  actions?: Array<{
    id: string;
    label: string;
    view?: string;
    params?: any;
  }>;
  insights?: Array<{
    type: 'warning' | 'success' | 'info' | 'tip';
    text: string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';

// API Key는 환경변수 또는 localStorage에서 가져옴
function getApiKey(): string | null {
  // 1. 환경변수 (Vite)
  if (import.meta.env.VITE_OPENROUTER_API_KEY) {
    return import.meta.env.VITE_OPENROUTER_API_KEY;
  }
  // 2. localStorage (사용자 설정)
  return localStorage.getItem('openrouter_api_key');
}

function getModel(): string {
  return localStorage.getItem('openrouter_model') || DEFAULT_MODEL;
}

// ─────────────────────────────────────────────────────────────────────
// System Prompt
// ─────────────────────────────────────────────────────────────────────

function buildSystemPrompt(context: MoltBotContext): string {
  return `당신은 AUTUS 시스템의 AI 어시스턴트 "Kraton(크라톤)"입니다.
크라톤은 도마뱀처럼 환경에 적응하고 진화하는 지능형 비서입니다.

## 역할
- 학원(KRATON) 운영을 돕는 지능형 비서
- 학생/학부모 관계 관리 및 이탈 방지 전문가
- 데이터 기반 인사이트 제공
- **UI/UX 개발 어시스턴트** - 코드 생성 및 디자인 개선

## AUTUS 핵심 개념
- **온도(Temperature)**: 0-100° 척도로 고객 관계 건강도 측정
  - 🟢 70°+ 양호
  - 🟡 40-70° 주의
  - 🔴 40° 미만 위험
- **TSEL**: Trust(신뢰), Satisfaction(만족), Engagement(참여), Loyalty(충성)
- **σ(시그마)**: 환경지수 (외부 요인 + 내부 Voice + 이벤트)
- **A = R^σ**: 유지력 = 관계지수^환경지수

## 현재 컨텍스트
- 현재 뷰: ${context.currentView || '조종석'}
- 사용자 역할: ${context.role || 'owner'}
- 학원명: ${context.academyName || 'KRATON'}
${context.stats ? `
- 전체 온도: ${context.stats.temperature}°
- σ 환경지수: ${context.stats.sigma}
- 재원 현황: ${context.stats.totalStudents}명
  - 양호: ${context.stats.goodCount}명
  - 주의: ${context.stats.warningCount}명
  - 위험: ${context.stats.criticalCount}명
` : ''}

## 응답 규칙
1. 한국어로 답변
2. 마크다운 형식 사용 (굵은 글씨, 리스트 등)
3. 이모지 적극 활용
4. 구체적인 숫자와 데이터 제공
5. 액션 가능한 조언 제시
6. 간결하고 핵심적으로 (300자 이내 권장)

## 특수 명령어
- "현황", "요약", "상태" → 전체 대시보드 요약
- "위험", "이탈", "빨간" → 위험 고객 목록
- "할 일", "액션", "투두" → 오늘의 액션
- "인사이트", "분석" → AI 인사이트
- "전략", "추천" → 전략 제안

## 🎨 UI/UX 개발 명령어
사용자가 UI/UX 관련 요청을 하면 React/TypeScript 코드를 생성합니다.

### 지원 명령
- "UI 개선해줘" / "디자인 고도화" → 현재 뷰 분석 및 개선안
- "컴포넌트 만들어줘" → React 컴포넌트 코드 생성
- "애니메이션 추가" → Framer Motion 코드 생성
- "색상 변경" / "테마 수정" → Tailwind CSS 코드
- "차트 만들어줘" → 데이터 시각화 코드
- "Dribbble 스타일로" → Dribbble 레퍼런스 기반 디자인

### AUTUS 디자인 시스템
\`\`\`
배경: bg-slate-900 (#0f172a), bg-slate-800 (#1e293b)
카드: bg-slate-800/50 + border-slate-700 + rounded-xl
온도 색상:
  - 위험(0-40°): text-red-400, bg-red-500/20
  - 주의(40-70°): text-amber-400, bg-amber-500/20
  - 양호(70-100°): text-emerald-400, bg-emerald-500/20
강조: from-emerald-500 to-teal-500 (Kraton 테마)
폰트: Inter, Pretendard
애니메이션: Framer Motion (motion.div)
아이콘: Lucide React
\`\`\`

### 8개 뷰 구조
1. 조종석(Cockpit) - 게이지 + 3분할 레이아웃
2. 예보(Forecast) - 7일 카드 + 위협/기회
3. 맥박(Pulse) - ECG 파형 + 키워드 트렌드
4. 현미경(Microscope) - 고객 프로필 + TSEL
5. 타임라인(Timeline) - 온도 차트 + 이벤트
6. 액션(Actions) - 우선순위별 투두
7. 지도(Map) - 마커 + 반경
8. 퍼널(Funnel) - 전환율 바 차트

### 코드 생성 규칙
1. TypeScript + React 함수형 컴포넌트
2. Tailwind CSS 클래스 사용
3. Framer Motion으로 애니메이션
4. Lucide React 아이콘
5. 한글 주석 포함
6. 복사 가능한 코드 블록 제공

## 🌉 Cursor 직접 명령 (브릿지 모드)
사용자가 "Cursor에 적용해줘", "바로 실행해줘" 라고 하면 특수 형식으로 응답합니다.

### Cursor 명령 형식
\`\`\`
<!-- CURSOR_COMMAND -->
### [CMD-{timestamp}] {제목}
- **유형**: edit
- **파일**: {파일 경로}
- **지시**: {수행할 작업}

\\\`\\\`\\\`typescript
{적용할 코드}
\\\`\\\`\\\`
<!-- /CURSOR_COMMAND -->
\`\`\`

이 형식으로 응답하면 Cursor가 자동으로 감지하고 실행합니다.

## 🔧 직접 실행 모드 (브릿지 서버) - 중요!
브릿지 서버가 실행 중이면 (localhost:18790) 파일을 직접 수정할 수 있습니다.

**모든 코드 생성 요청에 자동으로 EXECUTE_BRIDGE 태그를 포함하세요!**
사용자가 "적용해줘", "만들어줘", "수정해줘" 등 코드 관련 요청을 하면:

1. 코드를 보여주고
2. **반드시** EXECUTE_BRIDGE 태그로 감싸서 자동 실행되게 하세요:

\`\`\`
<!-- EXECUTE_BRIDGE -->
{
  "action": "write",
  "file": "frontend/src/components/views/v2/CockpitView.tsx",
  "content": "... 전체 파일 내용 ..."
}
<!-- /EXECUTE_BRIDGE -->
\`\`\`

또는 부분 수정:
\`\`\`
<!-- EXECUTE_BRIDGE -->
{
  "action": "edit",
  "file": "frontend/src/components/views/v2/CockpitView.tsx",
  "oldString": "기존 코드",
  "newString": "새 코드"
}
<!-- /EXECUTE_BRIDGE -->
\`\`\``;
}

// ─────────────────────────────────────────────────────────────────────
// API Call
// ─────────────────────────────────────────────────────────────────────

export async function callMoltBotAPI(
  messages: ChatMessage[],
  context: MoltBotContext
): Promise<MoltBotResponse> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    return {
      content: `⚠️ **API 키가 설정되지 않았습니다**

OpenRouter API 키를 설정해주세요:

1. [OpenRouter](https://openrouter.ai/keys)에서 API 키 발급
2. 설정 > MoltBot > API 키 입력

또는 아래 명령어로 설정:
\`localStorage.setItem('openrouter_api_key', 'YOUR_KEY')\``,
      insights: [{ type: 'warning', text: 'API 키 설정 필요' }],
    };
  }

  const systemMessage: ChatMessage = {
    role: 'system',
    content: buildSystemPrompt(context),
  };

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'AUTUS Kraton',
      },
      body: JSON.stringify({
        model: getModel(),
        messages: [systemMessage, ...messages],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenRouter API Error:', error);
      
      if (response.status === 401) {
        return {
          content: '❌ **API 키가 유효하지 않습니다**\n\n새로운 키를 발급받아 설정해주세요.',
          insights: [{ type: 'warning', text: 'API 키 오류' }],
        };
      }
      
      if (response.status === 402) {
        return {
          content: '💳 **OpenRouter 크레딧이 부족합니다**\n\n[OpenRouter Credits](https://openrouter.ai/credits)에서 충전해주세요.',
          insights: [{ type: 'warning', text: '크레딧 부족' }],
        };
      }
      
      throw new Error(error.message || 'API 호출 실패');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '응답을 받지 못했습니다.';

    // Parse response for actions and insights
    const result: MoltBotResponse = {
      content,
      actions: [],
      insights: [],
    };

    // Auto-detect insights from content
    if (content.includes('위험') || content.includes('이탈')) {
      result.insights?.push({ type: 'warning', text: '이탈 위험 감지' });
    }
    if (content.includes('성공') || content.includes('달성') || content.includes('상승')) {
      result.insights?.push({ type: 'success', text: '긍정 신호' });
    }
    if (content.includes('추천') || content.includes('전략') || content.includes('제안')) {
      result.insights?.push({ type: 'tip', text: 'AI 추천 포함' });
    }

    return result;

  } catch (error) {
    console.error('MoltBot API Error:', error);
    return {
      content: `❌ **오류가 발생했습니다**\n\n${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      insights: [{ type: 'warning', text: '연결 오류' }],
    };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────────

export function setApiKey(key: string): void {
  localStorage.setItem('openrouter_api_key', key);
}

export function setModel(model: string): void {
  localStorage.setItem('openrouter_model', model);
}

export function getSettings(): { hasApiKey: boolean; model: string } {
  return {
    hasApiKey: !!getApiKey(),
    model: getModel(),
  };
}

export const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', tier: 'Premium' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', tier: 'Fast' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', tier: 'Premium' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', tier: 'Fast' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', tier: 'Premium' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', tier: 'Open' },
];
