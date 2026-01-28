/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎤 Voice Input — 음성 인식
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Web Speech API를 활용한 음성 입력:
 * - 실시간 음성 인식
 * - 명령어 감지
 * - 결정 입력
 * - 햅틱 피드백
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Web Speech API Type Declarations
// ═══════════════════════════════════════════════════════════════════════════════

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

// eslint-disable-next-line no-var
declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface VoiceConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface VoiceResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  command?: VoiceCommand;
}

export type VoiceCommand = 
  | { type: 'accept' }
  | { type: 'reject' }
  | { type: 'skip' }
  | { type: 'undo' }
  | { type: 'status' }
  | { type: 'help' }
  | { type: 'decision'; text: string };

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const COMMANDS: Record<string, VoiceCommand['type']> = {
  // Accept
  '예': 'accept',
  '네': 'accept',
  '수락': 'accept',
  '확인': 'accept',
  'yes': 'accept',
  'accept': 'accept',
  '승인': 'accept',
  
  // Reject
  '아니오': 'reject',
  '아니': 'reject',
  '거절': 'reject',
  '취소': 'reject',
  'no': 'reject',
  'reject': 'reject',
  
  // Skip
  '건너뛰기': 'skip',
  '스킵': 'skip',
  '다음': 'skip',
  'skip': 'skip',
  'next': 'skip',
  
  // Undo
  '되돌리기': 'undo',
  '취소하기': 'undo',
  'undo': 'undo',
  
  // Status
  '상태': 'status',
  '현재': 'status',
  'status': 'status',
  
  // Help
  '도움말': 'help',
  '명령어': 'help',
  'help': 'help',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Voice Recognition
// ═══════════════════════════════════════════════════════════════════════════════

export class VoiceRecognition {
  private recognition: SpeechRecognition | null = null;
  private config: Required<VoiceConfig>;
  private state: VoiceState = 'idle';
  private onResult?: (result: VoiceResult) => void;
  private onStateChange?: (state: VoiceState) => void;
  private onError?: (error: string) => void;

  constructor(config: VoiceConfig = {}) {
    this.config = {
      language: config.language || 'ko-KR',
      continuous: config.continuous ?? true,
      interimResults: config.interimResults ?? true,
      maxAlternatives: config.maxAlternatives || 1,
    };

    this.initRecognition();
  }

  /**
   * 음성 인식 초기화
   */
  private initRecognition(): void {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.config.language;
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;

    this.recognition.onstart = () => {
      this.setState('listening');
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex];
      const transcript = result[0].transcript.trim();
      const confidence = result[0].confidence;
      const isFinal = result.isFinal;

      const voiceResult: VoiceResult = {
        text: transcript,
        confidence,
        isFinal,
        command: this.parseCommand(transcript),
      };

      this.onResult?.(voiceResult);

      // 햅틱 피드백
      if (isFinal && voiceResult.command) {
        this.hapticFeedback();
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.setState('error');
      this.onError?.(event.error);
    };

    this.recognition.onend = () => {
      if (this.state === 'listening' && this.config.continuous) {
        // 자동 재시작
        this.recognition?.start();
      } else {
        this.setState('idle');
      }
    };
  }

  /**
   * 명령어 파싱
   */
  private parseCommand(text: string): VoiceCommand | undefined {
    const lower = text.toLowerCase();

    // 정확한 매칭
    for (const [keyword, type] of Object.entries(COMMANDS)) {
      if (lower === keyword.toLowerCase()) {
        if (type === 'decision') {
          return { type: 'decision', text };
        }
        return { type } as VoiceCommand;
      }
    }

    // 부분 매칭
    for (const [keyword, type] of Object.entries(COMMANDS)) {
      if (lower.includes(keyword.toLowerCase())) {
        if (type === 'decision') {
          return { type: 'decision', text };
        }
        return { type } as VoiceCommand;
      }
    }

    // 결정 텍스트로 처리
    if (text.length >= 5) {
      return { type: 'decision', text };
    }

    return undefined;
  }

  /**
   * 상태 변경
   */
  private setState(state: VoiceState): void {
    this.state = state;
    this.onStateChange?.(state);
  }

  /**
   * 햅틱 피드백
   */
  private hapticFeedback(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  /**
   * 인식 시작
   */
  start(): boolean {
    if (!this.recognition) {
      this.onError?.('Speech Recognition not available');
      return false;
    }

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Voice recognition start error:', error);
      return false;
    }
  }

  /**
   * 인식 중지
   */
  stop(): void {
    if (this.recognition) {
      this.setState('idle');
      this.recognition.stop();
    }
  }

  /**
   * 일시 중지
   */
  pause(): void {
    if (this.recognition) {
      this.recognition.abort();
    }
  }

  /**
   * 콜백 설정
   */
  setCallbacks(
    onResult: (result: VoiceResult) => void,
    onStateChange?: (state: VoiceState) => void,
    onError?: (error: string) => void
  ): void {
    this.onResult = onResult;
    this.onStateChange = onStateChange;
    this.onError = onError;
  }

  /**
   * 현재 상태
   */
  getState(): VoiceState {
    return this.state;
  }

  /**
   * 지원 여부
   */
  static isSupported(): boolean {
    return !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }

  /**
   * 언어 변경
   */
  setLanguage(language: string): void {
    this.config.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Voice Synthesis (TTS)
// ═══════════════════════════════════════════════════════════════════════════════

export class VoiceSynthesis {
  private synth: SpeechSynthesis;
  private voice: SpeechSynthesisVoice | null = null;
  private rate: number = 1;
  private pitch: number = 1;
  private volume: number = 1;

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoice();
  }

  /**
   * 한국어 음성 로드
   */
  private loadVoice(): void {
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      this.voice = voices.find(v => v.lang.startsWith('ko')) || voices[0];
    };

    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
    loadVoices();
  }

  /**
   * 텍스트 읽기
   */
  speak(text: string): void {
    if (this.synth.speaking) {
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.voice;
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.volume = this.volume;

    this.synth.speak(utterance);
  }

  /**
   * 중지
   */
  stop(): void {
    this.synth.cancel();
  }

  /**
   * 설정
   */
  setOptions(options: { rate?: number; pitch?: number; volume?: number }): void {
    if (options.rate !== undefined) this.rate = options.rate;
    if (options.pitch !== undefined) this.pitch = options.pitch;
    if (options.volume !== undefined) this.volume = options.volume;
  }

  /**
   * 지원 여부
   */
  static isSupported(): boolean {
    return 'speechSynthesis' in window;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════════════════

export function createVoiceRecognition(config?: VoiceConfig): VoiceRecognition {
  return new VoiceRecognition(config);
}

export function createVoiceSynthesis(): VoiceSynthesis {
  return new VoiceSynthesis();
}

export default { VoiceRecognition, VoiceSynthesis };
