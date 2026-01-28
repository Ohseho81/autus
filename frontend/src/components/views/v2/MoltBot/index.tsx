/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🦎 KratonBot - AUTUS 2.0 내장 AI 어시스턴트
 * 텔레그램 없이 앱 내에서 직접 AI와 대화
 * OpenRouter API를 통한 Claude 3.5 Sonnet 연동
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, X, Send, Mic, MicOff, Sparkles, 
  ChevronDown, Loader2, Bot, User, Lightbulb,
  AlertTriangle, CheckCircle, Zap, Brain, Settings,
  Key, Cpu, ExternalLink
} from 'lucide-react';

// API
import { 
  callMoltBotAPI, 
  setApiKey, 
  setModel, 
  getSettings, 
  AVAILABLE_MODELS,
  type ChatMessage,
  type MoltBotContext 
} from './api';

// Bridge
import { checkBridgeServer, writeFileDirect, editFileDirect } from './bridge';

// Setup Guide
import { SetupGuide } from './SetupGuide';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  actions?: QuickAction[];
  insights?: Insight[];
}

interface QuickAction {
  id: string;
  label: string;
  action: () => void;
  icon?: React.ReactNode;
}

interface Insight {
  type: 'warning' | 'success' | 'info' | 'tip';
  text: string;
}

interface MoltBotContextData {
  currentView?: string;
  selectedCustomer?: any;
  role?: string;
  recentActions?: any[];
}

// ─────────────────────────────────────────────────────────────────────
// Quick Suggestions
// ─────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────
// Branding
// ─────────────────────────────────────────────────────────────────────

const BOT_NAME = 'Kraton';
const BOT_NAME_KO = '크라톤';
const BOT_ICON = '🦎'; // 도마뱀 (탈피/진화의 상징)

// ─────────────────────────────────────────────────────────────────────
// Bridge Command Parser
// ─────────────────────────────────────────────────────────────────────

interface BridgeCommand {
  action: 'write' | 'edit';
  file: string;
  content?: string;
  oldString?: string;
  newString?: string;
}

function parseBridgeCommand(content: string): BridgeCommand | null {
  const match = content.match(/<!-- EXECUTE_BRIDGE -->\s*([\s\S]*?)\s*<!-- \/EXECUTE_BRIDGE -->/);
  if (!match) return null;
  
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

async function executeBridgeCommand(command: BridgeCommand): Promise<{ success: boolean; message: string }> {
  const isServerUp = await checkBridgeServer();
  if (!isServerUp) {
    return { 
      success: false, 
      message: '❌ 브릿지 서버가 실행되지 않았습니다.\n\n터미널에서 실행:\n```\nnode scripts/kraton-bridge-server.js\n```' 
    };
  }
  
  if (command.action === 'write' && command.content) {
    const result = await writeFileDirect(command.file, command.content);
    if (result.success) {
      return { success: true, message: `✅ 파일 작성 완료: ${command.file}` };
    }
    return { success: false, message: `❌ 오류: ${result.error}` };
  }
  
  if (command.action === 'edit' && command.oldString && command.newString) {
    const result = await editFileDirect(command.file, command.oldString, command.newString);
    if (result.success) {
      return { success: true, message: `✅ 파일 수정 완료: ${command.file}` };
    }
    return { success: false, message: `❌ 오류: ${result.error}` };
  }
  
  return { success: false, message: '❌ 알 수 없는 명령' };
}

const QUICK_SUGGESTIONS = [
  { id: 'status', text: '오늘 현황 요약해줘', icon: <Sparkles size={12} /> },
  { id: 'risk', text: '위험 고객 누구야?', icon: <AlertTriangle size={12} /> },
  { id: 'actions', text: '오늘 할 일 알려줘', icon: <CheckCircle size={12} /> },
  { id: 'insight', text: 'AI 인사이트 보여줘', icon: <Brain size={12} /> },
];

// UI/UX 개발 명령어
const UI_SUGGESTIONS = [
  { id: 'ui-improve', text: '현재 화면 UI 개선해줘', icon: <Zap size={12} /> },
  { id: 'ui-component', text: '새 컴포넌트 만들어줘', icon: <Sparkles size={12} /> },
  { id: 'ui-animation', text: '애니메이션 추가해줘', icon: <Sparkles size={12} /> },
  { id: 'ui-cursor', text: 'UI 개선하고 Cursor에 적용해줘', icon: <Zap size={12} /> },
];

// ─────────────────────────────────────────────────────────────────────
// Settings Panel Component
// ─────────────────────────────────────────────────────────────────────

const SettingsPanel: React.FC<{
  onClose: () => void;
  onSave: () => void;
}> = ({ onClose, onSave }) => {
  const settings = getSettings();
  const [apiKey, setApiKeyState] = useState('');
  const [selectedModel, setSelectedModel] = useState(settings.model);
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    if (apiKey.trim()) {
      setApiKey(apiKey.trim());
    }
    setModel(selectedModel);
    onSave();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-slate-900 z-10 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-purple-400" />
          <span className="font-bold">{BOT_NAME} 설정</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-700/50"
        >
          <X size={18} className="text-slate-400" />
        </motion.button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* API Key */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
            <Key size={14} />
            OpenRouter API 키
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              placeholder={settings.hasApiKey ? '••••••••••••••••' : 'sk-or-...'}
              className="w-full bg-slate-800 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 border border-slate-700 focus:border-purple-500 outline-none pr-20"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] text-slate-400 hover:text-white"
            >
              {showKey ? '숨기기' : '보기'}
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {settings.hasApiKey ? (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <CheckCircle size={10} /> 키 설정됨
              </span>
            ) : (
              <span className="text-[10px] text-amber-400 flex items-center gap-1">
                <AlertTriangle size={10} /> 키 필요
              </span>
            )}
            <a 
              href="https://openrouter.ai/keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
            >
              키 발급받기 <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {/* Model Selection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
            <Cpu size={14} />
            AI 모델
          </label>
          <div className="space-y-2">
            {AVAILABLE_MODELS.map((model) => (
              <motion.button
                key={model.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedModel(model.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  selectedModel === model.id
                    ? 'bg-purple-500/20 border-purple-500'
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="text-left">
                  <div className="text-sm font-medium text-white">{model.name}</div>
                  <div className="text-[10px] text-slate-400">{model.id}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] ${
                  model.tier === 'Premium' ? 'bg-purple-500/20 text-purple-400' :
                  model.tier === 'Fast' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {model.tier}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="text-[10px] text-slate-400">
            💡 <strong className="text-slate-300">Claude 3.5 Sonnet</strong>이 AUTUS에 최적화되어 있습니다.
            코딩, UI 분석, 데이터 인사이트에서 최고 성능을 발휘합니다.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium"
        >
          저장
        </motion.button>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// AI Response Generator (Real API + Fallback Mock)
// ─────────────────────────────────────────────────────────────────────

async function generateResponse(
  userMessage: string, 
  context: MoltBotContextData,
  messageHistory: ChatMessage[]
): Promise<{ content: string; actions?: QuickAction[]; insights?: Insight[] }> {
  const settings = getSettings();
  
  // API 키가 있으면 실제 API 호출
  if (settings.hasApiKey) {
    const apiContext: MoltBotContext = {
      currentView: context.currentView,
      role: context.role,
      academyName: 'KRATON',
      stats: {
        totalStudents: 132,
        criticalCount: 3,
        warningCount: 8,
        goodCount: 121,
        temperature: 68.5,
        sigma: 0.85,
      },
    };

    const messages: ChatMessage[] = [
      ...messageHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userMessage },
    ];

    const response = await callMoltBotAPI(messages, apiContext);
    
    return {
      content: response.content,
      actions: response.actions?.map(a => ({
        id: a.id,
        label: a.label,
        action: () => {}, // Will be handled by parent
      })),
      insights: response.insights,
    };
  }
  
  // API 키가 없으면 Mock 응답
  await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
  
  const lowerMsg = userMessage.toLowerCase();
  
  // 현황 요약
  if (lowerMsg.includes('현황') || lowerMsg.includes('요약') || lowerMsg.includes('상태')) {
    return {
      content: `📊 **오늘의 KRATON 현황** (데모 모드)

🌡️ **전체 온도**: 68.5° (주의 필요)
👥 **재원 현황**: 132명
  - 🟢 양호: 121명 (91.7%)
  - 🟡 주의: 8명 (6.1%)
  - 🔴 위험: 3명 (2.3%)

⚠️ **긴급 알림**: 2건
  1. 김민수 38° - 이탈 위험
  2. D학원 프로모션 감지

σ 환경지수: 0.85 (중간고사 D-3)

---
💡 *실제 AI 응답을 위해 설정에서 API 키를 입력하세요*`,
      actions: [
        { id: 'a1', label: '위험 고객 보기', action: () => {} },
        { id: 'a2', label: '⚙️ API 키 설정', action: () => {} },
      ],
      insights: [
        { type: 'warning', text: '김민수 학생 긴급 상담 필요' },
        { type: 'info', text: '데모 모드 - API 키 필요' },
      ],
    };
  }
  
  // 위험 고객
  if (lowerMsg.includes('위험') || lowerMsg.includes('이탈') || lowerMsg.includes('빨간')) {
    return {
      content: `🚨 **이탈 위험 고객 (3명)** (데모 모드)

1. **김민수** (중2 A반)
   - 온도: 38° ↓12°
   - 이탈 확률: 42%
   - 원인: 숙제 미제출 + 비용 Voice
   
2. **박서준** (중1 B반)
   - 온도: 42° ↓8°
   - 이탈 확률: 35%
   
3. **이지은** (중3 A반)
   - 온도: 45° ↓5°
   - 이탈 확률: 28%

💡 **AI 추천**: 김민수 학생부터 긴급 상담을 진행하세요.`,
      actions: [
        { id: 'a1', label: '김민수 상세 보기', action: () => {} },
      ],
    };
  }
  
  // 오늘 할 일
  if (lowerMsg.includes('할 일') || lowerMsg.includes('액션') || lowerMsg.includes('투두')) {
    return {
      content: `✅ **오늘의 액션 (4건)** (데모 모드)

🔴 **긴급**
1. 김민수 학부모 상담 - 박강사 (17:00)

🟠 **높음**
2. D학원 대응 전략 수립 - 관리자
3. 이서연 성적 향상 축하 - 최강사

🟡 **보통**
4. 신규 문의 3건 응답 - 상담사

📊 진행률: 0/4 (0%)`,
      actions: [
        { id: 'a1', label: '액션 페이지로 이동', action: () => {} },
      ],
    };
  }
  
  // AI 인사이트
  if (lowerMsg.includes('인사이트') || lowerMsg.includes('분석') || lowerMsg.includes('추천')) {
    return {
      content: `🧠 **AI 인사이트** (데모 모드)

📈 **트렌드 분석**
- 시장: 🌊 썰물 (-5.2%)
- 우리: 🚀 역류 (+8.3%)

⚡ **공명 감지**
- 외부 "사교육비" ↔ 내부 "비용"
- 영향 고객: 8명

🎯 **추천 전략**
1. 비용 관련 Voice 고객 선제 대응
2. D학원 프로모션 대응 준비

---
💡 *Claude 3.5 Sonnet 연동 시 더 정교한 분석 제공*`,
      insights: [
        { type: 'success', text: '시장 대비 성과 우수' },
        { type: 'warning', text: '비용 민감 고객 8명 주의' },
      ],
    };
  }
  
  // 기본 응답
  return {
    content: `안녕하세요! AUTUS AI 어시스턴트 **Kraton**입니다. 🦎

다음과 같은 질문을 해보세요:
- "오늘 현황 요약해줘"
- "위험 고객 누구야?"
- "오늘 할 일 알려줘"
- "AI 인사이트 보여줘"

---
⚙️ **Claude 3.5 Sonnet 연동 방법**
1. 우측 상단 ⚙️ 설정 클릭
2. OpenRouter API 키 입력
3. 모델 선택 (Claude 3.5 권장)

*현재: 데모 모드*`,
    actions: [
      { id: 'settings', label: '⚙️ API 키 설정', action: () => {} },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────
// Message Component
// ─────────────────────────────────────────────────────────────────────

const MessageBubble: React.FC<{ 
  message: Message; 
  onActionClick?: (action: QuickAction) => void 
}> = ({ message, onActionClick }) => {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-blue-500' : 'bg-gradient-to-br from-emerald-500 to-teal-500'
      }`}>
        {isUser ? <User size={14} /> : <span className="text-sm">🦎</span>}
      </div>
      
      {/* Content */}
      <div className={`flex-1 ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block max-w-[85%] p-3 rounded-2xl text-sm ${
          isUser 
            ? 'bg-blue-500 text-white rounded-br-md' 
            : 'bg-slate-800 text-white rounded-bl-md'
        }`}>
          {/* Markdown-like rendering */}
          <div className="whitespace-pre-wrap">
            {message.content.split('\n').map((line, i) => {
              // Bold
              const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
              return (
                <div key={i} dangerouslySetInnerHTML={{ __html: formatted }} />
              );
            })}
          </div>
        </div>
        
        {/* Insights */}
        {message.insights && message.insights.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.insights.map((insight, i) => (
              <div 
                key={i}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] ${
                  insight.type === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                  insight.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                  insight.type === 'tip' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}
              >
                {insight.type === 'warning' && <AlertTriangle size={10} />}
                {insight.type === 'success' && <CheckCircle size={10} />}
                {insight.type === 'tip' && <Lightbulb size={10} />}
                {insight.type === 'info' && <Zap size={10} />}
                {insight.text}
              </div>
            ))}
          </div>
        )}
        
        {/* Quick Actions */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.actions.map((action) => (
              <motion.button
                key={action.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onActionClick?.(action)}
                className="px-2 py-1 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-[10px] text-blue-400"
              >
                {action.label}
              </motion.button>
            ))}
          </div>
        )}
        
        {/* Timestamp */}
        <div className={`text-[9px] text-slate-500 mt-1 ${isUser ? 'text-right' : ''}`}>
          {message.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Main MoltBot Component
// ─────────────────────────────────────────────────────────────────────

interface MoltBotProps {
  context?: MoltBotContextData;
  onNavigate?: (view: string, params?: any) => void;
}

export function MoltBot({ context, onNavigate }: MoltBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '안녕하세요! AUTUS AI 어시스턴트 **Kraton**입니다. 🦎\n\n무엇을 도와드릴까요?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [apiStatus, setApiStatus] = useState(getSettings().hasApiKey);
  const [bridgeStatus, setBridgeStatus] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 브릿지 서버 상태 확인
  useEffect(() => {
    if (isOpen) {
      checkBridgeServer().then(setBridgeStatus);
    }
  }, [isOpen]);

  // Show setup guide on first open if no API key
  useEffect(() => {
    if (isOpen && !getSettings().hasApiKey && !localStorage.getItem('moltbot_setup_skipped')) {
      setShowSetupGuide(true);
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      status: 'sent',
    };
    
    const currentInput = input.trim();
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Convert messages to ChatMessage format for API
      const messageHistory: ChatMessage[] = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      
      const response = await generateResponse(currentInput, context || {}, messageHistory);
      
      // 브릿지 명령 파싱
      const bridgeCommand = parseBridgeCommand(response.content);
      
      const actions = response.actions?.map(a => ({
        ...a,
        action: a.id === 'settings' ? () => setShowSettings(true) : a.action,
      })) || [];
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        actions,
        insights: response.insights,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // 🚀 브릿지 명령 자동 실행 (클릭 없이!)
      if (bridgeCommand) {
        // 잠시 대기 후 자동 실행
        setTimeout(async () => {
          const executingMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: '⚡ **자동 실행 중...**\n\n파일을 수정하고 있습니다...',
            timestamp: new Date(),
            insights: [{ type: 'info', text: '브릿지 실행 중' }],
          };
          setMessages(prev => [...prev, executingMessage]);
          
          const result = await executeBridgeCommand(bridgeCommand);
          
          const resultMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.success 
              ? `✅ **자동 적용 완료!**\n\n${result.message}\n\n브라우저를 새로고침하면 변경사항이 반영됩니다.`
              : `${result.message}`,
            timestamp: new Date(),
            insights: [{ 
              type: result.success ? 'success' : 'warning', 
              text: result.success ? '코드 자동 적용됨' : '실행 실패' 
            }],
          };
          setMessages(prev => [...prev, resultMessage]);
        }, 500);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, context, messages]);

  const handleQuickSuggestion = useCallback((text: string) => {
    setInput(text);
  }, []);
  
  // Handle quick suggestion submission
  useEffect(() => {
    if (input && QUICK_SUGGESTIONS.some(s => s.text === input)) {
      const timer = setTimeout(() => {
        handleSend();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [input]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleActionClick = (action: QuickAction) => {
    action.action();
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30 flex items-center justify-center z-40 text-2xl ${isOpen ? 'hidden' : ''}`}
      >
        🦎
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full text-[9px] text-slate-900 font-bold flex items-center justify-center">
          AI
        </span>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-4 w-96 h-[500px] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-xl">
                  🦎
                </div>
                <div>
                  <div className="font-bold text-white">{BOT_NAME}</div>
                  <div className="text-[10px] flex items-center gap-2">
                    <span className={`flex items-center gap-1 ${apiStatus ? 'text-emerald-400' : 'text-amber-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${apiStatus ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      {apiStatus ? 'Claude 3.5' : '데모 모드'}
                    </span>
                    {bridgeStatus !== null && (
                      <span className={`flex items-center gap-1 ${bridgeStatus ? 'text-blue-400' : 'text-slate-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${bridgeStatus ? 'bg-blue-400' : 'bg-slate-500'}`} />
                        {bridgeStatus ? '직접실행' : '브릿지OFF'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowSettings(true)}
                  className="p-2 rounded-lg hover:bg-slate-700/50"
                >
                  <Settings size={16} className="text-slate-400" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-700/50"
                >
                  <X size={18} className="text-slate-400" />
                </motion.button>
              </div>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <SettingsPanel 
                  onClose={() => setShowSettings(false)} 
                  onSave={() => setApiStatus(getSettings().hasApiKey)}
                />
              )}
            </AnimatePresence>

            {/* Setup Guide */}
            <AnimatePresence>
              {showSetupGuide && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900 z-20 overflow-y-auto"
                >
                  <SetupGuide 
                    onComplete={() => {
                      setShowSetupGuide(false);
                      setApiStatus(getSettings().hasApiKey);
                      localStorage.setItem('moltbot_setup_skipped', 'true');
                    }} 
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <MessageBubble 
                  key={msg.id} 
                  message={msg} 
                  onActionClick={handleActionClick}
                />
              ))}
              
              {isLoading && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <Loader2 size={14} className="animate-spin text-white" />
                  </div>
                  <div className="text-sm text-slate-400">Kraton이 생각하는 중...</div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            {messages.length <= 2 && (
              <div className="px-4 pb-2 space-y-3">
                {/* 운영 질문 */}
                <div>
                  <div className="text-[10px] text-slate-500 mb-2">📊 운영 질문</div>
                  <div className="flex flex-wrap gap-1">
                    {QUICK_SUGGESTIONS.map((s) => (
                      <motion.button
                        key={s.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleQuickSuggestion(s.text)}
                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                      >
                        {s.icon}
                        {s.text}
                      </motion.button>
                    ))}
                  </div>
                </div>
                
                {/* UI/UX 개발 */}
                <div>
                  <div className="text-[10px] text-emerald-400 mb-2">🎨 UI/UX 개발</div>
                  <div className="flex flex-wrap gap-1">
                    {UI_SUGGESTIONS.map((s) => (
                      <motion.button
                        key={s.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleQuickSuggestion(s.text)}
                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-[10px] text-emerald-400 border border-emerald-500/30"
                      >
                        {s.icon}
                        {s.text}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-slate-700">
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsListening(!isListening)}
                  className={`p-2 rounded-lg ${isListening ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </motion.button>
                
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Kraton에게 물어보세요..."
                  className="flex-1 bg-slate-800 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 border border-slate-700 focus:border-purple-500 outline-none"
                />
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={`p-2 rounded-lg ${
                    input.trim() && !isLoading
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                      : 'bg-slate-700 text-slate-500'
                  }`}
                >
                  <Send size={18} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default MoltBot;
